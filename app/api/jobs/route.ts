import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRbacContext, requireRbacPermission } from "@/lib/rbac"
import { enrichJobs } from "@/lib/jobs-helpers"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/jobs
 * List jobs with their job_tasks, franchise-scoped and department-filtered
 * the same way the legacy /api/work-orders route worked.
 * Optional query params: ?booking_id=<uuid> to look up the Job for one booking.
 */
export async function GET(request: NextRequest) {
  try {
    const rbacContext = await getRbacContext(request)
    if (!rbacContext) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const denied = await requireRbacPermission(request, "job.view")
    if ("response" in denied) return denied.response

    const user = rbacContext.user
    const isSuperAdmin = user.is_super_admin || user.role === "super_admin"
    const franchiseId = user.franchise_id

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("booking_id")

    const supabase = createClient()

    let query = supabase
      .from("jobs")
      .select(`*, job_tasks(*)`)
      .order("created_at", { ascending: false })

    if (bookingId) {
      query = query.eq("booking_id", bookingId)
    }
    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error("[Jobs GET] Database query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const enriched = await enrichJobs(supabase, jobs)

    // Department-role users only see jobs where their department has a task.
    const dept = user.department
    const isDeptStaff = !isSuperAdmin && user.role !== "franchise_admin" && dept

    const visible = isDeptStaff
      ? enriched
          .map((job: any) => ({
            ...job,
            job_tasks: (job.job_tasks || []).filter((t: any) => t.department === dept),
          }))
          .filter((job: any) => (job.job_tasks || []).length > 0)
      : enriched

    return NextResponse.json({ success: true, data: visible })
  } catch (error: any) {
    console.error("[Jobs GET] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
