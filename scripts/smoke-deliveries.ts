/*
  Smoke test for Deliveries backend
  - Verifies deliveries table exists
  - Calls RPC generate_delivery_number (or falls back)
  - Inserts a minimal delivery row
  - Reads it back

  Usage: pnpm smoke
  Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY must be set
*/

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  console.log('Running deliveries smoke test...')

  // 1) Check table exists
  const { error: probeError } = await supabase.from('deliveries').select('id').limit(1)
  if (probeError) {
    throw new Error(`Probe failed. deliveries table missing? ${probeError.message}`)
  }
  console.log('✓ deliveries table accessible')

  // 2) Find a customer to attach
  const { data: customers, error: custError } = await supabase.from('customers').select('id').limit(1)
  if (custError || !customers?.[0]?.id) {
    throw new Error('No customers found; seed one first (scripts/seed-customers.js)')
  }
  const customer_id = customers[0].id

  // 3) Generate delivery number
  let delivery_number = `DEL-${Date.now().toString().slice(-5)}`
  try {
    const { data, error } = await supabase.rpc('generate_delivery_number')
    if (!error && data) delivery_number = data
  } catch {}
  console.log('Using delivery_number:', delivery_number)

  // 4) Insert minimal delivery
  const toInsert = {
    delivery_number,
    customer_id,
    delivery_address: 'Smoke Test Address',
    delivery_date: new Date().toISOString().slice(0, 10),
    status: 'pending' as const,
  }

  const { data: inserted, error: insError } = await supabase
    .from('deliveries')
    .insert(toInsert)
    .select('*')
    .single()

  if (insError) {
    throw new Error(`Insert failed: ${insError.message}`)
  }
  console.log('✓ Inserted delivery id:', inserted.id)

  // 5) Read back list
  const { data: list, error: listError } = await supabase.from('deliveries').select('id, delivery_number').order('created_at', { ascending: false }).limit(3)
  if (listError) throw new Error(`List failed: ${listError.message}`)
  console.log('✓ Recent deliveries:', list)

  console.log('SMOKE TEST PASS')
}

main().catch((e) => {
  console.error('SMOKE TEST FAIL:', e.message)
  process.exit(1)
})
