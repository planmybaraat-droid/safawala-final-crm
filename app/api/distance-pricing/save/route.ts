import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Unified auth: validates session, role and permissions; fetches app user profile via service role
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'packages' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const appUser = auth.user!

    // Service-role client for DB writes
    const supabase = createClient()

    const { franchiseId, role, isSuperAdmin } = {
      franchiseId: (appUser.franchise_id || null) as string | null,
      role: appUser.role as string,
      isSuperAdmin: appUser.is_super_admin === true
    }

    if (!['super_admin', 'franchise_admin', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      id, 
      package_level_id,
      package_variant_id, // Support both field names
      distance_range, 
      min_distance_km, 
      max_distance_km, 
      additional_price, 
      franchise_id: bodyFranchiseId,
      is_active = true 
    } = body || {}

    // Use package_variant_id if provided, fallback to package_level_id
    const variantId = package_variant_id || package_level_id
    
    if (!variantId || typeof variantId !== 'string') {
      return NextResponse.json({ error: 'package_variant_id is required' }, { status: 400 })
    }
    if (typeof distance_range !== 'string' || !distance_range.trim()) {
      return NextResponse.json({ error: 'distance_range is required' }, { status: 400 })
    }
    // Coerce numeric strings from the client to numbers for validation
    const minKm = typeof min_distance_km === 'string' ? Number(min_distance_km) : min_distance_km
    const maxKm = typeof max_distance_km === 'string' ? Number(max_distance_km) : max_distance_km
    const addPrice = typeof additional_price === 'string' ? Number(additional_price) : additional_price

    if (!Number.isFinite(minKm) || !Number.isFinite(maxKm) || minKm < 0 || maxKm <= minKm) {
      return NextResponse.json({ error: 'Invalid min_distance_km/max_distance_km' }, { status: 400 })
    }
    if (!Number.isFinite(addPrice) || addPrice < 0) {
      return NextResponse.json({ error: 'Invalid additional_price' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Safely detect which columns exist by probing with select
    async function has(name: string) {
      const { error } = await supabase.from('distance_pricing').select(name).limit(1)
      return !error
    }
    const [
      hasPackageVariantId,
      hasDistanceRange,
      hasMinDistanceKm,
      hasMaxDistanceKm,
      hasAdditionalPrice,
      hasFranchise,
      hasCreatedAt,
      hasUpdatedAt,
      hasIsActive,
      hasDisplayOrder
    ] = await Promise.all([
      has('package_variant_id'),
      has('distance_range'),
      has('min_distance_km'),
      has('max_distance_km'),
      has('additional_price'),
      has('franchise_id'),
      has('created_at'),
      has('updated_at'),
      has('is_active'),
      has('display_order'),
    ])

    const dataToSave: any = {}
    if (hasPackageVariantId) dataToSave.package_variant_id = variantId
    if (hasDistanceRange) dataToSave.distance_range = distance_range.trim()
  if (hasMinDistanceKm) dataToSave.min_distance_km = minKm
  if (hasMaxDistanceKm) dataToSave.max_distance_km = maxKm
  if (hasAdditionalPrice) dataToSave.additional_price = addPrice
    if (hasIsActive) dataToSave.is_active = is_active
    if (hasUpdatedAt) dataToSave.updated_at = now
    if (hasDisplayOrder && !id) dataToSave.display_order = 0
    
    // Use franchise_id from body if provided (from frontend), otherwise use from user session
    const finalFranchiseId = bodyFranchiseId || franchiseId
    if (finalFranchiseId && hasFranchise) dataToSave.franchise_id = finalFranchiseId

    if (id) {
      // Update
      const updateData = { ...dataToSave }
      // Optional authorization: ensure same franchise when column exists
      if (hasFranchise && !isSuperAdmin) {
        const { data: existing, error: fetchErr } = await supabase
          .from('distance_pricing')
          .select('id, franchise_id')
          .eq('id', id)
          .maybeSingle()
        if (fetchErr) throw fetchErr
        if (existing && existing.franchise_id && existing.franchise_id !== franchiseId) {
          return NextResponse.json({ error: "You don't have access to update this pricing" }, { status: 403 })
        }
      }

      const { data, error } = await supabase
        .from('distance_pricing')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, pricing: data })
    } else {
      // Create
  const insertData = { ...dataToSave }
  if (hasCreatedAt) insertData.created_at = now
      const { data, error } = await supabase
        .from('distance_pricing')
        .insert(insertData)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, pricing: data })
    }
  } catch (error: any) {
    console.error('[Distance Pricing Save] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save distance pricing' }, { status: error?.message === 'Authentication required' ? 401 : 500 })
  }
}
