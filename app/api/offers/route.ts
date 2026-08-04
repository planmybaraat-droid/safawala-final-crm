import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

function mapDbError(e: any, context: string) {
  if (!e) return { status: 500, error: `${context} failed` }
  const code = e.code || e.details || ''
  if (code === '42P01' || /relation .* does not exist/i.test(e.message || '')) {
    return { status: 500, error: 'Offers tables missing. Run OFFERS_SYSTEM_MIGRATION.sql on the database.' }
  }
  return { status: 500, error: `${context} failed` }
}

function resolveFranchiseId(requestedFranchiseId: string | null | undefined, user: any) {
  if (requestedFranchiseId && requestedFranchiseId !== 'null' && requestedFranchiseId !== 'undefined') {
    return requestedFranchiseId
  }
  return user.franchise_id || null
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const franchiseId = resolveFranchiseId(searchParams.get('franchise_id'), user)

    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise context is required' }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    let query = supabase
      .from('offers')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false })

    if (code) {
      query = query.ilike('code', `%${code}%`)
    }

    const { data: offers, error } = await query

    if (error) {
      const mapped = mapDbError(error, 'Fetch offers')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    return NextResponse.json({ offers: offers || [] })
  } catch (error) {
    console.error('[Offers][GET] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { code, name, discount_type, discount_value, is_active = true } = body
    const franchiseId = resolveFranchiseId(body.franchise_id, user)

    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise context is required' }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    if (!code || !name || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (code.length < 3 || code.length > 20) {
      return NextResponse.json({ error: 'Code must be 3-20 characters' }, { status: 400 })
    }
    if (!['percent', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 })
    }
    if (discount_value <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 })
    }
    if (discount_type === 'percent' && discount_value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    const { data: existingOffer, error: checkError } = await supabase
      .from('offers')
      .select('id')
      .eq('code', code.toUpperCase())
      .eq('franchise_id', franchiseId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      const mapped = mapDbError(checkError, 'Offer existence check')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }
    if (existingOffer) return NextResponse.json({ error: 'Offer code already exists' }, { status: 409 })

    const { data: offer, error: insertError } = await supabase
      .from('offers')
      .insert({
        code: code.toUpperCase(),
        name: name.trim(),
        discount_type,
        discount_value,
        is_active,
        franchise_id: franchiseId,
      })
      .select()
      .single()

    if (insertError) {
      const mapped = mapDbError(insertError, 'Create offer')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    return NextResponse.json({ offer }, { status: 201 })
  } catch (error) {
    console.error('[Offers][POST] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { id, name, discount_value, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })
    }

    const { data: existingOffer, error: checkError } = await supabase
      .from('offers')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
      const mapped = mapDbError(checkError, 'Fetch offer')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }
    if (!existingOffer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

    if (!AuthMiddleware.canAccessFranchise(user, existingOffer.franchise_id)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (discount_value !== undefined) {
      if (discount_value <= 0) {
        return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 })
      }
      updateData.discount_value = discount_value
    }
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: offer, error: updateError } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', id)
      .eq('franchise_id', existingOffer.franchise_id)
      .select()
      .single()

    if (updateError) {
      const mapped = mapDbError(updateError, 'Update offer')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    return NextResponse.json({ offer })
  } catch (error) {
    console.error('[Offers][PUT] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })
    }

    const { data: existingOffer, error: existingError } = await supabase
      .from('offers')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (existingError) {
      if (existingError.code === 'PGRST116') return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
      const mapped = mapDbError(existingError, 'Fetch offer')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    if (!AuthMiddleware.canAccessFranchise(user, existingOffer.franchise_id)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const { data: redemptions, error: redemptionCheckError } = await supabase
      .from('offer_redemptions')
      .select('id')
      .eq('offer_id', id)
      .limit(1)

    if (redemptionCheckError) {
      const mapped = mapDbError(redemptionCheckError, 'Redemption check')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    if (redemptions && redemptions.length > 0) {
      return NextResponse.json({ error: 'Cannot delete offer that has been used' }, { status: 409 })
    }

    const { error: deleteError } = await supabase
      .from('offers')
      .delete()
      .eq('id', id)
      .eq('franchise_id', existingOffer.franchise_id)

    if (deleteError) {
      const mapped = mapDbError(deleteError, 'Delete offer')
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Offers][DELETE] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
