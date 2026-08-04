import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const body = await request.json()

    console.log("[v0] Creating notification via API:", body.title)

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        title: body.title,
        message: body.message,
        type: body.type || "info",
        priority: body.priority || "medium",
        user_id: body.user_id || null,
        franchise_id: body.franchise_id || null,
        action_url: body.action_url || null,
        metadata: body.metadata || {},
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating notification:", error)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }

    console.log("[v0] Notification created successfully:", notification.id)
    return NextResponse.json({ success: true, notification })
  } catch (error) {
    console.error("[v0] Exception in notification API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
