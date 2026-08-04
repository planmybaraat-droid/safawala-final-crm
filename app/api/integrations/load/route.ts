import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "franchise_admin", requirePermission: "integrations" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const integrationName = request.nextUrl.searchParams.get("name")

    if (!integrationName) {
      return NextResponse.json({ success: false, error: "Integration name is required" }, { status: 400 })
    }

    console.log("[v0] Loading integration config for:", integrationName)

    const { data, error } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("integration_name", integrationName)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is acceptable
      console.error("[v0] Error loading integration config:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] Integration config loaded:", integrationName)
    return NextResponse.json({ success: true, data: data || null })
  } catch (error) {
    console.error("[v0] Error in load integration API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
