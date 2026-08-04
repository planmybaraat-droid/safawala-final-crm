import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

interface ValidateOfferRequest {
  code: string
  orderValue: number
  customerId?: string
  franchise_id?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const body: ValidateOfferRequest = await request.json()
    const { code, orderValue } = body
    const franchiseId = body.franchise_id || user.franchise_id

    if (!franchiseId) {
      return NextResponse.json({ valid: false, error: 'Franchise context is required' }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ valid: false, error: 'Access denied to this franchise' }, { status: 403 })
    }

    if (!code || orderValue === undefined) {
      return NextResponse.json({ valid: false, error: 'Offer code and order value are required' }, { status: 400 })
    }

    if (orderValue <= 0) {
      return NextResponse.json({ valid: false, error: 'Order value must be greater than 0' }, { status: 400 })
    }

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, code, name, discount_type, discount_value, is_active, franchise_id')
      .eq('code', code.trim().toUpperCase())
      .eq('franchise_id', franchiseId)
      .eq('is_active', true)
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { valid: false, error: 'Invalid offer code', message: 'This offer code does not exist or is no longer active' },
        { status: 200 }
      )
    }

    let discountAmount = 0
    if (offer.discount_type === 'percent') {
      discountAmount = (orderValue * offer.discount_value) / 100
    } else if (offer.discount_type === 'fixed') {
      discountAmount = offer.discount_value
    }

    discountAmount = Math.min(discountAmount, orderValue)

    return NextResponse.json({
      valid: true,
      offer: {
        id: offer.id,
        code: offer.code,
        name: offer.name,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
      },
      discount: discountAmount,
      message: `Offer "${offer.name}" applied! You saved ₹${discountAmount.toFixed(2)}`,
    })
  } catch (error: any) {
    console.error('[Offers Validate] Error:', error)
    return NextResponse.json({ error: 'Failed to validate offer', details: error.message }, { status: 500 })
  }
}
