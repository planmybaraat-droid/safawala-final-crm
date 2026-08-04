import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const requestedFranchiseId = body?.franchise_id
    const franchiseId = requestedFranchiseId || user.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise context is required' }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const supabase = createClient()

    const code = body.code
    const orderValue = body.orderValue !== undefined ? body.orderValue : body.subtotal

    if (!code || orderValue === undefined) {
      return NextResponse.json({ error: 'Coupon code and order value are required' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, code, name, discount_type, discount_value, is_active, franchise_id, description')
      .eq('code', cleanCode)
      .eq('franchise_id', franchiseId)
      .eq('is_active', true)
      .single()

    if (offer && !offerError) {
      let discountAmount = 0
      if (offer.discount_type === 'percent') discountAmount = (orderValue * offer.discount_value) / 100
      else if (offer.discount_type === 'fixed') discountAmount = offer.discount_value
      discountAmount = Math.min(discountAmount, orderValue)

      return NextResponse.json({
        valid: true,
        coupon: {
          id: offer.id,
          code: offer.code,
          description: offer.description || offer.name || null,
          discount_type: offer.discount_type === 'percent' ? 'percentage' : 'flat',
          discount_value: offer.discount_value,
        },
        discount: discountAmount,
        message: `Offer "${offer.name}" applied! You saved ₹${discountAmount.toFixed(2)}`,
      })
    }

    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, franchise_id, description')
      .eq('code', cleanCode)
      .eq('franchise_id', franchiseId)
      .single()

    if (coupon && !couponError) {
      let discountAmount = 0
      if (coupon.discount_type === 'percentage') discountAmount = (orderValue * coupon.discount_value) / 100
      else if (coupon.discount_type === 'flat') discountAmount = coupon.discount_value
      discountAmount = Math.min(discountAmount, orderValue)

      return NextResponse.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description || null,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
        },
        discount: discountAmount,
        message: `Coupon applied! You saved ₹${discountAmount.toFixed(2)}`,
      })
    }

    return NextResponse.json(
      {
        valid: false,
        error: 'Invalid coupon code',
        message: 'This coupon/offer code does not exist or is no longer active'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error validating coupon:', error)
    return NextResponse.json({ error: 'Failed to validate coupon', details: error.message }, { status: 500 })
  }
}
