import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"
import { whatsappService } from "@/lib/whatsapp-service"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEPARTMENT_LABELS: Record<string, string> = {
  warehouse: "Warehouse",
  packing: "Packing",
  dispatch: "Dispatch",
  event_team: "Event Team",
  returns: "Returns",
  accounts: "Accounts",
}

/**
 * Sends a reminder (in-app notification + WhatsApp) to whoever is responsible
 * for a work order task. Never mutates task/work-order status — purely a nudge.
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

    const { data: task, error: taskError } = await supabase
      .from("work_order_tasks")
      .select("id, work_order_id, department, title, assigned_to, work_order:work_orders(id, work_order_number, franchise_id)")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const workOrder: any = Array.isArray(task.work_order) ? task.work_order[0] : task.work_order
    const departmentLabel = DEPARTMENT_LABELS[task.department] || task.department

    // Resolve the target(s): the assignee if set, otherwise everyone active in that department
    let targets: Array<{ id: string; name: string; phone: string | null }> = []
    if (task.assigned_to) {
      const { data: assignee } = await supabase
        .from("users")
        .select("id, name, phone")
        .eq("id", task.assigned_to)
        .single()
      if (assignee) targets = [assignee]
    } else {
      const { data: deptUsers } = await supabase
        .from("users")
        .select("id, name, phone")
        .eq("department", task.department)
        .eq("is_active", true)
      targets = deptUsers || []
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: `No team member found for ${departmentLabel}` }, { status: 404 })
    }

    const title = `Reminder: ${workOrder?.work_order_number || "Work Order"} — ${departmentLabel}`
    const message = `${task.title || "Task"} is waiting on you. Please action it when you can.`

    const notified: string[] = []

    await Promise.all(
      targets.map(async (person) => {
        // In-app notification (matches the live schema read by lib/hooks/use-notifications.ts)
        await supabase.from("notifications").insert({
          user_id: person.id,
          franchise_id: workOrder?.franchise_id || null,
          type: "work_order_reminder",
          title,
          message,
          priority: "medium",
          entity_type: "work_order_task",
          entity_id: task.id,
          metadata: { work_order_id: task.work_order_id, department: task.department },
          is_read: false,
          is_archived: false,
          action_url: `/work-orders/${task.work_order_id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        // WhatsApp nudge — best-effort, never blocks the in-app notification
        if (person.phone) {
          try {
            await whatsappService.sendMessage({
              to: person.phone,
              type: "text",
              text: {
                body: `🔔 *Reminder — Safawala*\n\nHi ${person.name},\n\n${title}\n${message}`,
              },
            })
          } catch (err) {
            console.error("[WorkOrder Remind] WhatsApp send failed:", err)
          }
        }

        notified.push(person.name)
      })
    )

    return NextResponse.json({ success: true, notified })
  } catch (error: any) {
    console.error("[WorkOrder Remind] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
