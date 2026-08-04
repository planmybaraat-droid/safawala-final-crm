import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Handle the actual logic
  return handleRestoreRequest(request)
}

// Also accept PATCH for compatibility
export async function PATCH(request: NextRequest) {
  return handleRestoreRequest(request)
}

async function handleRestoreRequest(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin

    const supabase = createClient()
    const body = await request.json()
    const { id, type = 'unified' } = body

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    console.log('[Bookings RESTORE] Simple restore for ID:', id, 'Type:', type)

    // Map type to table name
    const tableMap: Record<string, string> = {
      'package_booking': 'package_bookings',
      'package_bookings': 'package_bookings',
      'product_order': 'product_orders',
      'product_orders': 'product_orders',
      'direct_sales': 'direct_sales_orders',
      'direct_sales_orders': 'direct_sales_orders',
      'unified': 'bookings',
      'bookings': 'bookings'
    }

    const tableName = tableMap[type] || 'package_bookings'

    // Check if booking exists and belongs to user's franchise (must be archived)
    // If the specific table doesn't have it, try other tables
    let existing: { id: string; franchise_id?: string | null } | null = null
    let foundTable = tableName

    // First try the specified table
    const { data: primaryData, error: primaryError } = await supabase
      .from(tableName)
      .select('id, franchise_id')
      .eq('id', id)
      .eq('is_archived', true)
      .maybeSingle()

    if (!primaryError && primaryData) {
      existing = primaryData
    } else {
      // If not found in primary table, try other tables
      const fallbackTables = ['package_bookings', 'product_orders', 'direct_sales_orders', 'bookings'].filter(t => t !== tableName)
      
      for (const tbl of fallbackTables) {
        const { data, error } = await supabase
          .from(tbl)
          .select('id, franchise_id')
          .eq('id', id)
          .eq('is_archived', true)
          .maybeSingle()
        
        if (!error && data) {
          existing = data
          foundTable = tbl
          break
        }
      }
    }

    if (!existing) {
      console.log('[Bookings RESTORE] Booking not found in any table:', id)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Franchise ownership check
    if (!isSuperAdmin && existing.franchise_id && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Try to restore
    const { error: restoreError } = await supabase
      .from(foundTable)
      .update({ is_archived: false })
      .eq('id', id)

    if (restoreError) {
      console.error('[Bookings RESTORE] Restore error:', restoreError)

      // Check if column doesn't exist
      if (restoreError.message?.includes('is_archived') || restoreError.code === '42703') {
        return NextResponse.json({
          error: 'Archive functionality not available',
          message: 'Database needs update. Please contact admin.',
          details: 'Run ADD_ARCHIVE_TO_BOOKINGS.sql migration'
        }, { status: 400 })
      }

      return NextResponse.json({ error: restoreError.message }, { status: 400 })
    }

    console.log('[Bookings RESTORE] Successfully restored booking:', id)
    return NextResponse.json({
      success: true,
      message: 'Booking restored successfully',
      bookingId: id
    })

  } catch (error: any) {
    console.error('[Bookings RESTORE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to restore booking"
    }, { status: 500 })
  }
}