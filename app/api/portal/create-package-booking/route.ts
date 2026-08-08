import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/portal/create-package-booking
 *
 * Server-side package booking creation for the mobile Booking Portal.
 * Mirrors app/api/portal/create-booking/route.ts's structure (auth + RBAC,
 * generated number, two-phase insert to avoid trigger races, items insert,
 * then create_job_for_booking).
 */
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
      coupon_code = null,
      coupon_discount = 0,
      tax_amount = 0,
      gst_percentage = 0,
      security_deposit = 0,
      payment_method = 'Cash',
      notes = '',
      items = [], // { category_id, variant_id, package_id?, variant_name?, quantity, unit_price, total_price, extra_safas? }
    } = body

    if (!customer_id) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 })
    }
    if (!is_quote && !event_date) {
      return NextResponse.json({ error: "Event date is required" }, { status: 400 })
    }
    if (!is_quote && (!items || items.length === 0)) {
      return NextResponse.json({ error: "At least one package is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Generate a unique package number: prefix + timestamp + random suffix
    const prefix = is_quote ? 'QT' : 'PKG'
    const ts = Date.now().toString().slice(-8)
    const rand = Math.floor(Math.random() * 9000) + 1000
    let package_number = `${prefix}-${ts}-${rand}`

    const { data: existing } = await supabase
      .from('package_bookings')
      .select('id')
      .eq('package_number', package_number)
      .limit(1)

    if (existing && existing.length > 0) {
      package_number = `${prefix}-${ts}-${Math.floor(Math.random() * 90000) + 10000}`
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validSalesStaffId = sales_staff_id && UUID_RE.test(String(sales_staff_id)) ? sales_staff_id : null

    const bookingData: any = {
      package_number,
      customer_id,
      franchise_id: franchiseId,
      event_type,
      event_date: event_date || null,
      event_time: event_time || null,
      delivery_date: delivery_date || null,
      delivery_time: delivery_time || null,
      return_date: return_date || null,
      return_time: return_time || null,
      event_participant: event_participant || 'both',
      venue_address,
      groom_name,
      groom_whatsapp: groom_whatsapp || null,
      groom_address: groom_address || '',
      bride_name,
      bride_whatsapp: bride_whatsapp || null,
      bride_address: bride_address || '',
      sales_closed_by_id: validSalesStaffId,
      payment_method,
      amount_paid: Number(amount_paid) || 0,
      total_amount: Number(total_amount) || 0,
      subtotal_amount: Number(subtotal_amount) || Number(total_amount) || 0,
      tax_amount: Number(tax_amount) || 0,
      gst_percentage: Number(gst_percentage) || 0,
      discount_amount: Number(discount_amount) || 0,
      coupon_code: coupon_code || null,
      coupon_discount: Number(coupon_discount) || 0,
      security_deposit: Number(security_deposit) || 0,
      // Insert as 'pending_payment' first, then flip to 'confirmed' after items are
      // in place — same two-phase pattern as create-booking, to avoid any DB
      // trigger racing ahead of package_booking_items being inserted.
      status: is_quote ? 'quote' : 'pending_payment',
      is_quote: Boolean(is_quote),
      notes,
    }

    const { data: booking, error: bookingError } = await supabase
      .from('package_bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.error('[Portal Create Package Booking] Insert error:', bookingError)
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    // Insert package_booking_items
    if (items.length > 0) {
      const itemRows = items.map((item: any) => ({
        booking_id: booking.id,
        category_id: item.category_id || null,
        variant_id: item.variant_id || null,
        package_id: item.package_id || null,
        variant_name: item.variant_name || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || (Number(item.unit_price) * Number(item.quantity)) || 0,
        extra_safas: Number(item.extra_safas) || 0,
      }))

      const { error: itemsError } = await supabase
        .from('package_booking_items')
        .insert(itemRows)

      if (itemsError) {
        console.error('[Portal Create Package Booking] Items error (non-fatal):', itemsError)
      }
    }

    // Flip to confirmed once items exist (mirrors create-booking's two-phase insert)
    let confirmedBooking = booking
    if (!is_quote) {
      const { data: updatedBooking, error: confirmErr } = await supabase
        .from('package_bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
        .select()
        .single()

      if (confirmErr) {
        console.warn('[Portal Create Package Booking] Status confirm error (non-fatal):', confirmErr.message)
      } else {
        confirmedBooking = updatedBooking
      }
    }

    let job: { id: string; job_number: string } | null = null
    if (!is_quote) {
      try {
        const { data: jobId, error: jobErr } = await supabase.rpc('create_job_for_booking', {
          p_booking_id: confirmedBooking.id,
          p_booking_source: 'package_bookings',
          p_franchise_id: franchiseId,
        })
        if (jobErr) {
          console.error('[Portal Create Package Booking] Job creation error (non-fatal):', jobErr.message)
        } else if (jobId) {
          const { data: jobRow } = await supabase
            .from('jobs')
            .select('id, job_number')
            .eq('id', jobId)
            .single()
          job = jobRow || null
        }
      } catch (jobError) {
        console.error('[Portal Create Package Booking] Job creation failed (non-fatal):', jobError)
      }
    }

    return NextResponse.json({ success: true, data: confirmedBooking, job }, { status: 201 })
  } catch (error) {
    console.error('[Portal Create Package Booking] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
