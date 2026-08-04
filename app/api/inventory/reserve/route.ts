import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

/**
 * POST /api/inventory/reserve
 * Adjust product inventory when items are selected in a booking
 * 
 * Operations:
 * - "reserve": Decrease stock_available, increase stock_booked (when items selected)
 * - "release": Increase stock_available, decrease stock_booked (when items removed/unconfirmed)
 * - "confirm": No change (items already tracked in stock_booked)
 * - "return": Increase stock_available, decrease stock_booked (when items returned)
 * 
 * Body: {
 *   operation: 'reserve' | 'release' | 'confirm' | 'return',
 *   items: Array<{ product_id: string, quantity: number }>,
 *   bookingId: string
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const body = await request.json()
    const { operation, items, bookingId } = body

    if (!operation || !Array.isArray(items) || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: operation, items, bookingId' },
        { status: 400 }
      )
    }

    if (!['reserve', 'release', 'confirm', 'return'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation. Must be: reserve, release, confirm, or return' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get product IDs
    const productIds = items.map((item: any) => item.product_id).filter(Boolean)

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid product IDs provided' },
        { status: 400 }
      )
    }

    // Fetch current inventory for all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, stock_available, stock_booked, stock_total')
      .in('id', productIds)

    if (fetchError) {
      console.error('[Inventory API] Error fetching products:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'Products not found' },
        { status: 404 }
      )
    }

    const productsMap = new Map(products.map(p => [p.id, p]))

    // Build updates based on operation
    for (const item of items) {
      const product = productsMap.get(item.product_id)
      if (!product) continue

      const qty = item.quantity || 0
      let newAvailable = product.stock_available || 0
      let newBooked = product.stock_booked || 0

      switch (operation) {
        case 'reserve':
          // Decrease available, increase booked
          if (newAvailable < qty) {
            return NextResponse.json(
              { error: `Insufficient stock for product ${item.product_id}. Available: ${newAvailable}, Requested: ${qty}` },
              { status: 400 }
            )
          }
          newAvailable -= qty
          newBooked += qty
          break

        case 'release':
          // Increase available, decrease booked
          newAvailable += qty
          newBooked = Math.max(0, newBooked - qty)
          break

        case 'confirm':
          // Confirm booked items (just a status change, no inventory change needed)
          // No updates needed
          continue

        case 'return':
          // Increase available when items are returned
          newAvailable += qty
          newBooked = Math.max(0, newBooked - qty)
          break
      }

      // Apply individual updates using .update() instead of upsert
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_available: newAvailable,
          stock_booked: newBooked,
        })
        .eq('id', item.product_id)

      if (updateError) {
        console.error(`[Inventory API] Error updating product ${item.product_id}:`, updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    // Log the operation
    console.log(`[Inventory] ${operation.toUpperCase()} for booking ${bookingId}:`, {
      items: items.map(i => ({ product_id: i.product_id, qty: i.quantity })),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      operation,
      message: `${operation} operation completed for ${items.length} item(s)`,
      itemsUpdated: items.length
    })
  } catch (error) {
    console.error('[Inventory API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}
