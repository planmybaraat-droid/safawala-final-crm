import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/products/move-to-variant
 * Moves product A (standalone) under product B (parent) as a variation.
 * Body: {
 *   sourceProductId: string,
 *   targetProductId: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff', requirePermission: 'inventory' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const { sourceProductId, targetProductId } = body

    if (!sourceProductId || !targetProductId) {
      return NextResponse.json(
        { error: "sourceProductId and targetProductId are required in JSON body" },
        { status: 400 }
      )
    }

    if (sourceProductId === targetProductId) {
      return NextResponse.json(
        { error: "Source product and target parent product cannot be the same product" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 1. Fetch source product A details
    let sourceQuery = supabase.from("products").select("*").eq("id", sourceProductId)
    let targetQuery = supabase.from("products").select("*").eq("id", targetProductId)

    if (!auth.user!.is_super_admin && auth.user!.franchise_id) {
      sourceQuery = sourceQuery.eq("franchise_id", auth.user!.franchise_id)
      targetQuery = targetQuery.eq("franchise_id", auth.user!.franchise_id)
    }

    const { data: productA, error: errA } = await sourceQuery.single()

    if (errA || !productA) {
      return NextResponse.json({ error: "Source product (A) not found" }, { status: 404 })
    }

    // 2. Fetch target parent product B details
    const { data: productB, error: errB } = await targetQuery.single()

    if (errB || !productB) {
      return NextResponse.json({ error: "Target parent product (B) not found" }, { status: 404 })
    }

    // Franchise isolation check
    if (!AuthMiddleware.canAccessFranchise(auth.user!, productA.franchise_id) || !AuthMiddleware.canAccessFranchise(auth.user!, productB.franchise_id)) {
      return NextResponse.json(
        { error: "Access denied: products must belong to your assigned franchise" },
        { status: 403 }
      )
    }

    // 3. Calculate price adjustments relative to parent Product B
    const priceAdjustment = (Number(productA.price) || 0) - (Number(productB.price) || 0)
    const regularPriceAdjustment = (Number(productA.regular_price) || 0) - (Number(productB.regular_price) || 0)
    const rentalPriceAdjustment = (Number(productA.rental_price) || 0) - (Number(productB.rental_price) || 0)

    const barcodeValue = productA.barcode_number || productA.barcode || null

    // 4. Create new variation row
    const { data: variation, error: insertErr } = await supabase
      .from("product_variations")
      .insert([{
        product_id: productB.id,
        franchise_id: productA.franchise_id || productB.franchise_id,
        variation_name: productA.name,
        color: productA.color || null,
        design: (productA as any).design || null,
        material: productA.material || null,
        size: productA.size || null,
        sku: productA.sku || null,
        price_adjustment: priceAdjustment,
        regular_price_adjustment: regularPriceAdjustment,
        rental_price_adjustment: rentalPriceAdjustment,
        stock_total: productA.stock_total || 0,
        stock_available: productA.stock_available || 0,
        stock_booked: productA.stock_booked || 0,
        stock_damaged: productA.stock_damaged || 0,
        barcode: barcodeValue,
        image_url: productA.image_url || null,
        is_active: true
      }])
      .select()
      .single()

    if (insertErr) {
      console.error("Failed to insert product variation:", insertErr)
      return NextResponse.json(
        { error: `Failed to create variation row: ${insertErr.message}` },
        { status: 500 }
      )
    }

    // 5. Delete or Archive original standalone product A
    let actionTaken = "deleted"
    const { error: deleteErr } = await supabase
      .from("products")
      .delete()
      .eq("id", sourceProductId)

    if (deleteErr) {
      console.log("Delete failed, archiving source product A instead to bypass foreign key references:", deleteErr.message)
      // Archive fallback: clear barcode and mark inactive
      const { error: archiveErr } = await supabase
        .from("products")
        .update({
          barcode: null,
          barcode_number: null,
          is_active: false,
          description: `${productA.description || ""} (Moved to variation of ${productB.name})`
        })
        .eq("id", sourceProductId)

      if (archiveErr) {
        console.error("Archiving failed:", archiveErr)
        actionTaken = "error_on_cleanup"
      } else {
        actionTaken = "archived (barcode cleared)"
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully moved product "${productA.name}" under parent "${productB.name}" as a variation.`,
      action: actionTaken,
      variation
    })

  } catch (error) {
    console.error("Error moving product to variation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
