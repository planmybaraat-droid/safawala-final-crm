import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, canAccessFranchise } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

/**
 * POST /api/deliveries/[id]/unified-handover
 * Unified handover capturing: recipient info, photo, signature, and item categorization
 * Updates inventory based on categories: used→laundry, not-used→available, damaged/lost→archive
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff", requirePermission: "delivery.update" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const user = auth.user!

    const supabase = createClient()
    const deliveryId = params.id
    const body = await request.json()

    const {
      recipient_name,
      recipient_phone,
      photo_url,
      signature_url,
      items: itemUpdates
    } = body

    // Validate required fields
    if (!recipient_name || !recipient_phone) {
      return NextResponse.json(
        { error: "Recipient name and phone are required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(itemUpdates) || itemUpdates.length === 0) {
      return NextResponse.json(
        { error: "At least one item must be provided" },
        { status: 400 }
      )
    }

    // Fetch delivery
    const { data: delivery, error: delErr } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single()

    if (delErr || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    // Check franchise access
    if (!canAccessFranchise(user as any, delivery.franchise_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update delivery with handover info
    const { error: updateDelError } = await supabase
      .from("deliveries")
      .update({
        recipient_name,
        recipient_phone,
        handover_photo_url: photo_url,
        handover_signature_url: signature_url,
        updated_at: new Date().toISOString()
      })
      .eq("id", deliveryId)

    if (updateDelError) {
      console.error("Error updating delivery:", updateDelError)
      return NextResponse.json(
        { error: "Failed to update delivery" },
        { status: 500 }
      )
    }

    // Process each item and update inventory
    for (const itemUpdate of itemUpdates) {
      const {
        product_id,
        qty_used,
        qty_not_used,
        qty_damaged,
        qty_lost,
        damage_reason,
        damage_notes
      } = itemUpdate

      // Upsert handover item record
      const { error: handoverError } = await supabase
        .from("delivery_handover_items")
        .upsert({
          delivery_id: deliveryId,
          product_id,
          qty_used: qty_used || 0,
          qty_not_used: qty_not_used || 0,
          qty_damaged: qty_damaged || 0,
          qty_lost: qty_lost || 0,
          damage_reason: damage_reason || null,
          damage_notes: damage_notes || null,
          handover_completed_at: new Date().toISOString(),
          franchise_id: delivery.franchise_id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "delivery_id,product_id"
        })

      if (handoverError) {
        console.error("Error saving handover item:", handoverError)
        return NextResponse.json(
          { error: "Failed to save handover items" },
          { status: 500 }
        )
      }

      // Get current product stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("available_qty, booked_qty")
        .eq("id", product_id)
        .eq("franchise_id", delivery.franchise_id)
        .single()

      if (productError || !product) {
        console.error("Product not found:", product_id)
        continue
      }

      // ============================================================
      // INVENTORY UPDATES BASED ON CATEGORIZATION
      // ============================================================

      // 1. Not Used → Goes back to Available Inventory
      if (qty_not_used > 0) {
        const { error: invError } = await supabase
          .from("products")
          .update({
            available_qty: product.available_qty + qty_not_used,
            booked_qty: Math.max(0, product.booked_qty - qty_not_used)
          })
          .eq("id", product_id)
          .eq("franchise_id", delivery.franchise_id)

        if (invError) {
          console.error("Error updating available inventory:", invError)
        }
      }

      // 2. Used → Send to Laundry Batch (if applicable)
      if (qty_used > 0 && delivery.booking_type === "rental") {
        // Create or add to laundry batch
        const { data: existingBatch, error: batchErr } = await supabase
          .from("laundry_batches")
          .select("id")
          .eq("delivery_id", deliveryId)
          .eq("status", "pending")
          .maybeSingle()

        let laundryBatchId = existingBatch?.id

        if (!laundryBatchId) {
          const { data: newBatch, error: createErr } = await supabase
            .from("laundry_batches")
            .insert({
              delivery_id: deliveryId,
              franchise_id: delivery.franchise_id,
              status: "pending",
              created_by: user.id
            })
            .select("id")
            .single()

          if (!createErr && newBatch) {
            laundryBatchId = newBatch.id
          }
        }

        // Add items to laundry batch
        if (laundryBatchId) {
          const { error: laundryItemErr } = await supabase
            .from("laundry_batch_items")
            .insert({
              laundry_batch_id: laundryBatchId,
              product_id,
              quantity: qty_used,
              franchise_id: delivery.franchise_id
            })

          if (laundryItemErr) {
            console.error("Error adding to laundry batch:", laundryItemErr)
          }
        }
      }

      // 3. Damaged/Lost → Send to Archive
      if ((qty_damaged > 0 || qty_lost > 0)) {
        const archiveQty = qty_damaged + qty_lost
        
        // Create product archive entry
        const { error: archiveError } = await supabase
          .from("product_archive")
          .insert({
            product_id,
            quantity: archiveQty,
            reason: qty_damaged > 0 ? "damaged" : "lost",
            damage_reason: damage_reason || null,
            notes: damage_notes || null,
            reference_type: "delivery",
            reference_id: deliveryId,
            franchise_id: delivery.franchise_id,
            archived_by: user.id
          })

        if (archiveError) {
          console.error("Error archiving product:", archiveError)
        }

        // Update available inventory (reduce by damaged/lost amount)
        const { error: invError } = await supabase
          .from("products")
          .update({
            available_qty: Math.max(0, product.available_qty - archiveQty),
            booked_qty: Math.max(0, product.booked_qty - archiveQty)
          })
          .eq("id", product_id)
          .eq("franchise_id", delivery.franchise_id)

        if (invError) {
          console.error("Error updating inventory for archived items:", invError)
        }
      }
    }

    // Auto-create return for rentals (if not already created)
    let returnCreated = false
    if (delivery.booking_type === "rental") {
      const { data: existingReturn } = await supabase
        .from("returns")
        .select("id")
        .eq("delivery_id", deliveryId)
        .maybeSingle()

      if (!existingReturn) {
        // Generate return number
        const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

        const { data: newReturn, error: returnErr } = await supabase
          .from("returns")
          .insert({
            return_number: returnNumber,
            delivery_id: deliveryId,
            booking_id: delivery.booking_id,
            booking_source: delivery.booking_source,
            customer_id: delivery.customer_id,
            franchise_id: delivery.franchise_id,
            status: "pending",
            return_date: new Date().toISOString().slice(0, 10),
            notes: `Auto-created from unified handover on ${new Date().toLocaleString()}`
          })
          .select("id")
          .single()

        if (!returnErr && newReturn) {
          returnCreated = true
          console.log(`✅ Return created: ${returnNumber}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Handover completed successfully. Inventory updated.",
      return_created: returnCreated
    })

  } catch (error: any) {
    console.error("Error in POST /api/deliveries/[id]/unified-handover:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
