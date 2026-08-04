#!/usr/bin/env node

// Banking System Test Script
// Tests all API endpoints and validation

const BASE_URL = 'http://localhost:3000'
const ORG_ID = '00000000-0000-0000-0000-000000000001'

async function testBankingAPI() {
  console.log('🏦 Starting Banking System API Tests...')
  console.log('=' .repeat(50))

  let createdBankId = null

  try {
    // Test 1: GET /api/banks (should return empty list or existing banks)
    console.log('\n📊 Test 1: GET /api/banks')
    const listResponse = await fetch(`${BASE_URL}/api/banks?org_id=${ORG_ID}`)
    const listResult = await listResponse.json()
    console.log(`Status: ${listResponse.status}`)
    console.log(`Banks found: ${listResult.banks?.length || 0}`)
    
    if (listResponse.ok) {
      console.log('✅ GET /api/banks - PASSED')
    } else {
      console.log('❌ GET /api/banks - FAILED')
      console.log('Response:', listResult)
    }

    // Test 2: POST /api/banks (create new bank account)
    console.log('\n💾 Test 2: POST /api/banks (Create bank account)')
    const testBankData = {
      org_id: ORG_ID,
      bank_name: 'Test Bank',
      account_holder: 'Test Account Holder',
      account_number: 'TEST12345678',
      ifsc_code: 'TEST0123456',
      branch_name: 'Test Branch',
      upi_id: 'test@testbank',
      account_type: 'Current',
      is_primary: false,
      show_on_invoices: true
    }

    const createResponse = await fetch(`${BASE_URL}/api/banks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBankData)
    })
    const createResult = await createResponse.json()
    console.log(`Status: ${createResponse.status}`)
    
    if (createResponse.ok) {
      console.log('✅ POST /api/banks - PASSED')
      createdBankId = createResult.bank.id
      console.log(`Created bank ID: ${createdBankId}`)
    } else {
      console.log('❌ POST /api/banks - FAILED')
      console.log('Response:', createResult)
    }

    // Test 3: GET /api/banks/[id] (get specific bank)
    if (createdBankId) {
      console.log('\n🔍 Test 3: GET /api/banks/[id] (Get specific bank)')
      const getResponse = await fetch(`${BASE_URL}/api/banks/${createdBankId}?org_id=${ORG_ID}`)
      const getResult = await getResponse.json()
      console.log(`Status: ${getResponse.status}`)
      
      if (getResponse.ok) {
        console.log('✅ GET /api/banks/[id] - PASSED')
        console.log(`Bank name: ${getResult.bank.bank_name}`)
      } else {
        console.log('❌ GET /api/banks/[id] - FAILED')
        console.log('Response:', getResult)
      }
    }

    // Test 4: PUT /api/banks/[id] (update bank)
    if (createdBankId) {
      console.log('\n✏️ Test 4: PUT /api/banks/[id] (Update bank)')
      const updateData = {
        ...testBankData,
        bank_name: 'Updated Test Bank',
        is_primary: true
      }

      const updateResponse = await fetch(`${BASE_URL}/api/banks/${createdBankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      const updateResult = await updateResponse.json()
      console.log(`Status: ${updateResponse.status}`)
      
      if (updateResponse.ok) {
        console.log('✅ PUT /api/banks/[id] - PASSED')
        console.log(`Updated name: ${updateResult.bank.bank_name}`)
        console.log(`Is primary: ${updateResult.bank.is_primary}`)
      } else {
        console.log('❌ PUT /api/banks/[id] - FAILED')
        console.log('Response:', updateResult)
      }
    }

    // Test 5: Validation tests
    console.log('\n🛡️ Test 5: Validation tests')
    const invalidData = {
      org_id: ORG_ID,
      bank_name: 'X', // Too short
      account_holder: '', // Empty
      account_number: '123', // Too short
      ifsc_code: 'INVALID', // Wrong format
      upi_id: 'invalid-upi', // Wrong format
      account_type: 'InvalidType', // Not in enum
      is_primary: false,
      show_on_invoices: false
    }

    const validationResponse = await fetch(`${BASE_URL}/api/banks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    })
    const validationResult = await validationResponse.json()
    console.log(`Status: ${validationResponse.status}`)
    
    if (validationResponse.status === 400) {
      console.log('✅ Validation tests - PASSED')
      console.log(`Errors found: ${validationResult.details?.length || 1}`)
    } else {
      console.log('❌ Validation tests - FAILED (should return 400)')
      console.log('Response:', validationResult)
    }

    // Test 6: Presigned upload endpoint
    console.log('\n📤 Test 6: POST /api/uploads/presign')
    const presignData = {
      key: `banks/${ORG_ID}/test-qr.png`,
      mime: 'image/png',
      size: 12345,
      org_id: ORG_ID
    }

    const presignResponse = await fetch(`${BASE_URL}/api/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presignData)
    })
    const presignResult = await presignResponse.json()
    console.log(`Status: ${presignResponse.status}`)
    
    if (presignResponse.ok) {
      console.log('✅ POST /api/uploads/presign - PASSED')
      console.log(`Upload URL exists: ${!!presignResult.uploadUrl}`)
      console.log(`Public URL exists: ${!!presignResult.publicUrl}`)
    } else {
      console.log('❌ POST /api/uploads/presign - FAILED')
      console.log('Response:', presignResult)
    }

    // Test 7: DELETE /api/banks/[id] (cleanup)
    if (createdBankId) {
      console.log('\n🗑️ Test 7: DELETE /api/banks/[id] (Cleanup)')
      const deleteResponse = await fetch(`${BASE_URL}/api/banks/${createdBankId}?org_id=${ORG_ID}`, {
        method: 'DELETE'
      })
      const deleteResult = await deleteResponse.json()
      console.log(`Status: ${deleteResponse.status}`)
      
      if (deleteResponse.ok) {
        console.log('✅ DELETE /api/banks/[id] - PASSED')
        console.log(`Deleted bank: ${deleteResult.deleted_bank?.bank_name}`)
      } else {
        console.log('❌ DELETE /api/banks/[id] - FAILED')
        console.log('Response:', deleteResult)
      }
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message)
    console.error('Make sure the server is running on', BASE_URL)
  }

  console.log('\n' + '=' .repeat(50))
  console.log('🏁 Banking API Tests Completed!')
}

