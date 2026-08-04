import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    const taskId = params.id

    // Require staff permissions or above
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const supabase = createClient()

    const body = await request.json()
    const { status, checklist, photos, metadata, assigned_to } = body

    // 1. Retrieve the task
    const { data: task, error: fetchError } = await supabase
      .from("work_order_tasks")
      .select("*, work_order:work_orders(*)")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const workOrderId = task.work_order_id
    const department = task.department
    const workOrder = task.work_order

    // 2. Validate checklists and photos before marking task as completed
    if (status === "completed" || status === "picked") {
      const currentChecklist = checklist || task.checklist || []
      const uncheckedItem = currentChecklist.find((item: any) => !item.checked)
      
      // Enforce checklist validation (except for warehouse picking and accounts which have different states/flexibility)
      if (uncheckedItem && department !== "warehouse" && department !== "accounts") {
        return NextResponse.json({ 
          error: `Cannot complete ${department} task: checklist item "${uncheckedItem.text}" must be completed.` 
        }, { status: 400 })
      }

      // Enforce photo proof requirement on packing completion
      if (department === "packing") {
        const currentPhotos = photos || task.photos || []
        if (currentPhotos.length === 0) {
          return NextResponse.json({ 
            error: "Cannot complete packing task: At least one proof photo must be uploaded." 
          }, { status: 400 })
        }
      }
    }

    // 3. Build update query payload
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) updateData.status = status
    if (checklist !== undefined) updateData.checklist = checklist
    if (photos !== undefined) updateData.photos = photos
    if (metadata !== undefined) updateData.metadata = metadata
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to

    if (status === "completed" || status === "picked") {
      updateData.completed_at = new Date().toISOString()
    }

    // 4. Perform task update
    const { data: updatedTask, error: updateError } = await supabase
      .from("work_order_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single()

    if (updateError) {
      console.error("[Task Update Status POST] Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 5. Run sequential task transition logic
    let transitionLog = []

    if (status === "picked" && department === "warehouse") {
      // WH Picked -> Update PK Task to Active
      await supabase
        .from("work_order_tasks")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("work_order_id", workOrderId)
        .eq("department", "packing")

      // Update Work Order to in_progress if it is still new
      if (workOrder.status === "new") {
        await supabase
          .from("work_orders")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", workOrderId)
      }
      transitionLog.push("Activated Packing task and updated Work Order status to in_progress")
    }

    else if (status === "completed" && department === "packing") {
      // PK Completed -> Update DP Task to Active
      await supabase
        .from("work_order_tasks")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("work_order_id", workOrderId)
        .eq("department", "dispatch")
      transitionLog.push("Activated Dispatch task")
    }

    else if (status === "completed" && department === "dispatch") {
      // DP Completed -> Check if Event Setup task exists for this work order
      const { data: evTask } = await supabase
        .from("work_order_tasks")
        .select("id")
        .eq("work_order_id", workOrderId)
        .eq("department", "event_team")
        .maybeSingle()

      if (evTask) {
        // EV Setup task exists -> Set EV task to Active
        await supabase
          .from("work_order_tasks")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", evTask.id)
        
        // Update booking status to delivered
        await updateBookingStatus(supabase, workOrder.booking_id, workOrder.booking_source, "delivered")
        transitionLog.push("Activated Event Setup task and updated Booking status to delivered")
      } else {
        // No EV Setup task (Direct Sale/Product Sale) -> Complete Work Order and Booking
        await supabase
          .from("work_orders")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", workOrderId)

        await updateBookingStatus(supabase, workOrder.booking_id, workOrder.booking_source, "order_complete")
        transitionLog.push("Completed Work Order and Booking (Sale)")
      }
    }

    else if (status === "completed" && department === "event_team") {
      // EV Setup Completed -> Set Return Collection task to Active
      const { data: rtTask } = await supabase
        .from("work_order_tasks")
        .select("id")
        .eq("work_order_id", workOrderId)
        .eq("department", "returns")
        .maybeSingle()

      if (rtTask) {
        await supabase
          .from("work_order_tasks")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", rtTask.id)
        transitionLog.push("Activated Return Collection task")
      }
    }

    else if (status === "completed" && department === "returns") {
      // RT Returns Completed -> Set Work Order to Completed
      await supabase
        .from("work_orders")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", workOrderId)

      // Set booking status to returned
      await updateBookingStatus(supabase, workOrder.booking_id, workOrder.booking_source, "returned")
      transitionLog.push("Completed Work Order and updated Booking status to returned")
    }

    return NextResponse.json({
      success: true,
      data: updatedTask,
      transitions: transitionLog
    })
  } catch (error: any) {
    console.error("[Task Update Status POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// Helper function to update the status column in the corresponding booking source table
async function updateBookingStatus(supabase: any, bookingId: string, source: string, newStatus: string) {
  let table = ""
  if (source === "product_orders") table = "product_orders"
  else if (source === "package_bookings") table = "package_bookings"
  else if (source === "direct_sales_orders") table = "direct_sales_orders"

  if (!table) return

  // Normalize statuses to match specific tables constraints
  let statusValue = newStatus
  if (table === "direct_sales_orders" && newStatus === "returned") statusValue = "completed"
  if (table === "package_bookings" && newStatus === "returned") statusValue = "returned"
  if (table === "product_orders" && newStatus === "returned") statusValue = "returned"

  const { error } = await supabase
    .from(table)
    .update({ status: statusValue, updated_at: new Date().toISOString() })
    .eq("id", bookingId)

  if (error) {
    console.error(`[updateBookingStatus] Failed to update booking status for ${table} (${bookingId}):`, error)
  }
}
