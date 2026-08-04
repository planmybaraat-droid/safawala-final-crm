#!/usr/bin/env node

/**
 * Bulk Update Product Stock Script
 *
 * This script updates all product stock quantities to a specified value (default: 600)
 *
 * Usage:
 *   node scripts/bulk-update-stock.js [stock_quantity] [franchise_id]
 *
 * Examples:
 *   node scripts/bulk-update-stock.js 600                    # Update all products to 600
 *   node scripts/bulk-update-stock.js 1000 franchise-123    # Update products for specific franchise to 1000
 *
 * Environment Variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const https = require('https')
const http = require('http')
const { URL } = require('url')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Determine API base URL - use localhost for development, Supabase URL for production
const isDevelopment = process.env.NODE_ENV !== 'production'
const API_BASE_URL = isDevelopment ? 'http://localhost:3000' : SUPABASE_URL

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Please set these environment variables or create a .env.local file')
  process.exit(1)
}

// Parse command line arguments
const args = process.argv.slice(2)
const stockQuantity = args[0] ? parseInt(args[0]) : 600
const franchiseId = args[1] || null

if (isNaN(stockQuantity) || stockQuantity < 0) {
  console.error('❌ Invalid stock quantity. Must be a non-negative number.')
  process.exit(1)
}

console.log(`🚀 Starting bulk stock update...`)
console.log(`   Target stock quantity: ${stockQuantity}`)
if (franchiseId) {
  console.log(`   Franchise ID: ${franchiseId}`)
} else {
  console.log(`   Scope: All franchises`)
}
console.log('')

// Function to make HTTP request
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? https : http
    const req = protocol.request(url, options, (res) => {
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          resolve({ statusCode: res.statusCode, data: response })
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: body })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

// Function to get current stock statistics
async function getStockStats() {
  const url = new URL('/api/products/bulk-update-stock', API_BASE_URL)

  try {
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.statusCode === 200) {
      return response.data
    } else {
      console.error('❌ Failed to get stock statistics:', response.data)
      return null
    }
  } catch (error) {
    console.error('❌ Error getting stock statistics:', error.message)
    return null
  }
}

// Function to update stock
async function updateStock(quantity, franchiseId = null) {
  const url = new URL('/api/products/bulk-update-stock', API_BASE_URL)

  const payload = { stock_quantity: quantity }
  if (franchiseId) {
    payload.franchise_id = franchiseId
  }

  try {
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, payload)

    if (response.statusCode === 200) {
      return response.data
    } else {
      console.error('❌ Failed to update stock:', response.data)
      return null
    }
  } catch (error) {
    console.error('❌ Error updating stock:', error.message)
    return null
  }
}

// Main execution
async function main() {
  console.log('📊 Getting current stock statistics...')
  const beforeStats = await getStockStats()

  if (beforeStats) {
    console.log('   Current statistics:')
    console.log(`   - Total products: ${beforeStats.total_products}`)
    console.log(`   - Total stock: ${beforeStats.total_stock}`)
    console.log(`   - Average stock: ${beforeStats.average_stock}`)
    console.log(`   - Min stock: ${beforeStats.min_stock}`)
    console.log(`   - Max stock: ${beforeStats.max_stock}`)
    console.log('')
  }

  console.log('🔄 Updating stock quantities...')
  const result = await updateStock(stockQuantity, franchiseId)

  if (result && result.success) {
    console.log('✅ Stock update completed successfully!')
    console.log(`   Updated ${result.updated_count} products`)
    console.log(`   New stock quantity: ${result.stock_quantity}`)
    console.log('')

    // Get updated statistics
    console.log('📊 Getting updated stock statistics...')
    const afterStats = await getStockStats()

    if (afterStats) {
      console.log('   Updated statistics:')
      console.log(`   - Total products: ${afterStats.total_products}`)
      console.log(`   - Total stock: ${afterStats.total_stock}`)
      console.log(`   - Average stock: ${afterStats.average_stock}`)
      console.log(`   - Min stock: ${afterStats.min_stock}`)
      console.log(`   - Max stock: ${afterStats.max_stock}`)
    }

    console.log('')
    console.log('🎉 Bulk stock update completed successfully!')
  } else {
    console.error('❌ Stock update failed!')
    process.exit(1)
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script execution failed:', error.message)
  process.exit(1)
})