import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Territories are stored in franchise_settings with category='territory'
// setting_key = territory UUID, setting_value = JSON blob, franchise_id = null (global)

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const supabase = createClient()
    const { data, error } = await supabase
      .from("franchise_settings")
      .select("id, setting_key, setting_value, updated_at")
      .eq("category", "territory")
      .is("franchise_id", null)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const territories = (data || []).map(row => {
      try {
        const val = JSON.parse(row.setting_value || "{}")
        return { id: row.setting_key, ...val, _row_id: row.id }
      } catch {
        return { id: row.setting_key, name: row.setting_key, _row_id: row.id }
      }
    })

    return NextResponse.json({ success: true, data: territories })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const body = await request.json()
    const { name, cities, pincodes, is_locked, assigned_franchise_id } = body
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const id = crypto.randomUUID()
    const supabase = createClient()
    const { error } = await supabase.from("franchise_settings").insert({
      franchise_id: null,
      setting_key: id,
      setting_value: JSON.stringify({ name, cities: cities || [], pincodes: pincodes || [], is_locked: !!is_locked, assigned_franchise_id: assigned_franchise_id || "" }),
      setting_type: "json",
      category: "territory",
      description: `Territory: ${name}`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'super_admin')
    if (!authResult.success) return NextResponse.json(authResult.response, { status: 401 })

    const body = await request.json()
    const { id, name, cities, pincodes, is_locked, assigned_franchise_id } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const supabase = createClient()
    const { error } = await supabase
      .from("franchise_settings")
      .update({
        setting_value: JSON.stringify({ name, cities: cities || [], pincodes: pincodes || [], is_locked: !!is_locked, assigned_franchise_id: assigned_franchise_id || "" }),
        description: `Territory: ${name}`,
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", id)
      .eq("category", "territory")

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
      .eq("category", "territory")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
