import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const maxDuration = 30
export const revalidate = 0

/**
 * GET /api/bookings/[id]/items?source=product_order|package_booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { id } = params

    const { searchParams } = new URL(request.url)
    const sourceParam = searchParams.get('source') || 'product_order'
    
    console.log(`[Items API] START GET /api/bookings/${id}/items?source=${sourceParam}`)
    
    // Normalize source to handle both singular and plural forms
    const source = sourceParam.replace(/s$/, '') // Remove trailing 's' if present
    console.log(`[Items API] Normalized source: ${sourceParam} -> ${source}`)
    
    const supabase = createClient()
    
    let items: any[] = []
    
    if (source === 'product_order') {
      // Fetch product order items WITHOUT joins (FK doesn't exist yet)
      const { data, error } = await supabase
        .from('product_order_items')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('[Booking Items API] Error fetching product order items:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      // Fetch product details separately if there are items
      if (data && data.length > 0) {
        const productIds = [...new Set(data.map((item: any) => item.product_id).filter(Boolean))]
        
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id')
            .in('id', productIds)
          
          const productsMap = new Map(products?.map((p: any) => [p.id, p]) || [])
          
          items = data.map((item: any) => ({
            ...item,
            product: productsMap.get(item.product_id) || null
          }))
        } else {
          items = data
        }
      }
    } else if (source === 'package_booking') {
      // First try the new dedicated table for product items
      console.log('[Booking Items API] Fetching from package_booking_product_items...')
      let { data: newTableData, error: newTableError } = await supabase
        .from('package_booking_product_items')
        .select('*')
        .eq('package_booking_id', id)
        .order('created_at', { ascending: true })
      
      console.log('[Booking Items API] New table result:', { count: newTableData?.length || 0, error: newTableError?.message })
      
      // If new table has items, use those
      let sourceTable = 'package_booking_product_items'
      let data = newTableData || []
      
      // If new table is empty, check the old table for packages
      if (!newTableData || newTableData.length === 0) {
        console.log('[Booking Items API] No items in product items table, checking old package_booking_items table...')
        const { data: oldData, error: oldError } = await supabase
          .from('package_booking_items')
          .select('*')
          .eq('package_booking_id', id)
          .order('created_at', { ascending: true })
        
        if (oldData && oldData.length > 0) {
          console.log('[Booking Items API] Found items in old table:', oldData.length)
          data = oldData
          sourceTable = 'package_booking_items'
        }
      }
      
      // Fetch related product/package data
      if (data && data.length > 0) {
        console.log(`[Booking Items API] Fetching product/package data for ${data.length} items from ${sourceTable}...`)
        
        // Handle both product_id (new table) and package_id (old table)
        const productIds = [...new Set(data.map((item: any) => item.product_id).filter(Boolean))]
        const packageIds = [...new Set(data.map((item: any) => item.package_id).filter(Boolean))]
        
        console.log(`[Booking Items API] Product IDs to fetch: ${productIds.length}, Package IDs to fetch: ${packageIds.length}`)
        
        // Fetch products with all required fields
        const productsMap = new Map()
        if (productIds.length > 0) {
          const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, barcode, product_code, category, image_url, price, rental_price, stock_available, category_id')
            .in('id', productIds)
          
          if (prodError) {
            console.error('[Booking Items API] Error fetching products:', prodError)
          }
          
          products?.forEach((p: any) => productsMap.set(p.id, p))
          console.log(`[Booking Items API] Fetched ${products?.length || 0} products`)
        }
        
        // Fetch packages if needed
        const packagesMap = new Map()
        if (packageIds.length > 0) {
          const { data: packages, error: pkgError } = await supabase
            .from('package_sets')
            .select('id, name, category_id, image_url, base_price')
            .in('id', packageIds)
          
          if (pkgError) {
            console.error('[Booking Items API] Error fetching packages:', pkgError)
          }
          
          packages?.forEach((p: any) => packagesMap.set(p.id, p))
          console.log(`[Booking Items API] Fetched ${packages?.length || 0} packages`)
        }
        
        // Map the data with product/package structure for consistent display
        items = data.map((item: any) => {
          const product = productsMap.get(item.product_id) || packagesMap.get(item.package_id)
          const itemData: any = {
            ...item,
            id: item.id,
            product_id: item.product_id,
            package_booking_id: item.package_booking_id,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            product: product || null,
          }
          
          // Include optional fields if they exist
          if (item.notes !== undefined) itemData.notes = item.notes
          if (item.created_at !== undefined) itemData.created_at = item.created_at
          if (item.updated_at !== undefined) itemData.updated_at = item.updated_at
          if (item.created_by !== undefined) itemData.created_by = item.created_by
          if (item.updated_by !== undefined) itemData.updated_by = item.updated_by
          
          return itemData
        })
        
        console.log(`[Booking Items API] Mapped ${items.length} items with product data`)
      }
    }
    
    const elapsed = Date.now() - startTime
    console.log(`[Items API] SUCCESS - Returning ${items.length} items (${elapsed}ms)`)
    
    return NextResponse.json(
      {
        success: true,
        items,
        count: items.length,
        timestamp: new Date().toISOString(),
        duration_ms: elapsed
      },
      { status: 200 }
    )
  } catch (error) {
    const elapsed = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Items API] ERROR after ${elapsed}ms:`, errorMsg, error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch booking items',
        details: errorMsg,
        timestamp: new Date().toISOString(),
        duration_ms: elapsed
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings/[id]/items
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

    const { id } = params

    const body = await request.json()
    const { items, source } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      )
    }

    if (!source || !['product_order', 'product_orders', 'package_booking', 'package_bookings'].includes(source)) {
      return NextResponse.json(
        { error: 'Source must be product_order or package_booking' },
        { status: 400 }
      )
    }

    const normalizedSource = source.replace(/s$/, '') // Normalize to singular

    const supabase = createClient()

    if (normalizedSource === 'product_order') {
      // Delete existing items for this order
      const { error: deleteError } = await supabase
        .from('product_order_items')
        .delete()
        .eq('order_id', id)

      if (deleteError) {
        console.error('[Booking Items API] Error deleting old product order items:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Update has_items flag based on whether we have new items (if column exists)
      const hasItemsFlag = items.length > 0
      const { error: updateFlagError } = await supabase
        .from('product_orders')
        .update({ has_items: hasItemsFlag })
        .eq('id', id)

      if (updateFlagError) {
        // Column might not exist yet - log but don't fail
        if (updateFlagError.message?.includes('has_items') || updateFlagError.code === 'PGRST204') {
          console.warn('[Booking Items API] Note: has_items column does not exist yet on product_orders. Run SQL migration to add it.')
        } else {
          console.error('[Booking Items API] Error updating product_orders.has_items:', updateFlagError)
        }
      }

      // Insert new items only if there are any
      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          order_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
        }))

        const { error: insertError } = await supabase
          .from('product_order_items')
          .insert(itemsToInsert)

        if (insertError) {
          console.error('[Booking Items API] Error inserting product order items:', insertError)
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    } else if (normalizedSource === 'package_booking') {
      // Delete existing product items for this booking from the new table
      const { error: deleteError } = await supabase
        .from('package_booking_product_items')
        .delete()
        .eq('package_booking_id', id)

      if (deleteError) {
        console.error('[Booking Items API] Error deleting old package booking product items:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Update has_items flag based on whether we have new items
      const hasItemsFlag = items.length > 0
      const { error: updateFlagError } = await supabase
        .from('package_bookings')
        .update({ has_items: hasItemsFlag })
        .eq('id', id)

      if (updateFlagError) {
        console.error('[Booking Items API] Error updating package_bookings.has_items:', updateFlagError)
      }

      // Insert new product items only if there are any
      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          package_booking_id: id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          notes: item.notes || null,
        }))

        const { error: insertError } = await supabase
          .from('package_booking_product_items')
          .insert(itemsToInsert)

        if (insertError) {
          console.error('[Booking Items API] Error inserting package booking product items:', insertError)
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${items.length} items for ${normalizedSource}`,
      count: items.length
    })
  } catch (error) {
    console.error('[Booking Items API] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to save booking items' },
      { status: 500 }
    )
  }
}
