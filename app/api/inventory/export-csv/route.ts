import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "readonly" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  const franchiseId = auth.user?.franchise_id
  const isSuperAdmin = auth.user?.is_super_admin

  const supabase = createClient()

  let query = supabase
    .from("products")
    .select("id, name, barcode, product_code, category, category_id, description, rental_price, sale_price, security_deposit, stock_available, stock_total, reorder_level, image_url, is_active, created_at")
    .order("name")

  if (!isSuperAdmin && franchiseId) {
    query = query.eq("franchise_id", franchiseId)
  }

  const { data: products, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch category names
  const { data: categories } = await supabase.from("product_categories").select("id, name")
  const catMap: Record<string, string> = {}
  ;(categories || []).forEach((c: any) => { catMap[c.id] = c.name })

  // Build CSV
  const headers = [
    "Name", "Barcode", "Product Code", "Category", "Description",
    "Rental Price", "Sale Price", "Security Deposit",
    "Stock Available", "Stock Total", "Reorder Level",
    "Image URL", "Is Active"
  ]

  const escape = (v: any) => {
    if (v === null || v === undefined) return ""
    const s = String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const rows = (products || []).map((p: any) => [
    escape(p.name),
    escape(p.barcode || p.product_code || ""),
    escape(p.product_code || ""),
    escape(p.category || catMap[p.category_id] || ""),
    escape(p.description || ""),
    escape(p.rental_price ?? 0),
    escape(p.sale_price ?? 0),
    escape(p.security_deposit ?? 0),
    escape(p.stock_available ?? 0),
    escape(p.stock_total ?? 0),
    escape(p.reorder_level ?? 0),
    escape(p.image_url || ""),
    escape(p.is_active !== false ? "Yes" : "No"),
  ].join(","))

  const csv = [headers.join(","), ...rows].join("\n")
  const filename = `inventory-${new Date().toISOString().split("T")[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
