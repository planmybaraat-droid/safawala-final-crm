import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRbacContext } from "@/lib/rbac"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/jobs/[id]/interest
 * Any authenticated delivery or styling staff can register interest in a job.
 * Body: { role?: 'delivery'|'styling', note?: string }
 * role is inferred from the user's department when not supplied.
 */
export async function POST(
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

    const body = await request.json().catch(() => ({}))
    const role = body.role || rbacContext.user.department

    if (role !== "delivery" && role !== "styling") {
      return NextResponse.json({ error: "role must be 'delivery' or 'styling'" }, { status: 400 })
    }

    const supabase = createClient()
    const { data: interest, error } = await supabase
      .from("job_interests")
      .upsert(
        {
          job_id: jobId,
          role,
          user_id: rbacContext.user.id,
          note: body.note || null,
        },
        { onConflict: "job_id,role,user_id" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: interest })
  } catch (error: any) {
    console.error("[Job Interest POST] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
