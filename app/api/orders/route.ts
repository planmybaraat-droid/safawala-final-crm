import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// POST /api/orders — create a new product_order + items + lost/damaged items
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = auth.authContext!.user
  const franchiseId = user.franchise_id
  if (!franchiseId) return NextResponse.json({ error: "No franchise assigned" }, { status: 403 })

  try {
    const body = await req.json()
    const { orderData, items, lostDamagedItems } = body

    const supabase = createClient()

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from("product_orders")
      .insert([{ ...orderData, franchise_id: franchiseId }])
      .select()
      .single()

    if (orderError) {
      console.error("[Orders API] Insert error:", orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Insert items
    if (items && items.length > 0) {
      const itemsData = items.map((item: any) => ({ ...item, order_id: order.id }))
      const { error: itemsError } = await supabase.from("product_order_items").insert(itemsData)
      if (itemsError) {
        console.error("[Orders API] Items insert error:", itemsError)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    // Create the warehouse work order (Pick & Pack) for real, confirmed bookings —
    // quotes don't need picking yet. Failure here shouldn't fail the booking itself.
    const CONFIRMED_STATUSES = ["confirmed", "picked_up", "delivered", "in_progress"]
    if (!order.is_quote && CONFIRMED_STATUSES.includes(order.status)) {
      try {
        const { error: woError } = await supabase.rpc("create_work_order_for_booking", {
          p_booking_id: order.id,
          p_booking_source: "product_orders",
          p_franchise_id: order.franchise_id,
          p_order_number: order.order_number,
          p_is_rental: order.booking_type === "rental",
          p_items: (items || []).map((item: any) => ({ product_name: item.product_name, quantity: item.quantity })),
        })
        if (woError) console.error("[Orders API] Work order creation failed (non-fatal):", woError)
      } catch (woErr) {
        console.error("[Orders API] Work order creation threw (non-fatal):", woErr)
      }
    }

    // Insert lost/damaged items
    if (lostDamagedItems && lostDamagedItems.length > 0) {
      const ldData = lostDamagedItems.map((ld: any) => ({ ...ld, order_id: order.id }))
      const { error: ldError } = await supabase.from("order_lost_damaged_items").insert(ldData)
      if (ldError) {
        console.warn("[Orders API] Lost/damaged insert error (table may not exist):", ldError)
      }

      // Update inventory stock for lost/damaged
      for (const ldItem of lostDamagedItems) {
        if (ldItem.product_id) {
          let productQuery = supabase
            .from("products")
            .select("stock_available, stock_total, franchise_id")
            .eq("id", ldItem.product_id)

          if (!user.is_super_admin && franchiseId) {
            productQuery = productQuery.eq("franchise_id", franchiseId)
          }

          const { data: product } = await productQuery.single()
          if (product) {
            await supabase
              .from("products")
              .update({
                stock_available: Math.max(0, (product.stock_available || 0) - ldItem.quantity),
                stock_total: Math.max(0, (product.stock_total || 0) - ldItem.quantity),
                updated_at: new Date().toISOString(),
              })
              .eq("id", ldItem.product_id)
              .eq("franchise_id", product.franchise_id || franchiseId)
          }
        }
      }
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch (err: any) {
    console.error("[Orders API] Unexpected error:", err)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}

// PUT /api/orders — update existing product_order + replace items + lost/damaged items
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = auth.authContext!.user
  const franchiseId = user.franchise_id

  try {
    const body = await req.json()
    const { orderId, orderData, items, lostDamagedItems } = body

    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 })

    const supabase = createClient()

    // First, get existing order column info by fetching one row
    // Build a safe update payload by trying all fields and catching unknown column errors
    // Pick only known-safe columns from orderData
    const KNOWN_COLUMNS = [
      "order_number","invoice_date","customer_id","franchise_id","booking_type","event_type",
      "event_participant","event_date","event_time","delivery_date","delivery_time",
      "return_date","return_time","venue_address","groom_name","groom_whatsapp","groom_address",
      "bride_name","bride_whatsapp","bride_address","payment_method","amount_paid","total_amount",
      "subtotal","subtotal_amount","tax_amount","gst_amount","gst_percentage","discount_amount",
      "discount_type","security_deposit","coupon_code","coupon_discount","sales_closed_by_id",
      "status","pending_amount","notes","is_quote","selection_mode","variant_id",
      "use_custom_pricing","custom_package_price","has_modifications","modifications_details",
      "modification_date","pdf_url","updated_at",
    ]
    const updatePayload: any = {}
    for (const key of KNOWN_COLUMNS) {
      if (key in orderData) updatePayload[key] = orderData[key]
    }
    updatePayload.franchise_id = franchiseId || orderData.franchise_id
    updatePayload.updated_at = new Date().toISOString()

    // Try update — if unknown column error, retry with minimal safe set
    let { error: updateError } = await supabase
      .from("product_orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("franchise_id", franchiseId)

    if (updateError && updateError.message?.includes("column")) {
      // Fallback: minimal safe columns only
      const safePayload: any = {
        order_number: orderData.order_number,
        customer_id: orderData.customer_id,
        franchise_id: franchiseId || orderData.franchise_id,
        status: orderData.status || "confirmed",
        total_amount: orderData.total_amount,
        subtotal: orderData.subtotal,
        amount_paid: orderData.amount_paid,
        pending_amount: orderData.pending_amount,
        security_deposit: orderData.security_deposit,
        discount_amount: orderData.discount_amount,
        gst_amount: orderData.gst_amount || orderData.tax_amount,
        notes: orderData.notes,
        event_date: orderData.event_date,
        delivery_date: orderData.delivery_date,
        return_date: orderData.return_date,
        is_quote: orderData.is_quote,
        pdf_url: null,
        updated_at: new Date().toISOString(),
      }
      const retry = await supabase.from("product_orders").update(safePayload).eq("id", orderId).eq("franchise_id", franchiseId)
      updateError = retry.error
    }

    if (updateError) {
      console.error("[Orders API] Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Replace items
    await supabase.from("product_order_items").delete().eq("order_id", orderId)

    if (items && items.length > 0) {
      const itemsData = items.map((item: any) => ({ ...item, order_id: orderId }))
      const { error: itemsError } = await supabase.from("product_order_items").insert(itemsData)
      if (itemsError) {
        console.error("[Orders API] Items update error:", itemsError)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    // Replace lost/damaged items
    if (lostDamagedItems !== undefined) {
      await supabase.from("order_lost_damaged_items").delete().eq("order_id", orderId)
      if (lostDamagedItems.length > 0) {
        const ldData = lostDamagedItems.map((ld: any) => ({ ...ld, order_id: orderId }))
        await supabase.from("order_lost_damaged_items").insert(ldData)
      }
    }

    // A quote being converted/confirmed here also needs a work order — the
    // RPC is idempotent (no-ops if one already exists for this booking).
    const CONFIRMED_STATUSES = ["confirmed", "picked_up", "delivered", "in_progress"]
    const { data: finalOrder } = await supabase
      .from("product_orders")
      .select("id, order_number, franchise_id, booking_type, status, is_quote")
      .eq("id", orderId)
      .single()

    if (finalOrder && !finalOrder.is_quote && CONFIRMED_STATUSES.includes(finalOrder.status)) {
      try {
        const { error: woError } = await supabase.rpc("create_work_order_for_booking", {
          p_booking_id: finalOrder.id,
          p_booking_source: "product_orders",
          p_franchise_id: finalOrder.franchise_id,
          p_order_number: finalOrder.order_number,
          p_is_rental: finalOrder.booking_type === "rental",
          p_items: (items || []).map((item: any) => ({ product_name: item.product_name, quantity: item.quantity })),
        })
        if (woError) console.error("[Orders API] Work order creation failed (non-fatal):", woError)
      } catch (woErr) {
        console.error("[Orders API] Work order creation threw (non-fatal):", woErr)
      }
    }

    return NextResponse.json({ success: true, orderId })
  } catch (err: any) {
    console.error("[Orders API] Unexpected error:", err)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
