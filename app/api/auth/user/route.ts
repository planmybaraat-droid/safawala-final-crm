import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Supabase client is lazy via supabaseServer

/**
 * Get default permissions based on role
 */
function getDefaultPermissions(role: string): Record<string, boolean> {
  switch (role) {
    case 'super_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: true,
        staff: true,
        integrations: true,
        settings: true,
      };
    
    case 'franchise_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: false,
        staff: true,
        integrations: false,
        settings: true,
      };
    
    case 'staff':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: false,
        vendors: false,
        quotes: true,
        invoices: true,
        laundry: false,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: false,
        reports: false,
        financials: false,
        franchises: false,
        staff: false,
        integrations: false,
        settings: true,
      };
    
    default:
      return {
        dashboard: true,
        bookings: false,
        customers: false,
        inventory: false,
        packages: false,
        vendors: false,
        quotes: false,
        invoices: false,
        laundry: false,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: false,
        reports: false,
        financials: false,
        franchises: false,
        staff: false,
        integrations: false,
        settings: true,
      };
  }
}

/**
 * GET /api/auth/user
 * Get current user info from session cookie
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "readonly" })
    if (!auth.authorized || !auth.user) {
      return NextResponse.json(auth.error || { error: "Not authenticated" }, { status: auth.statusCode || 401 })
    }

    // Fetch fresh user data from database
    const { data: user, error } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role,
        franchise_id,
        is_active,
        permissions,
        created_at,
        updated_at,
        franchises!left (
          id,
          name,
          code,
          city
        )
      `)
      .eq("id", auth.user.id)
      .eq("is_active", true)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      )
    }

    // Franchises is an array, get the first one
  const franchise = Array.isArray(user.franchises) ? user.franchises[0] : user.franchises

    // Ensure permissions - if null or empty, use role defaults
    const permissions = user.permissions && typeof user.permissions === 'object' && Object.keys(user.permissions).length > 0
      ? user.permissions
      : getDefaultPermissions(user.role);

    // Return user with franchise info
    return NextResponse.json({
  id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      franchise_id: user.franchise_id,
      franchise_name: franchise?.name || null,
      franchise_code: franchise?.code || null,
      franchise_city: franchise?.city || null,
      is_active: user.is_active,
      permissions: permissions,
      created_at: user.created_at,
      updated_at: user.updated_at,
      isSuperAdmin: user.role === "super_admin",
    })

  } catch (error: any) {
    console.error("[Auth User API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}
