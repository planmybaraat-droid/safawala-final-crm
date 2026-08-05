import { NextRequest, NextResponse } from "next/server"
import { requireRbacPermission } from "@/lib/rbac"
import { logAudit } from "@/lib/audit-log"
import { supabaseServer } from "@/lib/supabase-server-simple"

const CATEGORIES = new Set(["transport", "packing", "purchase", "repair", "laundry", "food", "other"])

function canViewOtherUsers(user: any) {
  return user.is_super_admin || user.role === "franchise_admin" || user.department === "hr" || user.department === "accounts"
}
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const permission = await requireRbacPermission(request, "warehouse.view")
  if ("response" in permission) return permission.response

  const { user } = permission.context
  if (user.id !== params.userId && !canViewOtherUsers(user)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from("staff_expense_requests")
    .select("*")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })

  if (error) {
    const missingTable = error.code === "42P01" || error.code === "PGRST205"
    return NextResponse.json({
      success: false,
      error: missingTable ? "Expense ledger database migration is not applied yet." : error.message,
      code: missingTable ? "MIGRATION_REQUIRED" : error.code,
    }, { status: missingTable ? 503 : 500 })
  }

  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const permission = await requireRbacPermission(request, "warehouse.update")
  if ("response" in permission) return permission.response

  const { user } = permission.context
  if (user.id !== params.userId && !canViewOtherUsers(user)) {
    return NextResponse.json({ success: false, error: "You can only submit your own expenses." }, { status: 403 })
  }

  const body = await request.json()
  const amount = Number(body.amount)
  const category = String(body.category || "").trim().toLowerCase()
  const expenseDate = String(body.expenseDate || "").trim()

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ success: false, error: "Enter a valid expense amount." }, { status: 400 })
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ success: false, error: "Select a valid expense category." }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
    return NextResponse.json({ success: false, error: "Select a valid expense date." }, { status: 400 })
  }
  if (body.receiptUrl && !/^https:\/\//i.test(String(body.receiptUrl))) {
    return NextResponse.json({ success: false, error: "Receipt URL is invalid." }, { status: 400 })
  }

  // Ensure user exists in users table to prevent FK constraint errors
  const { data: existingUser } = await supabaseServer
    .from("users")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle()

  if (!existingUser) {
    await supabaseServer.from("users").upsert(
      {
        id: params.userId,
        email: user.email || `${params.userId}@safawala.com`,
        name: user.name || "Warehouse Staff",
        role: user.role || "staff",
        department: user.department || "warehouse",
        franchise_id: user.franchise_id || null,
      },
      { onConflict: "id" }
    )
  }

  let { data: ledger, error: ledgerError } = await supabaseServer
    .from("staff_ledgers")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle()
  if (ledgerError) return NextResponse.json({ success: false, error: ledgerError.message }, { status: 500 })

  if (!ledger) {
    const { data: created, error: createError } = await supabaseServer
      .from("staff_ledgers")
      .insert({ user_id: params.userId, utilized_credit: 0, credit_limit: 25000, base_salary: 0 })
      .select("id")
      .single()
    if (createError) return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
    ledger = created
  }

  const payload = {
    user_id: params.userId,
    ledger_id: ledger.id,
    franchise_id: user.franchise_id || null,
    amount,
    category,
    order_reference: String(body.orderReference || "").trim() || null,
    vendor_name: String(body.vendorName || "").trim() || null,
    expense_date: expenseDate,
    notes: String(body.notes || "").trim() || null,
    receipt_url: String(body.receiptUrl || "").trim() || null,
    receipt_name: String(body.receiptName || "").trim() || null,
    status: "pending",
  }

  const { data, error } = await supabaseServer
    .from("staff_expense_requests")
    .insert(payload)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  await logAudit(request, user, {
    module: "warehouse",
    action: "expense_submitted",
    resourceType: "staff_expense_request",
    resourceId: data.id,
    metadata: { amount, category, orderReference: payload.order_reference },
  })

  return NextResponse.json({ success: true, data }, { status: 201 })
}
