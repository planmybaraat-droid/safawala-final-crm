import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "super_admin" })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
  }

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const supabase = createClient()
    const { data, error } = await supabase
      .from("team_messages")
      .delete()
      .lt("created_at", cutoff)
      .select("id")

    if (error) {
      console.error("Chat cleanup error:", error)
      return NextResponse.json({ error: "Failed to clean up chat data" }, { status: 500 })
    }

    const deleted = data?.length || 0
    return NextResponse.json({ success: true, deleted, message: `Deleted ${deleted} expired chat messages` })
  } catch (error) {
    console.error("Chat cleanup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
