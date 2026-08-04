import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '200', 10)

    const supabase = createClient()

    let query = supabase
      .from('product_orders')
      .select(`
        id, order_number, status, booking_type, event_type,
        event_date, total_amount, amount_paid, discount_amount,
        payment_method, groom_name, bride_name, venue_address,
        notes, is_quote, created_at, updated_at, franchise_id,
        customers ( id, name, phone, email )
      `)
      .eq('is_quote', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Quotes API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Normalize: flatten customer fields
    const quotes = (data || []).map((q: any) => ({
      ...q,
      quote_number: q.order_number,
      customer_name: q.customers?.name || 'Unknown',
      customer_phone: q.customers?.phone || null,
    }))

    return NextResponse.json({ success: true, data: quotes })
  } catch (error) {
    console.error('[Quotes API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    const body = await request.json()
    const { id, status, ...rest } = body

    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('product_orders')
      .select('id, franchise_id, is_quote')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (!isSuperAdmin && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (status) updates.status = status

    // If converting to booking, flip is_quote flag and regenerate order_number
    if (status === 'converted' || rest.convert_to_booking) {
      updates.is_quote = false
      updates.status = 'confirmed'
      const ts = Date.now().toString().slice(-7)
      updates.order_number = `ORD-${ts}`
    }

    const { data: updated, error: updateErr } = await supabase
      .from('product_orders')
      .update(updates)
      .eq('id', id)
      .eq('franchise_id', existing.franchise_id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[Quotes API] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
