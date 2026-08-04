import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'packages' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 })
    }

    const supabase = createClient()

    // If franchise_id column exists, enforce tenant check
    const { error: probeErr } = await supabase.from('distance_pricing').select('franchise_id').limit(1)
    const hasFranchise = !probeErr
    if (hasFranchise && !isSuperAdmin) {
      const { data: existing, error: fetchErr } = await supabase
        .from('distance_pricing')
        .select('id, franchise_id')
        .eq('id', id)
        .maybeSingle()
      if (fetchErr) throw fetchErr
      if (existing && existing.franchise_id && existing.franchise_id !== franchiseId) {
        return NextResponse.json({ error: "You don't have access to delete this pricing" }, { status: 403 })
      }
    }

    const { error: delErr } = await supabase.from('distance_pricing').delete().eq('id', id)
    if (delErr) throw delErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Distance Pricing Delete] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete distance pricing' }, { status: error?.message === 'Authentication required' ? 401 : 500 })
  }
}
