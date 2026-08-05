import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireRbacPermission, writeAuditLog } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.view")
  if ("response" in permission) return permission.response
  const context = permission.context
  // Match Main CRM's /inventory view (app/inventory/dashboard.tsx fetches
  // /api/products?limit=3000&active_only=true — Postgres/PostgREST caps
  // real responses at 1000 rows regardless of the requested limit, so 1000
  // is the true ceiling both surfaces can reach). The old limit(500) here
  // silently truncated the list to half of what Main CRM shows.
  let query = supabaseServer
    .from("products")
    .select("id, name, product_code, sku, barcode, category, stock_available, stock_total, stock_booked, stock_damaged, stock_in_laundry, reorder_level, is_active, franchise_id")
    .eq("is_active", true)
    .order("name")
    .limit(1000)
  if (!context.user.is_super_admin && context.user.franchise_id) query = query.eq("franchise_id", context.user.franchise_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
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
