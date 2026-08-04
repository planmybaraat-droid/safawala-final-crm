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

    const body = await request.json()
    const { id } = body
    
    if (!id) return NextResponse.json({ error: 'Missing package id' }, { status: 400 })

    const supabase = createClient()

    if (!isSuperAdmin && franchiseId) {
      const { data: pkg, error: fetchErr } = await supabase
        .from('package_sets')
        .select('id, franchise_id')
        .eq('id', id)
        .single()
      if (fetchErr || !pkg || pkg.franchise_id !== franchiseId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Hard delete package and cascade manual cleanups if needed
    const { error } = await supabase
      .from('package_sets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Package delete error:', error)
      return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Package delete API error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
