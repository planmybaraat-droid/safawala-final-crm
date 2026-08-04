import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

/**
 * POST /api/barcodes/scan
 * Scan a barcode and update its status in a booking context
 * Body: {
 *   barcode: string,
 *   action: 'assign' | 'delivery_out' | 'return_in' | 'complete',
 *   booking_id?: string,
 *   booking_type?: 'package' | 'product',
 *   user_id?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const body = await request.json()
    let {
      barcode,
      action, 
      booking_id, 
      booking_type = 'package',
      user_id,
      notes 
    } = body
    
    if (!barcode) {
      return NextResponse.json(
        { error: 'barcode is required' },
        { status: 400 }
      )
    }
    
    if (!action) {
      return NextResponse.json(
        { error: 'action is required (assign, delivery_out, return_in, complete)' },
        { status: 400 }
      )
    }
    
    const supabase = createClient()
    
    // Get barcode details
    const { data: barcodeRecord, error: barcodeError } = await supabase
      .from('product_barcodes')
      .select(`
        id,
        barcode_number,
        product_id,
        status,
        booking_id,
        franchise_id,
        products (
          id,
          name,
          product_code
        )
      `)
      .eq('barcode_number', barcode)
      .single()
    
    if (barcodeError || !barcodeRecord) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      )
    }
    
    // Handle different scan actions
    let newStatus: string
    let updateFields: any = {}
    
    switch (action) {
      case 'assign':
        if (!booking_id) {
          return NextResponse.json(
            { error: 'booking_id required for assign action' },
            { status: 400 }
          )
        }
        
        // Check if already assigned to this booking
        const { data: existingAssignment } = await supabase
          .from('booking_barcode_assignments')
          .select('id, status')
          .eq('barcode_id', barcodeRecord.id)
          .eq('booking_id', booking_id)
          .single()
        
        if (existingAssignment) {
          return NextResponse.json({
            success: false,
            message: 'Barcode already assigned to this booking',
            barcode,
            current_status: existingAssignment.status
          })
        }
        
        // Create new assignment
        const { data: newAssignment, error: assignError } = await supabase
          .from('booking_barcode_assignments')
          .insert({
            booking_id,
            booking_type,
            barcode_id: barcodeRecord.id,
            product_id: barcodeRecord.product_id,
            status: 'assigned',
            assigned_by: user_id || null,
            franchise_id: barcodeRecord.franchise_id,
            notes
          })
          .select()
          .single()
        
        if (assignError) {
          return NextResponse.json({ error: assignError.message }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Barcode assigned to booking',
          action: 'assigned',
          barcode,
          booking_id,
          product: barcodeRecord.products,
          assignment: newAssignment
        })
      
      case 'delivery_out':
        newStatus = 'delivered'
        updateFields.delivered_by = user_id || null
        break
      
      case 'return_in':
        newStatus = 'returned'
        updateFields.returned_by = user_id || null
        break
      
      case 'complete':
        newStatus = 'completed'
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: assign, delivery_out, return_in, complete' },
          { status: 400 }
        )
    }
    
    // For non-assign actions, update existing assignment
    if (action !== 'assign') {
      if (!booking_id) {
        // If no booking_id provided, use the one from barcode
        booking_id = barcodeRecord.booking_id
      }
      
      if (!booking_id) {
        return NextResponse.json(
          { error: 'Barcode is not assigned to any booking' },
          { status: 400 }
        )
      }
      
      const { data: assignment, error: updateError } = await supabase
        .from('booking_barcode_assignments')
        .update({
          status: newStatus,
          notes: notes || null,
          ...updateFields
        })
        .eq('barcode_id', barcodeRecord.id)
        .eq('booking_id', booking_id)
        .select(`
          id,
          status,
          booking_id,
          booking_type
        `)
        .single()
      
      if (updateError) {
        console.error('[Barcode Scan API] Update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      if (!assignment) {
        return NextResponse.json(
          { error: 'Assignment not found for this barcode and booking' },
          { status: 404 }
        )
      }
      
      // Get booking number for response
      const bookingTable = assignment.booking_type === 'package' ? 'package_bookings' : 'product_orders'
      const bookingNumberField = assignment.booking_type === 'package' ? 'package_number' : 'order_number'
      
      const { data: bookingData } = await supabase
        .from(bookingTable)
        .select(bookingNumberField)
        .eq('id', booking_id)
        .single()
      
      return NextResponse.json({
        success: true,
        message: `Barcode status updated to ${newStatus}`,
        action: newStatus,
        barcode,
        booking_id,
        booking_number: (bookingData as any)?.[bookingNumberField] || null,
        product: barcodeRecord.products,
        new_status: newStatus
      })
    }
    
  } catch (error: any) {
    console.error('[Barcode Scan API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/barcodes/scan?barcode=PROD-6736-001
 * Get barcode details and current booking assignment
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')
    
    if (!barcode) {
      return NextResponse.json(
        { error: 'barcode parameter is required' },
        { status: 400 }
      )
    }
    
    const supabase = createClient()
    
    // Get barcode with current assignment
    const { data: barcodeRecord, error: barcodeError } = await supabase
      .from('product_barcodes')
      .select(`
        id,
        barcode_number,
        sequence_number,
        product_id,
        status,
        is_new,
        booking_id,
        last_used_at,
        products (
          id,
          name,
          product_code,
          category,
          image_url
        )
      `)
      .eq('barcode_number', barcode)
      .single()
    
    if (barcodeError || !barcodeRecord) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      )
    }
    
    // Get current assignment if any
    let assignment = null
    let bookingDetails = null
    
    if (barcodeRecord.booking_id) {
      const { data: assignmentData } = await supabase
        .from('booking_barcode_assignments')
        .select(`
          id,
          booking_id,
          booking_type,
          status,
          assigned_at,
          delivered_at,
          returned_at,
          completed_at
        `)
        .eq('barcode_id', barcodeRecord.id)
        .eq('booking_id', barcodeRecord.booking_id)
        .single()
      
      assignment = assignmentData
      
      if (assignmentData) {
        // Get booking details
        const bookingTable = assignmentData.booking_type === 'package' ? 'package_bookings' : 'product_orders'
        const bookingNumberField = assignmentData.booking_type === 'package' ? 'package_number' : 'order_number'
        
        const { data: booking } = await supabase
          .from(bookingTable)
          .select(`
            id,
            ${bookingNumberField},
            customer_id,
            event_date,
            status,
            customers (
              name,
              phone
            )
          `)
          .eq('id', barcodeRecord.booking_id)
          .single()
        
        bookingDetails = booking
      }
    }
    
    return NextResponse.json({
      success: true,
      barcode: {
        ...barcodeRecord,
        current_assignment: assignment,
        current_booking: bookingDetails
      }
    })
    
  } catch (error: any) {
    console.error('[Barcode Scan API GET] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
