import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireRbacPermission, writeAuditLog } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Warehouse-scoped work orders. Identity and franchise are always taken from the session. */
export async function GET(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.view")
  if ("response" in permission) return permission.response
  const context = permission.context
  const isWarehouseStaff = !context.user.is_super_admin && context.user.role !== "franchise_admin" && (context.user.role === "warehouse_staff" || context.user.department === "warehouse")

  let query = supabaseServer
    .from("work_orders")
    .select("id, work_order_number, booking_id, booking_source, status, franchise_id, created_at, updated_at, work_order_tasks!inner(id, task_number, title, department, status, instructions, assigned_to, due_date, updated_at)")
    .eq("work_order_tasks.department", "warehouse")
    .order("created_at", { ascending: false })

  if (!context.user.is_super_admin && context.user.franchise_id) {
    query = query.eq("franchise_id", context.user.franchise_id)
  }
  if (isWarehouseStaff) {
    query = query.or(`assigned_to.eq.${context.user.id},assigned_to.is.null`, { referencedTable: "work_order_tasks" })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}

export async function PATCH(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.update")
  if ("response" in permission) return permission.response
  const context = permission.context
  const isWarehouseStaff = !context.user.is_super_admin && context.user.role !== "franchise_admin" && (context.user.role === "warehouse_staff" || context.user.department === "warehouse")
  const body = await request.json().catch(() => ({}))
  const taskId = typeof body.task_id === "string" ? body.task_id : ""
  const allowed = new Set(["pending", "active", "picked", "shortage", "completed", "cancelled"])
  if (!taskId || !allowed.has(body.status)) {
    return NextResponse.json({ error: "task_id and a valid warehouse status are required" }, { status: 400 })
  }

  const { data: task, error: taskError } = await supabaseServer
    .from("work_order_tasks")
    .select("id, work_order_id, department, assigned_to, work_order:work_orders!inner(franchise_id)")
    .eq("id", taskId)
    .eq("department", "warehouse")
    .single()
  if (taskError || !task) return NextResponse.json({ error: "Warehouse task not found" }, { status: 404 })
  const order = Array.isArray(task.work_order) ? task.work_order[0] : task.work_order
  if (!context.user.is_super_admin && order?.franchise_id !== context.user.franchise_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (isWarehouseStaff && task.assigned_to && task.assigned_to !== context.user.id) {
    return NextResponse.json({ error: "This task is assigned to another warehouse user" }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from("work_order_tasks")
    .update({ status: body.status, updated_at: new Date().toISOString(), ...(body.status === "completed" || body.status === "picked" ? { completed_at: new Date().toISOString() } : {}) })
    .eq("id", taskId)
    .select("id, task_number, status, updated_at")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(request, context, { module: "warehouse", action: "status_change", resourceType: "work_order_task", resourceId: taskId, metadata: { status: body.status } })
  return NextResponse.json({ success: true, data })
}
