import { NextRequest, NextResponse } from 'next/server'
import { computePayroll } from '@/lib/payroll'
import { authenticateRequest } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }
    const user = auth.user!

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0,7)
    const franchise = searchParams.get('franchise')
    const filter = {
      search: searchParams.get('search') || undefined,
      overtimeOnly: searchParams.get('overtimeOnly') === 'true',
      missingConfigOnly: searchParams.get('missingConfig') === 'true',
      minNet: searchParams.get('minNet') ? Number(searchParams.get('minNet')) : undefined,
      maxNet: searchParams.get('maxNet') ? Number(searchParams.get('maxNet')) : undefined,
    }

    const result = await computePayroll({ month, franchiseId: user.role === 'super_admin' ? (franchise || null) : user.franchise_id, filter })

    return NextResponse.json(result)
  } catch (e:any) {
    console.error('[payroll/calculate] error', e)
    return NextResponse.json({ error: e.message || 'Failed to compute payroll' }, { status: 500 })
  }
}
