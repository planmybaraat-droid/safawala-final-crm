import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Verifies that the current cookie belongs to an active user. Sessions are
 * intentionally independent, so signing in elsewhere does not invalidate
 * this browser.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const cookieRaw = cookieStore.get("safawala_user")?.value

    if (!cookieRaw) {
      return NextResponse.json({ valid: false, reason: "missing_cookie" })
    }

    let parsed: any
    try {
      parsed = JSON.parse(cookieRaw)
    } catch {
      return NextResponse.json({ valid: false, reason: "bad_cookie" })
    }

    const { id: userId } = parsed

    if (!userId) {
      return NextResponse.json({ valid: false, reason: "legacy_session_missing_user" })
    }

    const serviceAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error } = await serviceAdmin
      .from("users")
      .select("is_active")
      .eq("id", userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ valid: false, reason: "user_not_found" })
    }

    if (!user.is_active) {
      return NextResponse.json({ valid: false, reason: "account_inactive" })
    }
    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error("[verify-session]", err)
    return NextResponse.json({ valid: false, reason: "verification_error" }, { status: 500 })
  }
}
