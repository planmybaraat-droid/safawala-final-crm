import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, canAccessFranchise } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

/**
 * GET /api/returns/[id]/preview
 * Preview inventory impact before processing return
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // AuthN/Z: ensure user is authenticated and scoped to the return's franchise
    const auth = await requireAuth(request, 'readonly')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user

    const supabase = createClient()
    const returnId = params.id
    
    // Get URL parameters for item quantities (if provided)
    const { searchParams } = new URL(request.url)
    const itemsParam = searchParams.get("items") // JSON string of items
    
    // 1. Fetch return record
    const { data: returnRecord, error: returnError } = await supabase
      .from("returns")
      .select("*")
      .eq("id", returnId)
      .single()
    
    if (returnError || !returnRecord) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      )
    }
    // Enforce franchise isolation
    if (!canAccessFranchise(user as any, returnRecord.franchise_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // 2. Get products from booking
    let productIds: string[] = []
    
    if (returnRecord.booking_source === "product_order") {
      const { data: orderItems } = await supabase
        .from("product_order_items")
        .select("product_id, quantity")
        .eq("order_id", returnRecord.booking_id)
      
      productIds = (orderItems || []).map(item => item.product_id)
    } else if (returnRecord.booking_source === "package_booking") {
      const { data: packageItems } = await supabase
        .from("package_booking_items")
        .select("reserved_products")
        .eq("booking_id", returnRecord.booking_id)
      
      // Extract product IDs from reserved_products array (supports string IDs or object with id)
      productIds = (packageItems || []).flatMap((item: any) =>
        (item.reserved_products || []).map((p: any) => typeof p === 'string' ? p : p?.id)
      ).filter(Boolean)
    }
    
    // Remove duplicates
    productIds = [...new Set(productIds)]
    
    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        preview: [],
        message: "No products found in booking"
      })
    }
    
    // 3. Fetch current product inventory
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, product_code, category, stock_total, stock_available, stock_damaged, stock_booked, stock_in_laundry")
      .in("id", productIds)
      .eq("franchise_id", returnRecord.franchise_id)
    
    if (productsError) {
      console.error("Error fetching products:", productsError)
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      )
    }
    
    // 4. Parse items if provided, otherwise use defaults
    let items: any[] = []
    if (itemsParam) {
      try {
        items = JSON.parse(itemsParam)
      } catch (e) {
        console.error("Error parsing items param:", e)
      }
    }
    
    // 5. If applicable, fetch handover restocked quantities to avoid double counting
    let handoverRestockedByProduct: Record<string, number> = {}
    let handoverLaundryByProduct: Record<string, number> = {}
    if (returnRecord.delivery_id) {
      const { data: handoverRows, error: handoverErr } = await supabase
        .from("delivery_handover_items")
        .select("product_id, restocked_qty, returned_laundry_qty")
        .eq("delivery_id", returnRecord.delivery_id)
        .in("product_id", productIds)

      if (!handoverErr && handoverRows) {
        for (const row of handoverRows) {
          if (row?.product_id) handoverRestockedByProduct[row.product_id] = Number(row.restocked_qty) || 0
          if (row?.product_id) handoverLaundryByProduct[row.product_id] = Number(row.returned_laundry_qty) || 0
        }
      }
    }
    
    // 6. Calculate preview for each product
    const preview = (products || []).map(product => {
      // Find item data if provided
      const itemData = items.find(i => i.product_id === product.id)
      
      const qty_delivered = itemData?.qty_delivered || 0
      const qty_returned = itemData?.qty_returned || 0
      const qty_not_used = itemData?.qty_not_used || 0
      const qty_damaged = itemData?.qty_damaged || 0
      const qty_lost = itemData?.qty_lost || 0
      const send_to_laundry = itemData?.send_to_laundry || false
      const qty_to_laundry = typeof itemData?.qty_to_laundry === 'number'
        ? Math.max(0, Math.min(itemData.qty_to_laundry, qty_returned))
        : (send_to_laundry ? qty_returned : 0)
      
      // Calculate new inventory values
      // handoverRestocked: quantities that were already restocked during handover (subset of not_used)
  const alreadyRestocked = Math.min(handoverRestockedByProduct[product.id] || 0, qty_not_used)
  const alreadyToLaundry = Math.max(0, handoverLaundryByProduct[product.id] || 0)
      // qty_not_used: Goes directly to available, but avoid double-adding already restocked during handover
      // qty_returned: Split between laundry and direct restock based on qty_to_laundry
      const directToAvailable = (qty_not_used - alreadyRestocked) + (qty_returned - qty_to_laundry)
  const tolaundry = qty_to_laundry
      
      const new_stock_available = product.stock_available + directToAvailable
      const new_stock_damaged = product.stock_damaged + qty_damaged
      const new_stock_total = product.stock_total - qty_lost
      const new_stock_in_laundry = (product.stock_in_laundry || 0) + tolaundry
  // Booked should be decreased only by quantities not already released at handover (restock or laundry)
  const bookedRelease = Math.max(0, qty_delivered - ((handoverRestockedByProduct[product.id] || 0) + alreadyToLaundry))
      const new_stock_booked = Math.max(0, (product.stock_booked || 0) - bookedRelease)
      
      return {
        product_id: product.id,
        product_name: product.name,
        product_code: product.product_code,
        category: product.category,
        current_stock: {
          total: product.stock_total,
          available: product.stock_available,
          damaged: product.stock_damaged,
          booked: product.stock_booked,
          in_laundry: product.stock_in_laundry || 0
        },
        new_stock: {
          total: new_stock_total,
          available: new_stock_available,
          damaged: new_stock_damaged,
          booked: new_stock_booked,
          in_laundry: new_stock_in_laundry
        },
        changes: {
          total: new_stock_total - product.stock_total,
          available: new_stock_available - product.stock_available,
          damaged: new_stock_damaged - product.stock_damaged,
          booked: new_stock_booked - (product.stock_booked || 0),
          in_laundry: new_stock_in_laundry - (product.stock_in_laundry || 0)
        },
        quantities: {
          delivered: qty_delivered,
          returned: qty_returned,
          not_used: qty_not_used,
          damaged: qty_damaged,
          lost: qty_lost,
          send_to_laundry,
          qty_to_laundry
        },
        warnings: [
          ...(new_stock_total < 0 ? ["Total stock would go negative"] : []),
          ...(new_stock_available < 0 ? ["Available stock would go negative"] : []),
          ...(qty_lost > 0 ? [`${qty_lost} items will be permanently removed`] : []),
          ...(qty_damaged > 0 ? [`${qty_damaged} items will be archived as damaged`] : []),
          ...(tolaundry > 0 ? [`${tolaundry} used items will be sent to laundry`] : []),
          ...(alreadyToLaundry > 0 ? [`${alreadyToLaundry} items were already sent to laundry at handover`] : []),
          ...(qty_not_used > 0 ? [`${qty_not_used} unused items will go directly to available${alreadyRestocked > 0 ? ` (of which ${alreadyRestocked} already restocked at handover)` : ''}`] : [])
        ]
      }
    })
    
    return NextResponse.json({
      success: true,
      preview,
      return_id: returnId,
      return_number: returnRecord.return_number
    })
    
  } catch (error: any) {
    console.error("Error in GET /api/returns/[id]/preview:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
