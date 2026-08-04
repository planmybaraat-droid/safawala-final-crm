import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { getContacts } from "@/lib/services/wati-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const name = req.nextUrl.searchParams.get("name") ?? undefined
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") ?? "50")
  const pageNumber = parseInt(req.nextUrl.searchParams.get("pageNumber") ?? "0")

  const result = await getContacts({ pageSize, pageNumber, name })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ contacts: result.contacts, total: result.total })
}
