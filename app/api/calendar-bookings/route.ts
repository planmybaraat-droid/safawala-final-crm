import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/calendar-bookings
 * Fetch bookings for calendar display
 * Returns bookings with event dates and delivery dates
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

    console.log(`[Calendar Bookings API] Fetching for franchise: ${franchiseId}, isSuperAdmin: ${isSuperAdmin}`)

    // Get optional date range from query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

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
        delivery_date,
        pickup_date,
        created_at,
        type,
        customers (
          id,
          name,
          phone
        )
      `)
      .order('event_date', { ascending: true })

    // Filter by franchise unless super admin
    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    // Apply date range filters if provided
    if (startDate) {
      query = query.gte('event_date', startDate)
    }
    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    // Limit to reasonable range (3 months of bookings max)
    if (!startDate && !endDate) {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      query = query.gte('event_date', threeMonthsAgo.toISOString())
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error("[Calendar Bookings API] Error:", error)
      return NextResponse.json(
        { error: "Failed to fetch calendar bookings", details: error.message },
        { status: 500 }
      )
    }

    console.log(`[Calendar Bookings API] Returning ${bookings?.length || 0} bookings`)

    // Add cache headers for 2 minutes
    return NextResponse.json(
      { success: true, data: bookings || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60'
        }
      }
    )
  } catch (error) {
    console.error("[Calendar Bookings API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
