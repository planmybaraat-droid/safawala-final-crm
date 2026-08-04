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

async function listColumns(client, table) {
  const { data, error } = await client
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('column_name')
  if (error) throw new Error(`Failed to fetch columns for ${table}: ${error.message}`)
  return new Set((data || []).map(r => r.column_name))
}

async function main() {
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  const admin = createClient(url, key)

  const expectedBookings = [
    'id','package_number','is_quote','customer_id','franchise_id','event_type','event_participant','payment_type',
    'custom_amount','discount_amount','coupon_code','coupon_discount','event_date','delivery_date','return_date',
    'venue_name','venue_address','groom_name','groom_whatsapp','groom_address','bride_name','bride_whatsapp',
    'bride_address','notes','distance_km','distance_amount','tax_amount','subtotal_amount','total_amount',
    'security_deposit','amount_paid','pending_amount','sales_closed_by_id','use_custom_pricing','custom_package_price',
    'payment_method','status','created_at','updated_at'
  ]

  const expectedItems = [
    'id','booking_id','category_id','variant_id','variant_name','variant_inclusions','quantity','unit_price',
    'total_price','extra_safas','reserved_products','security_deposit','distance_addon','created_at','updated_at'
  ]

  const bookingsCols = await listColumns(admin, 'package_bookings')
  const itemsCols = await listColumns(admin, 'package_booking_items')

  const missingBookings = expectedBookings.filter(c => !bookingsCols.has(c))
  const missingItems = expectedItems.filter(c => !itemsCols.has(c))

  console.log('📋 Schema check:')
  console.log('  package_bookings:')
  console.log('    Missing:', missingBookings)
  console.log('  package_booking_items:')
  console.log('    Missing:', missingItems)

  if (missingBookings.length === 0 && missingItems.length === 0) {
    console.log('✅ Package quote schema OK')
    process.exit(0)
  } else {
    console.log('⚠️ Missing columns detected')
    process.exit(2)
  }
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
