#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function readEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const env = {}
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach(line => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      env[key] = val
    }
  })
  return env
}

function log(emoji, msg) { console.log(`${emoji} ${msg}`) }

async function ensureCustomer(admin) {
  const { data: custs, error } = await admin.from('customers').select('id').limit(1)
  if (error) throw new Error('Query customers failed: ' + error.message)
  if (custs && custs.length > 0) return custs[0].id
  const { data: created, error: insErr } = await admin.from('customers').insert({
    name: 'Smoke Test Customer',
    phone: '9999999999',
    email: 'smoke-test@example.com',
    address: 'Test Address'
  }).select().single()
  if (insErr) throw new Error('Insert customer failed: ' + insErr.message)
  return created.id
}

async function main() {
  log('🚀', 'Package Quote Smoke Test (service role)')
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const admin = createClient(url, serviceKey)

  // Ensure a franchise exists (for NOT NULL franchise_id)
  let franchiseId = null
  try {
    const { data: franchises } = await admin.from('franchises').select('id').limit(1)
    if (franchises && franchises.length > 0) {
      franchiseId = franchises[0].id
      log('✅', 'Franchise ready: ' + franchiseId)
    } else {
      log('➕', 'Creating a sample franchise...')
      const code = 'SMOKE-' + Math.floor(Math.random()*10000).toString().padStart(4,'0')
      const { data: newFr, error: frErr } = await admin
        .from('franchises')
        .insert({ name: 'Smoke Franchise', code, address: 'Test Address' })
        .select()
        .single()
      if (frErr) throw frErr
      franchiseId = newFr.id
      log('✅', 'Franchise created: ' + franchiseId)
    }
  } catch (e) {
    log('⚠️', 'Could not ensure franchise (table may not exist). Will try a default fallback.')
    franchiseId = '00000000-0000-0000-0000-000000000001'
  }

  // Ensure a customer exists
  const customerId = await ensureCustomer(admin)
  log('✅', 'Customer ready: ' + customerId)

  // Create a package booking quote header
  const pkgNumber = 'QT-' + Date.now()
  log('🧪', 'Creating package quote: ' + pkgNumber)

  const now = new Date()
  const { data: booking, error } = await admin
    .from('package_bookings')
    .insert({
      package_number: pkgNumber,
      is_quote: true,
      status: 'quote',
      franchise_id: franchiseId,
      customer_id: customerId,
      event_type: 'Wedding',
      payment_type: 'full',
      event_date: now.toISOString(),
      subtotal_amount: 1000,
      tax_amount: 50,
      total_amount: 1050,
      amount_paid: 0,
      pending_amount: 1050,
      notes: 'Smoke test - package quote'
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create package quote:', error.message)
    process.exit(1)
  }

  log('✅', 'Package quote created with id: ' + booking.id)

  // Read back
  const { data: fetched, error: fetchErr } = await admin
    .from('package_bookings')
    .select('*')
    .eq('id', booking.id)
    .single()

  if (fetchErr) {
    console.error('❌ Failed to fetch created package quote:', fetchErr.message)
    process.exit(1)
  }

  log('📄', `Fetched: ${fetched.package_number} | is_quote=${fetched.is_quote} | total=${fetched.total_amount}`)

  log('🎉', 'Smoke test passed.')
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
