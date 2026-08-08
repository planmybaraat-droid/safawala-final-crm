import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, type AuthenticatedUser } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export type RbacPermission =
  | "warehouse.view"
  | "warehouse.update"
  | "warehouse.create"
  | "warehouse.delete"
  | "warehouse.export"
  | "qc.view"
  | "qc.update"
  | "delivery.view"
  | "delivery.update"
  | "job.view"
  | "job.update"
  | "styling.view"
  | "styling.update"
  | "travels.view"
  | "travels.update"
  | "accounts.view"
  | "accounts.update"
  | "users.manage"
  | "roles.manage"
  | "permissions.manage"
  | "settings.manage"

export interface RbacContext {
  user: AuthenticatedUser
  permissions: Set<string>
}

/** Resolve relational permissions server-side. The client copy is never trusted. */
export async function getRbacContext(request: NextRequest): Promise<RbacContext | null> {
  const auth = await authenticateRequest(request)
  if (!auth.authorized || !auth.user) return null

  let data: any[] | null = null
  let error: any = null
  try {
    const result = await supabaseServer
      .from("user_roles")
      .select("roles!inner(code, role_permissions(permissions!inner(code)))")
      .eq("user_id", auth.user.id)
    data = result.data
    error = result.error
  } catch (lookupError) {
    error = lookupError
  }

  const permissions = new Set<string>()
  if (!error && data) {
    for (const assignment of data as any[]) {
      const roles = Array.isArray(assignment.roles) ? assignment.roles : [assignment.roles]
      for (const role of roles) {
        const rolePermissions = role?.role_permissions || []
        for (const item of rolePermissions) {
          const permission = Array.isArray(item.permissions) ? item.permissions[0] : item.permissions
          if (permission?.code) permissions.add(permission.code)
        }
      }
    }
  }
  // Local department-login fallback still carries the server-derived profile
  // permissions even when Supabase service credentials are not configured.
  for (const [permission, enabled] of Object.entries(auth.user.permissions || {})) {
    if (enabled === true && permission.includes(".")) permissions.add(permission)
  }

  // Backward-compatible bootstrap for existing users while the migration is rolled out.
  if (auth.user.is_super_admin) {
    permissions.add("warehouse.view")
    permissions.add("warehouse.update")
    permissions.add("warehouse.create")
    permissions.add("warehouse.delete")
    permissions.add("warehouse.export")
    permissions.add("users.manage")
    permissions.add("roles.manage")
    permissions.add("permissions.manage")
    permissions.add("settings.manage")
    permissions.add("qc.view")
    permissions.add("qc.update")
    permissions.add("delivery.view")
    permissions.add("delivery.update")
    permissions.add("job.view")
    permissions.add("job.update")
    permissions.add("styling.view")
    permissions.add("styling.update")
    permissions.add("travels.view")
    permissions.add("travels.update")
    permissions.add("accounts.view")
    permissions.add("accounts.update")
  }
  if (auth.user.role === "franchise_admin") {
    permissions.add("warehouse.view")
    permissions.add("warehouse.update")
    permissions.add("qc.view")
    permissions.add("qc.update")
    permissions.add("delivery.view")
    permissions.add("delivery.update")
    permissions.add("job.view")
    permissions.add("job.update")
    permissions.add("styling.view")
    permissions.add("styling.update")
    permissions.add("travels.view")
    permissions.add("travels.update")
    permissions.add("accounts.view")
    permissions.add("accounts.update")
  }
  if (auth.user.role === "warehouse_staff" || auth.user.department === "warehouse") {
    permissions.add("warehouse.view")
    permissions.add("warehouse.update")
    permissions.add("job.view")
    permissions.add("job.update")
  }
  if (auth.user.role === "qc_staff" || auth.user.department === "qc") {
    permissions.add("qc.view")
    permissions.add("qc.update")
    permissions.add("job.view")
    permissions.add("job.update")
  }
  if (auth.user.role === "delivery_staff" || auth.user.department === "delivery") {
    permissions.add("delivery.view")
    permissions.add("delivery.update")
    permissions.add("job.view")
    permissions.add("job.update")
  }
  if (auth.user.role === "stylist" || auth.user.department === "styling") {
    permissions.add("styling.view")
    permissions.add("styling.update")
    permissions.add("job.view")
    permissions.add("job.update")
  }
  if (auth.user.role === "travels_staff" || auth.user.department === "travels") {
    permissions.add("travels.view")
    permissions.add("travels.update")
    permissions.add("job.view")
    permissions.add("job.update")
  }
  if (auth.user.role === "accounts_staff" || auth.user.department === "accounts") {
    permissions.add("accounts.view")
    permissions.add("accounts.update")
    permissions.add("job.view")
    permissions.add("job.update")
  }

  return { user: auth.user, permissions }
}

export function hasRbacPermission(context: RbacContext, permission: RbacPermission): boolean {
  return context.permissions.has(permission)
}

export async function requireRbacPermission(
  request: NextRequest,
  permission: RbacPermission,
): Promise<{ context: RbacContext } | { response: NextResponse }> {
  const context = await getRbacContext(request)
  if (!context) {
    return { response: NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 }) }
  }
  if (!hasRbacPermission(context, permission)) {
    return { response: NextResponse.json({ error: "Permission denied", code: "PERMISSION_DENIED" }, { status: 403 }) }
  }
  return { context }
}

export async function writeAuditLog(
  request: NextRequest,
  context: RbacContext,
  input: { module: string; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> },
) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null
  try { await supabaseServer.from("audit_logs").insert({
    user_id: context.user.id,
    user_email: context.user.email,
    franchise_id: context.user.franchise_id || null,
    module: input.module,
    action: input.action,
    resource_type: input.resourceType || null,
    resource_id: input.resourceId || null,
    ip_address: ip,
    user_agent: request.headers.get("user-agent") || null,
    metadata: input.metadata || {},
  }) } catch (error) { console.warn("[RBAC] Audit log unavailable:", error instanceof Error ? error.message : error) }
}
