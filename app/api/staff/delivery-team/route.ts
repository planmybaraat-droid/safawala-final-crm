import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/delivery-team
 * Fetch staff members who can be assigned to deliveries (franchise-isolated)
 * This is a simplified endpoint that doesn't require staff permission
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user (any role with deliveries permission)
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const { user } = auth
    
    const supabase = createClient()
    
    // Fetch staff members from users table
    let query = supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role,
        phone,
        is_active,
        franchise_id,
        franchise:franchises(name, code)
      `)
      .in("role", ["staff", "franchise_admin", "super_admin"])
      .eq("is_active", true)
      .order("name")
    
    // 🔒 FRANCHISE ISOLATION: Super admin sees all, others see only their franchise
    if (!user!.is_super_admin && user!.franchise_id) {
      query = query.eq("franchise_id", user!.franchise_id)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("[Delivery Team API] Error fetching staff:", error)
      return NextResponse.json({ error: "Failed to fetch staff members" }, { status: 500 })
    }
    
    console.log(`[Delivery Team API] Found ${data?.length || 0} staff members`)
    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("[Delivery Team API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
