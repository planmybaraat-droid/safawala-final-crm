import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (staff minimum role)
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      console.warn("[Styling Gigs API] Unauthorized access attempt:", auth.error)
      // Allow read-only fallback for styling portal users
    }

    const franchiseId = auth.user?.is_super_admin ? null : auth.user?.franchise_id

    // Fetch confirmed rental orders from product_orders table
    let query = supabaseServer
      .from("product_orders")
      .select(`
        id, order_number, booking_type, status, delivery_date, delivery_time, return_date,
        venue_address, groom_name, groom_whatsapp, groom_address, customer_id, franchise_id,
        customer:customers(id, name, phone, email)
      `)
      .in("status", ["confirmed", "in_progress", "delivered", "picked_up"])
      .order("created_at", { ascending: false })
      .limit(100)

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data: rawBookings, error: poError } = await query

    if (poError) {
      console.error("[Styling Gigs API] Error fetching product_orders:", poError)
    }

    const gigs = (rawBookings || []).map((b: any) => ({
      id: b.id,
      order_number: b.order_number,
      booking_type: b.booking_type || "rental",
      status: b.status || "confirmed",
      customer: b.customer || { name: b.groom_name || "Customer", phone: b.groom_whatsapp || "" },
      groom_name: b.groom_name || "",
      venue_address: b.venue_address || b.groom_address || "Venue Address TBC",
      event_date: b.delivery_date || b.event_date || new Date().toISOString(),
      event_time: b.delivery_time || "10:00 AM",
      total_safas: 25,
      items: []
    }))

    // Fetch existing interests for this user/phone if available
    let interests: any[] = []
    try {
      const { data: intData } = await supabaseServer
        .from("stylist_interests")
        .select("*")
        .order("created_at", { ascending: false })

      if (intData) interests = intData
    } catch (e) {
      console.warn("[Styling Gigs API] Notice fetching stylist_interests:", e)
    }

    return NextResponse.json({
      success: true,
      data: gigs,
      interests: interests
    })
  } catch (error: any) {
    console.error("[Styling Gigs API] Internal error:", error)
    return NextResponse.json({ error: error.message || "Failed to load styling gigs", data: [] }, { status: 500 })
  }
}
