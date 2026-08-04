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

function log(emoji, msg, obj) {
  console.log(`${emoji} ${msg}`)
  if (obj) console.log(obj)
}

async function ensureFranchise(admin) {
  const { data, error } = await admin.from('franchises').select('id').limit(1)
  if (error) throw new Error('Query franchises failed: ' + error.message)
  if (data && data.length > 0) return data[0].id
  const code = 'SMOKE-' + Math.floor(Math.random()*10000).toString().padStart(4,'0')
  const { data: created, error: insErr } = await admin
    .from('franchises')
    .insert({ name: 'Smoke Franchise', code, address: 'Test Address' })
    .select().single()
  if (insErr) throw new Error('Insert franchise failed: ' + insErr.message)
  return created.id
}

async function ensureCustomer(admin, franchiseId) {
  const { data, error } = await admin.from('customers').select('id').limit(1)
  if (error) throw new Error('Query customers failed: ' + error.message)
  if (data && data.length > 0) return data[0].id
  const { data: created, error: insErr } = await admin
    .from('customers')
    .insert({
      name: 'Smoke Test Customer',
      phone: '9999999999',
      email: 'smoke-test@example.com',
      address: 'Test Address',
      franchise_id: franchiseId
    }).select().single()
  if (insErr) throw new Error('Insert customer failed: ' + insErr.message)
  return created.id
}

async function ensureProduct(admin, franchiseId) {
  const { data, error } = await admin.from('products').select('id').limit(1)
  if (error) throw new Error('Query products failed: ' + error.message)
  if (data && data.length > 0) return data[0].id
  const code = 'TEST-' + Date.now()
  const { data: created, error: insErr } = await admin
    .from('products')
    .insert({
      product_code: code,
      name: 'Smoke Test Product',
      category: 'test',
      price: 10.0,
      rental_price: 25.0,
      stock_total: 100,
      stock_available: 100,
      franchise_id: franchiseId
    }).select().single()
  if (insErr) throw new Error('Insert product failed: ' + insErr.message)
  return created.id
}

async function main() {
  console.log('\n🚀 SMOKE: Creating both product and package quotes')
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  const admin = createClient(url, key)

  const franchiseId = await ensureFranchise(admin)
  log('✅', 'Franchise ready: ' + franchiseId)
  const customerId = await ensureCustomer(admin, franchiseId)
  log('✅', 'Customer ready: ' + customerId)
  const productId = await ensureProduct(admin, franchiseId)
  log('✅', 'Product ready: ' + productId)

  // 1) Create product quote
  const ordNo = 'QT-PROD-' + Date.now()
  log('🧪', 'Creating product quote: ' + ordNo)
  const { data: prodQuote, error: pqErr } = await admin
    .from('product_orders')
    .insert({
      order_number: ordNo,
      customer_id: customerId,
      franchise_id: franchiseId,
      booking_type: 'rental',
      event_type: 'Wedding',
      event_participant: 'Both',
      payment_type: 'full',
      event_date: new Date().toISOString(),
      subtotal_amount: 50,
      tax_amount: 2.5,
      total_amount: 52.5,
      amount_paid: 0,
      pending_amount: 52.5,
      status: 'quote',
      is_quote: true
    }).select().single()
  if (pqErr) { console.error('❌ Product quote failed:', pqErr.message); process.exit(1) }
  const { error: poiErr } = await admin
    .from('product_order_items')
    .insert({
      order_id: prodQuote.id,
      product_id: productId,
      quantity: 2,
      unit_price: 25,
      total_price: 50,
      security_deposit: 100
    })
  if (poiErr) { console.error('❌ Product quote item failed:', poiErr.message); process.exit(1) }
  log('✅', 'Product quote created: ' + ordNo)

  // 2) Create package quote
  const pkgNo = 'QT-PKG-' + Date.now()
  log('🧪', 'Creating package quote: ' + pkgNo)
  const { data: pkgQuote, error: pkErr } = await admin
    .from('package_bookings')
    .insert({
      package_number: pkgNo,
      is_quote: true,
      status: 'quote',
      customer_id: customerId,
      franchise_id: franchiseId,
      event_type: 'Wedding',
      payment_type: 'full',
      event_date: new Date().toISOString(),
      subtotal_amount: 1000,
      tax_amount: 50,
      total_amount: 1050,
      amount_paid: 0,
      pending_amount: 1050,
      notes: 'Smoke test - package quote'
    }).select().single()
  if (pkErr) { console.error('❌ Package quote failed:', pkErr.message); process.exit(1) }
  log('✅', 'Package quote created: ' + pkgNo)

  // Summary
  console.log('\n📊 SUMMARY:')
  console.log('  Product quote:', ordNo)
  console.log('  Package quote:', pkgNo)

  // Quick counts
  const { data: prodCount } = await admin.from('product_orders').select('id', { count: 'exact', head: true }).eq('is_quote', true)
  const { data: pkgCount } = await admin.from('package_bookings').select('id', { count: 'exact', head: true }).eq('is_quote', true)
  console.log('  Product quotes count (approx):', prodCount)
  console.log('  Package quotes count (approx):', pkgCount)

  console.log('\n🎉 Smoke test completed successfully.')
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
