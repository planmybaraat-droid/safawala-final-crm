import { NextRequest, NextResponse } from "next/server"
import { getRbacContext } from "@/lib/rbac"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const context = await getRbacContext(request)
  if (!context) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name,
      role: context.user.role,
      department: (context.user as any).department || null,
      franchise_id: context.user.franchise_id || null,
    },
    permissions: [...context.permissions].sort(),
  }, { headers: { "Cache-Control": "private, no-store" } })
}
