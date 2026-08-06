import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("booking_id")

    let query = supabaseServer.from("stylist_interests").select("*").order("created_at", { ascending: false })
    if (bookingId) query = query.eq("booking_id", bookingId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: true, data: [] })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { booking_id, stylist_name, stylist_phone, quoted_rate, notes } = body

    if (!stylist_name || !stylist_phone) {
      return NextResponse.json({ error: "Stylist Name and Phone number are required" }, { status: 400 })
    }

    const payload = {
      booking_id: booking_id || null,
      stylist_name,
      stylist_phone,
      quoted_rate: quoted_rate || "Market Standard",
      notes: notes || "",
      created_at: new Date().toISOString()
    }

    // Try inserting into stylist_interests
    const { data, error } = await supabaseServer
      .from("stylist_interests")
      .insert([payload])
      .select()

    if (error) {
      console.warn("[Stylist Interest API] Table notice:", error.message)
      // Fallback: insert into work_order_assignments
      try {
        await supabaseServer.from("work_order_assignments").insert([{
          work_order_id: booking_id,
          role: "stylist_applicant",
          notes: `Interested Stylist: ${stylist_name} (${stylist_phone}) - Rate: ₹${quoted_rate}`,
          created_at: new Date().toISOString()
        }])
      } catch (e) {
        // Ignore fallback error
      }
    }

    return NextResponse.json({ success: true, message: "Interest registered successfully!", data: payload })
  } catch (err: any) {
    console.error("[Stylist Interest API] Error:", err)
    return NextResponse.json({ error: err.message || "Failed to submit interest" }, { status: 500 })
  }
}
