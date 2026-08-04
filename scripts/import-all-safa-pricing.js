/**
 * 🎯 COMPLETE Import Script - Ready to Use
 * 
 * This script imports ALL 270 pricing combinations
 * Just run: node scripts/import-all-safa-pricing.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FRANCHISE_ID = '1a518dde-85b7-44ef-8bc4-092f53ddfd99' // Surat Branch

// Helper functions
const parsePrice = (str) => parseFloat(str?.replace(/[₹,/-\s]/g, '') || '0')
const parseExtra = (str) => {
  const match = str?.match(/₹(\d+)/)
  return match ? parseFloat(match[1]) : 0
}

// Complete pricing data structure
const pricingData = {
  categories: [
    { name: '21 Safas', count: 21 },
    { name: '31 Safas', count: 31 },
    { name: '41 Safas', count: 41 },
    { name: '51 Safas', count: 51 },
    { name: '61 Safas', count: 61 },
    { name: '71 Safas', count: 71 },
    { name: '81 Safas', count: 81 },
    { name: '91 Safas', count: 91 },
    { name: '101 Safas', count: 101 }
  ],
  
  variants: [
    {
      name: 'Classic Style',
      inclusions: 'Classic Style, 3 VIP Family Safas, Groom Safa not included',
      extra_safa: 100,
      missing_safa: 450,
      prices: {
        '21': { premium: 4000, vip: 4500, vvip: 5000 },
        '31': { premium: 5000, vip: 5500, vvip: 6000 },
        '41': { premium: 6000, vip: 6500, vvip: 7000 },
        '51': { premium: 7000, vip: 7500, vvip: 8000 },
        '61': { premium: 8000, vip: 8500, vvip: 9000 },
        '71': { premium: 9000, vip: 9500, vvip: 10000 },
        '81': { premium: 10000, vip: 10500, vvip: 11000 },
        '91': { premium: 11000, vip: 11500, vvip: 12000 },
        '101': { premium: 12000, vip: 12500, vvip: 13000 }
      }
    },
    {
      name: 'Rajputana Rajwada Styles',
      inclusions: 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa',
      extra_safa: 120,
      missing_safa: 500,
      prices: {
        '21': { premium: 5000, vip: 5500, vvip: 6000 },
        '31': { premium: 6200, vip: 6700, vvip: 7200 },
        '41': { premium: 7400, vip: 7900, vvip: 8400 },
        '51': { premium: 8600, vip: 9100, vvip: 9600 },
        '61': { premium: 9800, vip: 10300, vvip: 10800 },
        '71': { premium: 11000, vip: 11500, vvip: 12000 },
        '81': { premium: 12200, vip: 12700, vvip: 13200 },
        '91': { premium: 13400, vip: 13900, vvip: 14400 },
        '101': { premium: 14600, vip: 15100, vvip: 15600 }
      }
    },
    {
      name: 'Floral Design',
      inclusions: 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories',
      extra_safa: 150,
      missing_safa: 550,
      prices: {
        '21': { premium: 6000, vip: 6500, vvip: 7000 },
        '31': { premium: 7500, vip: 8000, vvip: 8500 },
        '41': { premium: 9000, vip: 9500, vvip: 10000 },
        '51': { premium: 10500, vip: 11000, vvip: 11500 },
        '61': { premium: 12000, vip: 12500, vvip: 13000 },
        '71': { premium: 13500, vip: 14000, vvip: 14500 },
        '81': { premium: 15000, vip: 15500, vvip: 16000 },
        '91': { premium: 16500, vip: 17000, vvip: 17500 },
        '101': { premium: 18000, vip: 18500, vvip: 19000 }
      }
    },
    {
      name: 'Bollywood Styles',
      inclusions: 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery',
      extra_safa: 200,
      missing_safa: 650,
      prices: {
        '21': { premium: 7000, vip: 7500, vvip: 8000 },
        '31': { premium: 9000, vip: 9500, vvip: 10000 },
        '41': { premium: 11000, vip: 11500, vvip: 12000 },
        '51': { premium: 13000, vip: 13500, vvip: 14000 },
        '61': { premium: 15000, vip: 15500, vvip: 16000 },
        '71': { premium: 17000, vip: 17500, vvip: 18000 },
        '81': { premium: 19000, vip: 19500, vvip: 20000 },
        '91': { premium: 21000, vip: 21500, vvip: 22000 },
        '101': { premium: 23000, vip: 23500, vvip: 24000 }
      }
    },
    {
      name: 'Adani\'s Wedding Safa',
      inclusions: 'Adani\'s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa with exclusive jewellery',
      extra_safa: 250,
      missing_safa: 700,
      prices: {
        '21': { premium: 8000, vip: 8500, vvip: 9000 },
        '31': { premium: 10500, vip: 11000, vvip: 11500 },
        '41': { premium: 13000, vip: 13500, vvip: 14000 },
        '51': { premium: 15500, vip: 16000, vvip: 16500 },
        '61': { premium: 18000, vip: 18500, vvip: 19000 },
        '71': { premium: 20500, vip: 21000, vvip: 21500 },
        '81': { premium: 23000, vip: 23500, vvip: 24000 },
        '91': { premium: 25500, vip: 26000, vvip: 26500 },
        '101': { premium: 28000, vip: 28500, vvip: 29000 }
      }
    },
    {
      name: 'Ram–Sita Wedding Shades',
      inclusions: 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa with exclusive jewellery',
      extra_safa: 300,
      missing_safa: 750,
      prices: {
        '21': { premium: 9000, vip: 9500, vvip: 10000 },
        '31': { premium: 12000, vip: 12500, vvip: 13000 },
        '41': { premium: 15000, vip: 15500, vvip: 16000 },
        '51': { premium: 18000, vip: 18500, vvip: 19000 },
        '61': { premium: 21000, vip: 21500, vvip: 22000 },
        '71': { premium: 24000, vip: 24500, vvip: 25000 },
        '81': { premium: 27000, vip: 27500, vvip: 28000 },
        '91': { premium: 30000, vip: 30500, vvip: 31000 },
        '101': { premium: 33000, vip: 33500, vvip: 34000 }
      }
    },
    {
      name: 'JJ Valaya Premium Silk',
      inclusions: 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa with Brooch',
      extra_safa: 350,
      missing_safa: 950,
      prices: {
        '21': { premium: 10000, vip: 10500, vvip: 11000 },
        '31': { premium: 13500, vip: 14000, vvip: 14500 },
        '41': { premium: 17000, vip: 17500, vvip: 18000 },
        '51': { premium: 20500, vip: 21000, vvip: 21500 },
        '61': { premium: 24000, vip: 24500, vvip: 25000 },
        '71': { premium: 27500, vip: 28000, vvip: 28500 },
        '81': { premium: 31000, vip: 31500, vvip: 32000 },
        '91': { premium: 34500, vip: 35000, vvip: 35500 },
        '101': { premium: 36500, vip: 37000, vvip: 37500 }
      }
    },
    {
      name: 'Tissue Silk Premium',
      inclusions: 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all + Groom Maharaja Safa',
      extra_safa: 400,
      missing_safa: 1050,
      prices: {
        '21': { premium: 11000, vip: 11500, vvip: 12000 },
        '31': { premium: 15000, vip: 15500, vvip: 16000 },
        '41': { premium: 19000, vip: 19500, vvip: 20000 },
        '51': { premium: 23000, vip: 23500, vvip: 24000 },
        '61': { premium: 27000, vip: 27500, vvip: 28000 },
        '71': { premium: 31000, vip: 31500, vvip: 32000 },
        '81': { premium: 35000, vip: 35500, vvip: 36000 },
        '91': { premium: 39000, vip: 39500, vvip: 40000 },
        '101': { premium: 40000, vip: 40500, vvip: 41000 }
      }
    },
    {
      name: 'Royal Heritage Special',
      inclusions: 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery & accessories',
      extra_safa: 450,
      missing_safa: 1150,
      prices: {
        '21': { premium: 12000, vip: 12500, vvip: 13000 },
        '31': { premium: 16500, vip: 17000, vvip: 17500 },
        '41': { premium: 21000, vip: 21500, vvip: 22000 },
        '51': { premium: 25500, vip: 26000, vvip: 26500 },
        '61': { premium: 30000, vip: 30500, vvip: 31000 },
        '71': { premium: 34500, vip: 35000, vvip: 35500 },
        '81': { premium: 39000, vip: 39500, vvip: 40000 },
        '91': { premium: 43500, vip: 44000, vvip: 44500 },
        '101': { premium: 43500, vip: 44000, vvip: 44500 }
      }
    }
  ],
  
  distanceTiers: [
    { range: '0-10 km', min: 0, max: 10, price: 500 },
    { range: '11-50 km', min: 11, max: 50, price: 1000 },
    { range: '51-250 km', min: 51, max: 250, price: 2000 },
    { range: '251-500 km', min: 251, max: 500, price: 3000 },
    { range: '501-2000 km', min: 501, max: 2000, price: 5000 }
  ]
}

async function importAll() {
  console.log('🚀 Starting COMPLETE import...\n')
  
  const stats = { categories: 0, variants: 0, levels: 0, distance: 0, errors: [] }
  
  // Import each category
  for (const categoryData of pricingData.categories) {
    console.log(`\n📁 Creating category: ${categoryData.name}`)
    
    const { data: category, error: catError } = await supabase
      .from('packages_categories')
      .insert({
        name: categoryData.name,
        description: `Premium wedding safa collection for ${categoryData.count} people`,
        franchise_id: FRANCHISE_ID,
        is_active: true
      })
      .select()
      .single()
    
    if (catError) {
      console.error(`❌ Error:`, catError.message)
      stats.errors.push(`Category ${categoryData.name}: ${catError.message}`)
      continue
    }
    
    stats.categories++
    console.log(`✅ Created: ${category.name}`)
    
    // Import variants for this category
    for (const variantData of pricingData.variants) {
      const categoryNum = categoryData.count.toString()
      const prices = variantData.prices[categoryNum]
      
      if (!prices) {
        console.log(`  ⚠️ No prices for ${variantData.name} in ${categoryData.name}`)
        continue
      }
      
      console.log(`  📝 Creating variant: ${variantData.name}`)
      
      const { data: variant, error: varError } = await supabase
        .from('package_variants')
        .insert({
          name: variantData.name,
          description: variantData.inclusions,
          category_id: category.id,
          franchise_id: FRANCHISE_ID,
          base_price: prices.premium,
          extra_safa_price: variantData.extra_safa,
          missing_safa_penalty: variantData.missing_safa,
          inclusions: JSON.stringify(variantData.inclusions.split(', ')),
          is_active: true
        })
        .select()
        .single()
      
      if (varError) {
        console.error(`  ❌ Error:`, varError.message)
        stats.errors.push(`Variant ${variantData.name}: ${varError.message}`)
        continue
      }
      
      stats.variants++
      
      // Create levels
      const levels = [
        { name: 'Premium', price: prices.premium, order: 1 },
        { name: 'VIP', price: prices.vip, order: 2 },
        { name: 'VVIP', price: prices.vvip, order: 3 }
      ]
      
      for (const levelData of levels) {
        const { data: level, error: lvlError } = await supabase
          .from('package_levels')
          .insert({
            name: levelData.name,
            variant_id: variant.id,
            base_price: levelData.price,
            display_order: levelData.order,
            is_active: true
          })
          .select()
          .single()
        
        if (lvlError) {
          console.error(`    ❌ Level error:`, lvlError.message)
          stats.errors.push(`Level ${levelData.name}: ${lvlError.message}`)
          continue
        }
        
        stats.levels++
        
        // Create distance pricing
        for (const distTier of pricingData.distanceTiers) {
          const { error: distError } = await supabase
            .from('distance_pricing')
            .insert({
              package_level_id: level.id,
              range: distTier.range,
              min_distance_km: distTier.min,
              max_distance_km: distTier.max,
              base_price_addition: distTier.price,
              is_active: true
            })
          
          if (distError) {
            stats.errors.push(`Distance pricing: ${distError.message}`)
          } else {
            stats.distance++
          }
        }
      }
      
      console.log(`    ✅ ${variantData.name}: 3 levels + ${pricingData.distanceTiers.length * 3} distance tiers`)
    }
  }
  
  console.log('\n\n🎉 Import Complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 Final Statistics:`)
  console.log(`   Categories: ${stats.categories}`)
  console.log(`   Variants: ${stats.variants}`)
  console.log(`   Levels: ${stats.levels}`)
  console.log(`   Distance Pricing: ${stats.distance}`)
  if (stats.errors.length > 0) {
    console.log(`\n⚠️ Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`))
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// Run
importAll().catch(console.error)
