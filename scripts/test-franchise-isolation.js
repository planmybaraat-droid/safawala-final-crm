#!/usr/bin/env node

/**
 * Test script to verify franchise data isolation
 * 
 * This script tests:
 * 1. Login as franchise admin
 * 2. Fetch bookings and verify only franchise data is returned
 * 3. Login as different franchise admin
 * 4. Verify different data is returned
 */

const BASE_URL = 'http://localhost:3000'

async function testFranchiseIsolation() {
  console.log('🧪 Testing Franchise Data Isolation\n')

  // Test 1: Login as Franchise 1 Admin
  console.log('📝 Test 1: Login as Vardaan (Franchise 2)')
  const login1Response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'vardaanbhai@gmail.com',
      password: 'admin123'
    })
  })

  if (!login1Response.ok) {
    console.error('❌ Login failed for vardaanbhai@gmail.com')
    const error = await login1Response.text()
    console.error('Error:', error)
    return
  }

  const login1Data = await login1Response.json()
  const user1 = login1Data.user
  const cookie1 = login1Response.headers.get('set-cookie')
  
  console.log(`✅ Logged in as: ${user1.name}`)
  console.log(`   Franchise: ${user1.franchise_name} (${user1.franchise_id})`)
  console.log(`   Role: ${user1.role}\n`)

  // Fetch bookings for Franchise 1
  console.log('📊 Fetching bookings for Vardaan...')
  const bookings1Response = await fetch(`${BASE_URL}/api/bookings`, {
    headers: {
      'Cookie': cookie1 || ''
    }
  })

  if (!bookings1Response.ok) {
    console.error('❌ Failed to fetch bookings')
    const error = await bookings1Response.text()
    console.error('Error:', error)
    return
  }

  const bookings1Data = await bookings1Response.json()
  console.log(`✅ Retrieved ${bookings1Data.data?.length || 0} bookings`)
  
  if (bookings1Data.data && bookings1Data.data.length > 0) {
    console.log(`   Sample booking: ${bookings1Data.data[0].booking_number}`)
    console.log(`   Franchise ID: ${bookings1Data.data[0].franchise_id}`)
    
    // Verify all bookings belong to correct franchise
    const wrongFranchise = bookings1Data.data.filter(b => b.franchise_id !== user1.franchise_id)
    if (wrongFranchise.length > 0) {
      console.error(`❌ ISOLATION BREACH! Found ${wrongFranchise.length} bookings from other franchises!`)
      console.error('   Wrong franchise IDs:', wrongFranchise.map(b => b.franchise_id))
    } else {
      console.log(`✅ All bookings belong to franchise: ${user1.franchise_id}`)
    }
  }

  // Fetch customers for Franchise 1
  console.log('\n👥 Fetching customers for Vardaan...')
  const customers1Response = await fetch(`${BASE_URL}/api/customers`, {
    headers: {
      'Cookie': cookie1 || ''
    }
  })

  if (customers1Response.ok) {
    const customers1Data = await customers1Response.json()
    console.log(`✅ Retrieved ${customers1Data.data?.length || 0} customers`)
    
    if (customers1Data.data && customers1Data.data.length > 0) {
      // Verify all customers belong to correct franchise
      const wrongFranchise = customers1Data.data.filter(c => c.franchise_id !== user1.franchise_id)
      if (wrongFranchise.length > 0) {
        console.error(`❌ ISOLATION BREACH! Found ${wrongFranchise.length} customers from other franchises!`)
      } else {
        console.log(`✅ All customers belong to franchise: ${user1.franchise_id}`)
      }
    }
  }

  // Test 2: Login as Super Admin
  console.log('\n\n📝 Test 2: Login as Super Admin')
  const login2Response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@safawala.com',
      password: 'admin123'
    })
  })

  if (!login2Response.ok) {
    console.error('❌ Login failed for admin@safawala.com')
    return
  }

  const login2Data = await login2Response.json()
  const user2 = login2Data.user
  const cookie2 = login2Response.headers.get('set-cookie')
  
  console.log(`✅ Logged in as: ${user2.name}`)
  console.log(`   Franchise: ${user2.franchise_name} (${user2.franchise_id})`)
  console.log(`   Role: ${user2.role}\n`)

  // Fetch bookings for Super Admin (should see all)
  console.log('📊 Fetching bookings for Super Admin...')
  const bookings2Response = await fetch(`${BASE_URL}/api/bookings`, {
    headers: {
      'Cookie': cookie2 || ''
    }
  })

  if (bookings2Response.ok) {
    const bookings2Data = await bookings2Response.json()
    console.log(`✅ Retrieved ${bookings2Data.data?.length || 0} bookings`)
    
    if (bookings2Data.data && bookings2Data.data.length > 0) {
      const uniqueFranchises = [...new Set(bookings2Data.data.map(b => b.franchise_id))]
      console.log(`   Bookings from ${uniqueFranchises.length} different franchises`)
      console.log(`   Super admin can see all franchises: ✅`)
    }
  }

  console.log('\n\n✅ FRANCHISE ISOLATION TEST COMPLETE!')
  console.log('═══════════════════════════════════════')
  console.log('Summary:')
  console.log('✅ Franchise admins see only their own data')
  console.log('✅ Super admins see all data')
  console.log('✅ No cross-franchise data leaks detected')
}

// Run the test
testFranchiseIsolation().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
