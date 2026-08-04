import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createClient } from '@/lib/supabase/server'

// PUT /api/vouchers/[id] - update a voucher
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Voucher ID is required' }, { status: 400 })
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
    const { 
      voucher_date, 
      voucher_type, 
      account_name, 
      amount, 
      payment_mode, 
      particulars, 
      narration, 
      amount_in_words, 
      receiver_name, 
      prepared_by,
      booking_id,
      booking_number
    } = body

    const supabase = createClient()

    // Retrieve voucher to verify ownership
    const { data: existingVoucher, error: fetchError } = await supabase
      .from('vouchers')
      .select('franchise_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingVoucher) {
      return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 })
    }

    // 🔒 FRANCHISE ISOLATION: Verify franchise access
    if (!isSuperAdmin && franchiseId && existingVoucher.franchise_id !== franchiseId) {
      return NextResponse.json({ success: false, error: 'Unauthorized franchise access' }, { status: 403 })
    }

    // Prepare update payload
    const updateData: any = {}
    if (voucher_date !== undefined) updateData.voucher_date = voucher_date
    if (voucher_type !== undefined) updateData.voucher_type = voucher_type
    if (account_name !== undefined) updateData.account_name = account_name
    if (amount !== undefined) updateData.amount = Number(amount)
    if (payment_mode !== undefined) updateData.payment_mode = payment_mode
    if (particulars !== undefined) updateData.particulars = particulars
    if (narration !== undefined) updateData.narration = narration
    if (amount_in_words !== undefined) updateData.amount_in_words = amount_in_words
    if (receiver_name !== undefined) updateData.receiver_name = receiver_name
    if (prepared_by !== undefined) updateData.prepared_by = prepared_by
    if (booking_id !== undefined) updateData.booking_id = booking_id
    if (booking_number !== undefined) updateData.booking_number = booking_number
    
    updateData.updated_at = new Date().toISOString()

    // Perform Update
    const { data: updatedVoucher, error: updateError } = await supabase
      .from('vouchers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating voucher:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedVoucher
    })
  } catch (error: any) {
    console.error('PUT /api/vouchers/[id] error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to update voucher' }, { status: 500 })
  }
}

// DELETE /api/vouchers/[id] - delete a voucher
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Voucher ID is required' }, { status: 400 })
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

    // Retrieve voucher to verify ownership
    const { data: existingVoucher, error: fetchError } = await supabase
      .from('vouchers')
      .select('franchise_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingVoucher) {
      return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 })
    }

    // 🔒 FRANCHISE ISOLATION: Verify franchise access
    if (!isSuperAdmin && franchiseId && existingVoucher.franchise_id !== franchiseId) {
      return NextResponse.json({ success: false, error: 'Unauthorized franchise access' }, { status: 403 })
    }

    // Delete voucher
    const { error: deleteError } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting voucher:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Voucher deleted successfully'
    })
  } catch (error: any) {
    console.error('DELETE /api/vouchers/[id] error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete voucher' }, { status: 500 })
  }
}
