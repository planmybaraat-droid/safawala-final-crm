import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { requireAuth } from '@/lib/auth-middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/expenses - paginated, filtered, franchise-isolated
export async function GET(req: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user and get franchise context
    const authResult = await requireAuth(req, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { user: authUser } = authResult.authContext!
    const franchiseId = authUser.franchise_id
    const isSuperAdmin = authUser.is_super_admin
    const userId = authUser.id

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '25')
    const pageSize = Math.min(100, pageSizeRaw > 0 ? pageSizeRaw : 25)
    const category = searchParams.get('category') || ''
    const vendor = searchParams.get('vendor') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const search = searchParams.get('search') || ''
    const sortField = searchParams.get('sortField') === 'amount' ? 'amount' : 'expense_date'
    const sortDir = searchParams.get('sortDir') === 'asc' ? true : false

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from('expenses')
      .select('*', { count: 'exact' })

    // 🔒 FRANCHISE ISOLATION: Super admin sees all, others see only their franchise
    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    if (category) query = query.eq('subcategory', category)
    if (vendor) query = query.ilike('vendor_name', `%${vendor}%`)
    if (dateFrom) query = query.gte('expense_date', dateFrom)
    if (dateTo) query = query.lte('expense_date', dateTo)
    if (search) {
      // OR filter across description & vendor_name
      const pattern = `%${search}%`
      query = query.or(`description.ilike.${pattern},vendor_name.ilike.${pattern}`)
    }

    query = query.order(sortField, { ascending: sortDir })
    // Secondary stable order when sorting by date
    if (sortField === 'expense_date') {
      query = query.order('id', { ascending: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    const total = count || 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      data: data || [],
      page,
      pageSize,
      total,
      totalPages,
      sortField,
      sortDir: sortDir ? 'asc' : 'desc'
    })
  } catch (e: any) {
    console.error('GET /api/expenses error', e)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

// POST /api/expenses - create new expense
export async function POST(req: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user and get franchise context
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { user: authUser } = authResult.authContext!
    const franchiseId = authUser.franchise_id
    const userId = authUser.id

    const body = await req.json()
    const { amount, expense_date, subcategory, vendor_name, receipt_number, description, receipt_url, booking_id, booking_number } = body

    // Validate required fields
    if (!amount || !expense_date || !subcategory) {
      return NextResponse.json({ 
        error: "Missing required fields: amount, expense_date, subcategory" 
      }, { status: 400 })
    }

    // Generate expense number
    const expenseNumber = `EXP${Date.now().toString(36).toUpperCase()}`

    // Use service role client for insert (bypasses RLS)
    const supabaseAdmin = createClient()

    console.log('[Expenses API] Inserting expense:', {
      expense_number: expenseNumber,
      amount,
      expense_date,
      subcategory,
      vendor_name,
      receipt_number,
      receipt_url,
      booking_id,
      booking_number,
      description,
      franchise_id: franchiseId,
      created_by: userId,
    })

    // Insert expense
    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        expense_number: expenseNumber,
        amount: Number(amount),
        expense_date,
        subcategory,
        vendor_name: vendor_name || null,
        receipt_number: receipt_number || null,
        receipt_url: receipt_url || null,
        booking_id: booking_id || null,
        booking_number: booking_number || null,
        description: description || null,
        franchise_id: franchiseId,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[Expenses API] INSERT error:', error)
      console.error('[Expenses API] Error message:', error.message)
      console.error('[Expenses API] Error details:', error.details)
      throw error
    }

    return NextResponse.json({ 
      success: true,
      data: expense
    })
  } catch (e: any) {
    console.error('POST /api/expenses error', e)
    console.error('Error stack:', e.stack)
    return NextResponse.json({ 
      error: e.message || 'Failed to add expense' 
    }, { status: 500 })
  }
}
