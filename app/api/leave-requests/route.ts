import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { logAudit } from "@/lib/audit-log"
import { isHrOrFranchiseAdmin } from "@/lib/hr-authorization"

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

    const resolvedEndDate = end_date || start_date
    const totalDays = Math.max(1, Math.round((new Date(resolvedEndDate).getTime() - new Date(start_date).getTime()) / 86400000) + 1)

    const { data, error } = await supabaseServer
      .from('leave_requests')
      .insert({
        user_id: auth.user!.id,
        franchise_id: auth.user!.franchise_id,
        leave_type,
        start_date,
        end_date: resolvedEndDate,
        total_days: totalDays,
        applied_date: new Date().toISOString().slice(0, 10),
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
      module: "hr", action: "leave.request", resourceType: "leave_request", resourceId: data.id,
      metadata: { leave_type, start_date, end_date: resolvedEndDate, total_days: totalDays },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    if (!isHrOrFranchiseAdmin(auth.user!)) {
      return NextResponse.json({ error: "Forbidden", message: "Only HR staff or a franchise admin can approve or reject leave" }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, admin_notes } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'approved') {
      updates.approved_by = auth.user!.id
      updates.approved_date = new Date().toISOString().slice(0, 10)
    } else if (status === 'rejected') {
      updates.rejection_reason = admin_notes || null
    }

    const { data, error } = await supabaseServer
      .from('leave_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
      module: "hr", action: status === 'approved' ? "leave.approve" : "leave.reject", resourceType: "leave_request", resourceId: id,
      metadata: { status, admin_notes: admin_notes || null },
    })

    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
