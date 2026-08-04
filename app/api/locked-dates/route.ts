import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"

export const dynamic = "force-dynamic"

// GET /api/locked-dates — fetch all locked dates for a franchise
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const franchiseId = req.nextUrl.searchParams.get("franchise_id") || auth.authContext?.user?.franchise_id

  const { data, error } = await supabase
    .from("locked_dates")
    .select("*")
    .eq("franchise_id", franchiseId)
    .order("locked_date", { ascending: true })

  if (error) {
    console.error("[locked-dates] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/locked-dates — create a locked date
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { locked_date, whatsapp_number, notes } = body
  const franchiseId = auth.authContext?.user?.franchise_id
  const userId = auth.authContext?.user?.id

  if (!locked_date) {
    return NextResponse.json({ error: "locked_date is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("locked_dates")
    .insert({
      franchise_id: franchiseId,
      locked_date,
      whatsapp_number: whatsapp_number || null,
      notes: notes || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error("[locked-dates] POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/locked-dates?id=xxx — update a locked date
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await req.json()
  const { whatsapp_number, notes } = body

  const { data, error } = await supabase
    .from("locked_dates")
    .update({ whatsapp_number: whatsapp_number ?? null, notes: notes ?? null })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/locked-dates?id=xxx — remove a locked date
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await supabase
    .from("locked_dates")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
