import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { requireAuth } from '@/lib/auth-middleware'

function num(v: any): number | undefined {
  const n = typeof v === 'string' ? Number(v) : (typeof v === 'number' ? v : NaN)
  return Number.isFinite(n) ? n : undefined
}

function parseRangeText(v?: string | null): { min?: number; max?: number } {
  if (!v || typeof v !== 'string') return {}
  const m = v.match(/(\d+)[^\d]+(\d+)/)
  if (!m) return {}
  return { min: Number(m[1]), max: Number(m[2]) }
}

function resolveKmRange(row: Record<string, any>): { min: number; max: number } | null {
  const min = num(row.min_km) ?? num(row.min_distance) ?? num(row.min_distance_km) ?? parseRangeText(row.distance_range).min ?? parseRangeText(row.range_name).min ?? 0
  const max = num(row.max_km) ?? num(row.max_distance) ?? num(row.max_distance_km) ?? parseRangeText(row.distance_range).max ?? parseRangeText(row.range_name).max ?? Number.POSITIVE_INFINITY
  if (!Number.isFinite(min as number) && !Number.isFinite(max as number)) return null
  return { min: (Number.isFinite(min as number) ? (min as number) : 0), max: (Number.isFinite(max as number) ? (max as number) : Number.POSITIVE_INFINITY) }
}

function resolveAddon(row: Record<string, any>, baseAmount: number): number | null {
  const add = num(row.base_price_addition)
  const extra = num(row.additional_price ?? row.extra_price)
  const mult = num(row.price_multiplier) ?? num(row.multiplier)
  if (Number.isFinite(add as number)) return add as number
  if (Number.isFinite(extra as number)) return extra as number
  if (Number.isFinite(mult as number) && (mult as number) > 1) return Math.max(0, baseAmount * ((mult as number) - 1))
  return null
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'readonly')
  if (!auth.success) return NextResponse.json({ ok: false, error: auth.response || 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const variantId = searchParams.get('variant_id') || searchParams.get('variantId')
  const km = Number(searchParams.get('km') || '0')
  const base = Number(searchParams.get('base') || '0')
  if (!variantId || !Number.isFinite(km) || !Number.isFinite(base)) {
    return NextResponse.json({ ok: false, error: 'variant_id, km and base required' }, { status: 400 })
  }

  try {
    // Per-variant rules
    const { data: dpRows } = await supabase
      .from('distance_pricing')
      .select('*')
      .eq('package_variant_id', variantId)

    if (Array.isArray(dpRows) && dpRows.length > 0) {
      const withRanges = dpRows
        .filter(r => (r as any).is_active !== false)
        .map(r => ({ row: r, range: resolveKmRange(r) }))
        .filter((x): x is { row: any; range: { min: number; max: number } } => !!x.range)
      const match = withRanges.find(x => km >= x.range.min && km <= x.range.max)
      if (match) {
        const addon = resolveAddon(match.row, base) ?? 0
        return NextResponse.json({ ok: true, addon, source: 'variant' })
      }
    }

    // Global tiers
    const { data: tiers } = await supabase.from('distance_pricing_tiers').select('*')
    if (Array.isArray(tiers) && tiers.length > 0) {
      const withRanges = tiers
        .filter(r => (r as any).is_active !== false)
        .map(r => ({ row: r, range: resolveKmRange(r) }))
        .filter((x): x is { row: any; range: { min: number; max: number } } => !!x.range)
      const match = withRanges.find(x => km >= x.range.min && km <= x.range.max)
      if (match) {
        const addon = resolveAddon(match.row, base) ?? 0
        return NextResponse.json({ ok: true, addon, source: 'global' })
      }
    }

    return NextResponse.json({ ok: true, addon: 0, source: 'none' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'compute failed' }, { status: 500 })
  }
}
