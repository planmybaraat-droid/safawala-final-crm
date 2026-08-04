import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

// GET - Fetch banking details
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'settings' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get('franchise_id')

    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, franchiseId)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('banking_details')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('is_primary', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching banking details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new bank account
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'settings' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const supabase = createClient()
    const body = await request.json()
    const {
      franchise_id,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      is_primary,
      show_on_invoice,
      upi_id,
      qr_file_path
    } = body

    if (!franchise_id || !bank_name || !account_holder_name || !account_number || !ifsc_code) {
      return NextResponse.json({ 
        error: 'Required fields: franchise_id, bank_name, account_holder_name, account_number, ifsc_code' 
      }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, franchise_id)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    // If this is set as primary, unset other primary accounts
    if (is_primary) {
      await supabase
        .from('banking_details')
        .update({ is_primary: false })
        .eq('franchise_id', franchise_id)
    }

    const bankingData = {
      franchise_id,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type: account_type || 'Current',
      is_primary: is_primary || false,
      show_on_invoice: show_on_invoice ?? true,
      upi_id,
      qr_file_path
    }

    const { data, error } = await supabase
      .from('banking_details')
      .insert(bankingData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Bank account added successfully' })
  } catch (error) {
    console.error('Error creating bank account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update bank account
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'settings' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const supabase = createClient()
    const body = await request.json()
    const {
      id,
      franchise_id,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      is_primary,
      show_on_invoice,
      upi_id,
      qr_file_path
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Bank account ID required' }, { status: 400 })
    }

    const { data: existingBank, error: existingBankError } = await supabase
      .from('banking_details')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (existingBankError || !existingBank) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
    }

    const effectiveFranchiseId = franchise_id || existingBank.franchise_id

    if (!effectiveFranchiseId || !AuthMiddleware.canAccessFranchise(auth.user!, effectiveFranchiseId)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    // If this is set as primary, unset other primary accounts
    if (is_primary) {
      await supabase
        .from('banking_details')
        .update({ is_primary: false })
        .eq('franchise_id', effectiveFranchiseId)
        .neq('id', id)
    }

    const bankingData = {
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      is_primary,
      show_on_invoice,
      upi_id,
      qr_file_path,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('banking_details')
      .update(bankingData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Bank account updated successfully' })
  } catch (error) {
    console.error('Error updating bank account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove bank account
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'settings' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Bank account ID required' }, { status: 400 })
    }

    const { data: existingBank, error: existingBankError } = await supabase
      .from('banking_details')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (existingBankError || !existingBank) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, existingBank.franchise_id)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const { error } = await supabase
      .from('banking_details')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Bank account deleted successfully' })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
