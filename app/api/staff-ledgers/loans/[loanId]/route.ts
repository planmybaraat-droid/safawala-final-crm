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

    const now = new Date().toISOString()
    const newStatus = status === "approved" ? "active" : status

    // 1. Try fetching from staff_loan_requests
    let loan: any = null
    const { data: primaryLoan } = await supabaseServer
      .from("staff_loan_requests")
      .select("*")
      .eq("id", params.loanId)
      .maybeSingle()

    if (primaryLoan) {
      loan = primaryLoan
    } else {
      // Check fallback table staff_expense_requests
      const { data: expLoan } = await supabaseServer
        .from("staff_expense_requests")
        .select("*")
        .eq("id", params.loanId)
        .maybeSingle()

      if (expLoan) {
        loan = {
          id: expLoan.id,
          user_id: expLoan.user_id,
          ledger_id: expLoan.ledger_id,
          franchise_id: expLoan.franchise_id,
          amount: expLoan.amount,
          purpose: "personal",
          reason: expLoan.notes,
          tenure_months: 1,
          monthly_emi: expLoan.amount,
          status: expLoan.status,
          is_fallback: true
        }
      }
    }

    if (!loan) {
      return NextResponse.json({ success: false, error: "Loan request not found." }, { status: 404 })
    }

    if (loan.status === "repaid") {
      return NextResponse.json({ success: false, error: "This loan has already been fully repaid." }, { status: 400 })
    }

    // 2. Update loan record in correct table
    if (loan.is_fallback) {
      const { data: updatedExp, error: expErr } = await supabaseServer
        .from("staff_expense_requests")
        .update({
          status: newStatus === "active" ? "approved" : newStatus,
          notes: reviewNotes ? `${loan.reason || ""} | Note: ${reviewNotes}` : loan.reason
        })
        .eq("id", params.loanId)
        .select("*")
        .single()

      if (expErr) throw expErr
      return NextResponse.json({ success: true, data: updatedExp })
    }

    // Update primary staff_loan_requests
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
