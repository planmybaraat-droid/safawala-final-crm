import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "super_admin" })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
  }

  try {
    const supabase = createClient()
    const activityCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const integrationCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [activityResult, integrationResult] = await Promise.all([
      supabase.from("activity_logs").delete().lt("created_at", activityCutoff).select("id"),
      supabase.from("integration_logs").delete().lt("created_at", integrationCutoff).select("id"),
    ])

    const errors = [activityResult.error, integrationResult.error].filter(Boolean)
    if (errors.length > 0) {
      console.error("Logs cleanup errors:", errors)
      return NextResponse.json({ error: "Failed to clean up one or more log tables" }, { status: 500 })
    }

    const activityDeleted = activityResult.data?.length || 0
    const integrationDeleted = integrationResult.data?.length || 0
    return NextResponse.json({
      success: true,
      deleted: { activity_logs: activityDeleted, integration_logs: integrationDeleted },
      message: `Deleted ${activityDeleted + integrationDeleted} expired log records`,
    })
  } catch (error) {
    console.error("Logs cleanup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
