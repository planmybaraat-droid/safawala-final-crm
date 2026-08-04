import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import speakeasy from "speakeasy"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'readonly')
  if (!authResult.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = authResult.authContext!.user
  if (!['super_admin', 'franchise_admin'].includes(user.role)) {
    return NextResponse.json({ error: "2FA is only for admins" }, { status: 403 })
  }

  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userData } = await supabase
    .from("users")
    .select("totp_secret")
    .eq("id", user.id)
    .single()

  const secret = (userData as any)?.totp_secret
  if (!secret) return NextResponse.json({ error: "Run setup first" }, { status: 400 })

  const isValid = speakeasy.totp.verify({ token: code, secret, encoding: "base32", window: 1 })
  if (!isValid) return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 })

  await supabase
    .from("users")
    .update({ totp_enabled: true } as any)
    .eq("id", user.id)

  return NextResponse.json({ success: true, message: "2FA enabled successfully" })
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request, 'readonly')
  if (!authResult.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = authResult.authContext!.user

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from("users")
    .update({ totp_secret: null, totp_enabled: false } as any)
    .eq("id", user.id)

  return NextResponse.json({ success: true, message: "2FA disabled" })
}
