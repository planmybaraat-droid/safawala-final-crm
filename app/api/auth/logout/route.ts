import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { supabaseServer } from "@/lib/supabase-server-simple"

export async function POST(request: NextRequest) {
  try {
    try {
      const raw = request.cookies.get("safawala_user")?.value
      const user = raw ? JSON.parse(raw) : null
      if (user?.id) {
        await supabaseServer.from("audit_logs").insert({
          user_id: user.id,
          user_email: user.email || null,
          franchise_id: user.franchise_id || null,
          module: "auth",
          action: "logout",
          ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
          user_agent: request.headers.get("user-agent"),
          metadata: {},
        })
      }
    } catch (auditError) {
      console.warn("[Auth] Logout audit could not be written:", auditError)
    }
    // Invalidate Supabase Auth session
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Logout: supabase signOut error (continuing):", e)
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" })

    // Clear cookies
    response.cookies.set("safawala_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
      path: "/",
    })
    
    response.cookies.set("safawala_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
      path: "/",
    })

    response.cookies.set("safawala_user", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
