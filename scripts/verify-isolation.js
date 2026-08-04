#!/usr/bin/env node

/**
 * Verify franchise isolation - check if customers are properly isolated
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyIsolation() {
  console.log('🔍 Verifying Franchise Isolation...\n')

  // 1. Get mysafawale franchise
  const { data: mysafawaleUser } = await supabase
    .from('users')
    .select('id, email, franchise_id, role')
    .eq('email', 'mysafawale@gmail.com')
    .single()

  if (!mysafawaleUser) {
    console.log('❌ mysafawale@gmail.com not found!')
    return
  }

  console.log('✅ mysafawale@gmail.com User:')
  console.log(`   Franchise ID: ${mysafawaleUser.franchise_id}`)
  console.log(`   Role: ${mysafawaleUser.role}\n`)

  // 2. Get ALL customers across ALL franchises
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, name, franchise_id')
    .order('created_at', { ascending: false })

  console.log(`📊 TOTAL CUSTOMERS (ALL FRANCHISES): ${allCustomers?.length || 0}`)
  
  // 3. Get customers ONLY for mysafawale franchise
  const { data: mysafawaleCustomers } = await supabase
    .from('customers')
    .select('id, name, customer_code, franchise_id, created_at')
    .eq('franchise_id', mysafawaleUser.franchise_id)
    .order('created_at', { ascending: false })

  console.log(`📊 mysafawale@gmail.com CUSTOMERS: ${mysafawaleCustomers?.length || 0}\n`)

  // 4. Break down by franchise
  const customersByFranchise = {}
  allCustomers?.forEach(c => {
    const fid = c.franchise_id || 'null'
    customersByFranchise[fid] = (customersByFranchise[fid] || 0) + 1
  })

  console.log('📋 Customers by Franchise:')
  console.log('─'.repeat(80))
  
  for (const [franchiseId, count] of Object.entries(customersByFranchise)) {
    const { data: franchise } = await supabase
      .from('franchises')
      .select('name, code')
      .eq('id', franchiseId)
      .single()
    
    const isMySafawale = franchiseId === mysafawaleUser.franchise_id
    const marker = isMySafawale ? '👉 YOUR FRANCHISE' : '   Other franchise'
    
    console.log(`${marker}`)
    console.log(`   Franchise: ${franchise?.name || 'Unknown'} (${franchise?.code || 'N/A'})`)
    console.log(`   ID: ${franchiseId}`)
    console.log(`   Customers: ${count}`)
    console.log('─'.repeat(80))
  }

  // 5. Show mysafawale customers
  if (mysafawaleCustomers && mysafawaleCustomers.length > 0) {
    console.log('\n📋 YOUR CUSTOMERS (mysafawale@gmail.com):')
    console.log('─'.repeat(80))
    mysafawaleCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`)
      console.log(`   Code: ${c.customer_code || 'N/A'}`)
      console.log(`   Created: ${new Date(c.created_at).toLocaleDateString()}`)
    })
    console.log('─'.repeat(80))
  }

  // 6. Verdict
  console.log('\n🎯 ISOLATION VERDICT:')
  if (mysafawaleCustomers?.length === allCustomers?.length) {
    console.log('⚠️  WARNING: All customers belong to mysafawale@gmail.com franchise!')
    console.log('   This might be expected if you only have one franchise with data.')
  } else {
    console.log('✅ PERFECT! Franchise isolation is working correctly!')
    console.log(`   Total: ${allCustomers?.length} customers across all franchises`)
    console.log(`   Yours: ${mysafawaleCustomers?.length} customers in your franchise`)
    console.log(`   Others: ${(allCustomers?.length || 0) - (mysafawaleCustomers?.length || 0)} customers in other franchises`)
  }
}

verifyIsolation().catch(console.error)
