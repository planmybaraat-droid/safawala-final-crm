import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createClient()

  const user = auth.authContext?.user
  const franchiseId = user?.franchise_id

  const { searchParams } = new URL(req.url)
  const transmissionsOnly = searchParams.get("transmissions") === "true"
  const sessionId = searchParams.get("session_id")

  if (transmissionsOnly && sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("walkie_talkie_sessions")
      .select("id, franchise_id")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (!user?.is_super_admin && session.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch transmissions for specific session ordered chronologically
    const { data, error } = await supabase
      .from("walkie_talkie_transmissions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: data ?? [] })
  }

  // Otherwise, fetch active session for franchise
  let query = supabase
    .from("walkie_talkie_sessions")
    .select("*")
    .eq("status", "active")

  if (franchiseId) {
    query = query.eq("franchise_id", franchiseId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, activeSession: data?.[0] || null })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createClient()

  const user = auth.authContext?.user
  const franchiseId = user?.franchise_id
  const body = await req.json()
  const { action, sessionId, audioUrl } = body

  if (action === "start") {
    // Create new active session (deactivate any existing active session just in case)
    if (franchiseId) {
      await supabase
        .from("walkie_talkie_sessions")
        .update({ status: "ended" })
        .eq("franchise_id", franchiseId)
        .eq("status", "active")
    } else {
      await supabase
        .from("walkie_talkie_sessions")
        .update({ status: "ended" })
        .eq("status", "active")
    }

    const { data, error } = await supabase
      .from("walkie_talkie_sessions")
      .insert({
        franchise_id: franchiseId || null,
        status: "active",
        host_id: user?.id || null,
        host_name: user?.name || "Unknown Host",
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, session: data })
  }

  if (action === "end" && sessionId) {
    // End session and compile log to main team chat
    const { data: session, error: getSessionError } = await supabase
      .from("walkie_talkie_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (getSessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (!user?.is_super_admin && session.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all transmissions
    const { data: transmissions } = await supabase
      .from("walkie_talkie_transmissions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    // Deactivate session
    await supabase
      .from("walkie_talkie_sessions")
      .update({ status: "ended" })
      .eq("id", sessionId)

    // Save Walkie-Talkie logs to team chat list
    const logSummary = `📻 Walkie-Talkie session started by ${session.host_name} has ended. Total transmissions: ${transmissions?.length || 0}.`
    const { data: chatMessage, error: chatError } = await supabase
      .from("team_messages")
      .insert({
        franchise_id: franchiseId || null,
        user_id: user?.id || null,
        user_name: session.host_name,
        user_role: user?.role || "staff",
        message: logSummary,
        message_type: "walkie_talkie_log",
        voice_url: transmissions && transmissions.length > 0 ? JSON.stringify(transmissions) : null // Store transmissions array here as serialized string
      })
      .select()
      .single()

    return NextResponse.json({ success: true, message: "Session ended and saved to chat", chatMessage })
  }

  if (action === "transmit" && sessionId && audioUrl) {
    const { data: session, error: sessionError } = await supabase
      .from("walkie_talkie_sessions")
      .select("id, franchise_id, status")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 })
    }

    if (!user?.is_super_admin && session.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Insert new voice clip transmission
    const { data, error } = await supabase
      .from("walkie_talkie_transmissions")
      .insert({
        session_id: sessionId,
        sender_id: user?.id || null,
        sender_name: user?.name || "Unknown",
        audio_url: audioUrl,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, transmission: data })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
