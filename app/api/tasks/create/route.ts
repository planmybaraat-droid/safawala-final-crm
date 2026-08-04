import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { ApiResponseBuilder } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request).catch(() => ({ authorized: false, user: null }))

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(ApiResponseBuilder.authError("Authentication required to create tasks"), { status: 401 })
    }

    const user = authResult.user
    const body = await request.json()
    
    if (!body.title || !body.assigned_to || !body.due_date) {
      return NextResponse.json(ApiResponseBuilder.validationError("Missing required fields: title, assigned_to, due_date"), { status: 400 })
    }

    // Determine franchise_id of the task
    let taskFranchiseId = body.franchise_id || user.franchise_id

    // If franchise_id is not set, let's look up the assignee's franchise_id
    if (!taskFranchiseId && body.assigned_to) {
      const { data: assignee, error: userError } = await supabaseServer
        .from("users")
        .select("franchise_id")
        .eq("id", body.assigned_to)
        .single()
      
      if (!userError && assignee) {
        taskFranchiseId = assignee.franchise_id
      }
    }

    const taskData = {
      title: body.title,
      description: body.description || null,
      assigned_to: body.assigned_to,
      assigned_by: user.id, // Always enforce set by logged-in user
      due_date: body.due_date,
      priority: body.priority || "medium",
      status: body.status || "pending",
      franchise_id: taskFranchiseId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseServer
      .from("tasks")
      .insert([taskData])
      .select(`
        *,
        assigned_to_user:users!assigned_to(name, email),
        assigned_by_user:users!assigned_by(name, email)
      `)
      .single()

    if (error) {
      console.error("Error creating task:", error)
      return NextResponse.json(ApiResponseBuilder.databaseError(error, "create task"), { status: 500 })
    }

    return NextResponse.json({ success: true, task: data })
  } catch (error) {
    console.error("Error in task creation API:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}
