import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRbacContext, requireRbacPermission } from "@/lib/rbac"
import { enrichJobs } from "@/lib/jobs-helpers"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET /api/jobs/[id] — full detail for one job, all 7 department task rows. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    const jobId = params.id

    const rbacContext = await getRbacContext(request)
    if (!rbacContext) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const denied = await requireRbacPermission(request, "job.view")
    if ("response" in denied) return denied.response

    const supabase = createClient()
    const { data: job, error } = await supabase
      .from("jobs")
      .select(`*, job_tasks(*)`)
      .eq("id", jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const user = rbacContext.user
    const isSuperAdmin = user.is_super_admin || user.role === "super_admin"
    if (!isSuperAdmin && user.franchise_id && job.franchise_id && job.franchise_id !== user.franchise_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [enriched] = await enrichJobs(supabase, [job])

    return NextResponse.json({ success: true, data: enriched })
  } catch (error: any) {
    console.error("[Job GET] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
