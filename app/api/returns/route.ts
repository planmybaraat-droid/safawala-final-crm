import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import AuditLogger from "@/lib/audit-logger"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

/**
 * GET /api/returns
 * Fetch all returns with delivery, booking, customer, and product details
 */
export async function GET(request: NextRequest) {
  try {
    // Enforce authentication and franchise isolation
    const auth = await requireAuth(request, 'readonly')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get("status") // pending, completed, etc.
  // Super admin may pass franchise_id to scope; others are locked to their own
  const franchise_id = user.is_super_admin ? searchParams.get("franchise_id") : (user.franchise_id || null)
    
    // Build query
    let query = supabase
      .from("returns")
      .select(`
        *,
        delivery:deliveries(
          id,
          delivery_number,
          delivery_address,
          delivered_at,
          driver_name,
          vehicle_number,
          assigned_staff_id
        ),
        customer:customers(
          id,
          name,
          phone,
          email,
          address
        )
      `)
      .order("created_at", { ascending: false })
    
    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }
    
    if (franchise_id) {
      query = query.eq("franchise_id", franchise_id)
    }
    
    const { data: returns, error } = await query
    
    if (error) {
      console.error("Error fetching returns:", error)
      return NextResponse.json(
        { error: "Failed to fetch returns", details: error.message },
        { status: 500 }
      )
    }
    
    // For each return, fetch the items with product details
    const enrichedReturns = await Promise.all(
      (returns || []).map(async (returnRecord) => {
        // Get booking details based on source
        let booking = null
        if (returnRecord.booking_source === "product_order") {
          const { data: po } = await supabase
            .from("product_orders")
            .select("order_number, order_type, event_date, delivery_date, return_date")
            .eq("id", returnRecord.booking_id)
            .maybeSingle()
          booking = po
        } else if (returnRecord.booking_source === "package_booking") {
          const { data: pb } = await supabase
            .from("package_bookings")
            .select("package_number, event_date, delivery_date, return_date")
            .eq("id", returnRecord.booking_id)
            .maybeSingle()
          booking = { ...pb, order_type: "rental" }
        }
        
        // Get return items
        const { data: items } = await supabase
          .from("return_items")
          .select(`
            *,
            product:products(
              id,
              name,
              product_code,
              category,
              image_url
            )
          `)
          .eq("return_id", returnRecord.id)
        
        return {
          ...returnRecord,
          booking,
          items: items || []
        }
      })
    )
    
    let finalReturns = enrichedReturns
    if (user.role === 'staff') {
      finalReturns = enrichedReturns.filter(
        (r) => r.delivery?.assigned_staff_id === user.id
      )
    }
    
    return NextResponse.json({
      success: true,
      returns: finalReturns,
      count: finalReturns.length
    })
  } catch (error: any) {
    console.error("Error in GET /api/returns:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

// Legacy POST endpoint for rental_returns compatibility
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request as NextRequest, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const userCtx = auth.authContext!.user
    const supabase = createClient()
    const body = await request.json()
    const { deliveryId, bookingId, items, notes } = body || {}

    if (!bookingId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "bookingId and items are required" }, { status: 400 })
    }

    const { data: bookingRecord, error: bookingError } = await supabase
      .from("bookings")
      .select("id, franchise_id")
      .eq("id", bookingId)
      .single()

    if (bookingError || !bookingRecord) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(userCtx, bookingRecord.franchise_id)) {
      return NextResponse.json({ success: false, error: "Access denied to this franchise" }, { status: 403 })
    }

    // Basic validation for each item
    for (const it of items) {
      const d = Number(it.qty_delivered || 0)
      const r = Number(it.qty_returned || 0)
      const dm = Number(it.qty_damaged || 0)
      const l = Number(it.qty_lost || 0)
      if (r < 0 || dm < 0 || l < 0 || d < 0) {
        return NextResponse.json({ success: false, error: "Quantities must be non-negative" }, { status: 400 })
      }
      if (r + dm + l !== d) {
        return NextResponse.json({ success: false, error: "returned + damaged + lost must equal delivered for all items" }, { status: 400 })
      }
    }

    // Create rental_returns header
    const { data: ret, error: retErr } = await supabase
      .from("rental_returns")
      .insert({ booking_id: bookingId, delivery_id: deliveryId || null, processed_by: userCtx.id, notes: notes || null })
      .select("id")
      .single()

    if (retErr) throw retErr

    const returnId = ret.id

    // Insert items
    const rows = items.map((it: any) => ({
      return_id: returnId,
      product_id: it.product_id,
      qty_delivered: Number(it.qty_delivered || 0),
      qty_returned: Number(it.qty_returned || 0),
      qty_damaged: Number(it.qty_damaged || 0),
      qty_lost: Number(it.qty_lost || 0),
      notes: it.notes || null,
    }))

    const { error: itemsErr } = await supabase.from("rental_return_items").insert(rows)
    if (itemsErr) throw itemsErr

    // Aggregate totals for booking summary and inventory updates per product
    let totalDamaged = 0
    let totalLost = 0

    for (const r of rows) {
      totalDamaged += r.qty_damaged
      totalLost += r.qty_lost

      // Inventory adjustments on products table
      // returned -> increase available (stock_available) and decrease stock_booked if tracked
      // damaged -> increase stock_damaged
      // lost -> decrease stock_total and stock_available

      // Fetch current product snapshot (best-effort)
      const { data: prod } = await supabase
        .from("products")
        .select("id, stock_total, stock_available, stock_booked, stock_damaged")
        .eq("id", r.product_id)
        .eq("franchise_id", bookingRecord.franchise_id)
        .maybeSingle()

      // Compute new values safely
      const stock_total = Math.max(0, (prod?.stock_total || 0) - r.qty_lost)
      const stock_available = Math.max(0, (prod?.stock_available || 0) + r.qty_returned - r.qty_lost)
      const stock_damaged = Math.max(0, (prod?.stock_damaged || 0) + r.qty_damaged)
      const stock_booked = Math.max(0, (prod?.stock_booked || 0) - r.qty_delivered) // whole delivered batch no longer booked

      await supabase
        .from("products")
        .update({ stock_total, stock_available, stock_damaged, stock_booked })
        .eq("id", r.product_id)
        .eq("franchise_id", bookingRecord.franchise_id)
    }

    // Push damaged/lost summary into booking (accumulative)
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, settlement_details")
      .eq("id", bookingId)
      .maybeSingle()

    const settlement_details = existing?.settlement_details || {}
    const returnsSummary = settlement_details.returns_summary || { damaged: 0, lost: 0 }
    returnsSummary.damaged = Number(returnsSummary.damaged || 0) + totalDamaged
    returnsSummary.lost = Number(returnsSummary.lost || 0) + totalLost

    const newDetails = { ...settlement_details, returns_summary: returnsSummary }

    await supabase
      .from("bookings")
      .update({ settlement_details: newDetails })
      .eq("id", bookingId)
      .eq("franchise_id", bookingRecord.franchise_id)

    // Audit log
    try {
      await AuditLogger.logCreate("rental_returns", returnId, { booking_id: bookingId, delivery_id: deliveryId, totals: { damaged: totalDamaged, lost: totalLost } }, {
        userId: userCtx.id,
        userEmail: userCtx.email,
      })
    } catch (e) {
      console.warn("Audit log failed for rental return", e)
    }

    return NextResponse.json({ success: true, returnId })
  } catch (error: any) {
    console.error("Process return failed:", error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
