import { NextRequest, NextResponse } from "next/server"
import { getRbacContext, writeAuditLog } from "@/lib/rbac"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const context = await getRbacContext(request)
  if (!context) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.module || !body?.action) {
    return NextResponse.json({ error: "module and action are required" }, { status: 400 })
  }
  // Clients may append activity, but cannot impersonate another user or alter IP/device fields.
  await writeAuditLog(request, context, {
    module: String(body.module).slice(0, 80),
    action: String(body.action).slice(0, 80),
    resourceType: body.resourceType ? String(body.resourceType).slice(0, 80) : undefined,
    resourceId: body.resourceId ? String(body.resourceId).slice(0, 160) : undefined,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  })
  return NextResponse.json({ ok: true })
}
