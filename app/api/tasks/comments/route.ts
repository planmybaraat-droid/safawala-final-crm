import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { ApiResponseBuilder } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request).catch(() => ({ authorized: false, user: null }))

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(ApiResponseBuilder.authError("Authentication required to view task comments"), { status: 401 })
    }

    const user = authResult.user

    const url = new URL(request.url)
    const taskId = url.searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json(ApiResponseBuilder.validationError("Missing query parameter: taskId"), { status: 400 })
    }

    // Verify task exists and is visible to the user
    const { data: task, error: fetchError } = await supabaseServer
      .from("tasks")
      .select("id, franchise_id, assigned_to, assigned_by")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json(ApiResponseBuilder.notFoundError("Task"), { status: 404 })
    }

    // Visibility permissions check using resolved user session

    // Check visibility permissions
    if (user.role === "staff" && task.assigned_to !== user.id && task.assigned_by !== user.id) {
      return NextResponse.json(ApiResponseBuilder.forbiddenError("You do not have permission to view comments for this task"), { status: 403 })
    }

    if (user.role === "franchise_admin" && task.franchise_id !== user.franchise_id) {
      return NextResponse.json(ApiResponseBuilder.forbiddenError("You do not have permission to view tasks outside your franchise"), { status: 403 })
    }

    // Fetch comments
    const { data: comments, error } = await supabaseServer
      .from("task_comments")
      .select(`
        id,
        comment,
        created_at,
        user_id,
        commenter:users!user_id(name, email, role)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching task comments:", error)
      return NextResponse.json(ApiResponseBuilder.databaseError(error, "fetch task comments"), { status: 500 })
    }

    return NextResponse.json({
      success: true,
      comments: comments || [],
    })
  } catch (error) {
    console.error("Error in task comments fetch API:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request).catch(() => ({ authorized: false, user: null }))

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(ApiResponseBuilder.authError("Authentication required to comment on tasks"), { status: 401 })
    }

    const user = authResult.user
    const body = await request.json()
    const { taskId, comment } = body

    if (!taskId || !comment || !comment.trim()) {
      return NextResponse.json(ApiResponseBuilder.validationError("Missing required fields: taskId, comment"), { status: 400 })
    }

    // Verify task exists and is visible to the user
    const { data: task, error: fetchError } = await supabaseServer
      .from("tasks")
      .select("id, franchise_id, assigned_to, assigned_by")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json(ApiResponseBuilder.notFoundError("Task"), { status: 404 })
    }

    // Check update/comment permissions
    if (user.role === "staff" && task.assigned_to !== user.id && task.assigned_by !== user.id) {
      return NextResponse.json(ApiResponseBuilder.forbiddenError("You do not have permission to comment on this task"), { status: 403 })
    }

    if (user.role === "franchise_admin" && task.franchise_id !== user.franchise_id) {
      return NextResponse.json(ApiResponseBuilder.forbiddenError("You do not have permission to edit tasks outside your franchise"), { status: 403 })
    }

    // Insert comment
    const commentData = {
      task_id: taskId,
      user_id: user.id,
      comment: comment.trim(),
      created_at: new Date().toISOString()
    }

    const { data: insertedComment, error } = await supabaseServer
      .from("task_comments")
      .insert([commentData])
      .select(`
        id,
        comment,
        created_at,
        user_id,
        commenter:users!user_id(name, email, role)
      `)
      .single()

    if (error) {
      console.error("Error creating task comment:", error)
      return NextResponse.json(ApiResponseBuilder.databaseError(error, "create task comment"), { status: 500 })
    }

    return NextResponse.json({
      success: true,
      comment: insertedComment,
    })
  } catch (error) {
    console.error("Error in task comment creation API:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}
