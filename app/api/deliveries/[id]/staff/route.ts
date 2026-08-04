import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/deliveries/[id]/staff
 * Fetch all staff assigned to a delivery
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { data, error } = await supabaseServer
      .from("delivery_staff")
      .select(`
        id,
        role,
        assigned_at,
        staff:users(id, name, email, phone, role)
      `)
      .eq("delivery_id", params.id)
      .order("assigned_at")

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ 
          success: true, 
          data: [],
          message: "delivery_staff table not found. Run ADD_DELIVERY_STAFF_SYSTEM.sql migration."
        })
      }
      console.error("[Delivery Staff API] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("[Delivery Staff API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/deliveries/[id]/staff
 * Replace all staff assignments for a delivery (full sync)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    const { staff_ids } = body // Array of user IDs

    if (!Array.isArray(staff_ids)) {
      return NextResponse.json({ error: "staff_ids must be an array" }, { status: 400 })
    }

    const deliveryId = params.id
    const assignedBy = auth.user!.id

    // Start transaction: delete existing and insert new
    // First, delete all existing assignments
    const { error: deleteError } = await supabaseServer
      .from("delivery_staff")
      .delete()
      .eq("delivery_id", deliveryId)

    if (deleteError && deleteError.code !== '42P01') {
      console.error("[Delivery Staff API] Delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new assignments
    if (staff_ids.length > 0) {
      const assignments = staff_ids.map((staffId: string) => ({
        delivery_id: deliveryId,
        staff_id: staffId,
        role: 'assigned',
        assigned_by: assignedBy,
      }))

      const { error: insertError } = await supabaseServer
        .from("delivery_staff")
        .insert(assignments)

      if (insertError) {
        // Table might not exist yet
        if (insertError.code === '42P01') {
          // Fallback: update the single assigned_staff_id column
          const { error: updateError } = await supabaseServer
            .from("deliveries")
            .update({ 
              assigned_staff_id: staff_ids[0] || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", deliveryId)

          if (updateError) {
            console.error("[Delivery Staff API] Fallback update error:", updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }

          return NextResponse.json({ 
            success: true, 
            message: "Staff assigned (fallback mode - run migration for full multi-staff support)",
            data: { staff_ids }
          })
        }

        console.error("[Delivery Staff API] Insert error:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Also update the denormalized assigned_staff_id (first staff) for backwards compatibility
    const { error: updateError } = await supabaseServer
      .from("deliveries")
      .update({ 
        assigned_staff_id: staff_ids[0] || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", deliveryId)

    if (updateError) {
      console.warn("[Delivery Staff API] Warning updating delivery:", updateError)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Staff assignments updated",
      data: { staff_ids }
    })
  } catch (error) {
    console.error("[Delivery Staff API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/deliveries/[id]/staff
 * Add staff member(s) to a delivery
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    const { staff_id, staff_ids, role = 'assigned' } = body

    const deliveryId = params.id
    const assignedBy = auth.user!.id

    // Support both single and multiple staff additions
    const idsToAdd = staff_ids || (staff_id ? [staff_id] : [])

    if (idsToAdd.length === 0) {
      return NextResponse.json({ error: "staff_id or staff_ids is required" }, { status: 400 })
    }

    const assignments = idsToAdd.map((id: string) => ({
      delivery_id: deliveryId,
      staff_id: id,
      role,
      assigned_by: assignedBy,
    }))

    const { data, error } = await supabaseServer
      .from("delivery_staff")
      .upsert(assignments, { onConflict: 'delivery_id,staff_id' })
      .select()

    if (error) {
      console.error("[Delivery Staff API] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[Delivery Staff API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/deliveries/[id]/staff
 * Remove staff member(s) from a delivery
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')

    const deliveryId = params.id

    let query = supabaseServer
      .from("delivery_staff")
      .delete()
      .eq("delivery_id", deliveryId)

    // If specific staff_id provided, only delete that assignment
    if (staffId) {
      query = query.eq("staff_id", staffId)
    }

    const { error } = await query

    if (error) {
      console.error("[Delivery Staff API] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Staff removed from delivery" })
  } catch (error) {
    console.error("[Delivery Staff API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
