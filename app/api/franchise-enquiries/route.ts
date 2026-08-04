import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { authenticateRequest } from "@/lib/auth-middleware"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "super_admin" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") ?? "100")

    let query = service()
      .from("franchise_enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: data?.length ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      full_name, whatsapp, email, city, state, pincode,
      investment_budget, current_profession, years_in_business,
      has_space, space_size, lead_source, callback_time,
      annual_turnover, territory_interest, message,
    } = body

    if (!full_name || !whatsapp || !city) {
      return NextResponse.json({ error: "Name, WhatsApp and city are required" }, { status: 400 })
    }

    const { data, error } = await service()
      .from("franchise_enquiries")
      .insert({
        full_name, whatsapp, email, city, state, pincode,
        investment_budget, current_profession, years_in_business,
        has_space, space_size, lead_source, callback_time,
        annual_turnover, territory_interest, message,
        status: "new",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "super_admin" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { id, status, notes } = await request.json()
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    const { error } = await service()
      .from("franchise_enquiries")
      .update({ status, notes })
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
