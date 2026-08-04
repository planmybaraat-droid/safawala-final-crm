import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'readonly')
  if (!authResult.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = authResult.authContext!.user
  if (!['super_admin', 'franchise_admin'].includes(user.role)) {
    return NextResponse.json({ error: "2FA is only for admins" }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if already enabled
  const { data: userData } = await supabase
    .from("users")
    .select("totp_enabled, totp_secret")
    .eq("id", user.id)
    .single()

  if ((userData as any)?.totp_enabled) {
    return NextResponse.json({ already_enabled: true })
  }

  // Generate a new secret
  const secret = speakeasy.generateSecret({ name: `Safawala CRM (${user.email})`, issuer: "Safawala CRM" })
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!)

  // Store secret temporarily (not enabled yet — user must verify first)
  await supabase
    .from("users")
    .update({ totp_secret: secret.base32, totp_enabled: false } as any)
    .eq("id", user.id)

  return NextResponse.json({ secret: secret.base32, qrDataUrl })
}
