import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Fetch all laundry batches
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseServer
      .from("laundry_batches")
      .select("*")
      .eq("franchise_id", franchiseId)
      .order("created_at", { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching laundry batches:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("Error in laundry GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new laundry batch
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id
    const userId = authContext!.user.id

    const body = await request.json()
    const { batch, items } = body

    if (!batch || !items || items.length === 0) {
      return NextResponse.json({ error: "Batch and items are required" }, { status: 400 })
    }

    // Create the batch with franchise_id
    const { data: batchData, error: batchError } = await supabaseServer
      .from("laundry_batches")
      .insert({
        ...batch,
        franchise_id: franchiseId,
        created_by: userId,
      })
      .select()
      .single()

    if (batchError) {
      console.error("Error creating batch:", batchError)
      return NextResponse.json({ error: batchError.message }, { status: 500 })
    }

    // Create batch items (no franchise_id on this table)
    const batchItemsToInsert = items.map((item: any) => ({
      ...item,
      batch_id: batchData.id,
    }))

    const { error: itemsError } = await supabaseServer
      .from("laundry_batch_items")
      .insert(batchItemsToInsert)

    if (itemsError) {
      console.error("Error creating batch items:", itemsError)
      // Rollback the batch creation
      await supabaseServer.from("laundry_batches").delete().eq("id", batchData.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json(batchData)
  } catch (error: any) {
    console.error("Error in laundry POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update a laundry batch
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from("laundry_batches")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("franchise_id", franchiseId)
      .select()
      .single()

    if (error) {
      console.error("Error updating batch:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in laundry PATCH:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a laundry batch
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 })
    }

    // Delete batch items first
    await supabaseServer
      .from("laundry_batch_items")
      .delete()
      .eq("batch_id", id)

    // Delete the batch
    const { error } = await supabaseServer
      .from("laundry_batches")
      .delete()
      .eq("id", id)
      .eq("franchise_id", franchiseId)

    if (error) {
      console.error("Error deleting batch:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in laundry DELETE:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
