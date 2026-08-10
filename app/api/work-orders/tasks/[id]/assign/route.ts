import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/work-orders/tasks/[id]/assign
 *
 * Delivery (or an admin) picks a specific stylist for a styling job — either
 * from the interested list or the full roster. Sets assigned_to and notifies
 * that one stylist directly (not a department-wide broadcast).
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

    const canAssign = user.is_super_admin
      || user.role === "franchise_admin"
      || user.department === "delivery"
      || user.role === "delivery_staff"
    if (!canAssign) {
      return NextResponse.json({ error: "Only delivery staff or an admin can assign a stylist" }, { status: 403 })
    }

    const body = await request.json()
    const stylistId: string | undefined = body.stylist_id
    if (!stylistId) {
      return NextResponse.json({ error: "stylist_id is required" }, { status: 400 })
    }

    const supabase = createClient()

    const { data: task, error: fetchError } = await supabase
      .from("work_order_tasks")
      .select("*, work_order:work_orders(*)")
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (task.department !== "styling") {
      return NextResponse.json({ error: "Only styling jobs can be assigned a stylist" }, { status: 403 })
    }
    const workOrder = task.work_order
    if (!user.is_super_admin && workOrder?.franchise_id !== user.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: stylist, error: stylistError } = await supabase
      .from("users")
      .select("id, name, phone, department, franchise_id")
      .eq("id", stylistId)
      .single()

    if (stylistError || !stylist) {
      return NextResponse.json({ error: "Stylist not found" }, { status: 404 })
    }
    if (stylist.department !== "styling") {
      return NextResponse.json({ error: "Selected user is not in the Styling department" }, { status: 400 })
    }
    if (!user.is_super_admin && stylist.franchise_id !== workOrder?.franchise_id) {
      return NextResponse.json({ error: "Stylist belongs to a different franchise" }, { status: 400 })
    }

    const nextMetadata = {
      ...(task.metadata || {}),
      assigned_stylist: { id: stylist.id, name: stylist.name, phone: stylist.phone || null, assigned_at: new Date().toISOString() },
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from("work_order_tasks")
      .update({ assigned_to: stylist.id, metadata: nextMetadata, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase.from("notifications").insert([{
      user_id: stylist.id,
      franchise_id: workOrder.franchise_id,
      type: "job_update",
      title: "You've been assigned a styling job",
      message: `${workOrder.work_order_number} — you're confirmed for this event.`,
      priority: "high",
      entity_type: "work_orders",
      entity_id: workOrder.id,
      action_url: "/portal/styling/assignments",
      action_label: "View Job",
    }])

    return NextResponse.json({ success: true, data: updatedTask })
  } catch (error: any) {
    console.error("[Job Assign POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
