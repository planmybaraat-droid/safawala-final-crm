import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, canAccessFranchise } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

/**
 * GET /api/deliveries/[id]/handover
 * Returns saved handover (not tied) items for a delivery
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff", requirePermission: "deliveries" })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    const user = auth.user!

    const supabase = createClient()
    const deliveryId = params.id

    // Fetch delivery (for franchise isolation)
    const { data: delivery, error: delErr } = await supabase
      .from("deliveries")
      .select("id, franchise_id")
      .eq("id", deliveryId)
      .single()

    if (delErr || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    if (!canAccessFranchise(user as any, delivery.franchise_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: items, error } = await supabase
      .from("delivery_handover_items")
  .select("product_id, qty_not_tied, notes, restocked_qty, returned_restocked_qty, returned_laundry_qty")
      .eq("delivery_id", deliveryId)

    if (error) {
      return NextResponse.json({ error: "Failed to fetch handover items" }, { status: 500 })
    }

    return NextResponse.json({ success: true, items: items || [] })
  } catch (error: any) {
    console.error("[Handover API][GET] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

interface HandoverItem {
  product_id: string
  qty_not_tied: number
  notes?: string
  // New: items returned during delivery (immediate handover)
  returned_now_qty?: number
  returned_now_process?: "restock" | "laundry"
}

/**
 * POST /api/deliveries/[id]/handover
 * Saves per-product handover quantities (not tied at delivery).
 * Inventory is NOT updated here; this is used to prefill the final return.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff", requirePermission: "deliveries" })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    const user = auth.user!

    const supabase = createClient()
    const deliveryId = params.id
    const body = await request.json()
    const items: HandoverItem[] = Array.isArray(body?.items) ? body.items : []
    const restockNow: boolean = Boolean(body?.restock_now)

    if (!items.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    // Fetch delivery to confirm franchise and existence
    const { data: delivery, error: delErr } = await supabase
      .from("deliveries")
      .select("id, franchise_id")
      .eq("id", deliveryId)
      .single()

    if (delErr || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    if (!canAccessFranchise(user as any, delivery.franchise_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Basic validation: non-negative integers
    for (const it of items) {
      if (!it.product_id || typeof it.qty_not_tied !== "number" || it.qty_not_tied < 0) {
        return NextResponse.json({ error: "Invalid item payload" }, { status: 400 })
      }
      if (it.returned_now_qty !== undefined) {
        if (typeof it.returned_now_qty !== "number" || it.returned_now_qty < 0) {
          return NextResponse.json({ error: "Invalid returned_now_qty" }, { status: 400 })
        }
        if (it.returned_now_qty > 0 && it.returned_now_process !== "restock" && it.returned_now_process !== "laundry") {
          return NextResponse.json({ error: "returned_now_process must be 'restock' or 'laundry' when quantity > 0" }, { status: 400 })
        }
      }
    }

    // Upsert by (delivery_id, product_id)
    const upserts = items.map((it) => ({
      delivery_id: deliveryId,
      product_id: it.product_id,
      qty_not_tied: Math.floor(it.qty_not_tied),
      notes: it.notes || null,
      franchise_id: delivery.franchise_id,
      updated_at: new Date().toISOString(),
    }))

    // Perform upsert using unique constraint
    const { error: upsertErr } = await supabase
      .from("delivery_handover_items")
      .upsert(upserts, { onConflict: "delivery_id,product_id" })

    if (upsertErr) {
      console.error("[Handover API][POST] Upsert error:", upsertErr)
      return NextResponse.json({ error: "Failed to save handover items" }, { status: 500 })
    }

  // Optionally restock now: increase available and decrease booked by delta not already restocked
    if (restockNow) {
      // 1) Fetch existing handover rows to know restocked_qty
      const productIds = items.map(i => i.product_id)
      const { data: existingRows, error: fetchErr } = await supabase
        .from("delivery_handover_items")
        .select("product_id, qty_not_tied, restocked_qty")
        .eq("delivery_id", deliveryId)
        .in("product_id", productIds)

      if (fetchErr) {
        console.error("[Handover API][POST] Fetch existing rows error:", fetchErr)
        return NextResponse.json({ error: "Failed to load handover state for restock" }, { status: 500 })
      }
      const restockedMap = new Map<string, number>()
      for (const r of existingRows || []) {
        restockedMap.set(r.product_id, Number(r.restocked_qty) || 0)
      }

      // 2) For each item, compute delta to restock now
      for (const it of items) {
        const already = restockedMap.get(it.product_id) || 0
        const target = Math.max(0, Math.floor(it.qty_not_tied))
        const delta = Math.max(0, target - already)
        if (delta === 0) continue

        // Update products inventory: available + delta, booked - delta (clamped >=0)
        const { data: prod, error: pErr } = await supabase
          .from("products")
          .select("id, stock_available, stock_booked")
          .eq("id", it.product_id)
          .eq("franchise_id", delivery.franchise_id)
          .single()
        if (pErr || !prod) {
          console.warn("[Handover API][POST] Product not found for restock:", it.product_id)
          continue
        }
        const newAvail = (prod.stock_available || 0) + delta
        const newBooked = Math.max(0, (prod.stock_booked || 0) - delta)
        const { error: invErr } = await supabase
          .from("products")
          .update({ stock_available: newAvail, stock_booked: newBooked })
          .eq("id", it.product_id)
          .eq("franchise_id", delivery.franchise_id)
        if (invErr) {
          console.error("[Handover API][POST] Inventory update failed:", invErr)
          continue
        }

        // Update handover row restocked_qty
        const { error: updErr } = await supabase
          .from("delivery_handover_items")
          .update({ restocked_qty: already + delta, restocked_at: new Date().toISOString() })
          .eq("delivery_id", deliveryId)
          .eq("product_id", it.product_id)
        if (updErr) {
          console.error("[Handover API][POST] Failed to bump restocked_qty:", updErr)
        }
      }
    }

    // Process items returned during delivery with per-process idempotent updates
    {
      const productIds = items.map(i => i.product_id)
      const { data: existingRows2, error: fetchErr2 } = await supabase
        .from("delivery_handover_items")
        .select("product_id, returned_restocked_qty, returned_laundry_qty")
        .eq("delivery_id", deliveryId)
        .in("product_id", productIds)
      if (fetchErr2) {
        console.error("[Handover API][POST] Fetch existing returned rows error:", fetchErr2)
        return NextResponse.json({ error: "Failed to load handover returned state" }, { status: 500 })
      }

      const returnedMap: Record<string, { restocked: number; laundry: number }> = {}
      for (const r of existingRows2 || []) {
        returnedMap[r.product_id] = {
          restocked: Number(r.returned_restocked_qty) || 0,
          laundry: Number(r.returned_laundry_qty) || 0,
        }
      }

      for (const it of items) {
        const provided = Math.max(0, Math.floor(it.returned_now_qty || 0))
        if (provided === 0) continue
        const process = it.returned_now_process === "laundry" ? "laundry" : "restock"
        const prev = returnedMap[it.product_id] || { restocked: 0, laundry: 0 }
        const currentVal = process === "restock" ? prev.restocked : prev.laundry
        const delta = Math.max(0, provided - currentVal)
        if (delta === 0) continue

        // Update inventory based on process
        const { data: prod, error: pErr } = await supabase
          .from("products")
          .select("id, stock_available, stock_booked, stock_in_laundry")
          .eq("id", it.product_id)
          .eq("franchise_id", delivery.franchise_id)
          .single()
        if (pErr || !prod) {
          console.warn("[Handover API][POST] Product not found for returned-now:", it.product_id)
          continue
        }

        let update: any
        if (process === "restock") {
          update = {
            stock_available: (prod.stock_available || 0) + delta,
            stock_booked: Math.max(0, (prod.stock_booked || 0) - delta),
          }
        } else {
          update = {
            stock_in_laundry: (prod.stock_in_laundry || 0) + delta,
            stock_booked: Math.max(0, (prod.stock_booked || 0) - delta),
          }
        }
        const { error: invErr2 } = await supabase
          .from("products")
          .update(update)
          .eq("id", it.product_id)
          .eq("franchise_id", delivery.franchise_id)
        if (invErr2) {
          console.error("[Handover API][POST] Inventory update (returned-now) failed:", invErr2)
          continue
        }

        // Bump the appropriate column to the provided absolute value
        const upd: any = process === "restock"
          ? { returned_restocked_qty: provided }
          : { returned_laundry_qty: provided }
        const { error: updErr2 } = await supabase
          .from("delivery_handover_items")
          .update(upd)
          .eq("delivery_id", deliveryId)
          .eq("product_id", it.product_id)
        if (updErr2) {
          console.error("[Handover API][POST] Failed to update returned-now column:", updErr2)
        }
      }
    }

    return NextResponse.json({ success: true, saved: items.length, restocked: restockNow })
  } catch (error: any) {
    console.error("[Handover API][POST] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
