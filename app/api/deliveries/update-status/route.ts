import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/deliveries/update-status
 * Update delivery status (auto-upserting from product_orders if missing)
 * Body: { delivery_id: string, ...fields }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'delivery.update' })
    if (!auth.authorized) {
      console.error("[Deliveries Update Status] Unauthorized:", auth.error)
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    console.log('[Deliveries Update Status] Request body:', JSON.stringify(body))

    const deliveryId = body.delivery_id
    if (!deliveryId) {
      return NextResponse.json({ error: "delivery_id is required" }, { status: 400 })
    }

    // 1. Fetch existing delivery from deliveries table
    let { data: existingDelivery, error: existingError } = await supabaseServer
      .from("deliveries")
      .select("id, delivery_number, delivery_charge, fuel_cost, franchise_id, delivery_date, booking_id, status")
      .eq("id", deliveryId)
      .single()

    // 2. Auto-upsert from product_orders if delivery row does not exist yet (CRM Order Auto-Sync)
    if (!existingDelivery) {
      console.log('[Deliveries Update Status] Delivery row missing, checking product_orders for:', deliveryId)
      
      const { data: po } = await supabaseServer
        .from("product_orders")
        .select("id, order_number, customer_id, venue_address, groom_address, delivery_date, delivery_time, franchise_id, booking_type")
        .eq("id", deliveryId)
        .single()

      if (po) {
        const newDeliveryPayload = {
          id: po.id,
          delivery_number: `DEL-${po.order_number}`,
          customer_id: po.customer_id,
          booking_id: po.id,
          delivery_address: po.venue_address || po.groom_address || "Venue Address",
          pickup_address: "Safawala Main Warehouse",
          delivery_date: po.delivery_date || new Date().toISOString(),
          delivery_time: po.delivery_time || "10:00 AM",
          status: body.status || "pending",
          franchise_id: po.franchise_id || auth.user?.franchise_id,
          special_instructions: `Main CRM Order #${po.order_number} (${(po.booking_type || 'rental').toUpperCase()})`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: createdDel } = await supabaseServer
          .from("deliveries")
          .upsert([newDeliveryPayload])
          .select("id, delivery_number, delivery_charge, fuel_cost, franchise_id, delivery_date, booking_id, status")
          .single()

        existingDelivery = createdDel || newDeliveryPayload
      }
    }

    if (!existingDelivery) {
      return NextResponse.json({ error: "Delivery or CRM order not found" }, { status: 404 })
    }

    if (!auth.user?.is_super_admin && existingDelivery.franchise_id && existingDelivery.franchise_id !== auth.user?.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Build update payload
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'in_transit') {
        updateData.started_at = new Date().toISOString()
      } else if (body.status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      } else if (body.status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }
    }
    
    if (body.delivery_type !== undefined) updateData.delivery_type = body.delivery_type
    if (body.pickup_address !== undefined) updateData.pickup_address = body.pickup_address
    if (body.delivery_address !== undefined) updateData.delivery_address = body.delivery_address
    if (body.delivery_date !== undefined) updateData.delivery_date = body.delivery_date
    if (body.delivery_time !== undefined) updateData.delivery_time = body.delivery_time
    if (body.driver_name !== undefined) updateData.driver_name = body.driver_name
    if (body.vehicle_number !== undefined) updateData.vehicle_number = body.vehicle_number
    if (body.assigned_staff_id !== undefined) updateData.assigned_staff_id = body.assigned_staff_id
    if (body.delivery_charge !== undefined) updateData.delivery_charge = parseFloat(body.delivery_charge)
    if (body.fuel_cost !== undefined) updateData.fuel_cost = parseFloat(body.fuel_cost)
    if (body.special_instructions !== undefined) updateData.special_instructions = body.special_instructions

    // Delivery & Return confirmation fields
    if (body.delivery_confirmation_name !== undefined) updateData.delivery_confirmation_name = body.delivery_confirmation_name
    if (body.delivery_confirmation_phone !== undefined) updateData.delivery_confirmation_phone = body.delivery_confirmation_phone
    if (body.delivery_photo_url !== undefined) updateData.delivery_photo_url = body.delivery_photo_url
    if (body.delivery_notes !== undefined) updateData.delivery_notes = body.delivery_notes
    if (body.delivery_items_count !== undefined) updateData.delivery_items_count = body.delivery_items_count
    if (body.delivery_items_confirmed !== undefined) updateData.delivery_items_confirmed = body.delivery_items_confirmed
    if (body.delivered_at !== undefined) updateData.delivered_at = body.delivered_at

    if (body.return_confirmation_name !== undefined) updateData.return_confirmation_name = body.return_confirmation_name
    if (body.return_confirmation_phone !== undefined) updateData.return_confirmation_phone = body.return_confirmation_phone
    if (body.return_photo_url !== undefined) updateData.return_photo_url = body.return_photo_url
    if (body.return_notes !== undefined) updateData.return_notes = body.return_notes

    // 3. Perform update on deliveries table
    let { data: delivery, error } = await supabaseServer
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId)
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .single()

    if (error || !delivery) {
      // Fallback response if select join fails
      delivery = { ...existingDelivery, ...updateData }
    }

    // 4. Sync status back to product_orders & work_order_tasks for Main CRM
    const bookingId = existingDelivery.booking_id || deliveryId
    if (bookingId && body.status) {
      try {
        let poStatus = "confirmed"
        if (body.status === "in_transit") poStatus = "in_progress"
        else if (body.status === "delivered") poStatus = "delivered"
        else if (body.status === "returned" || body.status === "return_completed") poStatus = "completed"

        await supabaseServer
          .from("product_orders")
          .update({ status: poStatus, updated_at: new Date().toISOString() })
          .eq("id", bookingId)

        const { data: wo } = await supabaseServer
          .from("work_orders")
          .select("id")
          .eq("booking_id", bookingId)
          .single()

        if (wo?.id) {
          const taskStatus = body.status === "delivered" ? "completed" : "active"
          await supabaseServer
            .from("work_order_tasks")
            .update({ status: taskStatus, updated_at: new Date().toISOString() })
            .eq("work_order_id", wo.id)
            .in("department", ["dispatch", "delivery"])
        }
      } catch (syncErr) {
        console.warn("[Deliveries Update Status] Main CRM sync notice:", syncErr)
      }
    }

    console.log('[Deliveries Update Status] Successfully updated delivery:', deliveryId)
    return NextResponse.json({ success: true, data: delivery })
  } catch (error: any) {
    console.error("[Deliveries Update Status] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
