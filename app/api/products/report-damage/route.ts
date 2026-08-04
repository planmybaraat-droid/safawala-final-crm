import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/products/report-damage
 * Report damaged stock for a product
 * Body: { productId: string, qty_damaged: number, damage_type: string, severity: string, description: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const { productId, qty_damaged, damage_type, severity, description } = body

    if (!productId || !qty_damaged || !damage_type || !severity) {
      return NextResponse.json(
        { error: "productId, qty_damaged, damage_type, and severity are required" },
        { status: 400 }
      )
    }

    const qty = parseInt(qty_damaged, 10)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "qty_damaged must be a positive integer" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 1. Fetch product to inspect stock
    let productQuery = supabase
      .from("products")
      .select("id, name, quantity, stock_quantity, stock_available, stock_damaged, franchise_id")
      .eq("id", productId)

    if (!auth.user!.is_super_admin && auth.user!.franchise_id) {
      productQuery = productQuery.eq("franchise_id", auth.user!.franchise_id)
    }

    const { data: product, error: fetchError } = await productQuery.single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // 2. Perform DB operations
    // Insert damage report
    const { data: report, error: insertError } = await supabase
      .from("damage_reports")
      .insert([
        {
          product_id: productId,
          qty_damaged: qty,
          damage_type,
          severity,
          description: description || null,
          reported_at: new Date().toISOString(),
          status: "pending"
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Failed to insert damage report:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update product quantities: decrement available and increment damaged
    // We update all potential columns ('quantity', 'stock_quantity', 'stock_available') to match schema variations
    const currentQty = product.quantity ?? product.stock_quantity ?? product.stock_available ?? 0
    const currentAvailable = product.stock_available ?? currentQty
    const currentDamaged = product.stock_damaged ?? 0

    const newQty = Math.max(0, currentQty - qty)
    const newAvailable = Math.max(0, currentAvailable - qty)
    const newDamaged = currentDamaged + qty

    const { error: updateError } = await supabase
      .from("products")
      .update({
        quantity: newQty,
        stock_quantity: newQty,
        stock_available: newAvailable,
        stock_damaged: newDamaged,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId)
      .eq("franchise_id", product.franchise_id)

    if (updateError) {
      console.error("Failed to update product stock:", updateError)
      // Note: even if update fails, we already inserted the report, so return a success indicator with warning
      return NextResponse.json({
        success: true,
        warning: "Report logged but failed to update product quantities",
        report
      }, { status: 200 })
    }

    return NextResponse.json({ success: true, report }, { status: 200 })

  } catch (error) {
    console.error("Error in report-damage route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
