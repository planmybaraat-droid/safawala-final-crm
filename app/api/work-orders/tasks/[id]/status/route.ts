import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"
import { getRbacContext, requireRbacPermission, writeAuditLog } from "@/lib/rbac"
import { notifyDepartment } from "@/lib/notify-department"

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
    const rbacContext = await getRbacContext(request)

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

    if (rbacContext?.user.department === "warehouse") {
      const denied = await requireRbacPermission(request, "warehouse.update")
      if ("response" in denied) return denied.response
      // Warehouse only handles picking — packing moved to the QC portal.
      if (department !== "warehouse") {
        return NextResponse.json({ error: "Warehouse users can only update warehouse (picking) tasks" }, { status: 403 })
      }
      if (!rbacContext.user.is_super_admin && workOrder?.franchise_id !== rbacContext.user.franchise_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const isWarehouseStaff = !rbacContext.user.is_super_admin && rbacContext.user.role !== "franchise_admin"
      if (task.assigned_to && task.assigned_to !== rbacContext.user.id && isWarehouseStaff) {
        return NextResponse.json({ error: "This task is assigned to another warehouse user" }, { status: 403 })
      }
    }

    if (rbacContext?.user.department === "qc" || rbacContext?.user.role === "qc_staff") {
      const denied = await requireRbacPermission(request, "qc.update")
      if ("response" in denied) return denied.response
      if (department !== "packing") {
        return NextResponse.json({ error: "QC users can only update packing tasks" }, { status: 403 })
      }
      if (!rbacContext.user.is_super_admin && workOrder?.franchise_id !== rbacContext.user.franchise_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const isQcStaff = !rbacContext.user.is_super_admin && rbacContext.user.role !== "franchise_admin"
      if (task.assigned_to && task.assigned_to !== rbacContext.user.id && isQcStaff) {
        return NextResponse.json({ error: "This task is assigned to another QC user" }, { status: 403 })
      }
    }

    if (rbacContext?.user.department === "delivery" || rbacContext?.user.role === "delivery_staff") {
      const denied = await requireRbacPermission(request, "delivery.update")
      if ("response" in denied) return denied.response
      if (department !== "dispatch") {
        return NextResponse.json({ error: "Delivery users can only update dispatch tasks" }, { status: 403 })
      }
      if (!rbacContext.user.is_super_admin && workOrder?.franchise_id !== rbacContext.user.franchise_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const isDeliveryStaff = !rbacContext.user.is_super_admin && rbacContext.user.role !== "franchise_admin"
      if (task.assigned_to && task.assigned_to !== rbacContext.user.id && isDeliveryStaff) {
        return NextResponse.json({ error: "This task is assigned to another delivery user" }, { status: 403 })
      }
    }

    if (rbacContext?.user.department === "accounts" || rbacContext?.user.role === "accounts_staff") {
      const denied = await requireRbacPermission(request, "accounts.update")
      if ("response" in denied) return denied.response
      if (department !== "accounts") {
        return NextResponse.json({ error: "Accounts users can only update accounts tasks" }, { status: 403 })
      }
      if (!rbacContext.user.is_super_admin && workOrder?.franchise_id !== rbacContext.user.franchise_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

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

    if (rbacContext) {
      await writeAuditLog(request, rbacContext, {
        module: department === "warehouse" || department === "packing" ? "warehouse" : department,
        action: "status_change",
        resourceType: "work_order_task",
        resourceId: taskId,
        metadata: { status, work_order_id: workOrderId },
      })
    }

    // 5. Run sequential task transition logic
    let transitionLog = []

    if (status === "picked" && department === "warehouse") {
      // WH Picked -> Update PK Task to Active. Also reset any prior QC
      // verdict — this fires again after a rework loop (QC failed -> WH
      // re-picked), so QC needs to redo the Quality Check step fresh.
      await supabase
        .from("work_order_tasks")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
          metadata: { qc_status: "pending", qc_checklist: null, qc_notes: null },
        })
        .eq("work_order_id", workOrderId)
        .eq("department", "packing")

      // Clear this task's own rework banner now that a fresh pick was submitted.
      await supabase
        .from("work_order_tasks")
        .update({ metadata: null })
        .eq("id", task.id)

      // Update Work Order to in_progress if it is still new
      if (workOrder.status === "new") {
        await supabase
          .from("work_orders")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", workOrderId)
      }
      transitionLog.push("Activated Packing task and updated Work Order status to in_progress")

      await notifyDepartment(supabase, {
        franchiseId: workOrder.franchise_id,
        department: "qc",
        title: "New packing job",
        message: `${workOrder.work_order_number} is picked and ready to pack.`,
        entityType: "work_orders",
        entityId: workOrderId,
        actionUrl: "/portal/qc/packing",
        actionLabel: "Open Packing Queue",
      })
    }

    else if (status === "completed" && department === "packing") {
      // PK Completed -> Update DP Task to Active
      await supabase
        .from("work_order_tasks")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("work_order_id", workOrderId)
        .eq("department", "dispatch")
      transitionLog.push("Activated Dispatch task")

      await notifyDepartment(supabase, {
        franchiseId: workOrder.franchise_id,
        department: "delivery",
        title: "New dispatch job",
        message: `${workOrder.work_order_number} is packed and ready to ship.`,
        entityType: "work_orders",
        entityId: workOrderId,
        actionUrl: "/portal/delivery/jobs",
        actionLabel: "Open Dispatch Jobs",
      })
    }

    else if (status === "shortage" && department === "packing") {
      // QC failed the Quality Check step -> send the picking task back to
      // Warehouse for rework, carrying over exactly which item(s) failed and
      // why so Warehouse doesn't have to go ask QC. When Warehouse re-picks,
      // the "picked" branch above clears this banner and resets QC's state.
      const failedItems = (metadata?.qc_checklist || []).filter((i: any) => i.status === "fail")
      const reworkSummary = failedItems.length > 0
        ? failedItems.map((i: any) => `${i.name}: ${i.note}`).join(" | ")
        : (metadata?.qc_notes || "Failed Quality Check")

      await supabase
        .from("work_order_tasks")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
          metadata: { rework_reason: reworkSummary, rework_items: failedItems, rework_at: new Date().toISOString() },
        })
        .eq("work_order_id", workOrderId)
        .eq("department", "warehouse")
      transitionLog.push("Sent back to Warehouse for rework")

      await notifyDepartment(supabase, {
        franchiseId: workOrder.franchise_id,
        department: "warehouse",
        title: "Item sent back for rework",
        message: `${workOrder.work_order_number} failed QC — ${reworkSummary}`,
        entityType: "work_orders",
        entityId: workOrderId,
        priority: "high",
        actionUrl: "/portal/warehouse/tasks",
        actionLabel: "Open Picking",
      })
    }

    else if (status === "completed" && department === "dispatch") {
      // DP Completed -> Check if Styling/Travels tasks exist for this work order
      const { data: postDispatchTasks } = await supabase
        .from("work_order_tasks")
        .select("id, department")
        .eq("work_order_id", workOrderId)
        .in("department", ["styling", "travels"])

      if (postDispatchTasks && postDispatchTasks.length > 0) {
        // Rental -> activate Styling and Travels tasks in parallel
        await supabase
          .from("work_order_tasks")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .in("id", postDispatchTasks.map(t => t.id))

        // Update booking status to delivered
        await updateBookingStatus(supabase, workOrder.booking_id, workOrder.booking_source, "delivered")
        transitionLog.push("Activated Styling and Travels tasks and updated Booking status to delivered")

        await Promise.all([
          notifyDepartment(supabase, {
            franchiseId: workOrder.franchise_id,
            department: "styling",
            title: "New styling job",
            message: `${workOrder.work_order_number} is out for delivery — event setup needed.`,
            entityType: "work_orders",
            entityId: workOrderId,
            actionUrl: "/portal/styling",
            actionLabel: "Open Styling",
          }),
          notifyDepartment(supabase, {
            franchiseId: workOrder.franchise_id,
            department: "travels",
            title: "New travel job",
            message: `${workOrder.work_order_number} needs travel coordination.`,
            entityType: "work_orders",
            entityId: workOrderId,
            actionUrl: "/portal/travels",
            actionLabel: "Open Travels",
          }),
        ])
      } else {
        // No Styling/Travels tasks (Direct Sale/Product Sale) -> Complete Work Order and Booking
        await supabase
          .from("work_orders")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", workOrderId)

        await updateBookingStatus(supabase, workOrder.booking_id, workOrder.booking_source, "order_complete")
        transitionLog.push("Completed Work Order and Booking (Sale)")
      }
    }

    else if (status === "completed" && department === "travels") {
      // Travel coordination is informational only — no downstream cascade.
      transitionLog.push("Travel coordination marked complete")
    }

    else if (status === "completed" && department === "styling") {
      // Styling Setup Completed -> Set Return Collection task to Active
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

        await notifyDepartment(supabase, {
          franchiseId: workOrder.franchise_id,
          department: "styling",
          title: "Return collection ready",
          message: `${workOrder.work_order_number} is ready for return collection.`,
          entityType: "work_orders",
          entityId: workOrderId,
          actionUrl: "/portal/styling",
          actionLabel: "Open Styling",
        })
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
