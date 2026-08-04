import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

// Validation schemas (removed ACCOUNT_TYPES)
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
const ACCOUNT_NUMBER_PATTERN = /^[a-zA-Z0-9]{8,24}$/

function validateBankAccount(data: any) {
  const errors: string[] = []

  if (data.bank_name !== undefined && (!data.bank_name || data.bank_name.length < 2 || data.bank_name.length > 100)) {
    errors.push('Bank name must be between 2 and 100 characters')
  }

  if (data.account_holder !== undefined && (!data.account_holder || data.account_holder.length < 2 || data.account_holder.length > 100)) {
    errors.push('Account holder name must be between 2 and 100 characters')
  }

  if (data.account_number !== undefined && (!data.account_number || !ACCOUNT_NUMBER_PATTERN.test(data.account_number))) {
    errors.push('Account number must be 8-24 alphanumeric characters')
  }

  if (data.ifsc_code !== undefined && (!data.ifsc_code || !IFSC_PATTERN.test(data.ifsc_code))) {
    errors.push('IFSC code must follow format: ABCD0123456 (4 letters, 1 zero, 6 alphanumeric)')
  }

  if (data.upi_id !== undefined && data.upi_id && !UPI_PATTERN.test(data.upi_id)) {
    errors.push('UPI ID format is invalid (e.g., user@bank)')
  }

  return errors
}

// GET /api/banks/[id] - Get single bank account
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
    const { id } = params
    const { searchParams } = new URL(request.url)
    const requestedOrgId = searchParams.get('org_id')
    const orgId = user.is_super_admin ? requestedOrgId : (user.franchise_id || null)

    if (!id) {
      return NextResponse.json(
        { error: 'Bank ID is required' },
        { status: 400 }
      )
    }
    if (!orgId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, orgId)) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Bank account not found' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching bank:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bank account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bank: data
    })
  } catch (error) {
    console.error('Error in bank GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/banks/[id] - Update bank account
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
    const { id } = params
    const body = await request.json()
    const {
      org_id,
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      branch_name,
      upi_id,
      qr_file_path,
      is_primary,
      show_on_invoices,
      show_on_quotes
    } = body

    const effectiveOrgId = user.is_super_admin ? (org_id || null) : (user.franchise_id || null)

    if (!id) {
      return NextResponse.json(
        { error: 'Bank ID is required' },
        { status: 400 }
      )
    }
    if (!effectiveOrgId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, effectiveOrgId)) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
    }

    // Validate input
    const validationErrors = validateBankAccount(body)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Check if bank exists and belongs to organization
    const { data: existingBank, error: fetchError } = await supabase
      .from('banks')
      .select('id')
      .eq('id', id)
      .eq('org_id', effectiveOrgId)
      .single()

    if (fetchError || !existingBank) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    // Prepare update data (removed account_type)
    const updateData: any = {}
    
    if (bank_name !== undefined) updateData.bank_name = bank_name.trim()
    if (account_holder !== undefined) updateData.account_holder = account_holder.trim()
    if (account_number !== undefined) updateData.account_number = account_number.trim()
    if (ifsc_code !== undefined) updateData.ifsc_code = ifsc_code.toUpperCase().trim()
    if (branch_name !== undefined) updateData.branch_name = branch_name?.trim() || null
    if (upi_id !== undefined) updateData.upi_id = upi_id?.trim() || null
    if (qr_file_path !== undefined) updateData.qr_file_path = qr_file_path || null
    if (is_primary !== undefined) updateData.is_primary = is_primary
    if (show_on_invoices !== undefined) updateData.show_on_invoices = show_on_invoices
    if (show_on_quotes !== undefined) updateData.show_on_quotes = show_on_quotes

    const { data, error } = await supabase
      .from('banks')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', effectiveOrgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating bank account:', error)
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A bank account with this number already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update bank account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bank: data,
      message: 'Bank account updated successfully'
    })

  } catch (error) {
    console.error('Error in bank PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/banks/[id] - Delete bank account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
    const { id } = params
    const { searchParams } = new URL(request.url)
    const requestedOrgId = searchParams.get('org_id')
    const orgId = user.is_super_admin ? requestedOrgId : (user.franchise_id || null)

    if (!id) {
      return NextResponse.json(
        { error: 'Bank ID is required' },
        { status: 400 }
      )
    }
    if (!orgId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, orgId)) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
    }

    // Get bank details before deletion (for QR file cleanup)
    const { data: bankToDelete, error: fetchError } = await supabase
      .from('banks')
      .select('id, qr_file_path, bank_name, account_number')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !bankToDelete) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    // Delete the bank record
    const { error: deleteError } = await supabase
      .from('banks')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('Error deleting bank account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete bank account' },
        { status: 500 }
      )
    }

    // TODO: Clean up QR file from storage if it exists
    // This could be done here or in a background job
    if (bankToDelete.qr_file_path) {
      console.log(`TODO: Delete QR file: ${bankToDelete.qr_file_path}`)
      // For Supabase storage:
      // const { error: storageError } = await supabase.storage
      //   .from('banks')
      //   .remove([bankToDelete.qr_file_path])
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account deleted successfully',
      deleted_bank: {
        id: bankToDelete.id,
        bank_name: bankToDelete.bank_name,
        account_number: bankToDelete.account_number
      }
    })

  } catch (error) {
    console.error('Error in bank DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
