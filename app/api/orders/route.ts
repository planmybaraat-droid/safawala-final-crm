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

    // Ensure order_number exists and is unique
    if (!orderData.order_number) {
      const prefix = orderData.booking_type === "sale" ? "SAL" : "ORD"
      orderData.order_number = `${prefix}-${Date.now().toString().slice(-7)}`
    }

    const targetStatus = orderData.status || "confirmed"
    const initialStatus = orderData.is_quote ? "generated" : "pending"

    // 1. Create order with initial status 'pending' to prevent trigger blocking
    let { data: order, error: orderError } = await supabase
      .from("product_orders")
      .insert([{
        ...orderData,
        status: initialStatus,
        franchise_id: franchiseId
      }])
      .select()
      .single()

    // 2. Retry if order_number collision
    if (orderError && (orderError.message?.includes("order_number") || orderError.code === "23505")) {
      console.warn("[Orders API] Primary order number collision, generating fallback...")
      const prefix = orderData.booking_type === "sale" ? "SAL" : "ORD"
      const fallbackOrderNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
      
      const retryRes = await supabase
        .from("product_orders")
        .insert([{
          ...orderData,
          order_number: fallbackOrderNumber,
          status: initialStatus,
          franchise_id: franchiseId
        }])
        .select()
        .single()

      if (retryRes.data) {
        order = retryRes.data
        orderError = null
      } else if (retryRes.error) {
        orderError = retryRes.error
      }
    }

    if (orderError || !order) {
      console.error("[Orders API] Final Insert error:", orderError)
      return NextResponse.json({ error: orderError?.message || "Failed to create booking" }, { status: 500 })
    }

    // 3. Insert items
    if (items && items.length > 0) {
      const itemsData = items.map((item: any) => ({ ...item, order_id: order.id }))
      const { error: itemsError } = await supabase.from("product_order_items").insert(itemsData)
      if (itemsError) {
        console.error("[Orders API] Items insert error:", itemsError)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    // 4. Safely update to target confirmed status (trigger errors on work_orders are non-fatal)
    if (initialStatus !== targetStatus) {
      try {
        const { error: updateErr } = await supabase
          .from("product_orders")
          .update({ status: targetStatus, updated_at: new Date().toISOString() })
          .eq("id", order.id)

        if (updateErr) {
          console.warn("[Orders API] Non-fatal status update notice:", updateErr.message)
        } else {
          order.status = targetStatus
        }
      } catch (err) {
        console.warn("[Orders API] Non-fatal status update exception:", err)
      }
    }

    // 5. Create warehouse work order (Pick & Pack) non-fatally
    const CONFIRMED_STATUSES = ["confirmed", "picked_up", "delivered", "in_progress"]
    if (!order.is_quote && CONFIRMED_STATUSES.includes(targetStatus)) {
      try {
        const { error: woError } = await supabase.rpc("create_work_order_for_booking", {
          p_booking_id: order.id,
          p_booking_source: "product_orders",
          p_franchise_id: order.franchise_id,
          p_order_number: order.order_number,
          p_is_rental: order.booking_type === "rental",
          p_items: (items || []).map((item: any) => ({ product_name: item.product_name, quantity: item.quantity })),
        })
        if (woError) console.warn("[Orders API] Work order creation notice (non-fatal):", woError.message)
      } catch (woErr) {
        console.warn("[Orders API] Work order creation exception (non-fatal):", woErr)
      }
    }

    // 6. Insert lost/damaged items
    if (lostDamagedItems && lostDamagedItems.length > 0) {
      const ldData = lostDamagedItems.map((ld: any) => ({ ...ld, order_id: order.id }))
      const { error: ldError } = await supabase.from("order_lost_damaged_items").insert(ldData)
      if (ldError) {
        console.warn("[Orders API] Lost/damaged insert notice (non-fatal):", ldError)
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

    let { error: updateError } = await supabase
      .from("product_orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("franchise_id", franchiseId)

    if (updateError && updateError.message?.includes("column")) {
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
      console.warn("[Orders API] Update notice (non-fatal):", updateError.message)
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
        if (woError) console.warn("[Orders API] Work order creation notice (non-fatal):", woError.message)
      } catch (woErr) {
        console.warn("[Orders API] Work order creation exception (non-fatal):", woErr)
      }
    }

    return NextResponse.json({ success: true, orderId })
  } catch (err: any) {
    console.error("[Orders API] Unexpected error:", err)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
