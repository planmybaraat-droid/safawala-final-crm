import { createClient } from "@/lib/supabase/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

/**
 * POST /api/direct-sales
 * 
 * Creates a new direct sale order with items
 * Handles inventory deduction server-side
 * Bypasses client-side RLS issues
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const user = auth.user!

    const supabase = await createClient()
    if (!user.franchise_id) {
      return NextResponse.json(
        { error: 'User not assigned to a franchise' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { sale, items } = body

    if (!sale || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sale and items' },
        { status: 400 }
      )
    }

    console.log('[Direct Sales API] Creating direct sale for user:', user.id)
    console.log('[Direct Sales API] Franchise:', user.franchise_id)
    console.log('[Direct Sales API] Sale number:', sale.sale_number)

    if (sale.franchise_id && !AuthMiddleware.canAccessFranchise(user, sale.franchise_id)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }

    // Insert direct sale order
    const { data: saleData, error: saleError } = await supabase
      .from('direct_sales_orders')
      .insert({
        sale_number: sale.sale_number,
        customer_id: sale.customer_id,
        franchise_id: user.franchise_id,
        sale_date: sale.sale_date,
        delivery_date: sale.delivery_date || null,
        venue_address: sale.venue_address || null,
        groom_name: sale.groom_name || null,
        groom_whatsapp: sale.groom_whatsapp || null,
        groom_address: sale.groom_address || null,
        bride_name: sale.bride_name || null,
        bride_whatsapp: sale.bride_whatsapp || null,
        bride_address: sale.bride_address || null,
        payment_method: sale.payment_method || 'Cash / Offline Payment',
        payment_type: sale.payment_type || 'full',
        subtotal_amount: sale.subtotal_amount || 0,
        discount_amount: sale.discount_amount || 0,
        coupon_code: sale.coupon_code || null,
        coupon_discount: sale.coupon_discount || 0,
        tax_amount: sale.tax_amount || 0,
        total_amount: sale.total_amount,
        amount_paid: sale.amount_paid || 0,
        pending_amount: sale.pending_amount || 0,
        security_deposit: 0, // Always 0 for direct sales
        status: sale.status || 'confirmed',
        notes: sale.notes || null,
        sales_closed_by_id: sale.sales_closed_by_id || null,
      })
      .select()
      .single()

    if (saleError) {
      console.error('[Direct Sales API] Sale insert error:', saleError)
      return NextResponse.json(
        { error: 'Failed to create direct sale', details: saleError.message },
        { status: 500 }
      )
    }

    console.log('[Direct Sales API] ✅ Direct sale created:', saleData.id)

    // Insert direct sale items
    const itemsToInsert = items.map((item: any) => ({
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }))

    const { error: itemsError } = await supabase
      .from('direct_sales_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('[Direct Sales API] Items insert error:', itemsError)
      // Rollback: Delete the sale order
      await supabase.from('direct_sales_orders').delete().eq('id', saleData.id)
      return NextResponse.json(
        { error: 'Failed to create sale items', details: itemsError.message },
        { status: 500 }
      )
    }

    console.log('[Direct Sales API] ✅ Inserted', itemsToInsert.length, 'items')

    // Deduct inventory (server-side for reliability)
    const inventoryUpdates: any[] = []
    for (const item of items) {
      try {
        // Fetch current stock
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('stock_available, name, franchise_id')
          .eq('id', item.product_id)
          .eq('franchise_id', user.franchise_id)
          .single()

        if (fetchError || !product) {
          console.warn(`[Direct Sales API] Could not fetch product ${item.product_id}:`, fetchError)
          continue
        }

        const newStock = Math.max(0, (product.stock_available || 0) - item.quantity)
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_available: newStock })
          .eq('id', item.product_id)
          .eq('franchise_id', user.franchise_id)

        if (updateError) {
          console.warn(`[Direct Sales API] Failed to deduct stock for ${product.name}:`, updateError)
        } else {
          inventoryUpdates.push({
            product_id: item.product_id,
            product_name: product.name,
            quantity_deducted: item.quantity,
            new_stock: newStock
          })
        }
      } catch (inventoryError) {
        console.error('[Direct Sales API] Inventory update error:', inventoryError)
      }
    }

    console.log('[Direct Sales API] ✅ Inventory updates:', inventoryUpdates.length)

    // Create a Job (jobs/job_tasks) for this sale — shared department-task
    // tracking system, wired to all three booking-creation paths. Non-fatal:
    // if the RPC isn't deployed yet or errors, the sale still stands.
    let job: { id: string; job_number: string } | null = null
    try {
      const { data: jobId, error: jobErr } = await supabase.rpc('create_job_for_booking', {
        p_booking_id: saleData.id,
        p_booking_source: 'direct_sales_orders',
        p_franchise_id: user.franchise_id,
      })
      if (jobErr) {
        console.error('[Direct Sales API] Job creation error (non-fatal):', jobErr.message)
      } else if (jobId) {
        const { data: jobRow } = await supabase
          .from('jobs')
          .select('id, job_number')
          .eq('id', jobId)
          .single()
        job = jobRow || null
      }
    } catch (jobError) {
      console.error('[Direct Sales API] Job creation failed (non-fatal):', jobError)
    }

    return NextResponse.json({
      success: true,
      data: {
        sale: saleData,
        items_count: itemsToInsert.length,
        inventory_updates: inventoryUpdates,
        job,
      },
      message: 'Direct sale created successfully'
    })

  } catch (error) {
    console.error('[Direct Sales API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/direct-sales
 * 
 * Fetches direct sales orders for the authenticated user's franchise
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const user = auth.user!

    if (!user.franchise_id) {
      return NextResponse.json(
        { error: 'User not assigned to franchise' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch direct sales for franchise
    const { data: sales, error: salesError } = await supabase
      .from('direct_sales_orders')
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .eq('franchise_id', user.franchise_id)
      .order('created_at', { ascending: false })

    if (salesError) {
      console.error('[Direct Sales API] Fetch error:', salesError)
      return NextResponse.json(
        { error: 'Failed to fetch sales', details: salesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sales,
      count: sales?.length || 0
    })

  } catch (error) {
    console.error('[Direct Sales API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
