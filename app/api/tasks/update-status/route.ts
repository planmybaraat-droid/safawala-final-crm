import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { ApiResponseBuilder } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request).catch(() => ({ authorized: false, user: null }))

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(ApiResponseBuilder.authError("Authentication required to update tasks"), { status: 401 })
    }

    const user = authResult.user
    const body = await request.json()
    const { taskId, status, priority, title, description, due_date } = body

    if (!taskId) {
      return NextResponse.json(ApiResponseBuilder.validationError("Missing required field: taskId"), { status: 400 })
    }

    // Fetch the task first to check permissions
    const { data: task, error: fetchError } = await supabaseServer
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json(ApiResponseBuilder.notFoundError("Task"), { status: 404 })
    }

    // Permission checks:
    // Staff can only update tasks assigned to them or created by them
    if (user.role === "staff" && task.assigned_to !== user.id && task.assigned_by !== user.id) {
      return NextResponse.json(ApiResponseBuilder.forbiddenError("You do not have permission to update this task"), { status: 403 })
    }

    // Franchise admin can only update tasks in their franchise
    if (user.role === "franchise_admin" && task.franchise_id !== user.franchise_id) {
      return NextResponse.json(ApiResponseBuilder.forbiddenError("You do not have permission to update tasks outside your franchise"), { status: 403 })
    }

    // Build the update payload
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      const validStatuses = ["pending", "in_progress", "completed", "cancelled"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(ApiResponseBuilder.validationError(`Invalid status: ${status}`), { status: 400 })
      }
      updateData.status = status
    }

    if (priority !== undefined) {
      const validPriorities = ["low", "medium", "high", "urgent"]
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(ApiResponseBuilder.validationError(`Invalid priority: ${priority}`), { status: 400 })
      }
      updateData.priority = priority
    }

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(ApiResponseBuilder.validationError("Title cannot be empty"), { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null
    }

    if (due_date !== undefined) {
      updateData.due_date = due_date
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabaseServer
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select(`
        *,
        assigned_to_user:users!assigned_to(name, email),
        assigned_by_user:users!assigned_by(name, email)
      `)
      .single()

    if (updateError) {
      console.error("Error updating task:", updateError)
      return NextResponse.json(ApiResponseBuilder.databaseError(updateError, "update task"), { status: 500 })
    }

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (error) {
    console.error("Error in update task status API:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}
