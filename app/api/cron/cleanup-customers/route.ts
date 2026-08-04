import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server-simple'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const secret = request.headers.get('x-cron-secret')
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // cutoff = now - 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Find candidates
    const { data: candidates, error: findError } = await supabaseServer
      .from('customers')
      .select('id, name')
      .lte('deleted_at', cutoff)

    if (findError) {
      console.error('[cron.cleanup-customers] findError', findError)
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    const deleted: string[] = []
    const skipped: { id: string; reason: string }[] = []

    for (const c of candidates || []) {
      // Skip if related bookings exist
      const { data: hasBookings, error: bookingsErr } = await supabaseServer
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', c.id)
      if (bookingsErr) {
        skipped.push({ id: c.id, reason: 'bookings check failed' })
        continue
      }
      if ((hasBookings as any)?.length > 0) {
        skipped.push({ id: c.id, reason: 'has bookings' })
        continue
      }

      // Safe hard delete
      const { error: delErr } = await supabaseServer
        .from('customers')
        .delete()
        .eq('id', c.id)

      if (delErr) {
        skipped.push({ id: c.id, reason: delErr.message })
      } else {
        deleted.push(c.id)
      }
    }

    return NextResponse.json({ success: true, deleted, skipped })
  } catch (e: any) {
    console.error('[cron.cleanup-customers] error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
