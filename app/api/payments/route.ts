import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })
    const user = authResult.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.role === 'super_admin'

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    const supabase = createClient()

    if (bookingId) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, franchise_id")
        .eq("id", bookingId)
        .single()

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      if (!isSuperAdmin && booking.franchise_id !== franchiseId) {
        return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
      }
    }
    let query = supabase
      .from("payments")
      .select("*, booking:bookings(booking_number, customer:customers(name, phone))")
      .order("payment_date", { ascending: false })
      .limit(limit)

    if (!isSuperAdmin) query = query.eq("franchise_id", franchiseId)
    if (bookingId) query = query.eq("booking_id", bookingId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })
    const user = authResult.authContext!.user
    const franchiseId = user.franchise_id

    const body = await request.json()
    const { booking_id, amount, payment_method, payment_date, reference_number, notes, status } = body

    if (!booking_id || !amount) {
      return NextResponse.json({ error: "booking_id and amount are required" }, { status: 400 })
    }

    const supabase = createClient()
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, franchise_id")
      .eq("id", booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (!user.is_super_admin && booking.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("payments")
      .insert([{
        booking_id,
        franchise_id: franchiseId,
        amount: parseFloat(amount),
        payment_method: payment_method ?? 'cash',
        payment_date: payment_date ?? new Date().toISOString().split('T')[0],
        reference_number: reference_number ?? null,
        notes: notes ?? null,
        status: status ?? 'paid',
        recorded_by: user.id,
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update the booking's paid_amount
    const { error: rpcError } = await supabase.rpc('increment_booking_paid_amount', {
      p_booking_id: booking_id,
      p_amount: parseFloat(amount),
    })

    if (rpcError) {
      // Fallback: manual update if RPC doesn't exist
      supabase
        .from("bookings")
        .select("paid_amount")
        .eq("id", booking_id)
        .eq("franchise_id", booking.franchise_id)
        .single()
        .then(({ data: bk }) => {
          if (bk) {
            supabase.from("bookings").update({ paid_amount: (bk.paid_amount ?? 0) + parseFloat(amount) }).eq("id", booking_id).eq("franchise_id", booking.franchise_id)
          }
        })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
