/*
  RLS Smoke Test (Node) — optional harness
  - Verifies basic tenant isolation by setting a JWT with random franchise_id
  - Requires a PostgREST header override; Supabase JS does not let us set arbitrary JWT directly,
    so this script uses the Service Role key and injects request.jwt.claims via Postgres function call per session.

  Usage:
    pnpm tsx scripts/rls-smoke-test.ts

  Env:
    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function setClaims(role: 'authenticated', userId: string, franchiseId: string, appRole: string) {
  const { error } = await supabase.rpc('set_local_claims', {
    p_role: role,
    p_user_id: userId,
    p_franchise: franchiseId,
    p_app_role: appRole,
  })
  if (error) throw error
}

async function count(table: string) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

async function main() {
  console.log('Running RLS Node smoke...')

  const randomUser = crypto.randomUUID()
  const randomFranchise = crypto.randomUUID()

  // Scenario A: Staff with random franchise should see 0 rows
  await setClaims('authenticated', randomUser, randomFranchise, 'staff')
  const tenantTables = [
    'customers','products','bookings','payments','purchases','expenses','laundry_batches','deliveries'
  ]
  for (const t of tenantTables) {
    try {
      const c = await count(t)
      if (c > 0) {
        console.log(`[LEAK] ${t}: ${c} rows visible with foreign franchise claims`)
      } else {
        console.log(`[OK]   ${t}: 0 rows visible`)
      }
    } catch (e: any) {
      console.log(`[SKIP] ${t}: ${e.message}`)
    }
  }

  // Scenario B: Super admin should see rows
  await setClaims('authenticated', randomUser, randomFranchise, 'super_admin')
  for (const t of tenantTables) {
    try {
      const c = await count(t)
      console.log(`[INFO] ${t}: super_admin sees ${c} rows`)
    } catch (e: any) {
      console.log(`[SKIP] ${t}: ${e.message}`)
    }
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error('RLS smoke failed:', e)
  process.exit(1)
})
