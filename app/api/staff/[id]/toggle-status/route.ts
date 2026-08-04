import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/staff/[id]/toggle-status
 * Toggle a staff member's active status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Toggle Status API] === REQUEST RECEIVED ===')
  console.log('[Toggle Status API] Params:', params)
  console.log('[Toggle Status API] URL:', request.url)
  
  try {
    console.log('[Toggle Status] Starting request for user:', params.id)
    
    // 🔒 SECURITY: Authenticate user with franchise_admin role + staff permission
    const auth = await authenticateRequest(request, {
      minRole: 'franchise_admin',
      requirePermission: 'staff'
    })
    
    if (!auth.authorized) {
      console.error('[Toggle Status] Auth failed')
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    
    const { user } = auth
    console.log('[Toggle Status] Auth successful:', user!.id)
    const id = params.id
    
    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }

    // Get current user and verify franchise access
    const { data: currentUser, error: fetchError } = await supabaseServer
      .from("users")
      .select("is_active, franchise_id")
      .eq("id", id)
      .single()
    
    if (fetchError) {
      console.error("Error fetching staff member:", fetchError)
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 })
    }
    
    // 🔒 FRANCHISE ISOLATION: Non-super-admins can only toggle staff in their franchise
    if (user!.role !== 'super_admin' && currentUser.franchise_id !== user!.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized: Can only toggle staff in your own franchise" },
        { status: 403 }
      )
    }
    
    // Toggle status
    const newStatus = !currentUser.is_active
    
    const { data, error } = await supabaseServer
      .from("users")
      .update({ 
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(`
        *,
        franchise:franchises(name, code)
      `)
      .single()
    
    if (error) {
      console.error("Error toggling staff status:", error)
      return NextResponse.json({ error: "Failed to update staff status" }, { status: 500 })
    }
    
    return NextResponse.json(
      {
        message: `Staff member ${newStatus ? 'activated' : 'deactivated'} successfully`,
        user: data,
      },
      { headers: { 'x-route': 'dynamic' } }
    )
  } catch (error) {
    console.error("Error in staff toggle-status route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}