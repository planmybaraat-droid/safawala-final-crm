import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Authentication is handled via requireAuth which uses Supabase auth-helpers

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Await params in Next.js 14+
    const params = 'then' in context.params ? await context.params : context.params
    const { id } = params
    
    const auth = await requireAuth(request, 'readonly')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin
    const supabase = createClient()
    const type = request.nextUrl.searchParams.get('type') || 'unified'
    let booking: any = null
    let error: any = null

    if (type === 'product_order') {
      const res = await supabase
        .from('product_orders')
        .select(`*, franchise_id, customer:customers(*)`)
        .eq('id', id)
        .single()
      booking = res.data; error = res.error
    } else if (type === 'package_booking') {
      const res = await supabase
        .from('package_bookings')
        .select(`*, franchise_id, customer:customers(*)`)
        .eq('id', id)
        .single()
      booking = res.data; error = res.error
    } else {
      const res = await supabase
        .from("bookings")
        .select(`
          *,
          franchise_id,
          customer:customers(*),
          items:booking_items(*, product:products(*))
        `)
        .eq("id", id)
        .single()
      booking = res.data; error = res.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Franchise isolation check
    if (!isSuperAdmin && booking?.franchise_id && booking.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin
    const supabase = createClient()
    const body = await request.json()
    
    // Await params in Next.js 14+
    const params = 'then' in context.params ? await context.params : context.params
    
    const type = request.nextUrl.searchParams.get('type') || 'unified'
    let table = 'bookings'
    if (type === 'product_order') table = 'product_orders'
    if (type === 'package_booking') table = 'package_bookings'

    // Check franchise ownership and fetch previous status/amount_paid before update
    const { data: existing, error: fetchErr } = await supabase
      .from(table)
      .select('id, franchise_id, status, amount_paid')
      .eq('id', params.id)
      .single()
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!isSuperAdmin && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: booking, error } = await supabase
      .from(table)
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('franchise_id', existing.franchise_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Trigger WhatsApp notification events asynchronously
    const oldStatus = existing?.status
    const oldAmountPaid = Number(existing?.amount_paid) || 0
    const newStatus = booking?.status
    const newAmountPaid = Number(booking?.amount_paid) || 0
    const finalFranchiseId = booking?.franchise_id || existing?.franchise_id || franchiseId

    if (booking && finalFranchiseId) {
      (async () => {
        try {
          const { onBookingStatusChange, onBookingCancelled, onPaymentReceived } = await import("@/lib/services/whatsapp-triggers")

          // 1. Status changes
          if (newStatus && oldStatus && newStatus !== oldStatus) {
            if (newStatus === "cancelled") {
              await onBookingCancelled({
                bookingId: booking.id,
                franchiseId: finalFranchiseId,
                reason: body.cancellation_reason || "Booking status changed to cancelled",
              })
            } else {
              await onBookingStatusChange({
                bookingId: booking.id,
                newStatus: newStatus,
                franchiseId: finalFranchiseId,
              })
            }
          }

          // 2. Payment changes (amount_paid increased)
          if (newAmountPaid > oldAmountPaid) {
            const increment = newAmountPaid - oldAmountPaid
            await onPaymentReceived({
              bookingId: booking.id,
              amountPaid: increment,
              franchiseId: finalFranchiseId,
            })
          }
        } catch (err) {
          console.error("[WhatsApp Trigger Error in PATCH]:", err)
        }
      })()
    }

    return NextResponse.json({ booking })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    console.log('[Bookings DELETE] Starting delete request...')
    const auth = await requireAuth(request, 'staff')
    console.log('[Bookings DELETE] Auth result:', auth.success)
    if (!auth.success) {
      console.log('[Bookings DELETE] Auth failed:', auth.response)
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin
    console.log('[Bookings DELETE] User:', user.email, 'Franchise:', franchiseId, 'SuperAdmin:', isSuperAdmin)
    const supabase = createClient()
    
    // Await params in Next.js 14+
    const params = 'then' in context.params ? await context.params : context.params
    
    const type = request.nextUrl.searchParams.get('type') || 'unified'
    const id = params.id

    console.log('[Bookings DELETE] Type:', type, 'ID:', id)

    // Probe all possible tables; prefer hinted table first but don't rely on it
    const allTables: Array<'package_bookings' | 'product_orders' | 'direct_sales_orders' | 'bookings'> = [
      'package_bookings', 'product_orders', 'direct_sales_orders', 'bookings'
    ]
    const preferred = (type === 'product_orders' || type === 'product_order') ? 'product_orders'
      : (type === 'package_bookings' || type === 'package_booking') ? 'package_bookings'
      : undefined
    const candidates = preferred ? [preferred, ...allTables.filter(t => t !== preferred)] : allTables

    // Find the first table that contains the record
    let foundTable: typeof candidates[number] | null = null
    let existing: { id: string; franchise_id?: string | null } | null = null
    for (const tbl of candidates) {
      console.log(`[Bookings DELETE] Checking table: ${tbl}`)
      const { data, error } = await supabase.from(tbl).select('id, franchise_id').eq('id', id).maybeSingle()
      console.log(`[Bookings DELETE] ${tbl} result:`, { found: !!data, error: error?.message })
      if (!error && data) {
        foundTable = tbl
        existing = data as any
        console.log(`[Bookings DELETE] Found in ${tbl}:`, existing)
        break
      }
    }

    if (!foundTable || !existing) {
      console.log('[Bookings DELETE] Not found in any candidate table:', candidates)
      return NextResponse.json({ error: 'Booking not found in any table' }, { status: 404 })
    }

    // Franchise ownership check
    if (!isSuperAdmin && existing.franchise_id && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Trigger WhatsApp notification for booking cancellation before deleting records
    const finalFranchiseId = existing.franchise_id || franchiseId
    if (finalFranchiseId) {
      try {
        const { onBookingCancelled } = await import("@/lib/services/whatsapp-triggers")
        // Await to ensure database query inside the trigger finishes before records are deleted
        await onBookingCancelled({
          bookingId: id,
          franchiseId: finalFranchiseId,
          reason: "Booking record deleted from CRM",
        })
      } catch (err) {
        console.error("[WhatsApp Trigger Error in DELETE]:", err)
      }
    }

    // Delete related items first based on actual table
    if (foundTable === 'product_orders') {
      await supabase.from('product_order_items').delete().eq('order_id', id)
    } else if (foundTable === 'package_bookings') {
      // Delete package booking product items (new table)
      await supabase.from('package_booking_product_items').delete().eq('package_booking_id', id)
      // Delete package booking items - support both legacy FK names
      await supabase.from('package_booking_items').delete().or(`package_booking_id.eq.${id},booking_id.eq.${id}`)
    } else if (foundTable === 'bookings') {
      // Unified legacy table support
      await supabase.from('booking_items').delete().eq('booking_id', id)
    } else if (foundTable === 'direct_sales_orders') {
      await supabase.from('direct_sales_items').delete().eq('sale_id', id)
    }

    // Delete the booking itself
    console.log(`[Bookings DELETE] Deleting from ${foundTable}...`)
    const { error } = await supabase.from(foundTable).delete().eq('id', id).eq('franchise_id', existing.franchise_id)
    if (error) {
      console.error('[Bookings DELETE] Delete failed:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('[Bookings DELETE] Successfully deleted')
    return NextResponse.json({ success: true, message: 'Booking deleted successfully' })
  } catch (error: any) {
    console.error('[Bookings DELETE] Error:', error)
    return NextResponse.json({ success: false, error: error.message || "Failed to delete booking" }, { status: 500 })
  }
}
