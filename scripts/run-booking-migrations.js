/*
Helper script to guide running the booking + quote migrations needed for invoices.
This does NOT execute DDL (Supabase JS client cannot run arbitrary DDL safely),
but it checks existence and prints exactly what to run.
*/

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, serviceKey)
  console.log('🔍 Checking for product_orders table...')
  const prod = await supabase.from('product_orders').select('id').limit(1)
  const hasProduct = !prod.error
  console.log(hasProduct ? '✅ product_orders exists' : '❌ product_orders missing')

  console.log('🔍 Checking for package_bookings table...')
  const pkg = await supabase.from('package_bookings').select('id').limit(1)
  const hasPackage = !pkg.error
  console.log(hasPackage ? '✅ package_bookings exists' : '❌ package_bookings missing')

  if (hasProduct) {
    console.log('🔍 Checking for product_orders.is_quote column...')
    const prodQuote = await supabase.from('product_orders').select('is_quote').limit(1)
    console.log(!prodQuote.error ? '✅ is_quote column on product_orders' : '❌ is_quote missing on product_orders')
  }
  if (hasPackage) {
    console.log('🔍 Checking for package_bookings.is_quote column...')
    const pkgQuote = await supabase.from('package_bookings').select('is_quote').limit(1)
    console.log(!pkgQuote.error ? '✅ is_quote column on package_bookings' : '❌ is_quote missing on package_bookings')
  }

  const migration1 = 'MIGRATION_SPLIT_PRODUCT_AND_PACKAGE_BOOKINGS.sql'
  const migration2 = 'ADD_QUOTE_SUPPORT.sql'

  console.log('\n📄 Migration 1 file present:', fs.existsSync(migration1))
  console.log('📄 Migration 2 file present:', fs.existsSync(migration2))

  if (!hasProduct || !hasPackage) {
    console.log('\n⚠️ Required base tables missing. Run migration 1 first.')
    printRunInstructions(migration1)
  } else {
    console.log('\n✅ Base tables exist.')
  }

  if (hasProduct && hasPackage) {
    // Check if is_quote present via earlier queries; if missing, show migration 2
    const prodQuoteMissing = prod.error || !(await supabase.from('product_orders').select('is_quote').limit(1)).error === false
    // Simpler: attempt again & check error
    const pqAttempt = await supabase.from('product_orders').select('is_quote').limit(1)
    const prodIsQuoteOk = !pqAttempt.error

    const pkgAttempt = await supabase.from('package_bookings').select('is_quote').limit(1)
    const pkgIsQuoteOk = !pkgAttempt.error

    if (!prodIsQuoteOk || !pkgIsQuoteOk) {
      console.log('\n⚠️ is_quote missing. Run migration 2 next.')
      printRunInstructions(migration2)
    } else {
      console.log('\n🎉 All required columns exist. You can refresh the invoices page.')
    }
  }
}

function printRunInstructions(file) {
  console.log('──────────────────────────────────────────')
  console.log('Run this in Supabase SQL Editor:')
  try {
    const sql = fs.readFileSync(file, 'utf8')
    console.log(sql)
  } catch (e) {
    console.log('Unable to read file', file, e.message)
  }
  console.log('──────────────────────────────────────────')
  console.log('Tip: copy to clipboard:')
  console.log(`cat ${file} | pbcopy`)
}

main().catch(e => { console.error(e); process.exit(1) })
