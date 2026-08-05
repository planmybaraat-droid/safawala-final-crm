import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, canAccessFranchise } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = 'nodejs'

/**
 * POST /api/deliveries/[id]/mark-delivered
 * Mark delivery as delivered with confirmation details (client info, photo, notes)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate and check permissions
    const auth = await authenticateRequest(request, { minRole: "staff", requirePermission: "delivery.update" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const user = auth.user!

    const supabase = createClient()
    const deliveryId = params.id
    const body = await request.json()
    
    const { client_name, client_phone, photo_url, notes, items_count } = body
    
    // Validate required fields
    if (!client_name || !client_phone) {
      return NextResponse.json(
        { error: "Client name and phone are required" },
        { status: 400 }
      )
    }
    
    // Get current delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single()
    
    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      )
    }

    // Check franchise access
    if (!canAccessFranchise(user as any, delivery.franchise_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    // Validate current status allows marking as delivered
    if (delivery.status !== "in_transit") {
      return NextResponse.json(
        { error: `Cannot mark as delivered from status: ${delivery.status}. Must be 'in_transit'.` },
        { status: 400 }
      )
    }
    
    // Prepare update data
    const updateData: any = {
      status: "delivered",
      delivered_at: new Date().toISOString(),
      delivery_confirmation_name: client_name,
      delivery_confirmation_phone: client_phone,
      delivery_photo_url: photo_url || null,
      delivery_notes: notes || null,
      delivery_items_count: items_count || null,
      updated_at: new Date().toISOString()
    }
    
    // Update delivery
    const { data: updatedDelivery, error: updateError } = await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId)
      .eq("franchise_id", delivery.franchise_id)
      .select()
      .single()
    
    if (updateError) {
      console.error("Error updating delivery:", updateError)
      return NextResponse.json(
        { error: "Failed to update delivery", details: updateError.message },
        { status: 500 }
      )
    }
    
    // Update booking status in source table (product_orders or package_bookings)
    if (delivery.booking_id) {
      const bookingTable = delivery.booking_source === "product_order" 
        ? "product_orders" 
        : "package_bookings"
      
      // For SALES: delivered = order_complete (final status)
      // For RENTAL: delivered = intermediate status (will become 'returned' later)
      const newBookingStatus = delivery.booking_type === "sale" 
        ? "order_complete" 
        : "delivered"
      
      await supabase
        .from(bookingTable)
        .update({ status: newBookingStatus })
        .eq("id", delivery.booking_id)
        .eq("franchise_id", delivery.franchise_id)
      
      console.log(`✅ Updated ${bookingTable} status to '${newBookingStatus}' for booking ${delivery.booking_id}`)
    }
    
    // If rental, ensure return is created
    let returnCreated = false
    let returnId = null
    if (delivery.booking_type === "rental") {
      const { data: existingReturn } = await supabase
        .from("returns")
        .select("id")
        .eq("delivery_id", deliveryId)
        .maybeSingle()

      if (!existingReturn) {
        const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        const { data: newReturn, error: returnErr } = await supabase
          .from("returns")
          .insert({
            return_number: returnNumber,
            delivery_id: deliveryId,
            booking_id: delivery.booking_id,
            booking_source: delivery.booking_source,
            customer_id: delivery.customer_id,
            franchise_id: delivery.franchise_id,
            status: "pending",
            return_date: new Date().toISOString().slice(0, 10),
            notes: `Auto-created on mark delivered on ${new Date().toLocaleString()}`
          })
          .select("id")
          .single()

        if (!returnErr && newReturn) {
          returnCreated = true
          returnId = newReturn.id
        }
      } else {
        returnCreated = true
        returnId = existingReturn.id
      }
    }
    
    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
      returnCreated,
      returnId,
      message: returnCreated 
        ? "Delivery marked as delivered. Return automatically created."
        : "Delivery marked as delivered."
    })
    
  } catch (error: any) {
    console.error("Error in mark-delivered API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
