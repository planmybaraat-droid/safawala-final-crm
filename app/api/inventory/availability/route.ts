import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/inventory/availability?event_date=YYYY-MM-DD&exclude_order_id=<id>
 *
 * For a given rental event date, works out how much of each product is still
 * free during the 5-day window around that date (event date -2 days to +2 days),
 * by subtracting quantities already reserved by OTHER rental orders whose own
 * 5-day window overlaps this one.
 *
 * This does not touch stock_available (that's a live, date-agnostic counter) —
 * it is a separate, date-aware calculation used only to show availability
 * badges while building a booking.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    const { searchParams } = new URL(request.url)
    const eventDateStr = searchParams.get('event_date')
    const excludeOrderId = searchParams.get('exclude_order_id')

    if (!eventDateStr) {
      return NextResponse.json({ error: 'event_date is required' }, { status: 400 })
    }

    const eventDate = new Date(`${eventDateStr}T00:00:00`)
    if (Number.isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: 'Invalid event_date' }, { status: 400 })
    }

    const toISODate = (d: Date) => d.toISOString().split('T')[0]
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d)
      copy.setDate(copy.getDate() + days)
      return copy
    }

    // This booking's own 5-day window (event date -2 to +2)
    const windowStart = toISODate(addDays(eventDate, -2))
    const windowEnd = toISODate(addDays(eventDate, 2))

    // Any other rental order whose event date is within 4 days of this one has a
    // 5-day window that overlaps ours, so it competes for the same stock.
    const overlapRangeStart = toISODate(addDays(eventDate, -4))
    const overlapRangeEnd = toISODate(addDays(eventDate, 4))

    const supabase = createClient()

    let ordersQuery = supabase
      .from('product_orders')
      .select('id, event_date')
      .eq('booking_type', 'rental')
      .neq('status', 'cancelled')
      .gte('event_date', overlapRangeStart)
      .lte('event_date', overlapRangeEnd)

    if (!isSuperAdmin && franchiseId) {
      ordersQuery = ordersQuery.eq('franchise_id', franchiseId)
    }
    if (excludeOrderId) {
      ordersQuery = ordersQuery.neq('id', excludeOrderId)
    }

    const { data: overlappingOrders, error: ordersError } = await ordersQuery
    if (ordersError) throw ordersError

    const conflictingOrderIds = (overlappingOrders || []).map((o) => o.id)

    const reservedByProduct: Record<string, number> = {}

    if (conflictingOrderIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('product_order_items')
        .select('order_id, product_id, quantity')
        .in('order_id', conflictingOrderIds)

      if (itemsError) throw itemsError

      for (const item of items || []) {
        if (!item.product_id) continue
        reservedByProduct[item.product_id] = (reservedByProduct[item.product_id] || 0) + (Number(item.quantity) || 0)
      }
    }

    let productsQuery = supabase
      .from('products')
      .select('id, name, stock_total')
      .eq('is_active', true)

    if (!isSuperAdmin && franchiseId) {
      productsQuery = productsQuery.eq('franchise_id', franchiseId)
    }

    const { data: products, error: productsError } = await productsQuery
    if (productsError) throw productsError

    const result: Record<string, { stockTotal: number; reserved: number; available: number }> = {}
    for (const product of products || []) {
      const stockTotal = Number(product.stock_total) || 0
      const reserved = reservedByProduct[product.id] || 0
      result[product.id] = {
        stockTotal,
        reserved,
        available: Math.max(0, stockTotal - reserved),
      }
    }

    return NextResponse.json({
      success: true,
      window: { start: windowStart, end: windowEnd },
      products: result,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to compute availability' }, { status: 500 })
  }
}
