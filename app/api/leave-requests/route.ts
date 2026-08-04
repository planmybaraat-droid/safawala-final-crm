import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const userId = searchParams.get('user_id') || auth.user!.id
    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    let query = supabaseServer
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!isSuperAdmin && auth.user!.role !== 'franchise_admin') {
      query = query.eq('user_id', auth.user!.id)
    } else if (userId && userId !== 'all') {
      query = query.eq('user_id', userId)
    }

    if (franchiseId && !isSuperAdmin) {
      query = query.eq('franchise_id', franchiseId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [], total: data?.length ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const body = await request.json()
    const { leave_type, start_date, end_date, reason } = body

    if (!leave_type || !start_date) {
      return NextResponse.json({ error: 'leave_type and start_date are required' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('leave_requests')
      .insert({
        user_id: auth.user!.id,
        franchise_id: auth.user!.franchise_id,
        leave_type,
        start_date,
        end_date: end_date || start_date,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const body = await request.json()
    const { id, status, admin_notes } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const { data, error } = await supabaseServer
      .from('leave_requests')
      .update({ status, admin_notes: admin_notes || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
