import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { logAudit } from "@/lib/audit-log"
import { supabaseServer } from "@/lib/supabase-server-simple"

export async function PATCH(request: NextRequest, { params }: { params: { expenseId: string } }) {
  const auth = await authenticateRequest(request, { minRole: "franchise_admin" })
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }

  const body = await request.json()
  const status = String(body.status || "").toLowerCase()
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ success: false, error: "Status must be approved or rejected." }, { status: 400 })
  }

  const { data: expense, error: expenseError } = await supabaseServer
    .from("staff_expense_requests")
    .select("*")
    .eq("id", params.expenseId)
    .single()
  if (expenseError || !expense) {
    return NextResponse.json({ success: false, error: expenseError?.message || "Expense not found." }, { status: 404 })
  }
  if (expense.status !== "pending") {
    return NextResponse.json({ success: false, error: "This expense has already been reviewed." }, { status: 409 })
  }
  if (auth.user.franchise_id && expense.franchise_id && auth.user.franchise_id !== expense.franchise_id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // Claim the pending request before posting any ledger side effects. This
  // prevents two administrators from approving the same expense at once.
  const reviewedAt = new Date().toISOString()
  const { data: claimed, error: claimError } = await supabaseServer
    .from("staff_expense_requests")
    .update({
      status,
      reviewed_by: auth.user.id,
      reviewed_at: reviewedAt,
      review_notes: String(body.reviewNotes || "").trim() || null,
      updated_at: reviewedAt,
    })
    .eq("id", expense.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (claimError) return NextResponse.json({ success: false, error: claimError.message }, { status: 500 })
  if (!claimed) {
    return NextResponse.json({ success: false, error: "This expense has already been reviewed." }, { status: 409 })
  }

  let transactionId: string | null = null
  if (status === "approved") {
    const { data: ledger, error: ledgerError } = await supabaseServer
      .from("staff_ledgers")
      .select("id, utilized_credit, credit_limit")
      .eq("id", expense.ledger_id)
      .single()
    if (ledgerError || !ledger) {
      await restorePending(expense.id)
      return NextResponse.json({ success: false, error: ledgerError?.message || "Ledger not found." }, { status: 500 })
    }

    const nextUtilized = Number(ledger.utilized_credit || 0) + Number(expense.amount)
    if (nextUtilized > Number(ledger.credit_limit || 25000)) {
      await restorePending(expense.id)
      return NextResponse.json({ success: false, error: "Approval would exceed this staff member's available balance." }, { status: 400 })
    }

    const { data: transaction, error: transactionError } = await supabaseServer
      .from("staff_ledger_transactions")
      .insert({
        ledger_id: ledger.id,
        title: `[Expense] ${String(expense.category).replace(/_/g, " ")}${expense.vendor_name ? ` · ${expense.vendor_name}` : ""}`,
        amount: expense.amount,
        type: "debit",
        created_by: auth.user.id,
        transaction_date: expense.expense_date,
      })
      .select("id")
      .single()
    if (transactionError) {
      await restorePending(expense.id)
      return NextResponse.json({ success: false, error: transactionError.message }, { status: 500 })
    }
    transactionId = transaction.id

    const { error: balanceError } = await supabaseServer
      .from("staff_ledgers")
      .update({ utilized_credit: nextUtilized, updated_at: new Date().toISOString() })
      .eq("id", ledger.id)
    if (balanceError) {
      await supabaseServer.from("staff_ledger_transactions").delete().eq("id", transactionId)
      await restorePending(expense.id)
      return NextResponse.json({ success: false, error: balanceError.message }, { status: 500 })
    }
  }

  const { data: updated, error: updateError } = await supabaseServer
    .from("staff_expense_requests")
    .update({
      status,
      ledger_transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expense.id)
    .select("*")
    .single()

  if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })

  await logAudit(request, auth.user, {
    module: "warehouse",
    action: `expense_${status}`,
    resourceType: "staff_expense_request",
    resourceId: expense.id,
    metadata: { amount: expense.amount, staffUserId: expense.user_id },
  })

  return NextResponse.json({ success: true, data: updated })
}

async function restorePending(expenseId: string) {
  await supabaseServer
    .from("staff_expense_requests")
    .update({
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      ledger_transaction_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
}
