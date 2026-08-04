import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const franchiseId = user.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ valid: false, error: 'Franchise context is required' }, { status: 400 })
    }

    const body = await request.json()
    const { code, order_value } = body

    if (!code || order_value === undefined) {
      return NextResponse.json({ valid: false, error: 'Code and order value are required' }, { status: 400 })
    }

    if (typeof order_value !== 'number' || order_value <= 0) {
      return NextResponse.json({ valid: false, error: 'Order value must be a positive number' }, { status: 400 })
    }

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('franchise_id', franchiseId)
      .eq('is_active', true)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({ valid: false, error: 'Invalid or inactive offer code' }, { status: 404 })
    }

    let discount = 0
    if (offer.discount_type === 'percent') {
      discount = (order_value * offer.discount_value) / 100
    } else if (offer.discount_type === 'fixed') {
      discount = Math.min(offer.discount_value, order_value)
    }

    discount = Math.round(discount * 100) / 100

    return NextResponse.json({
      valid: true,
      offer: {
        id: offer.id,
        code: offer.code,
        name: offer.name,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value
      },
      discount,
      message: `Offer applied successfully! ${offer.discount_type === 'percent' ? `${offer.discount_value}% off` : `₹${offer.discount_value} off`}`
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
