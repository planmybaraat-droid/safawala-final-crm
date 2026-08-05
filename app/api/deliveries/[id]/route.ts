import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// API Version: 2026-01-06-v2 - Force redeploy

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly', requirePermission: 'delivery.view' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    let query = supabaseServer
      .from("deliveries")
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .eq("id", params.id)

    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data: delivery, error } = await query.single()

    if (error) {
      console.error("[Deliveries API] Error fetching delivery:", error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: delivery })
  } catch (error) {
    console.error("[Deliveries API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user - just need staff role
    // Don't require permission check since it might not be set on existing users
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'delivery.update' })
    if (!auth.authorized) {
      console.error("[Deliveries API] Unauthorized:", auth.error)
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { data: existingDelivery, error: existingError } = await supabaseServer
      .from("deliveries")
      .select("id, franchise_id")
      .eq("id", params.id)
      .single()

    if (existingError || !existingDelivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    if (!auth.user?.is_super_admin && existingDelivery.franchise_id && existingDelivery.franchise_id !== auth.user?.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    console.log('[Deliveries API] PATCH request for delivery:', params.id, 'body:', JSON.stringify(body))
    const deliveryId = params.id

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
        // Delete existing assignments
        await supabaseServer
          .from("delivery_staff")
          .delete()
          .eq("delivery_id", deliveryId)

        // Insert new assignments
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
        // delivery_staff table might not exist - that's ok, we still save the first staff_id
        console.warn("[Deliveries API] delivery_staff table not available:", staffError)
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
      console.error("[Deliveries API] Error updating delivery:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('[Deliveries API] Successfully updated delivery:', deliveryId)
    return NextResponse.json({ success: true, data: delivery })
  } catch (error: any) {
    console.error("[Deliveries API] PATCH Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { data: existingDelivery, error: existingError } = await supabaseServer
      .from("deliveries")
      .select("id, franchise_id")
      .eq("id", params.id)
      .single()

    if (existingError || !existingDelivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    if (!auth.user?.is_super_admin && existingDelivery.franchise_id && existingDelivery.franchise_id !== auth.user?.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabaseServer
      .from("deliveries")
      .delete()
      .eq("id", params.id)
      .eq("franchise_id", existingDelivery.franchise_id)

    if (error) {
      console.error("[Deliveries API] Error deleting delivery:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Delivery deleted successfully" })
  } catch (error) {
    console.error("[Deliveries API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
