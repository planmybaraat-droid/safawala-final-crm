import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, name, role, department")
      .order("name")

    if (usersError) throw usersError

    // Fetch all ledgers
    const { data: ledgers, error: ledgersError } = await supabase
      .from("staff_ledgers")
      .select("*")

    if (ledgersError && ledgersError.code !== "PGRST116") {
      throw ledgersError
    }

    // Map users to ledgers, defaulting to 0 balances if ledger doesn't exist
    const staffWithLedgers = (users || []).map(user => {
      const ledger = ledgers?.find(l => l.user_id === user.id) || {
        base_salary: 0,
        utilized_credit: 0,
        credit_limit: 25000,
        id: null
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "unknown",
        ledger_id: ledger.id,
        baseSalary: ledger.base_salary,
        utilizedCredit: ledger.utilized_credit,
        creditLimit: ledger.credit_limit,
      }
    })

    return NextResponse.json({ success: true, data: staffWithLedgers })
  } catch (error: any) {
    console.error("Error fetching staff ledgers:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
