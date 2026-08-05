import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { logAudit } from "@/lib/audit-log"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const { data, error } = await supabaseServer
      .from('employee_kyc')
      .select('*')
      .eq('user_id', params.id)
      .order('doc_type')

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const body = await request.json()
    const { doc_type, status, url, note } = body

    if (!doc_type) return NextResponse.json({ error: 'doc_type required' }, { status: 400 })

    const isAdmin =
      auth.user!.is_super_admin ||
      auth.user!.role === 'franchise_admin' ||
      (auth.user!.role as string) === 'hr_staff'

    const upsertData: any = {
      user_id: params.id,
      franchise_id: auth.user!.franchise_id,
      doc_type,
      status: status ?? 'uploaded',
      updated_at: new Date().toISOString(),
    }
    if (url !== undefined) upsertData.url = url
    if (note !== undefined) upsertData.note = note
    if (status === 'verified' && isAdmin) {
      upsertData.verified_by = auth.user!.id
      upsertData.verified_at = new Date().toISOString()
    }

    const { data, error } = await supabaseServer
      .from('employee_kyc')
      .upsert(upsertData, { onConflict: 'user_id,doc_type' })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'KYC table not set up. Run database migration.' }, { status: 422 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
      module: "hr", action: "employee.document_upload", resourceType: "employee_kyc", resourceId: data.id,
      metadata: { employee_id: params.id, doc_type, status: upsertData.status },
    })

    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
