import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/travel-bookings — list all travel bookings for franchise
// ?status=pending&month=2026-06&stylist_id=xxx
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "readonly" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get("status")
  const month = searchParams.get("month")
  const stylistId = searchParams.get("stylist_id")
  const limit = parseInt(searchParams.get("limit") ?? "100")

  try {
    // Pull upcoming bookings from product_orders and merge with travel_bookings
    const franchiseId = auth.user!.franchise_id

    // 1. Fetch confirmed bookings with event dates
    // (assigned_stylist_id has no FK constraint in the DB, so it's batch-fetched
    // separately below rather than using a PostgREST embedded-resource join)
    let orderQ = supabaseServer
      .from("product_orders")
      .select(`
        id, order_number, status, event_date, event_time, event_type,
        venue_name, venue_address,
        customer:customers(id, name, phone),
        assigned_stylist_id
      `)
      .in("status", ["confirmed", "picked_up", "delivered", "in_progress"])
      .not("event_date", "is", null)
      .order("event_date", { ascending: true })
      .limit(limit)

    if (franchiseId && auth.user!.role !== "super_admin") {
      orderQ = orderQ.eq("franchise_id", franchiseId)
    }
    if (month) {
      const start = `${month}-01`
      const end = `${month}-31`
      orderQ = orderQ.gte("event_date", start).lte("event_date", end)
    } else {
      // Without an explicit month filter, bound the window to the recent past
      // through the future so a large backlog of old "confirmed" bookings
      // can't push genuinely upcoming events past the row limit.
      const windowStart = new Date()
      windowStart.setDate(windowStart.getDate() - 30)
      orderQ = orderQ.gte("event_date", windowStart.toISOString().slice(0, 10))
    }

    const { data: orders, error: ordersErr } = await orderQ
    if (ordersErr) throw ordersErr

    const stylistIds = [...new Set((orders ?? []).map((o: any) => o.assigned_stylist_id).filter(Boolean))]
    const stylistMap = new Map<string, any>()
    if (stylistIds.length > 0) {
      const { data: stylists } = await supabaseServer
        .from("users")
        .select("id, name, phone, department")
        .in("id", stylistIds)
      for (const s of stylists ?? []) stylistMap.set(s.id, s)
    }

    // 2. Fetch travel bookings for these orders
    const orderIds = (orders ?? []).map((o: any) => o.id)
    let travelQ = supabaseServer
      .from("travel_bookings")
      .select(`*, stylist:users!stylist_id(id, name, phone, department)`)
      .order("event_date", { ascending: true })

    if (orderIds.length > 0) {
      travelQ = travelQ.in("booking_id", orderIds)
    } else if (franchiseId) {
      travelQ = travelQ.eq("franchise_id", franchiseId)
    }

    if (status) travelQ = travelQ.eq("status", status)
    if (stylistId) travelQ = travelQ.eq("stylist_id", stylistId)

    const { data: travels } = await travelQ

    // 3. Merge: one row per order with travel data attached
    const merged = (orders ?? []).map((order: any) => {
      const travel = (travels ?? []).find((t: any) => t.booking_id === order.id) ?? null
      return {
        id: order.id,
        order_number: order.order_number,
        event_date: order.event_date,
        event_time: order.event_time,
        event_type: order.event_type,
        venue: order.venue_name ? `${order.venue_name}${order.venue_address ? `, ${order.venue_address}` : ""}` : order.venue_address,
        customer_name: order.customer?.name ?? "—",
        customer_phone: order.customer?.phone,
        assigned_stylist: order.assigned_stylist_id ? stylistMap.get(order.assigned_stylist_id) ?? null : null,
        travel,
      }
    })

    return NextResponse.json({ success: true, data: merged })
  } catch (err: any) {
    console.error("travel-bookings GET error:", err)
    return NextResponse.json({ success: true, data: [] })
  }
}

// POST /api/travel-bookings — create or update a travel booking
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "staff" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  try {
    const body = await request.json()
    const {
      booking_id, order_number, event_date, event_name, venue,
      customer_name, stylist_id, status, notes, documents,
    } = body

    const franchiseId = auth.user!.franchise_id

    // Check if a travel booking already exists for this booking_id
    if (booking_id) {
      const { data: existing } = await supabaseServer
        .from("travel_bookings")
        .select("id, franchise_id")
        .eq("booking_id", booking_id)
        .maybeSingle()

      if (existing) {
        if (auth.user!.role !== "super_admin" && existing.franchise_id !== franchiseId) {
          return NextResponse.json({ error: "Unauthorized: Can only update travel bookings in your own franchise" }, { status: 403 })
        }
        // Update instead
        const { data, error } = await supabaseServer
          .from("travel_bookings")
          .update({ stylist_id, status, notes, documents })
          .eq("id", existing.id)
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ success: true, data })
      }
    }

    // Create new
    const { data, error } = await supabaseServer
      .from("travel_bookings")
      .insert({
        booking_id, order_number, event_date, event_name, venue,
        customer_name, stylist_id, franchise_id: franchiseId,
        notes, documents: documents ?? [], status: status || "pending",
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: any) {
    console.error("travel-bookings POST error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// PATCH /api/travel-bookings — update status or details
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "staff" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  try {
    const body = await request.json()
    const { id, stylist_id, status, notes, documents } = body

    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })

    const { data: existing } = await supabaseServer
      .from("travel_bookings")
      .select("id, franchise_id")
      .eq("id", id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ success: false, error: "Travel booking not found" }, { status: 404 })
    if (auth.user!.role !== "super_admin" && existing.franchise_id !== auth.user!.franchise_id) {
      return NextResponse.json({ error: "Unauthorized: Can only update travel bookings in your own franchise" }, { status: 403 })
    }

    const { data, error } = await supabaseServer
      .from("travel_bookings")
      .update({ stylist_id, status, notes, documents })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
