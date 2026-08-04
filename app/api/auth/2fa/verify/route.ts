import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import speakeasy from "speakeasy"
import { cookies } from "next/headers"
import crypto from "crypto"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const { code, temp_token } = await request.json()

  if (!code || !temp_token) {
    return NextResponse.json({ error: "Code and token required" }, { status: 400 })
  }

  const cookieStore = cookies()
  const pendingRaw = cookieStore.get("safawala_2fa_pending")?.value
  if (!pendingRaw) {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 })
  }

  let pending: { userId: string; token: string; expiresAt: number }
  try {
    pending = JSON.parse(pendingRaw)
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  if (pending.token !== temp_token || Date.now() > pending.expiresAt) {
    return NextResponse.json({ error: "Session expired — please log in again" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userData, error } = await supabase
    .from("users")
    .select(`*, franchises(id, name, code)`)
    .eq("id", pending.userId)
    .eq("is_active", true)
    .single()

  if (error || !userData) {
    return NextResponse.json({ error: "User not found" }, { status: 401 })
  }

  const secret = (userData as any).totp_secret
  if (!secret) return NextResponse.json({ error: "2FA not configured" }, { status: 400 })

  const isValid = speakeasy.totp.verify({ token: code, secret, encoding: "base32", window: 1 })
  if (!isValid) {
    return NextResponse.json({ error: "Invalid code — check your authenticator app" }, { status: 400 })
  }

  // 2FA passed — generate session and complete login
  const sessionToken = `${pending.userId}:${crypto.randomUUID()}`
  await supabase
    .from("users")
    .update({ session_token: sessionToken, session_created_at: new Date().toISOString() } as any)
    .eq("id", userData.id)

  const user = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    department: userData.department || null,
    franchise_id: userData.franchise_id,
    franchise_name: (userData as any).franchises?.name || null,
    franchise_code: (userData as any).franchises?.code || null,
    is_active: userData.is_active,
    permissions: userData.permissions || {},
  }

  const res = NextResponse.json({ success: true, user })

  res.cookies.set("safawala_2fa_pending", "", { maxAge: 0, path: "/" })
  res.cookies.set("safawala_user", JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    department: user.department,
    franchise_id: user.franchise_id,
    session_token: sessionToken,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return res
}
