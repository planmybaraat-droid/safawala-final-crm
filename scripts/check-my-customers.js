#!/usr/bin/env node

/**
 * Quick verification script to check customers for mysafawale@gmail.com
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCustomers() {
  console.log('🔍 Checking customers for mysafawale@gmail.com...\n')

  // 1. Get franchise_id
  const { data: user } = await supabase
    .from('users')
    .select('id, email, franchise_id, role')
    .eq('email', 'mysafawale@gmail.com')
    .single()

  if (!user) {
    console.log('❌ User not found!')
    return
  }

  console.log('✅ User found:')
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Franchise ID: ${user.franchise_id}\n`)

  // 2. Get all customers for this franchise
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('franchise_id', user.franchise_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.log('❌ Error fetching customers:', error.message)
    return
  }

  console.log(`📊 Total Customers: ${customers?.length || 0}\n`)

  if (customers && customers.length > 0) {
    console.log('📋 Customer List:')
    console.log('─'.repeat(80))
    customers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`)
      console.log(`   Code: ${c.customer_code || 'N/A'}`)
      console.log(`   Phone: ${c.phone}`)
      console.log(`   Email: ${c.email || 'N/A'}`)
      console.log(`   Created: ${new Date(c.created_at).toLocaleString()}`)
      console.log('─'.repeat(80))
    })
  } else {
    console.log('ℹ️  No customers found')
  }

  // 3. Check the most recent customer
  const { data: recent } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (recent && recent[0]) {
    console.log('\n🆕 Most Recent Customer (any franchise):')
    console.log(`   Name: ${recent[0].name}`)
    console.log(`   Code: ${recent[0].customer_code}`)
    console.log(`   Franchise ID: ${recent[0].franchise_id}`)
    console.log(`   Match: ${recent[0].franchise_id === user.franchise_id ? '✅ Same franchise' : '❌ Different franchise'}`)
  }
}

checkCustomers().catch(console.error)
