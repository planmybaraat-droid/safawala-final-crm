import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { logAudit } from "@/lib/audit-log"

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
    // (product_orders has no assigned_stylist_id column or venue_name column —
    // only venue_address. Stylist assignment isn't tracked on this table.)
    let orderQ = supabaseServer
      .from("product_orders")
      .select(`
        id, order_number, status, event_date, event_time, event_type,
        venue_address,
        customer:customers(id, name, phone)
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

    // 2. Fetch travel bookings for these orders
    const orderIds = (orders ?? []).map((o: any) => o.id)
    let travelQ = supabaseServer
      .from("travel_bookings")
      .select(`*, stylist:users!stylist_id(id, name, phone, department)`)
      .order("event_date", { ascending: true })

    if (orderIds.length > 0) {
      travelQ = travelQ.in("booking_id", orderIds)
    } else if (franchiseId) {
      travelQ = travelQ.eq("franchise_id", franchiseId).not("booking_id", "is", null)
    } else {
      travelQ = travelQ.not("booking_id", "is", null)
    }

    if (status) travelQ = travelQ.eq("status", status)
    if (stylistId) travelQ = travelQ.eq("stylist_id", stylistId)

    const { data: travels } = await travelQ

    let standaloneQ = supabaseServer
      .from("travel_bookings")
      .select(`*, stylist:users!stylist_id(id, name, phone, department)`)
      .is("booking_id", null)
      .order("event_date", { ascending: true })
      .limit(limit)
    if (franchiseId && auth.user!.role !== "super_admin") standaloneQ = standaloneQ.eq("franchise_id", franchiseId)
    if (month) standaloneQ = standaloneQ.gte("event_date", `${month}-01`).lte("event_date", `${month}-31`)
    else {
      const windowStart = new Date()
      windowStart.setDate(windowStart.getDate() - 30)
      standaloneQ = standaloneQ.gte("event_date", windowStart.toISOString().slice(0, 10))
    }
    if (status) standaloneQ = standaloneQ.eq("status", status)
    if (stylistId) standaloneQ = standaloneQ.eq("stylist_id", stylistId)
    const { data: standalone } = await standaloneQ

    // 3. Merge: one row per order with travel data attached
    const merged = (orders ?? []).map((order: any) => {
      const travel = (travels ?? []).find((t: any) => t.booking_id === order.id) ?? null
      return {
        id: order.id,
        booking_id: order.id,
        order_number: order.order_number,
        event_date: order.event_date,
        event_time: order.event_time,
        event_type: order.event_type,
        venue: order.venue_address,
        customer_name: order.customer?.name ?? "—",
        customer_phone: order.customer?.phone,
        assigned_stylist: null,
        travel,
      }
    })

    const standaloneRows = (standalone ?? []).map((travel: any) => ({
      id: travel.id,
      booking_id: null,
      order_number: travel.order_number,
      event_date: travel.event_date,
      event_time: null,
      event_type: null,
      venue: travel.venue,
      customer_name: travel.customer_name ?? travel.event_name ?? "—",
      customer_phone: null,
      assigned_stylist: travel.stylist ?? null,
      travel,
    }))

    return NextResponse.json({ success: true, data: [...merged, ...standaloneRows] })
  } catch (err: any) {
    console.error("travel-bookings GET error:", err)
    return NextResponse.json({ success: false, error: err.message || "Failed to load travel bookings", data: [] }, { status: 500 })
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
      customer_name, stylist_id, status, notes, documents, travel_mode,
      ticket_ref, pnr, departure_from, arrival_at, departure_date, departure_time,
      return_date, return_time, hotel_name, hotel_address, hotel_checkin,
      hotel_checkout, hotel_ref, hotel_contact, ticket_cost, hotel_cost,
      other_cost, advance_given,
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
          .update({
            stylist_id, status, notes, documents, travel_mode, ticket_ref, pnr,
            departure_from, arrival_at, departure_date, departure_time, return_date,
            return_time, hotel_name, hotel_address, hotel_checkin, hotel_checkout,
            hotel_ref, hotel_contact, ticket_cost: ticket_cost ?? 0,
            hotel_cost: hotel_cost ?? 0, other_cost: other_cost ?? 0,
            advance_given: advance_given ?? 0,
          })
          .eq("id", existing.id)
          .select()
          .single()
        if (error) throw error

        await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
          module: "travels", action: "booking.update", resourceType: "travel_booking", resourceId: existing.id,
          metadata: { status, stylist_id, travel_mode },
        })

        return NextResponse.json({ success: true, data })
      }
    }

    // Create new
    const { data, error } = await supabaseServer
      .from("travel_bookings")
      .insert({
        booking_id, order_number, event_date, event_name, venue,
        customer_name, stylist_id, franchise_id: franchiseId, travel_mode,
        ticket_ref, pnr, departure_from, arrival_at, departure_date, departure_time,
        return_date, return_time, hotel_name, hotel_address, hotel_checkin,
        hotel_checkout, hotel_ref, hotel_contact, ticket_cost: ticket_cost ?? 0,
        hotel_cost: hotel_cost ?? 0, other_cost: other_cost ?? 0,
        advance_given: advance_given ?? 0, notes, documents: documents ?? [], status: status || "pending",
      })
      .select()
      .single()

    if (error) throw error

    await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
      module: "travels", action: "booking.create", resourceType: "travel_booking", resourceId: data.id,
      metadata: { status: status || "pending", stylist_id, travel_mode },
    })

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

    await logAudit(request, { id: auth.user!.id, email: auth.user!.email, franchise_id: auth.user!.franchise_id }, {
      module: "travels", action: "booking.status_change", resourceType: "travel_booking", resourceId: id,
      metadata: { status, stylist_id },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
