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
  // Ensure target user exists in users table first
  const { data: existingUser } = await supabaseServer
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle()

  if (!existingUser) {
    try {
      await supabaseServer.from("users").upsert(
        {
          id: targetUserId,
          email: authUser?.email || `${targetUserId}@safawala.com`,
          name: authUser?.name || "Warehouse Staff",
          role: authUser?.role || "staff",
          department: authUser?.department || "warehouse",
          franchise_id: authUser?.franchise_id || null,
        },
        { onConflict: "id" }
      )
    } catch (e) {
      console.warn("User upsert warning:", e)
    }
  }

  // 1. Check existing ledger by targetUserId
  let { data: ledger } = await supabaseServer
    .from("staff_ledgers")
    .select("id, credit_limit, utilized_credit")
    .eq("user_id", targetUserId)
    .maybeSingle()

  if (ledger) return { ledger, userId: targetUserId }

  // 2. Try creating ledger for targetUserId
  const { data: created, error: createError } = await supabaseServer
    .from("staff_ledgers")
    .insert({ user_id: targetUserId, utilized_credit: 0, credit_limit: 50000, base_salary: 0 })
    .select("id, credit_limit, utilized_credit")
    .maybeSingle()

  if (created) return { ledger: created, userId: targetUserId }

  // 3. Fallback: If FK constraint failed, lookup valid user in users table by email/id
  if (createError && (createError.code === "23503" || createError.message?.includes("foreign key"))) {
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
          .single()
        dbUserLedger = fallbackCreated
      }

      if (dbUserLedger) return { ledger: dbUserLedger, userId: dbUser.id }
    }
  }

  throw createError || new Error("Failed to initialize staff ledger")
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
    const { data, error } = await supabaseServer
      .from("staff_loan_requests")
      .select("*")
      .or(`user_id.eq.${params.userId},user_id.eq.${auth.user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      const missingTable = error.code === "42P01" || error.code === "PGRST205"
      return NextResponse.json({
        success: false,
        error: missingTable ? "Loan ledger database table is not created yet." : error.message,
        code: missingTable ? "MIGRATION_REQUIRED" : error.code,
        data: []
      }, { status: missingTable ? 200 : 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
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

    // Resolve ledger & valid user ID
    const { ledger, userId: effectiveUserId } = await getOrInitLedger(params.userId, auth.user)

    // Check if user already has an active or pending loan (Single Loan Policy)
    const { data: activeLoans } = await supabaseServer
      .from("staff_loan_requests")
      .select("id, amount, status")
      .or(`user_id.eq.${params.userId},user_id.eq.${effectiveUserId}`)
      .in("status", ["pending", "approved", "active"])

    if (activeLoans && activeLoans.length > 0) {
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
      ledger_id: ledger.id,
      franchise_id: auth.user.franchise_id || null,
      amount,
      purpose,
      reason: reason || null,
      tenure_months: tenureMonths,
      monthly_emi: monthlyEmi,
      status: "pending",
      repaid_amount: 0
    }

    const { data, error } = await supabaseServer
      .from("staff_loan_requests")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error(`Error submitting loan request for user ${params.userId}:`, err)
    return NextResponse.json({ success: false, error: err.message || "Failed to submit loan request" }, { status: 500 })
  }
}
