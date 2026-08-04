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
    const department = searchParams.get('department')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '200', 10)

    const supabase = createClient()

    let query = supabase
      .from('users')
      .select('id, name, email, role, department, franchise_id, is_active, phone, created_at')
      .order('name')
      .limit(limit)

    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    if (department) query = query.eq('department', department)
    if (role) query = query.eq('role', role)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,department.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
