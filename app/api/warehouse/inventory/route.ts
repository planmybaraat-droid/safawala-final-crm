import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireRbacPermission, writeAuditLog } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.view")
  if ("response" in permission) return permission.response
  const context = permission.context
  // The warehouse portal shares the same products table as Main CRM. Retrieve
  // every active product in stable 1,000-row pages so both surfaces agree.
  const data: any[] = []
  const pageSize = 1000
  let offset = 0
  let total = 0

  while (true) {
    let query = supabaseServer
      .from("products")
      .select("id, name, product_code, sku, barcode, category, category_id, description, color, size, material, price, regular_price, rental_price, cost_price, security_deposit, image_url, stock_available, stock_total, stock_booked, stock_damaged, stock_in_laundry, reorder_level, is_active, franchise_id", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (!context.user.is_super_admin && context.user.franchise_id) query = query.eq("franchise_id", context.user.franchise_id)

    const { data: page, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = page || []
    data.push(...rows)
    total = count ?? total
    offset += rows.length
    if (rows.length < pageSize || offset >= total) break
  }

  return NextResponse.json({ success: true, data, total: total || data.length })
}

export async function POST(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.update")
  if ("response" in permission) return permission.response
  const context = permission.context

  const franchiseId = context.user.franchise_id
  if (!context.user.is_super_admin && !franchiseId) {
    return NextResponse.json({ error: "No franchise assigned" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const stockTotal = Number(body.stock_total)
  if (!name) return NextResponse.json({ error: "Product name is required" }, { status: 400 })
  if (!Number.isInteger(stockTotal) || stockTotal < 1) {
    return NextResponse.json({ error: "Stock quantity must be a whole number of at least 1" }, { status: 400 })
  }

  const categoryId = typeof body.category_id === "string" && body.category_id ? body.category_id : null
  const barcode = typeof body.barcode === "string" && body.barcode.trim()
    ? body.barcode.trim()
    : `WH${Date.now().toString().slice(-10)}`

  const { data, error } = await supabaseServer
    .from("products")
    .insert({
      name,
      category_id: categoryId,
      barcode,
      stock_total: stockTotal,
      stock_available: stockTotal,
      stock_booked: 0,
      stock_damaged: 0,
      stock_in_laundry: 0,
      reorder_level: 5,
      is_active: true,
      franchise_id: franchiseId,
    })
    .select("id, name, product_code, barcode, category, stock_available, stock_total, stock_booked, stock_damaged, stock_in_laundry, is_active, franchise_id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(request, context, { module: "warehouse", action: "create", resourceType: "product", resourceId: data.id, metadata: { name, stock_total: stockTotal } })
  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.update")
  if ("response" in permission) return permission.response
  const context = permission.context
  const body = await request.json().catch(() => ({}))
  const productId = typeof body.product_id === "string" ? body.product_id : ""
  const stock = Number(body.stock_available)
  if (!productId || !Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "product_id and a non-negative integer stock_available are required" }, { status: 400 })

  let lookup = supabaseServer.from("products").select("id, franchise_id, stock_available").eq("id", productId).single()
  const { data: product, error: lookupError } = await lookup
  if (lookupError || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (!context.user.is_super_admin && product.franchise_id !== context.user.franchise_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data, error } = await supabaseServer.from("products").update({ stock_available: stock, updated_at: new Date().toISOString() }).eq("id", productId).select("id, name, stock_available, stock_total").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(request, context, { module: "warehouse", action: "edit", resourceType: "product", resourceId: productId, metadata: { previous_stock: product.stock_available, stock_available: stock } })
  return NextResponse.json({ success: true, data })
}
