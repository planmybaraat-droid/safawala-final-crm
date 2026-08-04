import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

function isLocalDevRequest(request: NextRequest) {
  const host = request.nextUrl.hostname
  return process.env.NODE_ENV !== "production" && (
    host === "localhost" || host === "127.0.0.1" || host === "::1"
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!isLocalDevRequest(request)) {
      return NextResponse.json({ error: "This endpoint is only available in local development" }, { status: 403 })
    }

    const auth = await authenticateRequest(request, { minRole: "super_admin" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { sql } = await request.json()

    if (!sql) {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      console.error("[v0] SQL execution error:", error)
      return NextResponse.json({ error: "SQL execution failed", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: "SQL executed successfully",
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error in SQL execution:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
