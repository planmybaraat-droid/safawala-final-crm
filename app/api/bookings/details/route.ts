import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const supabase = createClient()
    const id = request.nextUrl.searchParams.get('id')
    const type = request.nextUrl.searchParams.get('type') || 'unified'
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

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
        .from('bookings')
        .select(`*, franchise_id, customer:customers(*), items:booking_items(*, product:products(*))`)
        .eq('id', id)
        .single()
      booking = res.data; error = res.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (booking.franchise_id && !AuthMiddleware.canAccessFranchise(user, booking.franchise_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}
