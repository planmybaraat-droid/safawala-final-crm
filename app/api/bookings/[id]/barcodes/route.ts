import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

/**
 * GET /api/bookings/[id]/barcodes?type=package|product
 * Get all barcodes assigned to a booking with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const bookingType = searchParams.get('type') || 'package'
    
    const supabase = createClient()
    
    // Get assignments with barcode and product details
    const { data: assignments, error: assignError } = await supabase
      .from('booking_barcode_assignments')
      .select(`
        id,
        barcode_id,
        product_id,
        status,
        assigned_at,
        delivered_at,
        returned_at,
        completed_at,
        notes,
        assigned_by,
        product_barcodes!inner (
          barcode_number,
          sequence_number,
          status
        ),
        products!inner (
          id,
          name,
          product_code,
          category,
          image_url
        ),
        assigned_user:users!booking_barcode_assignments_assigned_by_fkey (
          id,
          name
        )
      `)
      .eq('booking_id', id)
      .eq('booking_type', bookingType)
      .order('assigned_at', { ascending: false })
    
    if (assignError) {
      console.error('[Booking Barcodes API] Error:', assignError)
      return NextResponse.json({ error: assignError.message }, { status: 500 })
    }
    
    // Get stats using the helper function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_booking_barcode_stats', {
        p_booking_id: id,
        p_booking_type: bookingType
      })
      .single()
    
    if (statsError) {
      console.error('[Booking Barcodes API] Stats error:', statsError)
    }
    
    // Format the response
    const formattedAssignments = (assignments || []).map((item: any) => ({
      id: item.id,
      barcode_id: item.barcode_id,
      barcode_number: item.product_barcodes?.barcode_number,
      sequence_number: item.product_barcodes?.sequence_number,
      barcode_status: item.product_barcodes?.status,
      product_id: item.product_id,
      product_name: item.products?.name,
      product_code: item.products?.product_code,
      product_category: item.products?.category,
      product_image: item.products?.image_url,
      status: item.status,
      assigned_at: item.assigned_at,
      delivered_at: item.delivered_at,
      returned_at: item.returned_at,
      completed_at: item.completed_at,
      notes: item.notes,
      assigned_by_name: item.assigned_user?.name || null,
    }))
    
    return NextResponse.json({
      success: true,
      booking_id: id,
      booking_type: bookingType,
      stats: stats || {
        total_assigned: 0,
        total_delivered: 0,
        total_with_customer: 0,
        total_returned: 0,
        total_completed: 0,
        total_pending: 0
      },
      barcodes: formattedAssignments
    })
    
  } catch (error: any) {
    console.error('[Booking Barcodes API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings/[id]/barcodes
 * Assign barcodes to a booking
 * Body: { barcodes: string[], product_id: string, booking_type: 'package' | 'product', user_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { id: bookingId } = params
    const body = await request.json()
    const { barcodes, product_id, booking_type = 'package', user_id, franchise_id } = body
    
    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return NextResponse.json(
        { error: 'barcodes array is required' },
        { status: 400 }
      )
    }
    
    if (!product_id) {
      return NextResponse.json(
        { error: 'product_id is required' },
        { status: 400 }
      )
    }
    
    if (!franchise_id) {
      return NextResponse.json(
        { error: 'franchise_id is required' },
        { status: 400 }
      )
    }
    
    const supabase = createClient()
    
    // Get barcode IDs from barcode numbers
    const { data: barcodeRecords, error: barcodeError } = await supabase
      .from('product_barcodes')
      .select('id, barcode_number, status, booking_id')
      .in('barcode_number', barcodes)
      .eq('product_id', product_id)
      .eq('franchise_id', franchise_id)
    
    if (barcodeError) {
      console.error('[Assign Barcodes API] Error fetching barcodes:', barcodeError)
      return NextResponse.json({ error: barcodeError.message }, { status: 500 })
    }
    
    if (!barcodeRecords || barcodeRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid barcodes found' },
        { status: 404 }
      )
    }
    
    // Check if any barcodes are already in use
    const unavailableBarcodes = barcodeRecords.filter(
      (b: any) => b.status !== 'available' || (b.booking_id && b.booking_id !== bookingId)
    )
    
    if (unavailableBarcodes.length > 0) {
      return NextResponse.json(
        {
          error: 'Some barcodes are not available',
          unavailable: unavailableBarcodes.map((b: any) => b.barcode_number)
        },
        { status: 400 }
      )
    }
    
    // Create assignments
    const assignments = barcodeRecords.map((barcode: any) => ({
      booking_id: bookingId,
      booking_type,
      barcode_id: barcode.id,
      product_id,
      status: 'assigned',
      assigned_by: user_id || null,
      franchise_id
    }))
    
    const { data: assignmentData, error: assignError } = await supabase
      .from('booking_barcode_assignments')
      .insert(assignments)
      .select()
    
    if (assignError) {
      console.error('[Assign Barcodes API] Error creating assignments:', assignError)
      return NextResponse.json({ error: assignError.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${barcodeRecords.length} barcode(s)`,
      assigned_count: barcodeRecords.length,
      assignments: assignmentData
    })
    
  } catch (error: any) {
    console.error('[Assign Barcodes API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bookings/[id]/barcodes
 * Unassign barcodes from a booking
 * Body: { assignment_ids: string[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { id: bookingId } = params
    const body = await request.json()
    const { assignment_ids } = body
    
    if (!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'assignment_ids array is required' },
        { status: 400 }
      )
    }
    
    const supabase = createClient()
    
    // Delete assignments (trigger will auto-update barcode status)
    const { error: deleteError } = await supabase
      .from('booking_barcode_assignments')
      .delete()
      .in('id', assignment_ids)
      .eq('booking_id', bookingId)
    
    if (deleteError) {
      console.error('[Unassign Barcodes API] Error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully unassigned ${assignment_ids.length} barcode(s)`,
      unassigned_count: assignment_ids.length
    })
    
  } catch (error: any) {
    console.error('[Unassign Barcodes API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
