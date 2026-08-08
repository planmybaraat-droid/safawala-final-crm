import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRbacContext } from "@/lib/rbac"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET /api/jobs/[id]/interests — list interest registrations for a job. */
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

    const supabase = createClient()
    const { data: interests, error } = await supabase
      .from("job_interests")
      .select("*, user:users(id, name, phone)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: interests || [] })
  } catch (error: any) {
    console.error("[Job Interests GET] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
