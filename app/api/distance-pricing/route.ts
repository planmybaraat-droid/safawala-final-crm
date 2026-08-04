import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { computeDistanceAddonForVariant } from '@/lib/distance-pricing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function fallbackEstimate(fromPincode: string, toPincode: string): number {
  const fromNum = parseInt(fromPincode)
  const toNum = parseInt(toPincode)
  if (isNaN(fromNum) || isNaN(toNum)) return 0
  const fromRegion = Math.floor(fromNum / 10000)
  const toRegion = Math.floor(toNum / 10000)
  if (fromRegion === toRegion) return Math.round(Math.abs(fromNum - toNum) / 100)
  const regionDiff = Math.abs(fromRegion - toRegion)
  return regionDiff * 200
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const variantId = sp.get('variantId') || sp.get('variant_id') || ''
    const baseUnit = Number(sp.get('baseUnit') || sp.get('base') || 0)
    const kmParam = sp.get('km')
    const from = sp.get('from') || sp.get('from_pincode') || ''
    const to = sp.get('to') || sp.get('to_pincode') || ''

    if (!variantId) return NextResponse.json({ success: false, error: 'variantId required' }, { status: 400 })
    if (!Number.isFinite(baseUnit)) return NextResponse.json({ success: false, error: 'baseUnit must be a number' }, { status: 400 })

    let km = Number(kmParam)
    let kmSource: 'param' | 'cache' | 'estimate' | 'none' = 'none'
    const canUseDb = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
    if (Number.isFinite(km) && km > 0) {
      kmSource = 'param'
    } else if (from && to && from !== to) {
      if (canUseDb) {
        // Try cache table first
        const { data, error } = await supabase
          .from('pincode_distances_exact')
          .select('distance_km')
          .eq('from_pincode', from)
          .eq('to_pincode', to)
          .limit(1)
        if (!error && data && data.length > 0) {
          km = Number(data[0].distance_km)
          kmSource = 'cache'
        } else {
          km = fallbackEstimate(from, to)
          kmSource = 'estimate'
        }
      } else {
        // Build-time or missing envs: fallback only
        km = fallbackEstimate(from, to)
        kmSource = 'estimate'
      }
    } else {
      km = 0
      kmSource = 'none'
    }

    const addon = await computeDistanceAddonForVariant(variantId, km, baseUnit)
    const unit = baseUnit + addon
    return NextResponse.json({ success: true, km, kmSource, addon, unit })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}
