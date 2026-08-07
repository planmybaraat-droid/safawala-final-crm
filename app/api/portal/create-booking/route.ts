import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff', requirePermission: 'bookings' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ error: "No franchise assigned to your account" }, { status: 403 })
    }

    const body = await req.json()
    const {
      customer_id,
      booking_type = 'rental',
      is_quote = false,
      event_date,
      event_time,
      delivery_date,
      delivery_time,
      return_date,
      return_time,
      event_type = 'wedding',
      event_participant = 'both',
      venue_address = '',
      groom_name = '',
      groom_whatsapp,
      groom_address = '',
      bride_name = '',
      bride_whatsapp,
      bride_address = '',
      sales_staff_id,
      total_amount = 0,
      subtotal_amount = 0,
      amount_paid = 0,
      discount_amount = 0,
      tax_amount = 0,
      gst_percentage = 0,
      payment_method = 'Cash',
      notes = '',
      items = [],
    } = body

    if (!customer_id) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 })
    }
    // For rental bookings, event_date is required. For sales, delivery_date or no date is fine.
    if (booking_type === 'rental' && !is_quote && !event_date) {
      return NextResponse.json({ error: "Event date is required for rental bookings" }, { status: 400 })
    }

    const supabase = createClient()

    // Generate a unique order number using timestamp + 4-digit random to avoid collisions
    const prefix = is_quote ? 'QUO' : (booking_type === 'sale' ? 'SAL' : 'ORD')
    const ts = Date.now().toString().slice(-8)
    const rand = Math.floor(Math.random() * 9000) + 1000
    let order_number = `${prefix}-${ts}-${rand}`

    // Final safety check — re-roll if this exact number somehow exists
    const { data: existing } = await supabase
      .from('product_orders')
      .select('id')
      .eq('order_number', order_number)
      .limit(1)

    if (existing && existing.length > 0) {
      order_number = `${prefix}-${ts}-${Math.floor(Math.random() * 90000) + 10000}`
    }

    // Only pass sales_closed_by_id if it's a valid UUID — non-UUID strings like "sales-staff-1"
    // will cause a Postgres "invalid input syntax for type uuid" error.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validSalesStaffId = sales_staff_id && UUID_RE.test(String(sales_staff_id)) ? sales_staff_id : null

    const orderData: any = {
      order_number,
      customer_id,
      franchise_id: franchiseId,
      booking_type,
      event_type: booking_type === 'sale' ? null : event_type,
      event_date: event_date || null,
      event_time: event_time || null,
      delivery_date: delivery_date || null,
      delivery_time: delivery_time || null,
      return_date: return_date || null,
      return_time: return_time || null,
      event_participant: booking_type === 'sale' ? null : (event_participant || 'both'),
      venue_address: booking_type === 'sale' ? '' : venue_address,
      groom_name: booking_type === 'sale' ? '' : groom_name,
      groom_whatsapp: booking_type === 'sale' ? null : (groom_whatsapp || null),
      groom_address: booking_type === 'sale' ? '' : (groom_address || ''),
      bride_name: booking_type === 'sale' ? '' : bride_name,
      bride_whatsapp: booking_type === 'sale' ? null : (bride_whatsapp || null),
      bride_address: booking_type === 'sale' ? '' : (bride_address || ''),
      sales_closed_by_id: validSalesStaffId,
      payment_method,
      amount_paid: Number(amount_paid) || 0,
      total_amount: Number(total_amount) || 0,
      subtotal_amount: Number(subtotal_amount) || Number(total_amount) || 0,
      tax_amount: Number(tax_amount) || 0,
      gst_percentage: Number(gst_percentage) || 0,
      discount_amount: Number(discount_amount) || 0,
      // Insert as 'pending' first so the DB trigger does NOT fire yet.
      // We update to 'confirmed' below (after items are inserted) so the
      // trigger fires exactly once with all items available — avoiding the
      // duplicate work_order_number race condition.
      status: is_quote ? 'generated' : 'pending',
      is_quote: Boolean(is_quote),
      notes,
      selection_mode: 'products',
    }

    const { data: order, error: orderError } = await supabase
      .from('product_orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('[Portal Create Booking] Order error:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Insert items
    if (items.length > 0) {
      const itemRows = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name || item.name || '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || Number(item.rental_price) || 0,
        total_price: Number(item.total_price) || (Number(item.unit_price || item.rental_price) * Number(item.quantity)) || 0,
        category: item.category || null,
      }))

      const { error: itemsError } = await supabase
        .from('product_order_items')
        .insert(itemRows)

      if (itemsError) {
        console.error('[Portal Create Booking] Items error (non-fatal):', itemsError)
      }
    }

    // Now update status to 'confirmed' — this triggers the DB trigger exactly once,
    // with all items already inserted, so it can build picking instructions correctly.
    let confirmedOrder = order
    if (!is_quote) {
      const { data: updatedOrder, error: confirmErr } = await supabase
        .from('product_orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .select()
        .single()

      if (confirmErr) {
        // If the trigger fails due to a duplicate work_order, the booking still exists.
        // The status update failing is non-fatal — booking was created, trigger error is cosmetic.
        console.warn('[Portal Create Booking] Status confirm error (non-fatal):', confirmErr.message)
      } else {
        confirmedOrder = updatedOrder
      }
    }

    if (!is_quote) {
      try {
        const { NotificationService } = await import("@/lib/notification-service")
        const { data: customer } = await supabase
          .from("customers")
          .select("name, phone")
          .eq("id", customer_id)
          .eq("franchise_id", franchiseId)
          .single()

        await NotificationService.notifyBookingCreated({
          ...order,
          customer_name: customer?.name || null,
          customer_phone: customer?.phone || null,
          venue: venue_address || null,
          booking_type,
          type: booking_type,
        })
      } catch (notificationError) {
        console.error('[Portal Create Booking] Notification failed:', notificationError)
      }
    }

    return NextResponse.json({ success: true, data: confirmedOrder }, { status: 201 })
  } catch (error) {
    console.error('[Portal Create Booking] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
