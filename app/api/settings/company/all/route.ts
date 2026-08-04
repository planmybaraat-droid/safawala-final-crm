import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/settings/company/all - super admin only
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('company_settings')
      .select('*, franchise:franchises(id, name, code)')
      .order('franchise_id')

    if (error) {
      console.error('[Settings All] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
