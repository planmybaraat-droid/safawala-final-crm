import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = auth.authContext?.user
    const franchiseId = user?.franchise_id

    // Fetch presences that are marked online and updated in the last 45 seconds
    const cutoff = new Date(Date.now() - 45 * 1000).toISOString()
    const { data: presences, error: presenceError } = await supabase
      .from("user_presence")
      .select("*")
      .eq("status", "online")
      .gt("last_seen", cutoff)

    if (presenceError) {
      return NextResponse.json({ error: presenceError.message }, { status: 500 })
    }

    const userIds = presences?.map(p => p.user_id) || []
    if (userIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    let userQuery = supabase
      .from("users")
      .select("id, name, role")
      .in("id", userIds)

    if (franchiseId) {
      userQuery = userQuery.eq("franchise_id", franchiseId)
    }

    const { data: users, error: usersError } = await userQuery
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    // Map users to online presence list
    const onlineUsers = users.map(u => {
      const presence = presences.find(p => p.user_id === u.id)
      const isTyping = presence?.typing_until && new Date(presence.typing_until) > new Date()
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        last_seen: presence?.last_seen,
        is_typing: !!isTyping
      }
    })

    return NextResponse.json({ data: onlineUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = auth.authContext?.user
    if (!user?.id) return NextResponse.json({ error: "Invalid user" }, { status: 400 })

    const { status, typing } = await req.json()
    if (status !== "online" && status !== "offline") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const upsertData: any = {
      user_id: user.id,
      status: status,
      last_seen: new Date().toISOString()
    }

    if (status === "offline") {
      upsertData.typing_until = null
    } else if (typing !== undefined) {
      upsertData.typing_until = typing ? new Date(Date.now() + 4000).toISOString() : null
    }

    const { data, error } = await supabase
      .from("user_presence")
      .upsert(upsertData)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
