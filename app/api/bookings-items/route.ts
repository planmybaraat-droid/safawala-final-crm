import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const maxDuration = 30
export const revalidate = 0

/**
 * GET /api/bookings-items?id=UUID&source=product_order|package_booking
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sourceParam = searchParams.get('source') || 'product_order'
    
    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
    }
    
    console.log(`[Items API] START GET /api/bookings-items?id=${id}&source=${sourceParam}`)
    
    // Normalize source to handle both singular and plural forms
    const source = sourceParam.replace(/s$/, '') // Remove trailing 's' if present
    console.log(`[Items API] Normalized source: ${sourceParam} -> ${source}`)
    
    const supabase = createClient()
    
    let items: any[] = []
    
    if (source === 'direct_sale') {
      console.log(`[Items API] Direct Sales: Checking rows for sale_id=${id}`)
      // Lightweight count to aid diagnostics (subject to RLS)
      try {
        const { count: dsiCount } = await supabase
          .from('direct_sales_items')
          .select('id', { count: 'exact', head: true })
          .eq('sale_id', id)
        console.log(`[Items API] direct_sales_items count (RLS-scoped): ${dsiCount ?? 'unknown'}`)
      } catch (e: any) {
        console.warn('[Items API] Unable to count direct_sales_items (likely RLS/head not supported):', e?.message)
      }
      
      // First try a joined select to get product details inline
      let { data: joined, error: joinError } = await supabase
        .from('direct_sales_items')
        .select(`
          id, sale_id, product_id, quantity, unit_price, total_price, created_at,
          product:products(id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id)
        `)
        .eq('sale_id', id)
        .order('created_at', { ascending: true })

      if (!joinError && joined) {
        console.log(`[Items API] Joined fetch returned ${joined.length} item(s) for sale ${id}`)
        items = joined
      } else {
        console.warn('[Items API] Join failed or not supported, falling back to two-step fetch:', joinError?.message)
        // Fallback: fetch items then hydrate with product info
        const { data, error } = await supabase
          .from('direct_sales_items')
          .select('*')
          .eq('sale_id', id)
          .order('created_at', { ascending: true })
        
        if (error) {
          console.error('[Items API] Error fetching direct sales items:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        if (data && data.length > 0) {
          console.log(`[Items API] Fallback base items: ${data.length}`)
          const productIds = [...new Set(data.map((item: any) => item.product_id).filter(Boolean))]
          console.log(`[Items API] Unique product IDs to hydrate: ${productIds.length}`)
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from('products')
              .select('id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id')
              .in('id', productIds)
            console.log(`[Items API] Products fetched for hydration: ${products?.length ?? 0}`)
            const productsMap = new Map(products?.map((p: any) => [p.id, p]) || [])
            items = data.map((item: any) => ({
              ...item,
              product: productsMap.get(item.product_id) || null
            }))
          } else {
            items = data
          }
        } else {
          console.log('[Items API] Fallback base items: 0')
        }
      }
    } else if (source === 'product_order') {
      console.log(`[Items API] Product Order Items: Checking rows for order_id=${id}`)
      // Lightweight count to aid diagnostics (subject to RLS)
      try {
        const { count: poiCount } = await supabase
          .from('product_order_items')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', id)
        console.log(`[Items API] product_order_items count (RLS-scoped): ${poiCount ?? 'unknown'}`)
      } catch (e: any) {
        console.warn('[Items API] Unable to count product_order_items (likely RLS/head not supported):', e?.message)
      }
      // First try a joined select to get product details inline (handles most cases)
      let { data: joined, error: joinError } = await supabase
        .from('product_order_items')
        .select(`
          id, order_id, product_id, quantity, unit_price, total_price, security_deposit, created_at,
          product:products(id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id)
        `)
        .eq('order_id', id)
        .order('created_at', { ascending: true })

      if (!joinError && joined) {
        console.log(`[Items API] Joined fetch returned ${joined.length} item(s) for order ${id}`)
        items = joined
      } else {
        console.warn('[Items API] Join failed or not supported, falling back to two-step fetch:', joinError?.message)
        // Fallback: fetch items then hydrate with product info
        const { data, error } = await supabase
          .from('product_order_items')
          .select('*')
          .eq('order_id', id)
          .order('created_at', { ascending: true })
        
        if (error) {
          console.error('[Booking Items API] Error fetching product order items:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        if (data && data.length > 0) {
          console.log(`[Items API] Fallback base items: ${data.length}`)
          const productIds = [...new Set(data.map((item: any) => item.product_id).filter(Boolean))]
          console.log(`[Items API] Unique product IDs to hydrate: ${productIds.length}`)
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from('products')
              .select('id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id')
              .in('id', productIds)
            console.log(`[Items API] Products fetched for hydration: ${products?.length ?? 0}`)
            const productsMap = new Map(products?.map((p: any) => [p.id, p]) || [])
            items = data.map((item: any) => ({
              ...item,
              product: productsMap.get(item.product_id) || null
            }))
          } else {
            items = data
          }
        } else {
          console.log('[Items API] Fallback base items: 0')
        }
      }
    } else if (source === 'package_booking') {
      // Try new table first
      let { data: newTableData, error: newTableError } = await supabase
        .from('package_booking_product_items')
        .select('*')
        .eq('package_booking_id', id)
        .order('created_at', { ascending: true })
      
      if (newTableError) {
        console.warn('[Items API] New table error, trying old table:', newTableError.message)
        
        // Fall back to old table
        const { data: oldTableData, error: oldTableError } = await supabase
          .from('package_booking_items')
          .select('*')
          .eq('package_booking_id', id)
          .order('created_at', { ascending: true })
        
        if (oldTableError) {
          console.error('[Items API] Both table queries failed:', oldTableError)
          return NextResponse.json({ error: oldTableError.message }, { status: 500 })
        }
        
        newTableData = oldTableData
      }
      
      // Fetch product details
      if (newTableData && newTableData.length > 0) {
        const productIds = [...new Set(newTableData.map((item: any) => item.product_id).filter(Boolean))]
        
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id')
            .in('id', productIds)
          
          const productsMap = new Map(products?.map((p: any) => [p.id, p]) || [])
          items = newTableData.map((item: any) => ({
            ...item,
            product: productsMap.get(item.product_id) || null
          }))
        } else {
          items = newTableData
        }
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[Items API] SUCCESS: Returned ${items.length} items in ${duration}ms`)
    
    return NextResponse.json({ items })
  } catch (error) {
    console.error('[Items API] Exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings-items
 * Save/update booking items
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const body = await request.json()
    const { bookingId, items, source } = body
    
    if (!bookingId || !items || !source) {
      return NextResponse.json({ error: 'bookingId, items, and source are required' }, { status: 400 })
    }
    
    console.log(`[Items API] POST: Saving ${items.length} items for booking ${bookingId} (source: ${source})`)
    
    const supabase = createClient()
    
    // Normalize source
    const normalizedSource = source.replace(/s$/, '')
    
    // Determine the correct table based on source
    let tableName: string
    let foreignKeyField: string
    
    if (normalizedSource === 'product_order') {
      tableName = 'product_order_items'
      foreignKeyField = 'order_id'
    } else if (normalizedSource === 'package_booking') {
      // Try the new table first, fall back to old one
      tableName = 'package_booking_product_items'
      foreignKeyField = 'package_booking_id'
    } else if (normalizedSource === 'direct_sale') {
      tableName = 'direct_sales_items'
      foreignKeyField = 'sale_id'
    } else {
      return NextResponse.json({ error: `Invalid source: ${source}` }, { status: 400 })
    }
    
    // Delete existing items for this booking
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq(foreignKeyField, bookingId)
    
    if (deleteError) {
      console.error(`[Items API] Error deleting existing items from ${tableName}:`, deleteError)
      // If table doesn't exist and it's package_booking, try the old table
      if (normalizedSource === 'package_booking' && deleteError.code === '42P01') {
        tableName = 'package_booking_items'
        const { error: oldDeleteError } = await supabase
          .from(tableName)
          .delete()
          .eq(foreignKeyField, bookingId)
        
        if (oldDeleteError) {
          console.error(`[Items API] Error deleting from old table ${tableName}:`, oldDeleteError)
          return NextResponse.json({ error: oldDeleteError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
    }
    
    // Insert new items if any
    if (items.length > 0) {
      const insertData = items.map((item: any) => {
        const baseItem = {
          [foreignKeyField]: bookingId,
          product_id: item.product_id || null,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
        }
        
        // Add source-specific fields
        if (normalizedSource === 'product_order') {
          return {
            ...baseItem,
            security_deposit: item.security_deposit || 0,
          }
        }
        
        // For package_bookings, include variant_id and package_id
        if (normalizedSource === 'package_booking') {
          return {
            ...baseItem,
            variant_id: item.variant_id || null,
            package_id: item.package_id || null,
          }
        }
        
        // For direct_sales, just use base fields
        return baseItem
      })
      
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(insertData)
      
      if (insertError) {
        console.error(`[Items API] Error inserting items into ${tableName}:`, insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
    
    // Update the has_items flag on the parent booking
    const parentTable = normalizedSource === 'product_order' ? 'product_orders' : 
                        normalizedSource === 'package_booking' ? 'package_bookings' : 'direct_sales'
    const { error: updateError } = await supabase
      .from(parentTable)
      .update({ has_items: items.length > 0 })
      .eq('id', bookingId)
    
    if (updateError) {
      console.warn(`[Items API] Failed to update has_items flag on ${parentTable}:`, updateError.message)
      // Don't fail the request if this update fails
    }
    
    console.log(`[Items API] Successfully saved ${items.length} items for booking ${bookingId}`)
    
    return NextResponse.json({ 
      success: true,
      itemsCount: items.length,
      message: `Successfully saved ${items.length} items`
    })
  } catch (error) {
    console.error('[Items API] Exception in POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
