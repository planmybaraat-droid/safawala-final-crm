import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { userId } = params

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }

    // Fetch user details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, name, role, department")
      .eq("id", userId)
      .single()

    if (userError) throw userError

    // Fetch ledger
    let { data: ledger, error: ledgerError } = await supabase
      .from("staff_ledgers")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (ledgerError && ledgerError.code !== "PGRST116") {
      throw ledgerError
    }

    // If no ledger exists, return a default template
    if (!ledger) {
      return NextResponse.json({
        success: true,
        data: {
          id: userId,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || "unknown",
          ledger_id: null,
          baseSalary: 0,
          utilizedCredit: 0,
          creditLimit: 25000,
          transactions: []
        }
      })
    }

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from("staff_ledger_transactions")
      .select("*")
      .eq("ledger_id", ledger.id)
      .order("created_at", { ascending: false })

    if (txError) throw txError

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "unknown",
        ledger_id: ledger.id,
        baseSalary: ledger.base_salary,
        utilizedCredit: ledger.utilized_credit,
        creditLimit: ledger.credit_limit,
        transactions: transactions || []
      }
    })
  } catch (error: any) {
    console.error(`Error fetching ledger for user ${params.userId}:`, error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
