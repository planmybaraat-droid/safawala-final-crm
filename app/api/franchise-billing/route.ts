import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Franchise billing invoices & quotes stored in franchise_settings
// setting_key = record UUID, category = "franchise_invoice" | "franchise_quote"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'franchise_invoice'

    const supabase = createClient()
    const { data, error } = await supabase
      .from("franchise_settings")
      .select("id, setting_key, setting_value, created_at")
      .eq("category", type)
      .is("franchise_id", null)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const records = (data || []).map(row => {
      try {
        return { _row_id: row.id, id: row.setting_key, created_at: row.created_at, ...JSON.parse(row.setting_value || "{}") }
      } catch {
        return { _row_id: row.id, id: row.setting_key, created_at: row.created_at }
      }
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const body = await request.json()
    const { record_type, ...fields } = body
    if (!record_type) return NextResponse.json({ error: "record_type required" }, { status: 400 })

    const id = crypto.randomUUID()
    const category = record_type === 'quote' ? 'franchise_quote' : 'franchise_invoice'
    const supabase = createClient()

    const { error } = await supabase.from("franchise_settings").insert({
      franchise_id: null,
      setting_key: id,
      setting_value: JSON.stringify({ ...fields, id }),
      setting_type: "json",
      category,
      description: `Franchise ${record_type}: ${fields.franchiseName || fields.candidateName || id}`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const body = await request.json()
    const { id, ...fields } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const supabase = createClient()
    const { data: existing } = await supabase
      .from("franchise_settings")
      .select("setting_value, category")
      .eq("setting_key", id)
      .single()

    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

    const current = JSON.parse(existing.setting_value || "{}")
    const { error } = await supabase
      .from("franchise_settings")
      .update({ setting_value: JSON.stringify({ ...current, ...fields }), updated_at: new Date().toISOString() })
      .eq("setting_key", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const supabase = createClient()
    const { error } = await supabase
      .from("franchise_settings")
      .delete()
      .eq("setting_key", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
