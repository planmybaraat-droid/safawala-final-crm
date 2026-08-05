import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export async function PATCH(request: NextRequest, { params }: { params: { loanId: string } }) {
  const auth = await authenticateRequest(request, { minRole: "staff" })
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(auth.error || { success: false, error: "Unauthorized" }, { status: auth.statusCode || 401 })
  }

  const isAdminOrHR =
    auth.user.is_super_admin ||
    auth.user.role === "franchise_admin" ||
    auth.user.department === "hr" ||
    auth.user.department === "accounts" ||
    auth.user.department === "manager"

  if (!isAdminOrHR) {
    return NextResponse.json({ success: false, error: "Only HR or Management can review loan applications." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { status, reviewNotes } = body

    if (!status || !["approved", "rejected", "active", "repaid"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status option provided." }, { status: 400 })
    }

    // 1. Fetch loan request
    const { data: loan, error: loanErr } = await supabaseServer
      .from("staff_loan_requests")
      .select("*")
      .eq("id", params.loanId)
      .single()

    if (loanErr || !loan) {
      return NextResponse.json({ success: false, error: "Loan request not found." }, { status: 404 })
    }

    if (loan.status === "repaid") {
      return NextResponse.json({ success: false, error: "This loan has already been fully repaid." }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newStatus = status === "approved" ? "active" : status

    // 2. If approving loan, update staff ledger & record transaction
    if (newStatus === "active" && loan.status !== "active") {
      // Find staff ledger
      let { data: ledger, error: ledgerErr } = await supabaseServer
        .from("staff_ledgers")
        .select("id, utilized_credit, credit_limit")
        .eq("user_id", loan.user_id)
        .maybeSingle()

      if (!ledger) {
        const { data: existingUser } = await supabaseServer
          .from("users")
          .select("id")
          .eq("id", loan.user_id)
          .maybeSingle()

        if (!existingUser) {
          await supabaseServer.from("users").upsert(
            {
              id: loan.user_id,
              email: `${loan.user_id}@safawala.com`,
              name: "Warehouse Staff",
              role: "staff",
              department: "warehouse",
              franchise_id: loan.franchise_id || null,
            },
            { onConflict: "id" }
          )
        }

        const { data: newLedger, error: createErr } = await supabaseServer
          .from("staff_ledgers")
          .insert({ user_id: loan.user_id, utilized_credit: 0, credit_limit: 50000, base_salary: 0 })
          .select()
          .single()
        if (createErr) throw createErr
        ledger = newLedger
      }

      const newUtilized = (ledger.utilized_credit || 0) + loan.amount

      // Update staff ledger
      await supabaseServer
        .from("staff_ledgers")
        .update({ utilized_credit: newUtilized })
        .eq("id", ledger.id)

      // Post transaction record
      await supabaseServer.from("staff_ledger_transactions").insert({
        ledger_id: ledger.id,
        type: "loan",
        amount: -Math.abs(loan.amount),
        title: `Loan Disbursed (${loan.purpose.toUpperCase()}) - ${loan.tenure_months} Mo. EMI`,
        notes: reviewNotes || `Loan disbursed to staff. EMI: ₹${loan.monthly_emi}/month`,
        created_at: now,
      })
    }

    // 3. Update loan record
    const { data: updatedLoan, error: updateErr } = await supabaseServer
      .from("staff_loan_requests")
      .update({
        status: newStatus,
        reviewed_by: auth.user.id,
        reviewed_at: now,
        review_notes: reviewNotes || null,
        disbursed_at: newStatus === "active" ? (loan.disbursed_at || now) : loan.disbursed_at,
        updated_at: now,
      })
      .eq("id", params.loanId)
      .select("*")
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, data: updatedLoan })
  } catch (err: any) {
    console.error("Error updating loan request:", err)
    return NextResponse.json({ success: false, error: err.message || "Failed to update loan" }, { status: 500 })
  }
}
