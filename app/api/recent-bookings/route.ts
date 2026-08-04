import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/recent-bookings
 * Fetch recent bookings for dashboard display
 * Returns last 10 bookings ordered by creation date
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id
    const isSuperAdmin = authContext!.user.role === 'super_admin'
    const supabase = createClient()

    console.log(`[Recent Bookings API] Fetching for franchise: ${franchiseId}, isSuperAdmin: ${isSuperAdmin}`)

    // Build query with franchise filter
    let query = supabase
      .from("bookings")
      .select(`
        id,
        booking_number,
        customer_id,
        status,
        total_amount,
        event_date,
        created_at,
        type,
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // Filter by franchise unless super admin
    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error("[Recent Bookings API] Error:", error)
      return NextResponse.json(
        { error: "Failed to fetch recent bookings", details: error.message },
        { status: 500 }
      )
    }

    console.log(`[Recent Bookings API] Returning ${bookings?.length || 0} bookings`)

    // Add cache headers for 1 minute
    return NextResponse.json(
      { success: true, data: bookings || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
        }
      }
    )
  } catch (error) {
    console.error("[Recent Bookings API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
