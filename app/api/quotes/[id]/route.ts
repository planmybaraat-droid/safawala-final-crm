import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { id } = params
    const supabase = createClient()

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    let query = supabase
      .from('product_orders')
      .select(`*, customers ( id, name, phone, email )`)
      .eq('id', id)
    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }
    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { ...data, quote_number: data.order_number, customer_name: data.customers?.name, customer_phone: data.customers?.phone }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const { id } = params
    const body = await request.json()
    const { status, convert_to_booking } = body

    const supabase = createClient()

    const { data: existing, error: fetchErr } = await supabase
      .from('product_orders')
      .select('id, franchise_id')
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

    if (convert_to_booking || status === 'converted') {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
