import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })
    const user = authResult.authContext!.user

    const { searchParams } = new URL(request.url)
    const requestedFranchiseId = searchParams.get('franchise_id')
    const franchiseId = user.is_super_admin ? requestedFranchiseId : (user.franchise_id || null)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') ?? '200', 10)

    if (franchiseId && !AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const supabase = createClient()
    let query = supabase
      .from("financial_transactions")
      .select(`
        id, transaction_date, amount, type, description, reference_number,
        franchise_id, created_at,
        category:financial_categories(id, name, type),
        franchise:franchises(id, name, code)
      `)
      .order("transaction_date", { ascending: false })
      .limit(limit)

    if (franchiseId) query = query.eq("franchise_id", franchiseId)
    if (type) query = query.eq("type", type)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })
    const user = authResult.authContext!.user

    const body = await request.json()
    const { franchise_id, category_id, amount, type, description, transaction_date, reference_number } = body

    if (!amount || !type || !franchise_id || !category_id) {
      return NextResponse.json({ error: "amount, type, franchise_id, category_id are required" }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        franchise_id,
        category_id,
        amount: parseFloat(amount),
        type,
        description: description || "",
        transaction_date: transaction_date || new Date().toISOString().split("T")[0],
        reference_number: reference_number || `ADM-${Date.now()}`,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
