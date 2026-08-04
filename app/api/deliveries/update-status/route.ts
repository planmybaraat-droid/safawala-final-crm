import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// API Version: 2026-01-06 - Workaround for [id] route 404 issue

/**
 * POST /api/deliveries/update-status
 * Update delivery status (workaround for dynamic route issues on Vercel)
 * Body: { delivery_id: string, ...fields }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request, { minRole: 'staff' })
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

    const { data: existingDelivery, error: existingError } = await supabaseServer
      .from("deliveries")
      .select("delivery_number, delivery_charge, fuel_cost, franchise_id, delivery_date")
      .eq("id", deliveryId)
      .single()

    if (existingError || !existingDelivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    if (!auth.user?.is_super_admin && existingDelivery.franchise_id && existingDelivery.franchise_id !== auth.user?.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Build update object (only include fields that are provided)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Handle status update with timestamps
    if (body.status !== undefined) {
      updateData.status = body.status
      
      // Set timestamps based on status
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
    
    // Handle assigned_staff_ids array
    const staffIds = body.assigned_staff_ids
    if (staffIds !== undefined && Array.isArray(staffIds)) {
      updateData.assigned_staff_id = staffIds.length > 0 ? staffIds[0] : null
      
      // Also update delivery_staff junction table
      try {
        await supabaseServer
          .from("delivery_staff")
          .delete()
          .eq("delivery_id", deliveryId)
          .eq("franchise_id", existingDelivery.franchise_id)

        if (staffIds.length > 0) {
          const assignments = staffIds.map((staffId: string) => ({
            delivery_id: deliveryId,
            staff_id: staffId,
            role: 'assigned',
          }))
          await supabaseServer
            .from("delivery_staff")
            .insert(assignments)
        }
      } catch (staffError) {
        console.warn("[Deliveries Update Status] delivery_staff table not available:", staffError)
      }
    }
    
    if (body.delivery_charge !== undefined) updateData.delivery_charge = parseFloat(body.delivery_charge)
    if (body.fuel_cost !== undefined) updateData.fuel_cost = parseFloat(body.fuel_cost)
    if (body.special_instructions !== undefined) updateData.special_instructions = body.special_instructions

    // Delivery confirmation fields
    if (body.delivery_confirmation_name !== undefined) updateData.delivery_confirmation_name = body.delivery_confirmation_name
    if (body.delivery_confirmation_phone !== undefined) updateData.delivery_confirmation_phone = body.delivery_confirmation_phone
    if (body.delivery_photo_url !== undefined) updateData.delivery_photo_url = body.delivery_photo_url
    if (body.delivery_notes !== undefined) updateData.delivery_notes = body.delivery_notes
    if (body.delivery_items_count !== undefined) updateData.delivery_items_count = body.delivery_items_count
    if (body.delivery_items_confirmed !== undefined) updateData.delivery_items_confirmed = body.delivery_items_confirmed
    if (body.delivered_at !== undefined) updateData.delivered_at = body.delivered_at
    
    // Return confirmation fields
    if (body.return_confirmation_name !== undefined) updateData.return_confirmation_name = body.return_confirmation_name
    if (body.return_confirmation_phone !== undefined) updateData.return_confirmation_phone = body.return_confirmation_phone
    if (body.return_photo_url !== undefined) updateData.return_photo_url = body.return_photo_url
    if (body.return_notes !== undefined) updateData.return_notes = body.return_notes

    const { data: delivery, error } = await supabaseServer
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId)
      .eq("franchise_id", existingDelivery.franchise_id)
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .single()

    if (error) {
      console.error("[Deliveries Update Status] Error updating delivery:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // ===================================================================
    // AUTO-CREATE EXPENSE when delivery/fuel charges exist
    // ===================================================================
    // TODO: Implement independent expense management - not auto-creating for now
    // const newDeliveryCharge = parseFloat(body.delivery_charge || 0)
    // const newFuelCost = parseFloat(body.fuel_cost || 0)
    // 
    // // Get current delivery charges if not provided in body
    // let currentDeliveryCharge = newDeliveryCharge
    // let currentFuelCost = newFuelCost
    // 
    // if (existingDelivery && (newDeliveryCharge === 0 && newFuelCost === 0)) {
    //   // If charges not in request, use existing delivery charges
    //   currentDeliveryCharge = existingDelivery.delivery_charge || 0
    //   currentFuelCost = existingDelivery.fuel_cost || 0
    // }
    // 
    // const totalExpense = currentDeliveryCharge + currentFuelCost
    // const oldTotal = (existingDelivery?.delivery_charge || 0) + (existingDelivery?.fuel_cost || 0)
    //
    // // Create expense if charges exist and this is first time or charges changed
    // if (totalExpense > 0) {
    //   try {
    //     // Check if expense already exists for this delivery
    //     const { data: existingExpense } = await supabaseServer
    //       .from("expenses")
    //       .select("id, amount")
    //       .eq("notes", `Auto-generated for delivery ${existingDelivery?.delivery_number || deliveryId}`)
    //       .single()
    //
    //     if (existingExpense) {
    //       // Update existing expense if amount changed
    //       if (totalExpense !== existingExpense.amount) {
    //         await supabaseServer
    //           .from("expenses")
    //           .update({
    //             amount: totalExpense,
    //             description: `Delivery charges for ${existingDelivery?.delivery_number || 'delivery'} - Delivery: ₹${currentDeliveryCharge}, Fuel: ₹${currentFuelCost}`,
    //             updated_at: new Date().toISOString(),
    //           })
    //           .eq("id", existingExpense.id)
    //         console.log(`[Deliveries Update Status] ✅ Updated expense: ₹${existingExpense.amount} → ₹${totalExpense}`)
    //       }
    //     } else {
    //       // Create new expense
    //       await supabaseServer.from("expenses").insert({
    //         franchise_id: existingDelivery?.franchise_id || auth.user?.franchise_id,
    //         category: "Transportation",
    //         description: `Delivery charges for ${existingDelivery?.delivery_number || 'delivery'} - Delivery: ₹${currentDeliveryCharge}, Fuel: ₹${currentFuelCost}`,
    //         amount: totalExpense,
    //         expense_date: existingDelivery?.delivery_date || new Date().toISOString().split('T')[0],
    //         payment_method: "cash",
    //         vendor_name: "Delivery",
    //         notes: `Auto-generated for delivery ${existingDelivery?.delivery_number || deliveryId}`,
    //         created_by: auth.user?.id,
    //       })
    //       console.log(`[Deliveries Update Status] ✅ Created expense: ₹${totalExpense} for ${existingDelivery?.delivery_number}`)
    //     }
    //   } catch (expenseErr) {
    //     console.warn("[Deliveries Update Status] Could not create/update expense:", expenseErr)
    //     // Don't fail the main request if expense creation fails
    //   }
    // }

    console.log('[Deliveries Update Status] Successfully updated delivery:', deliveryId)
    return NextResponse.json({ success: true, data: delivery })
  } catch (error: any) {
    console.error("[Deliveries Update Status] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
