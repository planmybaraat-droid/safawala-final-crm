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
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    let query = supabaseServer
      .from('recruitment_candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (franchiseId && !isSuperAdmin) query = query.eq('franchise_id', franchiseId)
    if (status) query = query.eq('status', status)
    if (department) query = query.eq('department', department)

    const { data, error } = await query
    if (error) {
      // Table may not exist yet
      if (error.code === '42P01') return NextResponse.json({ data: [], total: 0 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
    const { name, phone, email, department, position, interview_date, interview_time, interviewer, notes, source } = body

    if (!name || !department) return NextResponse.json({ error: 'name and department required' }, { status: 400 })

    const { data, error } = await supabaseServer
      .from('recruitment_candidates')
      .insert({
        franchise_id: auth.user!.franchise_id,
        name,
        phone: phone || null,
        email: email || null,
        department,
        position: position || null,
        interview_date: interview_date || null,
        interview_time: interview_time || null,
        interviewer: interviewer || null,
        notes: notes || null,
        source: source || 'direct',
        status: interview_date ? 'interview_scheduled' : 'applied',
        applied_by: auth.user!.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'Recruitment table not set up. Run database migration.' }, { status: 422 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const body = await request.json()
    const { id, status, interview_date, interview_time, notes, joining_date } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data, error } = await supabaseServer
      .from('recruitment_candidates')
      .update({
        ...(status && { status }),
        ...(interview_date && { interview_date }),
        ...(interview_time && { interview_time }),
        ...(notes !== undefined && { notes }),
        ...(joining_date && { joining_date }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
