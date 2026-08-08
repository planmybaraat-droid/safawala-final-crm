import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/portal/staff
 *
 * Lightweight, franchise-isolated staff directory for the mobile portal.
 * Unlike /api/staff (which requires the `staff` management permission and
 * franchise_admin+ role, and returns sensitive fields like salary/permissions),
 * this endpoint only exposes id/name/role/department so any authenticated
 * portal user (e.g. booking_staff) can attribute a booking/sale to a
 * colleague without needing staff-management access.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const franchiseId = user.franchise_id
    if (!user.is_super_admin && !franchiseId) {
      return NextResponse.json({ error: "No franchise assigned to your account" }, { status: 403 })
    }

    const supabase = createClient()

    let query = supabase
      .from('users')
      .select('id, name, role, department')
      .eq('is_active', true)
      .order('name')

    if (!user.is_super_admin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Portal Staff] Fetch error:', error)
      return NextResponse.json({ error: "Failed to fetch staff members" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('[Portal Staff] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
