import { supabase } from "./supabase"

export interface ProductBarcode {
  id: string
  product_id: string
  franchise_id: string
  barcode_number: string
  sequence_number: number
  status: 'available' | 'damaged' | 'retired' | 'in_use'
  is_new: boolean
  booking_id?: string
  last_used_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Extended fields for booking info
  booking_number?: string
  booking_type?: 'package' | 'product'
  customer_name?: string
  event_date?: string
}

/**
 * Generate barcode number in format: PROD-{product_code}-{sequence}
 * Example: PROD-6736-001, PROD-6736-002, etc.
 */
export function generateBarcodeNumber(productCode: string, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(3, '0')
  return `${productCode}-${paddedSequence}`
}

/**
 * Generate multiple barcodes for a product
 */
export async function generateBarcodesForProduct(
  productId: string,
  productCode: string,
  franchiseId: string,
  quantity: number,
  startSequence: number = 1
): Promise<{ success: boolean; barcodes?: ProductBarcode[]; error?: string }> {
  try {
    const barcodesToInsert = []
    
    for (let i = 0; i < quantity; i++) {
      const sequence = startSequence + i
      const barcodeNumber = generateBarcodeNumber(productCode, sequence)
      
      barcodesToInsert.push({
        product_id: productId,
        franchise_id: franchiseId,
        barcode_number: barcodeNumber,
        sequence_number: sequence,
        status: 'available',
        is_new: true,
      })
    }

    const { data, error } = await supabase
      .from('product_barcodes')
      .insert(barcodesToInsert)
      .select()

    if (error) {
      console.error('Error generating barcodes:', error)
      return { success: false, error: error.message }
    }

    // Note: Stock already set during product creation, no need to update again
    // The product was created with the correct stock_total and stock_available
    // This function only generates barcode entries for tracking

    return { success: true, barcodes: data }
  } catch (err) {
    console.error('Exception generating barcodes:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get all barcodes for a product with booking details
 */
export async function getProductBarcodes(
  productId: string,
  filters?: {
    status?: 'available' | 'in_use' | 'damaged' | 'retired'
    isNew?: boolean
  }
): Promise<{ success: boolean; barcodes?: ProductBarcode[]; error?: string }> {
  try {
    let query = supabase
      .from('product_barcodes')
      .select('*')
      .eq('product_id', productId)
      .order('sequence_number', { ascending: true })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.isNew !== undefined) {
      query = query.eq('is_new', filters.isNew)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching barcodes:', error)
      return { success: false, error: error.message }
    }

    // Fetch booking details for barcodes that are in use
    const barcodesWithBookingInfo = await Promise.all(
      (data || []).map(async (barcode: any) => {
        if (barcode.status === 'in_use' && barcode.booking_id) {
          try {
            // First, try to get from booking_barcode_assignments to determine type
            const { data: assignment } = await supabase
              .from('booking_barcode_assignments')
              .select('booking_type')
              .eq('barcode_id', barcode.id)
              .eq('booking_id', barcode.booking_id)
              .single()

            const bookingType = assignment?.booking_type || 'package'
            
            // Fetch from appropriate table
            if (bookingType === 'package') {
              const { data: booking } = await supabase
                .from('package_bookings')
                .select('package_number, event_date, customer_id, customers(name)')
                .eq('id', barcode.booking_id)
                .single()

              if (booking) {
                return {
                  ...barcode,
                  booking_number: booking.package_number,
                  booking_type: 'package' as const,
                  customer_name: (booking as any).customers?.name,
                  event_date: booking.event_date
                }
              }
            } else {
              const { data: booking } = await supabase
                .from('product_orders')
                .select('order_number, event_date, customer_id, customers(name)')
                .eq('id', barcode.booking_id)
                .single()

              if (booking) {
                return {
                  ...barcode,
                  booking_number: booking.order_number,
                  booking_type: 'product' as const,
                  customer_name: (booking as any).customers?.name,
                  event_date: booking.event_date
                }
              }
            }
          } catch (err) {
            console.error('Error fetching booking details:', err)
          }
        }
        return barcode
      })
    )

    return { success: true, barcodes: barcodesWithBookingInfo }
  } catch (err) {
    console.error('Exception fetching barcodes:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get barcode statistics for a product
 */
export async function getBarcodeStats(productId: string): Promise<{
  total: number
  available: number
  inUse: number
  damaged: number
  retired: number
  new: number
}> {
  try {
    const { data, error } = await supabase
      .from('product_barcodes')
      .select('status, is_new')
      .eq('product_id', productId)

    if (error || !data) {
      return { total: 0, available: 0, inUse: 0, damaged: 0, retired: 0, new: 0 }
    }

    const stats = {
      total: data.length,
      available: data.filter((b: any) => b.status === 'available').length,
      inUse: data.filter((b: any) => b.status === 'in_use').length,
      damaged: data.filter((b: any) => b.status === 'damaged').length,
      retired: data.filter((b: any) => b.status === 'retired').length,
      new: data.filter((b: any) => b.is_new).length,
    }

    return stats
  } catch (err) {
    console.error('Exception getting barcode stats:', err)
    return { total: 0, available: 0, inUse: 0, damaged: 0, retired: 0, new: 0 }
  }
}

/**
 * Update barcode status
 */
export async function updateBarcodeStatus(
  barcodeId: string,
  status: 'available' | 'damaged' | 'retired' | 'in_use',
  bookingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { 
      status,
      is_new: false, // Remove NEW badge when status changes
    }

    if (status === 'in_use') {
      updateData.last_used_at = new Date().toISOString()
      if (bookingId) {
        updateData.booking_id = bookingId
      }
    }

    const { error } = await supabase
      .from('product_barcodes')
      .update(updateData)
      .eq('id', barcodeId)

    if (error) {
      console.error('Error updating barcode status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Exception updating barcode status:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Bulk update barcode status
 */
export async function bulkUpdateBarcodeStatus(
  barcodeIds: string[],
  status: 'available' | 'damaged' | 'retired' | 'in_use'
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status }

    if (status === 'in_use') {
      updateData.last_used_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('product_barcodes')
      .update(updateData)
      .in('id', barcodeIds)

    if (error) {
      console.error('Error bulk updating barcode status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Exception bulk updating barcode status:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get the next sequence number for a product
 */
export async function getNextSequenceNumber(productId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('product_barcodes')
      .select('sequence_number')
      .eq('product_id', productId)
      .order('sequence_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error getting next sequence:', error)
      return 1
    }

    if (!data || data.length === 0) {
      return 1
    }

    return data[0].sequence_number + 1
  } catch (err) {
    console.error('Exception getting next sequence:', err)
    return 1
  }
}

/**
 * Delete barcodes for a product
 */
export async function deleteProductBarcodes(
  productId: string,
  barcodeIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase
      .from('product_barcodes')
      .delete()
      .eq('product_id', productId)

    if (barcodeIds && barcodeIds.length > 0) {
      query = query.in('id', barcodeIds)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting barcodes:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Exception deleting barcodes:', err)
    return { success: false, error: String(err) }
  }
}
