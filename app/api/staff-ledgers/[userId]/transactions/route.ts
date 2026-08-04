import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

// Transaction types and their debit/credit direction
const TX_SIGN: Record<string, number> = {
  advance: -1, loan: -1, deduction: -1,
  recovery: 1, bonus: 1, reimbursement: 1, trip_allowance: 1,
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const { userId } = params

    // Get or find ledger for this user
    const { data: ledger } = await supabaseServer
      .from("staff_ledgers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (!ledger) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data, error } = await supabaseServer
      .from("staff_ledger_transactions")
      .select("*")
      .eq("ledger_id", ledger.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error: any) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ success: false, data: [], error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const { userId } = params
    const body = await request.json()
    // Accept both old format {title, type: 'credit'|'debit'} and new format {type: 'advance'|..., amount, notes, date}
    let { type, amount, notes, date, title } = body

    if (!userId || !amount || !type) {
      return NextResponse.json({ success: false, error: "Missing required fields: type and amount" }, { status: 400 })
    }

    const amt = Math.abs(parseFloat(amount))
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be a positive number" }, { status: 400 })
    }

    // Map transaction type to credit/debit direction
    const sign = TX_SIGN[type]
    const isDebit = sign !== undefined ? sign < 0 : type === 'debit'
    const creditDebitType = isDebit ? 'debit' : 'credit'
    const txTitle = title || type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

    // Get or create ledger
    let { data: ledger, error: ledgerError } = await supabaseServer
      .from("staff_ledgers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (ledgerError) throw ledgerError

    if (!ledger) {
      // Fetch base salary from users table
      const { data: userData } = await supabaseServer
        .from("users")
        .select("salary")
        .eq("id", userId)
        .maybeSingle()

      const { data: newLedger, error: createError } = await supabaseServer
        .from("staff_ledgers")
        .insert({ user_id: userId, base_salary: userData?.salary ?? 0, utilized_credit: 0, credit_limit: 50000 })
        .select()
        .single()

      if (createError) throw createError
      ledger = newLedger
    }

    // Update utilized credit balance
    let newUtilized = parseFloat(ledger.utilized_credit ?? 0)
    if (isDebit) {
      newUtilized += amt
    } else {
      newUtilized = Math.max(0, newUtilized - amt)
    }

    const { error: updateError } = await supabaseServer
      .from("staff_ledgers")
      .update({ utilized_credit: newUtilized })
      .eq("id", ledger.id)

    if (updateError) throw updateError

    // Insert transaction record
    const txData: any = {
      ledger_id: ledger.id,
      title: txTitle,
      type: creditDebitType,
      amount: amt,
    }
    if (notes) txData.notes = notes
    if (date) txData.date = date

    const { data: tx, error: txError } = await supabaseServer
      .from("staff_ledger_transactions")
      .insert(txData)
      .select()
      .single()

    if (txError) {
      // Table might not have notes/date columns — try without
      const { data: tx2, error: txError2 } = await supabaseServer
        .from("staff_ledger_transactions")
        .insert({ ledger_id: ledger.id, title: txTitle, type: creditDebitType, amount: amt })
        .select()
        .single()
      if (txError2) throw txError2
      return NextResponse.json({ success: true, data: { ...tx2, type, notes, date }, newUtilizedCredit: newUtilized })
    }

    return NextResponse.json({ success: true, data: { ...tx, type, notes, date }, newUtilizedCredit: newUtilized })
  } catch (error: any) {
    console.error("Error adding transaction:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
