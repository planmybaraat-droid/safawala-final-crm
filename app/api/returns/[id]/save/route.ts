import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, canAccessFranchise } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = 'nodejs'

/**
 * POST /api/returns/[id]/save
 * Save return details without processing (no inventory changes)
 * This allows saving client info, photo, and item quantities for later processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate and check permissions
    const auth = await authenticateRequest(request, { minRole: "staff" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const user = auth.user!

    const supabase = createClient()
    const returnId = params.id
    const body = await request.json()
    
    const { items, notes, client_name, client_phone, photo_url } = body
    
    // Get current return record
    const { data: returnRecord, error: returnError } = await supabase
      .from("returns")
      .select("*, booking:booking_id(*)")
      .eq("id", returnId)
      .single()
    
    if (returnError || !returnRecord) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      )
    }

    // Check franchise access
    if (!canAccessFranchise(user as any, returnRecord.franchise_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    // Update return record with client info and notes
    const updateData: any = {
      notes: notes || returnRecord.notes,
      return_confirmation_name: client_name || null,
      return_confirmation_phone: client_phone || null,
      return_photo_url: photo_url || null,
      updated_at: new Date().toISOString(),
    }
    
    const { error: updateError } = await supabase
      .from("returns")
      .update(updateData)
      .eq("id", returnId)
      .eq("franchise_id", returnRecord.franchise_id)
    
    if (updateError) {
      console.error("Error updating return:", updateError)
      return NextResponse.json(
        { error: "Failed to update return", details: updateError.message },
        { status: 500 }
      )
    }
    
    // Save item quantities to return_items table (upsert)
    if (items && items.length > 0) {
      for (const item of items) {
        const itemData = {
          return_id: returnId,
          product_id: item.product_id,
          qty_delivered: item.qty_delivered,
          qty_returned: item.qty_returned,
          qty_not_used: item.qty_not_used || 0,
          qty_damaged: item.qty_damaged || 0,
          qty_lost: item.qty_lost || 0,
          qty_to_laundry: item.qty_to_laundry || 0,
          damage_reason: item.damage_reason || null,
          damage_description: item.damage_description || null,
          damage_severity: item.damage_severity || null,
          lost_reason: item.lost_reason || null,
          lost_description: item.lost_description || null,
          notes: item.notes || null,
          updated_at: new Date().toISOString(),
        }
        
        // Check if item already exists
        const { data: existingItem } = await supabase
          .from("return_items")
          .select("id")
          .eq("return_id", returnId)
          .eq("product_id", item.product_id)
          .single()
        
        if (existingItem) {
          // Update existing item
          await supabase
            .from("return_items")
          .update(itemData)
          .eq("id", existingItem.id)
          .eq("return_id", returnId)
        } else {
          // Insert new item
          await supabase
            .from("return_items")
            .insert({
              ...itemData,
              created_at: new Date().toISOString(),
            })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Return details saved successfully. No inventory changes made.",
    })
    
  } catch (error: any) {
    console.error("Error in save return API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
