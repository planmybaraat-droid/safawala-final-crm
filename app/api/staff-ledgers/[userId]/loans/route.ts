import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

const VALID_PURPOSES = new Set([
  "emergency",
  "personal",
  "medical",
  "education",
  "festival",
  "equipment",
  "other",
])

function canViewOtherUsers(user: any) {
  return user.is_super_admin || user.role === "franchise_admin" || user.department === "hr" || user.department === "accounts" || user.department === "manager"
}

async function getOrInitLedger(targetUserId: string, authUser: any) {
  try {
    let { data: ledger } = await supabaseServer
      .from("staff_ledgers")
      .select("id, credit_limit, utilized_credit")
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (ledger) return { ledger, userId: targetUserId }

    const { data: created } = await supabaseServer
      .from("staff_ledgers")
      .insert({ user_id: targetUserId, utilized_credit: 0, credit_limit: 50000, base_salary: 0 })
      .select("id, credit_limit, utilized_credit")
      .maybeSingle()

    if (created) return { ledger: created, userId: targetUserId }

    const { data: dbUser } = await supabaseServer
      .from("users")
      .select("id")
      .or(`email.eq.${authUser?.email || ""},id.eq.${authUser?.id || ""}`)
      .limit(1)
      .maybeSingle()

    if (dbUser) {
      let { data: dbUserLedger } = await supabaseServer
        .from("staff_ledgers")
        .select("id, credit_limit, utilized_credit")
        .eq("user_id", dbUser.id)
        .maybeSingle()

      if (!dbUserLedger) {
        const { data: fallbackCreated } = await supabaseServer
          .from("staff_ledgers")
          .insert({ user_id: dbUser.id, utilized_credit: 0, credit_limit: 50000, base_salary: 0 })
          .select("id, credit_limit, utilized_credit")
          .maybeSingle()
        dbUserLedger = fallbackCreated
      }

      if (dbUserLedger) return { ledger: dbUserLedger, userId: dbUser.id }
    }
  } catch (err) {
    console.warn("getOrInitLedger warning:", err)
  }

  return { ledger: null, userId: targetUserId }
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await authenticateRequest(request, { minRole: "staff" })
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(auth.error || { success: false, error: "Unauthorized" }, { status: auth.statusCode || 401 })
  }

  if (auth.user.id !== params.userId && !canViewOtherUsers(auth.user)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    // 1. Primary: staff_loan_requests table
    const { data, error } = await supabaseServer
      .from("staff_loan_requests")
      .select("*")
      .or(`user_id.eq.${params.userId},user_id.eq.${auth.user.id}`)
      .order("created_at", { ascending: false })

    if (!error) {
      return NextResponse.json({ success: true, data: data || [] })
    }

    const missingTable = error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("schema cache") || error.message?.includes("staff_loan_requests")

    if (missingTable) {
      // Fallback: Query staff_expense_requests where category = 'loan'
      const { data: expData } = await supabaseServer
        .from("staff_expense_requests")
        .select("*")
        .or(`user_id.eq.${params.userId},user_id.eq.${auth.user.id}`)
        .eq("category", "loan")
        .order("created_at", { ascending: false })

      const mappedLoans = (expData || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        ledger_id: e.ledger_id,
        franchise_id: e.franchise_id,
        amount: e.amount,
        purpose: "personal",
        reason: e.notes || "Salary Loan / Advance",
        tenure_months: 1,
        monthly_emi: e.amount,
        status: e.status || "pending",
        repaid_amount: 0,
        created_at: e.created_at,
        updated_at: e.created_at,
      }))

      return NextResponse.json({ success: true, data: mappedLoans })
    }

    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 })
  } catch (err: any) {
    console.error(`Error fetching loans for user ${params.userId}:`, err)
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch loan requests", data: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await authenticateRequest(request, { minRole: "staff" })
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(auth.error || { success: false, error: "Unauthorized" }, { status: auth.statusCode || 401 })
  }

  if (auth.user.id !== params.userId && !canViewOtherUsers(auth.user)) {
    return NextResponse.json({ success: false, error: "You can only request loans for yourself." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const amount = Number(body.amount)
    const purpose = String(body.purpose || "personal").trim().toLowerCase()
    const reason = String(body.reason || "").trim()

    if (!Number.isFinite(amount) || amount <= 0 || amount > 500000) {
      return NextResponse.json({ success: false, error: "Enter a valid loan amount up to ₹5,00,000." }, { status: 400 })
    }

    if (!VALID_PURPOSES.has(purpose)) {
      return NextResponse.json({ success: false, error: "Select a valid loan purpose." }, { status: 400 })
    }

    const { ledger, userId: effectiveUserId } = await getOrInitLedger(params.userId, auth.user)

    // Check if user already has an active or pending loan (Single Loan Policy)
    let activeLoans: any[] = []
    const { data: primaryActive } = await supabaseServer
      .from("staff_loan_requests")
      .select("id, amount, status")
      .or(`user_id.eq.${params.userId},user_id.eq.${effectiveUserId}`)
      .in("status", ["pending", "approved", "active"])
      .maybeSingle()

    if (primaryActive) {
      activeLoans = [primaryActive]
    } else {
      // Check fallback table
      const { data: expActive } = await supabaseServer
        .from("staff_expense_requests")
        .select("id, amount, status")
        .or(`user_id.eq.${params.userId},user_id.eq.${effectiveUserId}`)
        .eq("category", "loan")
        .in("status", ["pending", "approved", "active"])
        .maybeSingle()
      if (expActive) activeLoans = [expActive]
    }

    if (activeLoans.length > 0) {
      const existing = activeLoans[0]
      return NextResponse.json({
        success: false,
        error: `❌ Active Loan Found: You already have an active or pending loan of ₹${Number(existing.amount).toLocaleString("en-IN")}. You must fully repay your existing loan before applying for a new one.`
      }, { status: 400 })
    }

    const creditLimit = ledger?.credit_limit ?? 50000
    const utilizedCredit = ledger?.utilized_credit ?? 0
    const availableCredit = creditLimit - utilizedCredit

    if (amount > availableCredit) {
      return NextResponse.json({
        success: false,
        error: `Requested loan (₹${amount.toLocaleString("en-IN")}) exceeds your available credit limit (₹${availableCredit.toLocaleString("en-IN")}).`
      }, { status: 400 })
    }

    const tenureMonths = 1
    const monthlyEmi = amount

    const payload = {
      user_id: effectiveUserId,
      ledger_id: ledger?.id || null,
      franchise_id: auth.user.franchise_id || null,
      amount,
      purpose,
      reason: reason || null,
      tenure_months: tenureMonths,
      monthly_emi: monthlyEmi,
      status: "pending",
      repaid_amount: 0
    }

    // 1. Try primary staff_loan_requests table
    const { data: createdLoan, error: primaryErr } = await supabaseServer
      .from("staff_loan_requests")
      .insert(payload)
      .select("*")
      .maybeSingle()

    if (createdLoan) {
      return NextResponse.json({ success: true, data: createdLoan })
    }

    const missingTable = primaryErr && (
      primaryErr.code === "42P01" ||
      primaryErr.code === "PGRST205" ||
      primaryErr.message?.includes("schema cache") ||
      primaryErr.message?.includes("staff_loan_requests")
    )

    if (missingTable) {
      // 2. Fallback: Save in staff_expense_requests table with category 'loan'
      const expPayload = {
        user_id: effectiveUserId,
        ledger_id: ledger?.id || null,
        franchise_id: auth.user.franchise_id || null,
        amount,
        category: "loan",
        notes: reason ? `[LOAN REQUEST: ${purpose.toUpperCase()}] ${reason}` : `Loan request (${purpose})`,
        status: "pending",
        expense_date: new Date().toISOString().slice(0, 10),
        order_reference: `LOAN-${Date.now()}`,
        vendor_name: "Staff Loan / Salary Advance"
      }

      const { data: expLoan, error: expErr } = await supabaseServer
        .from("staff_expense_requests")
        .insert(expPayload)
        .select("*")
        .single()

      if (expErr) {
        return NextResponse.json({ success: false, error: expErr.message }, { status: 500 })
      }

      const mappedLoan = {
        id: expLoan.id,
        user_id: expLoan.user_id,
        ledger_id: expLoan.ledger_id,
        franchise_id: expLoan.franchise_id,
        amount: expLoan.amount,
        purpose,
        reason: expLoan.notes,
        tenure_months: 1,
        monthly_emi: expLoan.amount,
        status: expLoan.status || "pending",
        repaid_amount: 0,
        created_at: expLoan.created_at,
        updated_at: expLoan.created_at,
      }

      return NextResponse.json({ success: true, data: mappedLoan })
    }

    return NextResponse.json({ success: false, error: primaryErr?.message || "Failed to submit loan request" }, { status: 500 })
  } catch (err: any) {
    console.error(`Error submitting loan request for user ${params.userId}:`, err)
    return NextResponse.json({ success: false, error: err.message || "Failed to submit loan request" }, { status: 500 })
  }
}
