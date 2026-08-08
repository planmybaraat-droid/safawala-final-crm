import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRbacContext, requireRbacPermission, writeAuditLog } from "@/lib/rbac"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/jobs/[id]/assign
 * Delivery-department-only. Body: { role: 'delivery'|'styling', user_id }
 * Upserts job_assignments and sets that job_task's assigned_to.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    const jobId = params.id

    const rbacContext = await getRbacContext(request)
    if (!rbacContext) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const denied = await requireRbacPermission(request, "delivery.update")
    if ("response" in denied) return denied.response

    const body = await request.json().catch(() => ({}))
    const { role, user_id } = body

    if (role !== "delivery" && role !== "styling") {
      return NextResponse.json({ error: "role must be 'delivery' or 'styling'" }, { status: 400 })
    }
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    const supabase = createClient()

    const { data: assignment, error } = await supabase
      .from("job_assignments")
      .upsert(
        {
          job_id: jobId,
          role,
          user_id,
          assigned_by: rbacContext.user.id,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: "job_id,role" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reflect the assignment on the matching department task.
    await supabase
      .from("job_tasks")
      .update({ assigned_to: user_id, updated_at: new Date().toISOString() })
      .eq("job_id", jobId)
      .eq("department", role)

    await writeAuditLog(request, rbacContext, {
      module: "delivery",
      action: "assign",
      resourceType: "job",
      resourceId: jobId,
      metadata: { role, user_id },
    })

    return NextResponse.json({ success: true, data: assignment })
  } catch (error: any) {
    console.error("[Job Assign POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
