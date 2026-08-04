import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server-simple'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing package id' }, { status: 400 })

    const { data: pkg, error: fetchErr } = await supabaseServer
      .from('package_sets')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (fetchErr || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, pkg.franchise_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseServer
      .from('package_sets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Package update error:', error)
      return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Package update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
