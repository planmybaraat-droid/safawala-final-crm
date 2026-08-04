import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

// Validation schemas (removed ACCOUNT_TYPES)
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
const ACCOUNT_NUMBER_PATTERN = /^[a-zA-Z0-9]{8,24}$/

interface BankAccount {
  id?: string
  org_id: string
  bank_name: string
  account_holder: string
  account_number: string
  ifsc_code: string
  branch_name?: string
  upi_id?: string
  qr_file_path?: string
  is_primary: boolean
  show_on_invoices: boolean
  show_on_quotes: boolean
  created_by?: string
}

function validateBankAccount(data: Partial<BankAccount>) {
  const errors: string[] = []

  if (!data.bank_name || data.bank_name.length < 2 || data.bank_name.length > 100) {
    errors.push('Bank name must be between 2 and 100 characters')
  }

  if (!data.account_holder || data.account_holder.length < 2 || data.account_holder.length > 100) {
    errors.push('Account holder name must be between 2 and 100 characters')
  }

  if (!data.account_number || !ACCOUNT_NUMBER_PATTERN.test(data.account_number)) {
    errors.push('Account number must be 8-24 alphanumeric characters')
  }

  if (!data.ifsc_code || !IFSC_PATTERN.test(data.ifsc_code)) {
    errors.push('IFSC code must follow format: ABCD0123456 (4 letters, 1 zero, 6 alphanumeric)')
  }

  if (data.upi_id && !UPI_PATTERN.test(data.upi_id)) {
    errors.push('UPI ID format is invalid (e.g., user@bank)')
  }

  return errors
}

// GET /api/banks - List all banks for organization
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
    const { searchParams } = new URL(request.url)
    const requestedOrgId = searchParams.get('org_id')
    const orgId = user.is_super_admin ? requestedOrgId : (user.franchise_id || null)

    if (!orgId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, orgId)) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching banks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bank accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      banks: data || []
    })
  } catch (error) {
    console.error('Error in banks GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/banks - Create new bank account
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
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
      is_primary = false,
      show_on_invoices = false,
      show_on_quotes = false,
      created_by
    } = body

    const effectiveOrgId = user.is_super_admin ? (org_id || null) : (user.franchise_id || null)
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

    // Prepare data for insertion (removed account_type)
    const bankData = {
      org_id: effectiveOrgId,
      bank_name: bank_name.trim(),
      account_holder: account_holder.trim(),
      account_number: account_number.trim(),
      ifsc_code: ifsc_code.toUpperCase().trim(),
      branch_name: branch_name?.trim() || null,
      upi_id: upi_id?.trim() || null,
      qr_file_path: qr_file_path || null,
      is_primary,
      show_on_invoices,
      show_on_quotes,
      created_by: created_by || user.id || null
    }

    const { data, error } = await supabase
      .from('banks')
      .insert(bankData)
      .select()
      .single()

    if (error) {
      console.error('Error creating bank account:', error)
      
      // Handle specific database errors
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A bank account with this number already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create bank account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bank: data,
      message: 'Bank account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in banks POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
