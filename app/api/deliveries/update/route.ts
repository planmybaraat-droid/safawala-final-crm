import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/deliveries/update
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'delivery.update' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const body = await request.json()
    const { id: deliveryId, ...updates } = body

    if (!deliveryId) {
      return NextResponse.json({ error: "Delivery ID is required" }, { status: 400 })
    }

    console.log('[Deliveries Update API] Updating delivery:', deliveryId)
    console.log('[Deliveries Update API] Updates:', Object.keys(updates))

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.delivery_type !== undefined) updateData.delivery_type = updates.delivery_type
    if (updates.pickup_address !== undefined) updateData.pickup_address = updates.pickup_address
    if (updates.delivery_address !== undefined) updateData.delivery_address = updates.delivery_address
    if (updates.delivery_date !== undefined) updateData.delivery_date = updates.delivery_date
    if (updates.delivery_time !== undefined) updateData.delivery_time = updates.delivery_time
    if (updates.driver_name !== undefined) updateData.driver_name = updates.driver_name
    if (updates.vehicle_number !== undefined) updateData.vehicle_number = updates.vehicle_number
    if (updates.delivery_charge !== undefined) updateData.delivery_charge = parseFloat(updates.delivery_charge)
    if (updates.fuel_cost !== undefined) updateData.fuel_cost = parseFloat(updates.fuel_cost)
    if (updates.special_instructions !== undefined) updateData.special_instructions = updates.special_instructions

    // Handle assigned_staff_ids array
    const staffIds = updates.assigned_staff_ids
    if (staffIds !== undefined && Array.isArray(staffIds)) {
      updateData.assigned_staff_id = staffIds.length > 0 ? staffIds[0] : null
      
      // Also update delivery_staff junction table (optional)
      try {
        await supabaseServer
          .from("delivery_staff")
          .delete()
          .eq("delivery_id", deliveryId)

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
        console.warn("[Deliveries Update API] Staff assignment optional error:", staffError)
      }
    }

    // Update delivery
    const { data: delivery, error } = await supabaseServer
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId)
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .single()

    if (error) {
      console.error("[Deliveries Update API] Supabase error:", error)
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: 400 })
    }

    console.log('[Deliveries Update API] Successfully updated:', deliveryId)
    return NextResponse.json({ success: true, data: delivery })
  } catch (error: any) {
    console.error("[Deliveries Update API] Exception:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      stack: error.stack
    }, { status: 500 })
  }
}
