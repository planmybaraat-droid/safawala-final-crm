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

async function run() {
  console.log('🧪 Seeding minimal smoke-test data (service role)')
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  const admin = createClient(url, serviceKey)

  // Ensure at least one customer exists
  const { data: customers, error: custErr } = await admin
    .from('customers')
    .select('id')
    .limit(1)

  if (custErr) {
    console.error('❌ Failed to query customers:', custErr.message)
    process.exit(1)
  }

  if (!customers || customers.length === 0) {
    console.log('➕ Creating a sample customer...')
    const { data: newCust, error: insErr } = await admin
      .from('customers')
      .insert({
        name: 'Smoke Test Customer',
        phone: '9999999999',
        email: 'smoke-test@example.com',
        address: 'Test Address',
      })
      .select()
      .single()
    if (insErr) {
      console.error('❌ Failed to insert sample customer:', insErr.message)
      process.exit(1)
    }
    console.log('✅ Customer ready:', newCust.id)
  } else {
    console.log('✅ Customer exists')
  }

  // Ensure at least one product exists
  const { data: products, error: prodErr } = await admin
    .from('products')
    .select('id')
    .limit(1)

  if (prodErr) {
    console.error('❌ Failed to query products:', prodErr.message)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('➕ Creating a sample product...')
    const code = 'TEST-' + Date.now()
    const { data: newProd, error: insErr } = await admin
      .from('products')
      .insert({
        product_code: code,
        name: 'Smoke Test Product',
        category: 'test',
        price: 10.0,
        rental_price: 25.0,
        stock_total: 100,
        stock_available: 100,
      })
      .select()
      .single()
    if (insErr) {
      console.error('❌ Failed to insert sample product:', insErr.message)
      process.exit(1)
    }
    console.log('✅ Product ready:', newProd.id)
  } else {
    console.log('✅ Product exists')
  }

  console.log('🎉 Seed complete.')
}

run().catch((e) => {
  console.error('❌ Seed error:', e)
  process.exit(1)
})
