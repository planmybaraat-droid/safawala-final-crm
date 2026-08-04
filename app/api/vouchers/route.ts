import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/vouchers - list vouchers
export async function GET(req: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user (readonly minimum)
    const authResult = await requireAuth(req, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { user: authUser } = authResult.authContext!
    const franchiseId = authUser.franchise_id
    const isSuperAdmin = authUser.role === 'super_admin'

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '25')
    const pageSize = Math.min(100, pageSizeRaw > 0 ? pageSizeRaw : 25)
    
    const search = searchParams.get('search') || ''
    const voucherType = searchParams.get('voucher_type') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = createClient()
    let query = supabase
      .from('vouchers')
      .select('*', { count: 'exact' })

    // 🔒 FRANCHISE ISOLATION: Non-super_admins only see their own franchise data
    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    // Apply filters
    if (voucherType && voucherType !== 'all') {
      query = query.eq('voucher_type', voucherType)
    }
    if (dateFrom) {
      query = query.gte('voucher_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('voucher_date', dateTo)
    }
    if (search) {
      const searchPattern = `%${search}%`
      query = query.or(`account_name.ilike.${searchPattern},voucher_number.ilike.${searchPattern},booking_number.ilike.${searchPattern}`)
    }

    // Order by date descending, then created_at descending
    query = query.order('voucher_date', { ascending: false }).order('created_at', { ascending: false })
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    const total = count || 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      success: true,
      data: data || [],
      page,
      pageSize,
      total,
      totalPages
    })
  } catch (error: any) {
    console.error('GET /api/vouchers error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch vouchers' }, { status: 500 })
  }
}

// POST /api/vouchers - create voucher
export async function POST(req: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user (staff minimum)
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { user: authUser } = authResult.authContext!
    const franchiseId = authUser.franchise_id
    const userId = authUser.id

    const body = await req.json()
    const { 
      voucher_number, 
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

    if (!voucher_type || !account_name || amount === undefined) {
      return NextResponse.json({ success: false, error: 'Voucher type, account name, and amount are required' }, { status: 400 })
    }

    // Auto-generate voucher number if not provided
    const prefix = voucher_type === 'expense' ? 'PV' : 'RV' // Payment Voucher or Receipt Voucher
    const finalVoucherNumber = voucher_number || `${prefix}-${Date.now().toString(36).toUpperCase()}`

    const supabase = createClient()

    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .insert({
        voucher_number: finalVoucherNumber,
        voucher_date: voucher_date || new Date().toISOString().split('T')[0],
        voucher_type,
        account_name,
        amount: Number(amount) || 0,
        payment_mode: payment_mode || 'Cash',
        particulars: particulars || null,
        narration: narration || null,
        amount_in_words: amount_in_words || null,
        receiver_name: receiver_name || null,
        prepared_by: prepared_by || authUser.name || 'Staff',
        booking_id: booking_id || null,
        booking_number: booking_number || null,
        franchise_id: franchiseId || null,
        created_by: userId
      })
      .select()
      .single()

    if (voucherError) {
      console.error('Error inserting voucher:', voucherError)
      return NextResponse.json({ success: false, error: voucherError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: voucher
    })
  } catch (error: any) {
    console.error('POST /api/vouchers error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create voucher' }, { status: 500 })
  }
}
