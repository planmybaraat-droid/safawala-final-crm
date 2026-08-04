import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createClient } from '@/lib/supabase/server'

// PUT /api/challans/[id] - update a challan
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Challan ID is required' }, { status: 400 })
    }

    // 🔒 SECURITY: Authenticate user (staff minimum)
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { user: authUser } = authResult.authContext!
    const franchiseId = authUser.franchise_id
    const isSuperAdmin = authUser.role === 'super_admin'

    const body = await req.json()
    const { status, party_name, mobile_number, narration, prepared_by, total_amount, items } = body

    const supabase = createClient()

    // Retrieve challan to verify ownership
    const { data: existingChallan, error: fetchError } = await supabase
      .from('challans')
      .select('franchise_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingChallan) {
      return NextResponse.json({ success: false, error: 'Challan not found' }, { status: 404 })
    }

    // 🔒 FRANCHISE ISOLATION: Verify franchise access
    if (!isSuperAdmin && franchiseId && existingChallan.franchise_id !== franchiseId) {
      return NextResponse.json({ success: false, error: 'Unauthorized franchise access' }, { status: 403 })
    }

    // Prepare update payload
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (party_name !== undefined) updateData.party_name = party_name
    if (mobile_number !== undefined) updateData.mobile_number = mobile_number
    if (narration !== undefined) updateData.narration = narration
    if (prepared_by !== undefined) updateData.prepared_by = prepared_by
    if (total_amount !== undefined) updateData.total_amount = Number(total_amount)
    
    updateData.updated_at = new Date().toISOString()

    // Perform Update
    const { data: updatedChallan, error: updateError } = await supabase
      .from('challans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating challan:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // If items are provided, replace them
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabase.from('challan_items').delete().eq('challan_id', id)

      // Insert new items
      const itemsData = items.map((item: any) => ({
        challan_id: id,
        item_details: item.item_details,
        qty: parseInt(item.qty) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseInt(item.qty) || 1) * (parseFloat(item.rate) || 0)
      }))

      const { error: itemsError } = await supabase
        .from('challan_items')
        .insert(itemsData)

      if (itemsError) {
        console.error('Error updating challan items:', itemsError)
        return NextResponse.json({ 
          success: false, 
          error: 'Challan header updated but failed to update items: ' + itemsError.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedChallan
    })
  } catch (error: any) {
    console.error('PUT /api/challans/[id] error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to update challan' }, { status: 500 })
  }
}

// DELETE /api/challans/[id] - delete a challan
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Challan ID is required' }, { status: 400 })
    }

    // 🔒 SECURITY: Authenticate user (staff minimum)
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { user: authUser } = authResult.authContext!
    const franchiseId = authUser.franchise_id
    const isSuperAdmin = authUser.role === 'super_admin'

    const supabase = createClient()

    // Retrieve challan to verify ownership
    const { data: existingChallan, error: fetchError } = await supabase
      .from('challans')
      .select('franchise_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingChallan) {
      return NextResponse.json({ success: false, error: 'Challan not found' }, { status: 404 })
    }

    // 🔒 FRANCHISE ISOLATION: Verify franchise access
    if (!isSuperAdmin && franchiseId && existingChallan.franchise_id !== franchiseId) {
      return NextResponse.json({ success: false, error: 'Unauthorized franchise access' }, { status: 403 })
    }

    // Delete challan. Cascade deletes items.
    const { error: deleteError } = await supabase
      .from('challans')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting challan:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Challan deleted successfully'
    })
  } catch (error: any) {
    console.error('DELETE /api/challans/[id] error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete challan' }, { status: 500 })
  }
}
