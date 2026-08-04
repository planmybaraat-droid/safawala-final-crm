import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "franchise_admin" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  const franchiseId = auth.user?.franchise_id
  if (!franchiseId) return NextResponse.json({ error: "No franchise assigned" }, { status: 403 })

  try {
    const body = await request.json()
    const { rows } = body // array of row objects from parsed CSV

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch category map (name → id)
    const { data: categories } = await supabase.from("product_categories").select("id, name")
    const catMap: Record<string, string> = {}
    ;(categories || []).forEach((c: any) => { catMap[c.name.toLowerCase().trim()] = c.id })

    let created = 0, updated = 0, errors = 0
    const errorList: string[] = []

    for (const row of rows) {
      try {
        const name = (row["Name"] || row["name"] || "").trim()
        if (!name) continue

        const categoryName = (row["Category"] || row["category"] || "").trim()
        const categoryId = categoryName ? catMap[categoryName.toLowerCase()] || null : null

        const productData = {
          name,
          barcode: row["Barcode"] || row["barcode"] || null,
          product_code: row["Product Code"] || row["product_code"] || null,
          category: categoryName || null,
          category_id: categoryId,
          description: row["Description"] || row["description"] || null,
          rental_price: parseFloat(row["Rental Price"] || row["rental_price"] || "0") || 0,
          sale_price: parseFloat(row["Sale Price"] || row["sale_price"] || "0") || 0,
          security_deposit: parseFloat(row["Security Deposit"] || row["security_deposit"] || "0") || 0,
          stock_available: parseInt(row["Stock Available"] || row["stock_available"] || "0") || 0,
          stock_total: parseInt(row["Stock Total"] || row["stock_total"] || "0") || 0,
          reorder_level: parseInt(row["Reorder Level"] || row["reorder_level"] || "0") || 0,
          image_url: row["Image URL"] || row["image_url"] || null,
          is_active: (row["Is Active"] || row["is_active"] || "Yes").toLowerCase() !== "no",
          franchise_id: franchiseId,
        }

        // Check if product with same barcode or name exists
        const barcode = productData.barcode
        let existing = null
        if (barcode) {
          const { data } = await supabase
            .from("products")
            .select("id")
            .eq("franchise_id", franchiseId)
            .eq("barcode", barcode)
            .single()
          existing = data
        }

        if (existing) {
          await supabase.from("products").update(productData).eq("id", existing.id)
          updated++
        } else {
          await supabase.from("products").insert([productData])
          created++
        }
      } catch (rowErr: any) {
        errors++
        errorList.push(`Row "${row["Name"] || "?"}: ${rowErr.message}"`)
      }
    }

    return NextResponse.json({ success: true, created, updated, errors, errorList })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
