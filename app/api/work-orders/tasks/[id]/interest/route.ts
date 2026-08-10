import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/work-orders/tasks/[id]/interest
 *
 * Lets a stylist register (or withdraw) interest in a styling job before
 * it's assigned. Stored on the task's own `metadata.interested_stylists`
 * array rather than a separate table — same pattern QC rework notes use.
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
    const user = authResult.authContext!.user

    const body = await request.json()
    const action: "add" | "remove" = body.action === "remove" ? "remove" : "add"
    const note: string = (body.note || "").toString().slice(0, 300)

    const supabase = createClient()

    const { data: task, error: fetchError } = await supabase
      .from("work_order_tasks")
      .select("*, work_order:work_orders(franchise_id)")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (task.department !== "styling") {
      return NextResponse.json({ error: "Interest can only be registered on styling jobs" }, { status: 403 })
    }
    if (!user.is_super_admin && task.work_order?.franchise_id !== user.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existing: any[] = (task.metadata?.interested_stylists as any[]) || []
    const withoutMe = existing.filter((s) => s.user_id !== user.id)
    const nextList = action === "add"
      ? [...withoutMe, { user_id: user.id, name: user.name, phone: (user as any).phone || null, note, at: new Date().toISOString() }]
      : withoutMe

    const nextMetadata = { ...(task.metadata || {}), interested_stylists: nextList }

    const { data: updatedTask, error: updateError } = await supabase
      .from("work_order_tasks")
      .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedTask })
  } catch (error: any) {
    console.error("[Job Interest POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
