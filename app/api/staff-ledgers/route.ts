import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    // Same fix as [userId]/route.ts: staff_ledgers/staff_ledger_transactions
    // have RLS enabled, and the anon-key session client silently returns
    // zero rows instead of erroring when its own Supabase session isn't
    // valid — authenticateRequest above is the real authorization check.
    const supabase = supabaseServer

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
    const staffWithLedgers = (users || []).map((user: any) => {
      const ledger = ledgers?.find((l: any) => l.user_id === user.id) || {
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
