import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Checks if the current session token in the cookie matches
 * the latest session_token stored in the DB for this user.
 * If they don't match, another device has logged in → this session is invalid.
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

    const { id: userId, session_token: cookieToken } = parsed

    if (!userId || !cookieToken) {
      return NextResponse.json({ valid: false, reason: "legacy_session_missing_token" })
    }

    const serviceAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error } = await serviceAdmin
      .from("users")
      .select("session_token, is_active")
      .eq("id", userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ valid: false, reason: "user_not_found" })
    }

    console.log("[verify-session] userId:", userId, "cookieToken:", cookieToken, "dbToken:", user.session_token)

    if (!user.is_active) {
      return NextResponse.json({ valid: false, reason: "account_inactive" })
    }

    if (!user.session_token) {
      return NextResponse.json({
        valid: false,
        reason: "missing_db_session_token",
        message: "Your session is incomplete. Please sign in again.",
      })
    }

    const [dbDevice, dbUuid] = user.session_token.includes(":") ? user.session_token.split(":") : ["legacy", user.session_token]
    const [cookieDevice, cookieUuid] = cookieToken.includes(":") ? cookieToken.split(":") : ["legacy", cookieToken]

    if (dbDevice === cookieDevice) {
      const response = NextResponse.json({ valid: true })
      
      // If session tokens differ (e.g. user logged in again in another tab), update cookie
      if (user.session_token !== cookieToken) {
        const updatedPayload = {
          ...parsed,
          session_token: user.session_token
        }
        response.cookies.set('safawala_user', JSON.stringify(updatedPayload), {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }
      return response
    }

    return NextResponse.json({
      valid: false,
      reason: "session_replaced",
      message: "You have been logged out because your account was accessed from another device.",
    })
  } catch (err) {
    console.error("[verify-session]", err)
    return NextResponse.json({ valid: false, reason: "verification_error" }, { status: 500 })
  }
}
