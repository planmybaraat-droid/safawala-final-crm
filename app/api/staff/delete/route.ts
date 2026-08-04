import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/staff/delete
 * Body: { id: string }
 * Stable endpoint to delete a staff member (fallback for environments where DELETE /api/staff/[id] may 404)
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user with franchise_admin role + staff permission
    const auth = await authenticateRequest(request, {
      minRole: 'franchise_admin',
      requirePermission: 'staff'
    })

    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { user } = auth
    const body = await request.json().catch(() => null as any)
    const id = body?.id as string | undefined

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 })
    }

    // Prevent self-deletion
    if (id === user!.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 })
    }

    // Load target user
    const { data: existingUser, error: fetchError } = await supabaseServer
      .from('users')
      .select('id, franchise_id, role, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    if (user!.role !== 'super_admin' && existingUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Cannot delete super admin accounts' }, { status: 403 })
    }

    // Prevent deleting last active franchise admin
    if (existingUser.role === 'franchise_admin' && existingUser.is_active) {
      const { data: admins } = await supabaseServer
        .from('users')
        .select('id')
        .eq('franchise_id', existingUser.franchise_id)
        .eq('role', 'franchise_admin')
        .eq('is_active', true)

      if (admins && admins.length <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last active admin. Assign another admin first.' }, { status: 403 })
      }
    }

    // Franchise isolation (non-super-admins)
    if (user!.role !== 'super_admin' && existingUser.franchise_id !== user!.franchise_id) {
      return NextResponse.json({ error: 'Unauthorized: Can only delete staff in your own franchise' }, { status: 403 })
    }

    // Delete now
    const { error: delError } = await supabaseServer
      .from('users')
      .delete()
      .eq('id', id)

    if (delError) {
      console.error('[Staff Delete] Error:', delError)
      if (delError.code === '23503') {
        return NextResponse.json(
          { error: "This staff member has existing bookings, tasks, or other records linked to their account and can't be permanently deleted. Deactivate them instead to preserve that history, or reassign their records first." },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: delError.message || 'Failed to delete staff member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Staff member deleted successfully' }, { headers: { 'x-route': 'fallback-delete' } })
  } catch (error) {
    console.error('[Staff Delete] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
