import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { getMessages } from "@/lib/services/wati-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const phone = req.nextUrl.searchParams.get("phone")
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 })

  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") ?? "50")
  const pageNumber = parseInt(req.nextUrl.searchParams.get("pageNumber") ?? "0")

  const result = await getMessages({ phone, pageSize, pageNumber })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ messages: result.messages })
}
