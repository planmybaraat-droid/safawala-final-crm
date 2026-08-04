import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = auth.authContext?.user
    if (!user?.id) return NextResponse.json({ error: "Invalid user" }, { status: 400 })

    const body = await req.json()
    const { messageIds } = body

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ success: true })
    }

    const rows = messageIds.map(id => ({
      message_id: id,
      user_id: user.id,
      user_name: user.name || "Unknown"
    }))

    const { error } = await supabase
      .from("team_message_seen")
      .upsert(rows, { onConflict: "message_id,user_id" })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
