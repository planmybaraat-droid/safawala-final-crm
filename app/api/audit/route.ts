import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { authenticateRequest } from '@/lib/auth-middleware'

// POST /api/audit - record an audit entry
// Body: { entity_type, entity_id, action, changes?, actor_id?, actor_role? }
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const body = await req.json()
    const { entity_type, entity_id, action, changes, actor_id, actor_role } = body || {}

    if (!entity_type || !entity_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const insert = {
      entity_type,
      entity_id,
      action,
      changes: changes || null,
      actor_id: actor_id || null,
      actor_role: actor_role || null
    }

  const { data, error } = await supabase.from('expense_audit').insert(insert).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('POST /api/audit error', e)
    return NextResponse.json({ error: 'Failed to write audit entry' }, { status: 500 })
  }
}
