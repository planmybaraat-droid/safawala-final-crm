import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { logAudit } from "@/lib/audit-log"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
    const userIdParam = searchParams.get('user_id')
    const dateParam = searchParams.get('date')
    const monthParam = searchParams.get('month') // YYYY-MM
    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin
    const isAdmin =
      isSuperAdmin ||
      auth.user!.role === 'franchise_admin' ||
      (auth.user!.role as string) === 'hr_staff'

    let query = supabaseServer
      .from('attendance_records')
      .select('*, user:users!attendance_records_user_id_fkey(id,name,email,role,department)')
      .order('date', { ascending: false })
      .limit(limit)

    if (!isAdmin) {
      query = query.eq('user_id', auth.user!.id)
    } else if (userIdParam && userIdParam !== 'all') {
      query = query.eq('user_id', userIdParam)
    }

    if (franchiseId && !isSuperAdmin) {
      query = query.eq('franchise_id', franchiseId)
    }

    if (dateParam) {
      query = query.eq('date', dateParam)
    } else if (monthParam) {
      query = query.gte('date', `${monthParam}-01`).lte('date', `${monthParam}-31`)
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
    const { date, status = 'present', check_in, check_out, notes } = body

    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

    const isAdmin =
      auth.user!.is_super_admin ||
      auth.user!.role === 'franchise_admin' ||
      (auth.user!.role as string) === 'hr_staff'
    // Admin can mark attendance for any user; staff can only mark their own
    const userId = isAdmin && body.user_id ? body.user_id : auth.user!.id
    const franchiseId = auth.user!.franchise_id

    const { data: existing } = await supabaseServer
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabaseServer
        .from('attendance_records')
        .update({
          status,
          check_in_time: check_in ?? null,
          check_out_time: check_out ?? null,
          notes: notes ?? null,
          approved_by: auth.user!.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*, user:users!attendance_records_user_id_fkey(id,name,email,role,department)')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
        module: "hr", action: "attendance.update", resourceType: "attendance_record", resourceId: existing.id,
        metadata: { user_id: userId, date, status },
      })

      return NextResponse.json({ data, updated: true })
    }

    const { data, error } = await supabaseServer
      .from('attendance_records')
      .insert({
        user_id: userId,
        franchise_id: franchiseId,
        date,
        status,
        check_in_time: check_in ?? null,
        check_out_time: check_out ?? null,
        notes: notes ?? null,
        approved_by: auth.user!.id,
      })
      .select('*, user:users!attendance_records_user_id_fkey(id,name,email,role,department)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
      module: "hr", action: "attendance.update", resourceType: "attendance_record", resourceId: data.id,
      metadata: { user_id: userId, date, status },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
