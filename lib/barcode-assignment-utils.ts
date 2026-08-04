import { supabase } from "./supabase"

export interface BarcodeAssignment {
  id: string
  booking_id: string
  booking_type: 'package' | 'product'
  barcode_id: string
  product_id: string
  status: 'assigned' | 'delivered' | 'with_customer' | 'returned' | 'completed'
  assigned_at: string
  delivered_at?: string
  returned_at?: string
  completed_at?: string
  assigned_by?: string
  notes?: string
}

/**
 * Auto-assign available barcodes to a booking based on quantity
 * This is used when user manually selects quantity without scanning
 */
export async function autoAssignBarcodes(
  bookingId: string,
  bookingType: 'package' | 'product',
  productId: string,
  quantity: number,
  franchiseId: string,
  userId?: string
): Promise<{ success: boolean; assigned_count: number; error?: string }> {
  try {
    // Get available barcodes for this product (not in use, not damaged, not retired)
    const { data: availableBarcodes, error: fetchError } = await supabase
      .from('product_barcodes')
      .select('id, barcode_number, sequence_number')
      .eq('product_id', productId)
      .eq('franchise_id', franchiseId)
      .eq('status', 'available')
      .is('booking_id', null)
      .order('sequence_number', { ascending: true })
      .limit(quantity)

    if (fetchError) {
      console.error('[Auto Assign Barcodes] Fetch error:', fetchError)
      return { success: false, assigned_count: 0, error: fetchError.message }
    }

    if (!availableBarcodes || availableBarcodes.length === 0) {
      return { 
        success: false, 
        assigned_count: 0, 
        error: 'No available barcodes found for this product' 
      }
    }

    // If we don't have enough barcodes, return partial success info
    const assignCount = Math.min(availableBarcodes.length, quantity)

    // Create assignments
    const assignments = availableBarcodes.slice(0, assignCount).map((barcode: any) => ({
      barcode_id: barcode.id,
      booking_id: bookingId,
      booking_type: bookingType,
      product_id: productId,
      status: 'assigned',
      assigned_by: userId,
    }))

    const { error: insertError } = await supabase
      .from('booking_barcode_assignments')
      .insert(assignments)

    if (insertError) {
      console.error('[Auto Assign Barcodes] Insert error:', insertError)
      return { success: false, assigned_count: 0, error: insertError.message }
    }

    return {
      success: true,
      assigned_count: assignCount,
      error: assignCount < quantity 
        ? `Only ${assignCount} of ${quantity} barcodes available` 
        : undefined
    }

  } catch (error: any) {
    console.error('[Auto Assign Barcodes] Unexpected error:', error)
    return { success: false, assigned_count: 0, error: error.message }
  }
}

/**
 * Get barcode assignments for a booking
 */
export async function getBookingBarcodes(
  bookingId: string,
  bookingType: 'package' | 'product'
): Promise<{ success: boolean; data?: any[]; stats?: any; error?: string }> {
  try {
    // Get assignments with details
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
        product_barcodes (
          barcode_number,
          sequence_number,
          status
        ),
        products (
          id,
          name,
          product_code,
          category,
          image_url
        )
      `)
      .eq('booking_id', bookingId)
      .eq('booking_type', bookingType)
      .order('assigned_at', { ascending: false })

    if (assignError) {
      return { success: false, error: assignError.message }
    }

    // Get stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_booking_barcode_stats', {
        p_booking_id: bookingId,
        p_booking_type: bookingType
      })
      .single()

    return {
      success: true,
      data: assignments || [],
      stats: stats || {
        total_assigned: 0,
        total_delivered: 0,
        total_with_customer: 0,
        total_returned: 0,
        total_completed: 0,
        total_pending: 0
      }
    }

  } catch (error: any) {
    console.error('[Get Booking Barcodes] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unassign barcodes from a booking
 */
export async function unassignBarcodes(
  assignmentIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('booking_barcode_assignments')
      .delete()
      .in('id', assignmentIds)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Update barcode assignment status (e.g., delivered, returned)
 */
export async function updateBarcodeAssignmentStatus(
  assignmentId: string,
  newStatus: 'assigned' | 'delivered' | 'with_customer' | 'returned' | 'completed',
  userId?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      status: newStatus,
      notes: notes || null
    }

    // Add user tracking based on status
    if (newStatus === 'delivered') {
      updateData.delivered_by = userId || null
    } else if (newStatus === 'returned') {
      updateData.returned_by = userId || null
    }

    const { error } = await supabase
      .from('booking_barcode_assignments')
      .update(updateData)
      .eq('id', assignmentId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Bulk update barcode assignment statuses
 */
export async function bulkUpdateBarcodeAssignmentStatus(
  assignmentIds: string[],
  newStatus: 'assigned' | 'delivered' | 'with_customer' | 'returned' | 'completed',
  userId?: string
): Promise<{ success: boolean; updated_count: number; error?: string }> {
  try {
    const updateData: any = { status: newStatus }

    if (newStatus === 'delivered') {
      updateData.delivered_by = userId || null
    } else if (newStatus === 'returned') {
      updateData.returned_by = userId || null
    }

    const { data, error } = await supabase
      .from('booking_barcode_assignments')
      .update(updateData)
      .in('id', assignmentIds)
      .select()

    if (error) {
      return { success: false, updated_count: 0, error: error.message }
    }

    return { success: true, updated_count: data?.length || 0 }

  } catch (error: any) {
    return { success: false, updated_count: 0, error: error.message }
  }
}

/**
 * Check if product has enough available barcodes for quantity
 */
export async function checkBarcodeAvailability(
  productId: string,
  franchiseId: string,
  requiredQuantity: number
): Promise<{ available: number; sufficient: boolean }> {
  try {
    const { count, error } = await supabase
      .from('product_barcodes')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('franchise_id', franchiseId)
      .eq('status', 'available')
      .is('booking_id', null)

    if (error) {
      console.error('[Check Barcode Availability] Error:', error)
      return { available: 0, sufficient: false }
    }

    const available = count || 0
    return {
      available,
      sufficient: available >= requiredQuantity
    }

  } catch (error) {
    console.error('[Check Barcode Availability] Unexpected error:', error)
    return { available: 0, sufficient: false }
  }
}
