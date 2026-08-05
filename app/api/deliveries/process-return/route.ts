import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest, canAccessFranchise } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ReturnItem {
  id: string
  product_id?: string
  variant_id?: string
  product_name: string
  variant_name?: string
  barcode?: string
  quantity: number
  lost_damaged: number
  used: number
  fresh: number
  unit_price?: number
}

/**
 * POST /api/deliveries/process-return
 * Process return: 
 * - USED items → Laundry (auto-create laundry entry)
 * - FRESH items → Back to Inventory (+stock)
 * - LOST/DAMAGED items → Archive (NO stock increment) + Add to Invoice
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff", requirePermission: "delivery.update" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    const {
      delivery_id,
      booking_id,
      booking_source,
      items,
      client_name,
      client_phone,
      notes,
      photo_url,
    } = body

    if (!delivery_id || !booking_id || !items?.length) {
      return NextResponse.json(
        { error: "delivery_id, booking_id, and items are required" },
        { status: 400 }
      )
    }

    const typedItems = items as ReturnItem[]
    let usedToLaundry = 0
    let freshToInventory = 0
    let lostDamagedCount = 0
    let lostDamagedCharge = 0

    // Determine which table to update
    const itemsTable = booking_source === "package_booking"
      ? "package_booking_product_items"
      : "product_order_items"

    const bookingTable = booking_source === "package_booking"
      ? "package_bookings"
      : "product_orders"

    // Get delivery details for reference
    const { data: delivery } = await supabaseServer
      .from("deliveries")
      .select("delivery_number, customer_id, franchise_id")
      .eq("id", delivery_id)
      .single()

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    if (!canAccessFranchise(auth.user as any, delivery.franchise_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[Process Return] Starting return processing for delivery:", delivery?.delivery_number)

    // Process each item
    for (const item of typedItems) {
      // 1. Update item with return quantities
      try {
        await supabaseServer
          .from(itemsTable)
          .update({
            return_lost_damaged: item.lost_damaged,
            return_used: item.used,
            return_fresh: item.fresh,
            return_processed: true,
            return_processed_at: new Date().toISOString(),
          })
          .eq("id", item.id)
      } catch (itemErr) {
        console.warn(`[Process Return] Could not update item ${item.id} return quantities:`, itemErr)
      }

      // Count totals
      if (item.used > 0) usedToLaundry += item.used
      if (item.fresh > 0) freshToInventory += item.fresh
      if (item.lost_damaged > 0) lostDamagedCount += item.lost_damaged

      // ===================================================================
      // 2. USED items → Create LAUNDRY entry (auto-filled, user edits later)
      // ===================================================================
      if (item.used > 0) {
        try {
          await supabaseServer.from("laundry_items").insert({
            variant_id: item.variant_id || null,
            product_id: item.product_id || null,
            product_name: item.product_name,
            variant_name: item.variant_name || null,
            quantity: item.used,
            status: "pending",
            source: "delivery_return",
            source_id: delivery_id,
            booking_id: booking_id,
            franchise_id: auth.user?.franchise_id,
            created_by: auth.user?.id,
            notes: `Auto-added from return processing - ${delivery?.delivery_number || 'Unknown'} - ${item.used} items need cleaning`,
          })
          console.log(`[Process Return] ✅ Created laundry entry for ${item.product_name} x${item.used}`)
        } catch (laundryErr) {
          console.warn(`[Process Return] Could not create laundry entry:`, laundryErr)
        }
      }

      // ===================================================================
      // 3. FRESH items → Back to INVENTORY (increase stock)
      // ===================================================================
      if (item.fresh > 0 && item.variant_id) {
        try {
          const { data: variant } = await supabaseServer
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", item.variant_id)
            .single()

          if (variant) {
            const newStock = (variant.stock_quantity || 0) + item.fresh
            await supabaseServer
              .from("product_variants")
              .update({
                stock_quantity: newStock,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.variant_id)

            console.log(`[Process Return] ✅ Restored ${item.fresh} items to inventory for ${item.product_name}`)

            // Log inventory movement
            try {
              await supabaseServer.from("inventory_movements").insert({
                variant_id: item.variant_id,
                product_id: item.product_id,
                movement_type: "return_fresh",
                quantity: item.fresh,
                previous_stock: variant.stock_quantity || 0,
                new_stock: newStock,
                reference_type: "delivery_return",
                reference_id: delivery_id,
                notes: `Fresh items returned from ${delivery?.delivery_number || 'delivery'}`,
                franchise_id: auth.user?.franchise_id,
                created_by: auth.user?.id,
              })
            } catch (movementErr) {
              console.warn(`[Process Return] Could not log inventory movement:`, movementErr)
            }
          }
        } catch (stockErr) {
          console.warn(`[Process Return] Could not update stock:`, stockErr)
        }
      }

      // ===================================================================
      // 4. LOST/DAMAGED items → ARCHIVE (NO stock change) + Add to INVOICE
      // ===================================================================
      if (item.lost_damaged > 0) {
        // Get product price for charging
        let chargePerItem = item.unit_price || 0
        if (!chargePerItem && item.product_id) {
          try {
            const { data: product } = await supabaseServer
              .from("products")
              .select("rental_price, sale_price")
              .eq("id", item.product_id)
              .single()
            chargePerItem = product?.sale_price || product?.rental_price || 0
          } catch (priceErr) {
            console.warn(`[Process Return] Could not get product price:`, priceErr)
          }
        }

        const totalCharge = chargePerItem * item.lost_damaged
        lostDamagedCharge += totalCharge

        // 4a. Add to PRODUCT_ARCHIVE (permanent record, NO stock increment)
        try {
          await supabaseServer.from("product_archive").insert({
            product_id: item.product_id || null,
            variant_id: item.variant_id || null,
            product_name: item.product_name,
            variant_name: item.variant_name || null,
            quantity: item.lost_damaged,
            reason: "lost_damaged",
            source: "delivery_return",
            source_id: delivery_id,
            booking_id: booking_id,
            franchise_id: auth.user?.franchise_id,
            created_by: auth.user?.id,
            notes: `Lost/Damaged during return - ${delivery?.delivery_number || 'Unknown'} - Charged: ₹${totalCharge}`,
          })
          console.log(`[Process Return] ✅ Archived ${item.lost_damaged} lost/damaged items: ${item.product_name}`)
        } catch (archiveErr) {
          console.warn("Could not insert to product_archive:", archiveErr)
        }

        // 4b. Add to ORDER_LOST_DAMAGED_ITEMS (for invoice charging)
        try {
          await supabaseServer.from("order_lost_damaged_items").insert({
            order_id: booking_id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            barcode: item.barcode || null,
            type: "damaged", // or "lost" - could be specified per item
            quantity: item.lost_damaged,
            charge_per_item: chargePerItem,
            total_charge: totalCharge,
            notes: `Auto-added from return processing - ${delivery?.delivery_number || 'Unknown'}`,
          })
          console.log(`[Process Return] ✅ Added lost/damaged charge to invoice: ${item.product_name} x${item.lost_damaged} = ₹${totalCharge}`)
        } catch (invoiceErr) {
          console.warn("Could not add to order_lost_damaged_items:", invoiceErr)
        }

        // 4c. Update booking's lost_damaged_items JSON (for quick reference)
        try {
          const { data: booking } = await supabaseServer
            .from(bookingTable)
            .select("lost_damaged_items, total_amount")
            .eq("id", booking_id)
            .single()

          const existingLostDamaged = booking?.lost_damaged_items || []
          const newLostDamagedEntry = {
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            variant_name: item.variant_name,
            quantity: item.lost_damaged,
            charge_per_item: chargePerItem,
            total_charge: totalCharge,
            reported_at: new Date().toISOString(),
            reported_by: auth.user?.name || auth.user?.email,
            source: "return_processing",
          }

          // Update booking with lost/damaged info AND update total amount
          const newTotal = (booking?.total_amount || 0) + totalCharge
          await supabaseServer
            .from(bookingTable)
            .update({
              lost_damaged_items: [...existingLostDamaged, newLostDamagedEntry],
              total_amount: newTotal,
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking_id)
          
          console.log(`[Process Return] ✅ Updated booking total: ₹${booking?.total_amount || 0} → ₹${newTotal}`)
        } catch (bookingErr) {
          console.warn(`[Process Return] Could not update booking lost/damaged items:`, bookingErr)
        }
      }
    }

    // 5. Update delivery status and return timestamp
    // Note: Check constraint only allows: pending, in_transit, delivered, cancelled
    // We update all fields in one call to ensure returned_at is set
    const updateFields: any = {
      status: "delivered",
      updated_at: new Date().toISOString(),
    }

    // Add return fields - these should exist if the migration was run
    updateFields.returned_at = new Date().toISOString()
    if (client_name) updateFields.return_confirmation_name = client_name
    if (client_phone) updateFields.return_confirmation_phone = client_phone
    if (notes) updateFields.return_notes = notes
    if (photo_url) updateFields.return_photo_url = photo_url
    if (auth.user?.id) updateFields.return_processed_by = auth.user.id

    const { error: statusError } = await supabaseServer
      .from("deliveries")
      .update(updateFields)
      .eq("id", delivery_id)

    if (statusError) {
      console.error("[Process Return] Failed to update delivery:", statusError)
      // If it fails, try with just the basic fields
      const { error: basicError } = await supabaseServer
        .from("deliveries")
        .update({
          status: "delivered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery_id)
      
      if (basicError) {
        throw new Error(`Failed to update delivery status: ${basicError.message}`)
      }
      console.warn("[Process Return] Updated with basic fields only (some columns may not exist)")
    } else {
      console.log("[Process Return] ✅ Updated delivery with all return fields including returned_at")
    }

    // 6. Update booking return status
    try {
      await supabaseServer
        .from(bookingTable)
        .update({
          return_status: "completed",
          return_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking_id)
    } catch (bookingErr) {
      console.warn("[Process Return] Booking return status not updated:", bookingErr)
    }

    console.log(`[Process Return] ✅ Complete! Laundry: ${usedToLaundry}, Inventory: ${freshToInventory}, Lost/Damaged: ${lostDamagedCount} (₹${lostDamagedCharge})`)

    return NextResponse.json({
      success: true,
      message: "Return processed successfully",
      used_to_laundry: usedToLaundry,
      fresh_to_inventory: freshToInventory,
      lost_damaged_count: lostDamagedCount,
      lost_damaged_charge: lostDamagedCharge,
    })
  } catch (error: any) {
    console.error("[Process Return] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