// Test validation functions
function testValidation() {
  console.log('\n🔍 Testing Validation Functions...')
  
  const tests = [
    { name: 'IFSC Code - Valid', pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, value: 'HDFC0001234', expected: true },
    { name: 'IFSC Code - Invalid', pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, value: 'INVALID123', expected: false },
    { name: 'UPI ID - Valid', pattern: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, value: 'user@bank', expected: true },
    { name: 'UPI ID - Invalid', pattern: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, value: 'invalid-upi', expected: false },
    { name: 'Account Number - Valid', pattern: /^[a-zA-Z0-9]{8,24}$/, value: '123456789012', expected: true },
    { name: 'Account Number - Too Short', pattern: /^[a-zA-Z0-9]{8,24}$/, value: '123', expected: false }
  ]

  tests.forEach(test => {
    const result = test.pattern.test(test.value)
    const status = result === test.expected ? '✅' : '❌'
    console.log(`${status} ${test.name}: ${test.value} -> ${result}`)
  })
}

// Run tests
async function main() {
  console.log('🚀 Banking System Test Suite')
  console.log('Server URL:', BASE_URL)
  console.log('Organization ID:', ORG_ID)
  
  testValidation()
  await testBankingAPI()
  
  console.log('\n📝 Next Steps:')
  console.log('1. Run the database schema: psql -f scripts/create-banking-schema.sql')
  console.log('2. Test the UI at: http://localhost:3000/settings')
  console.log('3. Check the Banking Details tab')
}

main().catch(console.error)