import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { ApiResponseBuilder } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request).catch(() => ({ authorized: false, user: null }))

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(ApiResponseBuilder.authError("Authentication required to access tasks"), { status: 401 })
    }

    const user = authResult.user

    const userId = user.id
    const userRole = user.role
    const franchiseId = user.franchise_id

    // Parse query params
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const priority = url.searchParams.get("priority")
    const assignmentType = url.searchParams.get("assignmentType") || "all" // assigned_to_me, created_by_me, all

    let query = supabaseServer
      .from("tasks")
      .select(`
        *,
        assigned_to_user:users!assigned_to(name, email),
        assigned_by_user:users!assigned_by(name, email),
        task_comments(id)
      `)
      .order("created_at", { ascending: false })

    // Apply role-based and assignmentType filters
    if (userRole === "staff") {
      // Staff see tasks either assigned to them or created by them
      if (assignmentType === "assigned_to_me") {
        query = query.eq("assigned_to", userId)
      } else if (assignmentType === "created_by_me") {
        query = query.eq("assigned_by", userId)
      } else {
        query = query.or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`)
      }
    } else if (userRole === "franchise_admin") {
      // Franchise Admin: see franchise tasks
      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }
      
      if (assignmentType === "assigned_to_me") {
        query = query.eq("assigned_to", userId)
      } else if (assignmentType === "created_by_me") {
        query = query.eq("assigned_by", userId)
      }
    } else {
      // Super Admin: can see all
      if (assignmentType === "assigned_to_me") {
        query = query.eq("assigned_to", userId)
      } else if (assignmentType === "created_by_me") {
        query = query.eq("assigned_by", userId)
      }
    }

    // Apply filters for status and priority
    if (status && status !== "all") {
      query = query.eq("status", status)
    }
    if (priority && priority !== "all") {
      query = query.eq("priority", priority)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching tasks:", error)
      return NextResponse.json(ApiResponseBuilder.serverError("Failed to fetch tasks", error.message), { status: 500 })
    }

    // The frontend page/components expect tasks under the property "tasks" in response or as main data array
    // Wait, let's look at page.tsx line 111: `setTasks(result.tasks || [])`
    // Wait, so the response should contain { success: true, tasks: [...] } or we can return custom object
    // Let's make sure it returns both so it works with whatever the frontend expects.
    return NextResponse.json({
      success: true,
      tasks: data || [],
      data: data || [],
      total: count || data?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error in task fetching API:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}
