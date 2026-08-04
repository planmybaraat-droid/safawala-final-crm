import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/challans - list challans
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
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = createClient()
    let query = supabase
      .from('challans')
      .select('*, challan_items(*)', { count: 'exact' })

    // 🔒 FRANCHISE ISOLATION: Non-super_admins only see their own franchise
    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (dateFrom) {
      query = query.gte('challan_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('challan_date', dateTo)
    }
    if (search) {
      const searchPattern = `%${search}%`
      query = query.or(`party_name.ilike.${searchPattern},mobile_number.ilike.${searchPattern},challan_number.ilike.${searchPattern}`)
    }

    // Order by date descending, then created_at descending
    query = query.order('challan_date', { ascending: false }).order('created_at', { ascending: false })
    
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
    console.error('GET /api/challans error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch challans' }, { status: 500 })
  }
}

// POST /api/challans - create challan
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
    const { challan_number, challan_date, party_name, mobile_number, status, narration, prepared_by, total_amount, items } = body

    if (!party_name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Party name and at least one item are required' }, { status: 400 })
    }

    // Auto-generate challan number if not provided
    const finalChallanNumber = challan_number || `CHL-${Date.now().toString(36).toUpperCase()}`

    const supabase = createClient()

    // 1. Insert Challan Header
    const { data: challan, error: challanError } = await supabase
      .from('challans')
      .insert({
        challan_number: finalChallanNumber,
        challan_date: challan_date || new Date().toISOString().split('T')[0],
        party_name,
        mobile_number: mobile_number || null,
        status: status || 'active',
        narration: narration || null,
        prepared_by: prepared_by || authUser.name || 'Staff',
        total_amount: Number(total_amount) || 0,
        franchise_id: franchiseId || null,
        created_by: userId
      })
      .select()
      .single()

    if (challanError) {
      console.error('Error inserting challan:', challanError)
      return NextResponse.json({ success: false, error: challanError.message }, { status: 500 })
    }

    // 2. Insert Challan Items
    const itemsData = items.map((item: any) => ({
      challan_id: challan.id,
      item_details: item.item_details,
      qty: parseInt(item.qty) || 1,
      rate: parseFloat(item.rate) || 0,
      amount: (parseInt(item.qty) || 1) * (parseFloat(item.rate) || 0)
    }))

    const { error: itemsError } = await supabase
      .from('challan_items')
      .insert(itemsData)

    if (itemsError) {
      console.error('Error inserting challan items:', itemsError)
      // Attempt to clean up challan header if items insert fail
      await supabase.from('challans').delete().eq('id', challan.id)
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...challan,
        challan_items: itemsData
      }
    })
  } catch (error: any) {
    console.error('POST /api/challans error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create challan' }, { status: 500 })
  }
}
