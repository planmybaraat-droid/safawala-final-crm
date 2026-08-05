import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"
import { hasElevatedDepartmentAccess } from "@/lib/hr-authorization"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // User directory is an administrative surface. Never expose it to
    // department users (including Delivery) even when they know the URL —
    // except HR staff (manage employees) and Travels staff (assign
    // stylists to events), who each need it for their own franchise.
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })
    if (!hasElevatedDepartmentAccess(authResult.authContext!.user, ["hr", "travels"])) {
      return NextResponse.json({ error: "Forbidden", message: "This action requires franchise_admin role or higher" }, { status: 403 })
    }

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
