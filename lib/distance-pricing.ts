import { supabase } from "./supabase"

/**
 * Safely coerce any value to a finite number, otherwise return undefined
 */
function num(v: any): number | undefined {
  const n = typeof v === "string" ? Number(v) : (typeof v === "number" ? v : NaN)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Parse textual range fields like "0-50 km" or "51 – 100 km" into [min,max]
 */
function parseRangeText(v?: string | null): { min?: number; max?: number } {
  if (!v || typeof v !== "string") return {}
  const m = v.match(/(\d+)[^\d]+(\d+)/)
  if (!m) return {}
  const min = Number(m[1])
  const max = Number(m[2])
  if (!Number.isFinite(min) && !Number.isFinite(max)) return {}
  return { min, max }
}

/**
 * Resolve [min,max] KM from a row that may use different column names across setups
 */
function resolveKmRange(row: Record<string, any>): { min: number; max: number } | null {
  // Common column names across scripts
  const min = num(row.min_km) ?? num(row.min_distance) ?? num(row.min_distance_km) ?? parseRangeText(row.distance_range).min ?? parseRangeText(row.range_name).min ?? 0
  const max = num(row.max_km) ?? num(row.max_distance) ?? num(row.max_distance_km) ?? parseRangeText(row.distance_range).max ?? parseRangeText(row.range_name).max ?? Number.POSITIVE_INFINITY
  if (!Number.isFinite(min as number) && !Number.isFinite(max as number)) return null
  return { min: (Number.isFinite(min as number) ? (min as number) : 0), max: (Number.isFinite(max as number) ? (max as number) : Number.POSITIVE_INFINITY) }
}

/**
 * Resolve an addon for a candidate rule row given the base amount
 */
function resolveAddon(row: Record<string, any>, baseAmount: number): number | null {
  const add = num(row.base_price_addition)
  const extra = num(row.extra_price)
  const mult = num(row.price_multiplier) ?? num(row.multiplier)
  if (Number.isFinite(add as number)) return add as number
  if (Number.isFinite(extra as number)) return extra as number
  if (Number.isFinite(mult as number) && (mult as number) > 1) return Math.max(0, baseAmount * ((mult as number) - 1))
  return null
}

/**
 * Compute distance-based addon for a variant using per-variant rules first, then global tiers.
 * Robust to slight schema differences (column names) across installations.
 */
export async function computeDistanceAddonForVariant(variantId: string, km: number, baseAmount: number): Promise<number> {
  try {
    if (!km || km <= 0) return 0

    // 1) Per-variant rules (distance_pricing)
    const { data: dpRows, error: dpErr } = await supabase
      .from("distance_pricing")
      .select("*")
      .eq("package_variant_id", variantId)

    if (!dpErr && Array.isArray(dpRows) && dpRows.length > 0) {
      // Prefer active rows if the column exists; otherwise accept all
      const rows = dpRows.filter((r: any) => r.is_active !== false)
      const withRanges = rows
        .map(r => ({ row: r, range: resolveKmRange(r) }))
        .filter((x): x is { row: any; range: { min: number; max: number } } => !!x.range)
      const match = withRanges.find(x => km >= x.range.min && km <= x.range.max)
      if (match) {
        const addon = resolveAddon(match.row, baseAmount)
        if (Number.isFinite(addon as number)) return addon as number
      }
    }

    // 2) Global tiers (distance_pricing_tiers)
    const { data: tierRows, error: tierErr } = await supabase
      .from("distance_pricing_tiers")
      .select("*")

    if (!tierErr && Array.isArray(tierRows) && tierRows.length > 0) {
      const rows = tierRows.filter((r: any) => r.is_active !== false)
      const withRanges = rows
        .map(r => ({ row: r, range: resolveKmRange(r) }))
        .filter((x): x is { row: any; range: { min: number; max: number } } => !!x.range)
      const match = withRanges.find(x => km >= x.range.min && km <= x.range.max)
      if (match) {
        const addon = resolveAddon(match.row, baseAmount)
        if (Number.isFinite(addon as number)) return addon as number
      }
    }
  } catch (e) {
    // Ignore and fall back to 0
  }
  return 0
}

/**
 * Convenience helper to compute final unit from base and distance context.
 */
export async function computeUnitWithDistance(variantId: string, km: number, baseUnit: number): Promise<{ unit: number; addon: number }> {
  const addon = await computeDistanceAddonForVariant(variantId, km, baseUnit)
  return { unit: baseUnit + addon, addon }
}
