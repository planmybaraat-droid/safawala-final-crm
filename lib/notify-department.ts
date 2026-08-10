import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Inserts one notification row per active user of a department (within a
 * franchise) using the canonical `notifications` table shape that
 * `lib/hooks/use-notifications.ts` reads via Supabase Realtime. Keep this the
 * single writer for "a job is ready for your department" events — the older
 * notification-system/notification-dispatcher helpers write a different
 * column shape and are not read by the realtime bell.
 */
export async function notifyDepartment(
  supabase: SupabaseClient,
  params: {
    franchiseId: string
    department: string
    title: string
    message: string
    priority?: "critical" | "high" | "medium" | "low" | "info"
    entityType?: string
    entityId?: string
    actionUrl?: string
    actionLabel?: string
    metadata?: Record<string, any>
  }
) {
  const { franchiseId, department, title, message, priority = "medium", entityType, entityId, actionUrl, actionLabel, metadata } = params

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id")
    .eq("franchise_id", franchiseId)
    .eq("department", department)
    .eq("is_active", true)

  if (usersError || !users || users.length === 0) return

  const rows = users.map((u: { id: string }) => ({
    user_id: u.id,
    franchise_id: franchiseId,
    type: "job_update",
    title,
    message,
    priority,
    entity_type: entityType || null,
    entity_id: entityId || null,
    metadata: metadata || {},
    action_url: actionUrl || null,
    action_label: actionLabel || null,
  }))

  await supabase.from("notifications").insert(rows)
}
