import type { NextRequest } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"

/**
 * Lightweight audit-log writer for routes that already have an authenticated
 * user (from authenticateRequest/requireAuth) and don't need the full RBAC
 * permission resolution that lib/rbac.ts's writeAuditLog performs. Never
 * throws — a logging failure must not block the mutation it's recording.
 */
export async function logAudit(
  request: NextRequest,
  actor: { id: string; email?: string | null; franchise_id?: string | null },
  input: { module: string; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> },
) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null
  try {
    await supabaseServer.from("audit_logs").insert({
      user_id: actor.id,
      user_email: actor.email || null,
      franchise_id: actor.franchise_id || null,
      module: input.module,
      action: input.action,
      resource_type: input.resourceType || null,
      resource_id: input.resourceId || null,
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || null,
      metadata: input.metadata || {},
    })
  } catch (error) {
    console.warn("[Audit] Could not write audit log:", error instanceof Error ? error.message : error)
  }
}
