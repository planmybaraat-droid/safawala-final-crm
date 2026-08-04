import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Fetch batch items by batch ID
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')

    if (!batchId) {
      return NextResponse.json({ error: "batch_id is required" }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from("laundry_batch_items")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching batch items:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("Error in batch items GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update batch items (delete old and insert new)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const body = await request.json()
    const { batch_id, items, total_items, total_cost } = body

    if (!batch_id) {
      return NextResponse.json({ error: "batch_id is required" }, { status: 400 })
    }

    // Update batch totals
    const { error: batchError } = await supabaseServer
      .from("laundry_batches")
      .update({
        total_items: total_items,
        total_cost: total_cost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch_id)

    if (batchError) {
      console.error("Error updating batch:", batchError)
      return NextResponse.json({ error: batchError.message }, { status: 500 })
    }

    // Delete existing items
    const { error: deleteError } = await supabaseServer
      .from("laundry_batch_items")
      .delete()
      .eq("batch_id", batch_id)

    if (deleteError) {
      console.error("Error deleting batch items:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        ...item,
        batch_id: batch_id,
      }))

      const { error: insertError } = await supabaseServer
        .from("laundry_batch_items")
        .insert(itemsToInsert)

      if (insertError) {
        console.error("Error inserting batch items:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in batch items PUT:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
