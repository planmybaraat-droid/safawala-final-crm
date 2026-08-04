import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

function resolveFranchiseId(requestedFranchiseId: string | null | undefined, user: any) {
  if (requestedFranchiseId && requestedFranchiseId !== 'null' && requestedFranchiseId !== 'undefined') {
    return requestedFranchiseId
  }
  return user.franchise_id || null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const { searchParams } = new URL(request.url)
    const franchiseId = user.is_super_admin ? searchParams.get('franchise_id') : (user.franchise_id || null)

    let query = supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (franchiseId) {
      if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
        return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
      }
      query = query.eq('franchise_id', franchiseId)
    } else if (!user.is_super_admin) {
      return NextResponse.json({ coupons: [] })
    }

    const { data: coupons, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch coupons', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupons: coupons || [] })
  } catch (error: any) {
    console.error('[Coupons GET] Unexpected error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const body = await request.json()
    const { code, discount_type, discount_value } = body
    const franchiseId = resolveFranchiseId(body.franchise_id, user)

    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise context is required' }, { status: 400 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    if (!code || !discount_type) {
      return NextResponse.json({ error: 'Code and discount type are required' }, { status: 400 })
    }
    if (discount_type !== 'free_shipping' && (discount_value === undefined || discount_value <= 0)) {
      return NextResponse.json({ error: 'Discount value is required and must be > 0' }, { status: 400 })
    }
    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    const sanitizedData = {
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value: discount_type === 'free_shipping' ? 0 : Number(discount_value),
      franchise_id: franchiseId,
      created_by: user.id,
      is_active: true,
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert([sanitizedData])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Invalid franchise reference' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create coupon', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error: any) {
    console.error('[Coupons POST] Unexpected error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const { data: existingCoupon, error: existingError } = await supabase
      .from('coupons')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (existingError || !existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, existingCoupon.franchise_id)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const sanitizedUpdates: any = {}
    Object.keys(updates).forEach((key) => {
      const value = updates[key]
      if (key === 'code' && value) sanitizedUpdates[key] = value.trim().toUpperCase()
      else if (key === 'description') sanitizedUpdates[key] = value?.trim() || null
      else if ((key === 'valid_until' || key === 'valid_from') && value === '') sanitizedUpdates[key] = null
      else if (key === 'max_discount' || key === 'usage_limit' || key === 'per_user_limit') sanitizedUpdates[key] = value || null
      else if (key === 'min_order_value') sanitizedUpdates[key] = value || 0
      else sanitizedUpdates[key] = value
    })

    if (sanitizedUpdates.discount_type === 'percentage' && sanitizedUpdates.discount_value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('franchise_id', existingCoupon.franchise_id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update coupon', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupon })
  } catch (error: any) {
    console.error('Error in PUT /api/coupons:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const { data: existingCoupon, error: existingError } = await supabase
      .from('coupons')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (existingError || !existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }
    if (!AuthMiddleware.canAccessFranchise(user, existingCoupon.franchise_id)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)
      .eq('franchise_id', existingCoupon.franchise_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete coupon', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/coupons:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
