/**
 * Import Safa Pricing Data from CSV
 * 
 * This script imports the pricing data into the database
 * Run: node scripts/import-safa-pricing.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key to bypass RLS
)

// Your franchise ID (Surat Branch)
const FRANCHISE_ID = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'

// Parse price from "₹4,000/-" to 4000
function parsePrice(priceStr) {
  if (!priceStr) return 0
  return parseFloat(priceStr.replace(/[₹,/-\s]/g, '')) || 0
}

// Extract numbers from range like "₹100/- per piece" to 100
function parseExtraSafaPrice(str) {
  if (!str) return 0
  const match = str.match(/₹(\d+)/)
  return match ? parseFloat(match[1]) : 0
}

// Parse "₹450 + GST" to 450
function parseMissingSafaPenalty(str) {
  if (!str) return 0
  const match = str.match(/₹(\d+)/)
  return match ? parseFloat(match[1]) : 0
}

// CSV data - your pricing sheet
const csvData = `Category	Package Variant	Level	Price (₹)	Inclusions	Extra Safa (₹)	Missing Safa (₹)	0–10 km	11–50 km	51–250 km	251–500 km	501–2000 km
21	Classic Style	Premium	₹4,000/-	Classic Style, 3 VIP Family Safas, Groom Safa not included	₹100/- per piece	₹450 + GST	₹500/-	₹1000/-	₹2000/-	₹3000/-	₹5000/-
21	Classic Style	VIP	₹4,500/-	Classic Style, 3 VIP Family Safas, Groom Safa not included	₹100/- per piece	₹450 + GST	₹500/-	₹1000/-	₹2000/-	₹3000/-	₹5000/-
21	Classic Style	VVIP	₹5,000/-	Classic Style, 3 VIP Family Safas, Groom Safa not included	₹100/- per piece	₹450 + GST	₹500/-	₹1000/-	₹2000/-	₹3000/-	₹5000/-
21	Rajputana Rajwada Styles	Premium	₹5,000/-	Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa	₹120/- per piece	₹500 + GST	₹500/-	₹1000/-	₹2000/-	₹3000/-	₹5000/-
21	Rajputana Rajwada Styles	VIP	₹5,500/-	Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa	₹120/- per piece	₹500 + GST	₹500/-	₹1000/-	₹2000/-	₹3000/-	₹5000/-
21	Rajputana Rajwada Styles	VVIP	₹6,000/-	Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa	₹120/- per piece	₹500 + GST	₹500/-	₹1000/-	₹2000/-	₹3000/-	₹5000/-`

// Parse CSV into structured data
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split('\t')
  
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t')
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })
    data.push(row)
  }
  
  return data
}

// Group data by category → variant → level
function groupData(rows) {
  const grouped = {}
  
  rows.forEach(row => {
    const categoryName = `${row.Category} Safas`
    const variantName = row['Package Variant']
    const levelName = row.Level
    
    if (!grouped[categoryName]) {
      grouped[categoryName] = {}
    }
    
    if (!grouped[categoryName][variantName]) {
      grouped[categoryName][variantName] = {
        inclusions: row.Inclusions,
        extra_safa_price: parseExtraSafaPrice(row['Extra Safa (₹)']),
        missing_safa_penalty: parseMissingSafaPenalty(row['Missing Safa (₹)']),
        levels: []
      }
    }
    
    grouped[categoryName][variantName].levels.push({
      name: levelName,
      base_price: parsePrice(row['Price (₹)']),
      distance_pricing: [
        { range: '0-10 km', min_km: 0, max_km: 10, price: parsePrice(row['0–10 km']) },
        { range: '11-50 km', min_km: 11, max_km: 50, price: parsePrice(row['11–50 km']) },
        { range: '51-250 km', min_km: 51, max_km: 250, price: parsePrice(row['51–250 km']) },
        { range: '251-500 km', min_km: 251, max_km: 500, price: parsePrice(row['251–500 km']) },
        { range: '501-2000 km', min_km: 501, max_km: 2000, price: parsePrice(row['501–2000 km']) }
      ]
    })
  })
  
  return grouped
}

async function importData() {
  console.log('🚀 Starting import...\n')
  
  // Parse CSV
  const rows = parseCSV(csvData)
  console.log(`📊 Parsed ${rows.length} rows from CSV`)
  
  // Group data
  const grouped = groupData(rows)
  console.log(`📦 Found ${Object.keys(grouped).length} categories\n`)
  
  let stats = {
    categories: 0,
    variants: 0,
    levels: 0,
    distance_pricing: 0
  }
  
  // Import data
  for (const [categoryName, variants] of Object.entries(grouped)) {
    console.log(`\n📁 Creating category: ${categoryName}`)
    
    // Create category
    const { data: category, error: catError } = await supabase
      .from('packages_categories')
      .insert({
        name: categoryName,
        description: `Premium wedding safa collection for ${categoryName.split(' ')[0]} people`,
        franchise_id: FRANCHISE_ID,
        is_active: true
      })
      .select()
      .single()
    
    if (catError) {
      console.error(`❌ Error creating category ${categoryName}:`, catError.message)
      continue
    }
    
    stats.categories++
    console.log(`✅ Created category: ${category.name} (${category.id})`)
    
    // Create variants
    for (const [variantName, variantData] of Object.entries(variants)) {
      console.log(`  📝 Creating variant: ${variantName}`)
      
      const { data: variant, error: varError } = await supabase
        .from('package_variants')
        .insert({
          name: variantName,
          description: variantData.inclusions,
          category_id: category.id,
          franchise_id: FRANCHISE_ID,
          base_price: variantData.levels[0].base_price, // Use first level's price as base
          extra_safa_price: variantData.extra_safa_price,
          missing_safa_penalty: variantData.missing_safa_penalty,
          inclusions: JSON.stringify(variantData.inclusions.split(', ')),
          is_active: true
        })
        .select()
        .single()
      
      if (varError) {
        console.error(`  ❌ Error creating variant ${variantName}:`, varError.message)
        continue
      }
      
      stats.variants++
      console.log(`  ✅ Created variant: ${variant.name}`)
      
      // Create levels
      for (const levelData of variantData.levels) {
        console.log(`    🎚️ Creating level: ${levelData.name}`)
        
        const { data: level, error: lvlError } = await supabase
          .from('package_levels')
          .insert({
            name: levelData.name,
            variant_id: variant.id,
            base_price: levelData.base_price,
            display_order: levelData.name === 'Premium' ? 1 : levelData.name === 'VIP' ? 2 : 3,
            is_active: true
          })
          .select()
          .single()
        
        if (lvlError) {
          console.error(`    ❌ Error creating level ${levelData.name}:`, lvlError.message)
          continue
        }
        
        stats.levels++
        console.log(`    ✅ Created level: ${level.name} (₹${level.base_price})`)
        
        // Create distance pricing
        for (const distPricing of levelData.distance_pricing) {
          const { error: distError } = await supabase
            .from('distance_pricing')
            .insert({
              package_level_id: level.id,
              range: distPricing.range,
              min_distance_km: distPricing.min_km,
              max_distance_km: distPricing.max_km,
              base_price_addition: distPricing.price,
              is_active: true
            })
          
          if (distError) {
            console.error(`      ❌ Error creating distance pricing:`, distError.message)
          } else {
            stats.distance_pricing++
          }
        }
        
        console.log(`    ✅ Created ${levelData.distance_pricing.length} distance pricing tiers`)
      }
    }
  }
  
  console.log('\n\n🎉 Import complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 Statistics:`)
  console.log(`   Categories: ${stats.categories}`)
  console.log(`   Variants: ${stats.variants}`)
  console.log(`   Levels: ${stats.levels}`)
  console.log(`   Distance Pricing: ${stats.distance_pricing}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// Run import
importData().catch(console.error)
