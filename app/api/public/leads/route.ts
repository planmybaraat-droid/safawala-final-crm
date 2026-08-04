import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.PACKAGES_ADMIN_PASSWORD || null

function checkPassword(req: NextRequest): boolean {
  if (!ADMIN_PASSWORD) return false
  const pw = req.headers.get("x-admin-password") || new URL(req.url).searchParams.get("pw")
  return pw === ADMIN_PASSWORD
}

// GET — fetch leads (admin password required)
export async function GET(request: NextRequest) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data || [] })
}

// POST — submit a new lead (public, no password)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, event_date, message, source, link_label, price_link_id } = body

  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name and phone required" }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: name.trim(),
      phone: phone.trim(),
      event_date: event_date || null,
      message: message || null,
      source: source || "package_link",
      link_label: link_label || null,
      price_link_id: price_link_id || null,
      status: "new",
    })
    .select()
    .single()

  if (error) {
    console.error("[leads POST]", error)
    return NextResponse.json({ error: "Failed to save enquiry" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

// PATCH — update lead status (admin password required)
export async function PATCH(request: NextRequest) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
