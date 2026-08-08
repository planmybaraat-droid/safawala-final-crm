import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"
import { getRbacContext, requireRbacPermission, writeAuditLog, type RbacPermission } from "@/lib/rbac"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_STATUSES = ["waiting", "in_progress", "completed"]

// Which RBAC permission gates updates to each department's task, and which
// departments a given portal role is allowed to touch.
const DEPT_PERMISSION: Record<string, RbacPermission> = {
  warehouse: "warehouse.update",
  qc: "qc.update",
  delivery: "delivery.update",
  travels: "travels.update",
  styling: "styling.update",
  accounts: "accounts.update",
}

/**
 * POST /api/jobs/tasks/[id]/status
 * Flip one department's job_task status: waiting -> in_progress -> completed.
 * Styling completion requires a non-empty checklist/photos (Returns check-in).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    const taskId = params.id

    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const supabase = createClient()
    const rbacContext = await getRbacContext(request)
    if (!rbacContext) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { status, checklist, photos, notes, assigned_to } = body

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 })
    }

    const { data: task, error: fetchError } = await supabase
      .from("job_tasks")
      .select("*, job:jobs(*)")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const jobId = task.job_id
    const department = task.department as string
    const job = task.job

    // Department-scoped RBAC + franchise scoping, mirroring the legacy work-order route.
    const permission = DEPT_PERMISSION[department]
    if (!rbacContext.user.is_super_admin && rbacContext.user.role !== "franchise_admin") {
      if (rbacContext.user.department && rbacContext.user.department !== department) {
        return NextResponse.json({ error: `${rbacContext.user.department} users cannot update ${department} tasks` }, { status: 403 })
      }
      if (permission) {
        const denied = await requireRbacPermission(request, permission)
        if ("response" in denied) return denied.response
      }
      if (task.assigned_to && task.assigned_to !== rbacContext.user.id) {
        return NextResponse.json({ error: "This task is assigned to another user" }, { status: 403 })
      }
    }
    if (!rbacContext.user.is_super_admin && job?.franchise_id && job.franchise_id !== rbacContext.user.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Returns check-in requirement: styling task cannot complete without checklist/photos.
    if (status === "completed") {
      if (department === "styling") {
        const currentChecklist = checklist !== undefined ? checklist : task.checklist
        const currentPhotos = photos !== undefined ? photos : task.photos
        if (!Array.isArray(currentChecklist) || currentChecklist.length === 0 || !Array.isArray(currentPhotos) || currentPhotos.length === 0) {
          return NextResponse.json({
            error: "Cannot complete styling task: Returns check-in requires a non-empty checklist and at least one photo.",
          }, { status: 400 })
        }
        const uncheckedItem = currentChecklist.find((item: any) => !item.checked)
        if (uncheckedItem) {
          return NextResponse.json({
            error: `Cannot complete styling task: checklist item "${uncheckedItem.text}" must be completed.`,
          }, { status: 400 })
        }
      } else {
        const currentChecklist = checklist !== undefined ? checklist : task.checklist
        if (Array.isArray(currentChecklist) && currentChecklist.length > 0) {
          const uncheckedItem = currentChecklist.find((item: any) => !item.checked)
          if (uncheckedItem) {
            return NextResponse.json({
              error: `Cannot complete ${department} task: checklist item "${uncheckedItem.text}" must be completed.`,
            }, { status: 400 })
          }
        }
      }
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status !== undefined) updateData.status = status
    if (checklist !== undefined) updateData.checklist = checklist
    if (photos !== undefined) updateData.photos = photos
    if (notes !== undefined) updateData.notes = notes
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (status === "completed") updateData.completed_at = new Date().toISOString()

    const { data: updatedTask, error: updateError } = await supabase
      .from("job_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single()

    if (updateError) {
      console.error("[Job Task Status POST] Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await writeAuditLog(request, rbacContext, {
      module: department,
      action: "status_change",
      resourceType: "job_task",
      resourceId: taskId,
      metadata: { status, job_id: jobId },
    })

    // If every task is completed, mark the parent Job completed.
    if (status === "completed") {
      const { data: allTasks } = await supabase.from("job_tasks").select("status").eq("job_id", jobId)
      if (allTasks && allTasks.every((t: any) => t.status === "completed")) {
        await supabase.from("jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId)
      }
    }

    return NextResponse.json({ success: true, data: updatedTask })
  } catch (error: any) {
    console.error("[Job Task Status POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
