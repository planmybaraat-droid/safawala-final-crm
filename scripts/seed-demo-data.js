#!/usr/bin/env node

/**
 * Seed Demo Data Script
 * Adds 50 products and multiple packages with variants for demo purposes
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hvxgjfbbzjgjrbfmqlqd.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Product categories and items
const productData = [
  // Sherwani Collection (15 items)
  { category: 'Sherwani', name: 'Royal Gold Sherwani', rental: 8000, sale: 35000, deposit: 5000, stock: 5 },
  { category: 'Sherwani', name: 'Classic Cream Sherwani', rental: 6500, sale: 28000, deposit: 4000, stock: 8 },
  { category: 'Sherwani', name: 'Maroon Velvet Sherwani', rental: 9000, sale: 42000, deposit: 6000, stock: 4 },
  { category: 'Sherwani', name: 'Navy Blue Designer Sherwani', rental: 7500, sale: 32000, deposit: 5000, stock: 6 },
  { category: 'Sherwani', name: 'Ivory Pearl Sherwani', rental: 8500, sale: 38000, deposit: 5500, stock: 5 },
  { category: 'Sherwani', name: 'Black Embroidered Sherwani', rental: 7000, sale: 30000, deposit: 4500, stock: 7 },
  { category: 'Sherwani', name: 'Pastel Pink Sherwani', rental: 6000, sale: 25000, deposit: 4000, stock: 6 },
  { category: 'Sherwani', name: 'Mint Green Sherwani', rental: 6500, sale: 27000, deposit: 4000, stock: 5 },
  { category: 'Sherwani', name: 'Silver Grey Sherwani', rental: 7500, sale: 33000, deposit: 5000, stock: 4 },
  { category: 'Sherwani', name: 'Wine Red Sherwani', rental: 8000, sale: 36000, deposit: 5500, stock: 5 },
  { category: 'Sherwani', name: 'Peach Silk Sherwani', rental: 6500, sale: 28000, deposit: 4000, stock: 6 },
  { category: 'Sherwani', name: 'Chocolate Brown Sherwani', rental: 7000, sale: 31000, deposit: 4500, stock: 5 },
  { category: 'Sherwani', name: 'Royal Purple Sherwani', rental: 8500, sale: 39000, deposit: 6000, stock: 4 },
  { category: 'Sherwani', name: 'Champagne Gold Sherwani', rental: 9500, sale: 45000, deposit: 6500, stock: 3 },
  { category: 'Sherwani', name: 'Teal Blue Sherwani', rental: 7000, sale: 30000, deposit: 4500, stock: 6 },

  // Kurta Collection (10 items)
  { category: 'Kurta', name: 'White Chikankari Kurta', rental: 2500, sale: 8000, deposit: 1500, stock: 12 },
  { category: 'Kurta', name: 'Sky Blue Cotton Kurta', rental: 2000, sale: 6500, deposit: 1200, stock: 15 },
  { category: 'Kurta', name: 'Pink Silk Kurta', rental: 3000, sale: 9500, deposit: 1800, stock: 10 },
  { category: 'Kurta', name: 'Yellow Festive Kurta', rental: 2500, sale: 8500, deposit: 1500, stock: 12 },
  { category: 'Kurta', name: 'Green Designer Kurta', rental: 2800, sale: 9000, deposit: 1600, stock: 10 },
  { category: 'Kurta', name: 'Orange Embroidered Kurta', rental: 2700, sale: 8800, deposit: 1500, stock: 11 },
  { category: 'Kurta', name: 'Black Pathani Kurta', rental: 2300, sale: 7500, deposit: 1400, stock: 14 },
  { category: 'Kurta', name: 'Beige Linen Kurta', rental: 2200, sale: 7000, deposit: 1300, stock: 13 },
  { category: 'Kurta', name: 'Red Wedding Kurta', rental: 3200, sale: 10000, deposit: 2000, stock: 8 },
  { category: 'Kurta', name: 'Lavender Kurta Pajama Set', rental: 2600, sale: 8500, deposit: 1500, stock: 10 },

  // Safa/Turban Collection (10 items)
  { category: 'Safa', name: 'Red Rajasthani Safa', rental: 1500, sale: 4500, deposit: 800, stock: 20 },
  { category: 'Safa', name: 'Golden Safa with Kalgi', rental: 2000, sale: 6000, deposit: 1200, stock: 15 },
  { category: 'Safa', name: 'Pink Designer Safa', rental: 1800, sale: 5500, deposit: 1000, stock: 18 },
  { category: 'Safa', name: 'Orange Traditional Safa', rental: 1600, sale: 5000, deposit: 900, stock: 20 },
  { category: 'Safa', name: 'Maroon Royal Safa', rental: 1700, sale: 5200, deposit: 1000, stock: 16 },
  { category: 'Safa', name: 'Cream Bandhani Safa', rental: 1800, sale: 5500, deposit: 1000, stock: 15 },
  { category: 'Safa', name: 'Green Festive Safa', rental: 1600, sale: 4800, deposit: 900, stock: 18 },
  { category: 'Safa', name: 'Blue Embroidered Safa', rental: 1900, sale: 5800, deposit: 1100, stock: 14 },
  { category: 'Safa', name: 'Yellow Celebration Safa', rental: 1700, sale: 5000, deposit: 900, stock: 17 },
  { category: 'Safa', name: 'White Pearl Safa', rental: 2200, sale: 6500, deposit: 1300, stock: 12 },

  // Jooti/Shoes Collection (8 items)
  { category: 'Jooti', name: 'Golden Embroidered Jooti', rental: 1200, sale: 3500, deposit: 600, stock: 25 },
  { category: 'Jooti', name: 'Cream Velvet Mojari', rental: 1000, sale: 3000, deposit: 500, stock: 30 },
  { category: 'Jooti', name: 'Red Traditional Jooti', rental: 1100, sale: 3200, deposit: 550, stock: 28 },
  { category: 'Jooti', name: 'Black Designer Jooti', rental: 1300, sale: 3800, deposit: 650, stock: 22 },
  { category: 'Jooti', name: 'Maroon Royal Mojari', rental: 1150, sale: 3400, deposit: 600, stock: 26 },
  { category: 'Jooti', name: 'Beige Leather Jooti', rental: 1250, sale: 3600, deposit: 600, stock: 24 },
  { category: 'Jooti', name: 'Navy Blue Mojari', rental: 1100, sale: 3300, deposit: 550, stock: 27 },
  { category: 'Jooti', name: 'Brown Classic Jooti', rental: 1050, sale: 3100, deposit: 550, stock: 28 },

  // Accessories (7 items)
  { category: 'Accessories', name: 'Pearl Mala Set', rental: 800, sale: 2500, deposit: 400, stock: 15 },
  { category: 'Accessories', name: 'Golden Brooch', rental: 500, sale: 1500, deposit: 300, stock: 20 },
  { category: 'Accessories', name: 'Kundan Kalgi', rental: 1500, sale: 4500, deposit: 800, stock: 12 },
  { category: 'Accessories', name: 'Designer Belt', rental: 600, sale: 1800, deposit: 350, stock: 18 },
  { category: 'Accessories', name: 'Embroidered Stole', rental: 700, sale: 2200, deposit: 400, stock: 16 },
  { category: 'Accessories', name: 'Silver Kara Set', rental: 900, sale: 2800, deposit: 500, stock: 14 },
  { category: 'Accessories', name: 'Wedding Handkerchief', rental: 300, sale: 800, deposit: 200, stock: 25 },
]

// Package sets with variants
const packageSets = [
  {
    name: 'Royal Groom Package',
    base_price: 15000,
    extra_safa_price: 1500,
    description: 'Premium complete groom outfit with sherwani, safa, jooti and accessories',
    variants: [
      { name: 'Standard', price: 15000 },
      { name: 'Premium', price: 18000 },
      { name: 'Deluxe', price: 22000 },
    ]
  },
  {
    name: 'Classic Groom Package',
    base_price: 12000,
    extra_safa_price: 1200,
    description: 'Traditional groom outfit with elegant sherwani and accessories',
    variants: [
      { name: 'Basic', price: 12000 },
      { name: 'Standard', price: 14000 },
      { name: 'Premium', price: 17000 },
    ]
  },
  {
    name: 'Wedding Special Package',
    base_price: 20000,
    extra_safa_price: 2000,
    description: 'Luxury wedding package with designer sherwani and premium accessories',
    variants: [
      { name: 'Gold', price: 20000 },
      { name: 'Platinum', price: 25000 },
      { name: 'Diamond', price: 30000 },
    ]
  },
  {
    name: 'Budget Groom Package',
    base_price: 8000,
    extra_safa_price: 800,
    description: 'Affordable yet stylish groom outfit for budget-conscious customers',
    variants: [
      { name: 'Economy', price: 8000 },
      { name: 'Standard', price: 10000 },
    ]
  },
  {
    name: 'Sangeet Special Package',
    base_price: 10000,
    extra_safa_price: 1000,
    description: 'Vibrant and colorful outfit perfect for sangeet ceremonies',
    variants: [
      { name: 'Basic', price: 10000 },
      { name: 'Premium', price: 13000 },
    ]
  },
  {
    name: 'Destination Wedding Package',
    base_price: 18000,
    extra_safa_price: 1800,
    description: 'Travel-friendly premium outfit for destination weddings',
    variants: [
      { name: 'Standard', price: 18000 },
      { name: 'Deluxe', price: 22000 },
      { name: 'Royal', price: 28000 },
    ]
  },
]

async function seedProducts() {
  console.log('🌱 Starting to seed products...')
  
  // Get or use default franchise ID
  const { data: franchises } = await supabase
    .from('franchises')
    .select('id')
    .limit(1)

  let franchiseId
  if (!franchises || franchises.length === 0) {
    console.log('⚠️  No franchise found. Using default franchise ID...')
    franchiseId = '00000000-0000-0000-0000-000000000001' // Default franchise from setup
  } else {
    franchiseId = franchises[0].id
  }
  
  console.log(`✅ Using franchise ID: ${franchiseId}`)

  // Insert products
  const productsToInsert = productData.map(p => ({
    name: p.name,
    category: p.category,
    rental_price: p.rental,
    sale_price: p.sale,
    security_deposit: p.deposit,
    stock_available: p.stock,
    franchise_id: franchiseId,
    product_code: `PRD${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
  }))

  const { data: insertedProducts, error: productsError } = await supabase
    .from('products')
    .insert(productsToInsert)
    .select()

  if (productsError) {
    console.error('❌ Error inserting products:', productsError)
    return
  }

  console.log(`✅ Successfully inserted ${insertedProducts.length} products`)
  
  // Show summary by category
  const categoryCounts = {}
  insertedProducts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1
  })
  
  console.log('\n📊 Products by category:')
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} items`)
  })
}

async function seedPackages() {
  console.log('\n🌱 Starting to seed packages...')
  
  // Get or use default franchise ID
  const { data: franchises } = await supabase
    .from('franchises')
    .select('id')
    .limit(1)

  let franchiseId
  if (!franchises || franchises.length === 0) {
    console.log('⚠️  No franchise found. Using default franchise ID...')
    franchiseId = '00000000-0000-0000-0000-000000000001'
  } else {
    franchiseId = franchises[0].id
  }

  for (const pkg of packageSets) {
    // Insert package
    const { data: insertedPackage, error: packageError } = await supabase
      .from('package_sets')
      .insert({
        name: pkg.name,
        base_price: pkg.base_price,
        extra_safa_price: pkg.extra_safa_price,
        description: pkg.description,
        franchise_id: franchiseId,
        package_code: `PKG${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      })
      .select()
      .single()

    if (packageError) {
      console.error(`❌ Error inserting package ${pkg.name}:`, packageError)
      continue
    }

    console.log(`✅ Created package: ${pkg.name}`)

    // Insert variants for this package
    const variantsToInsert = pkg.variants.map(v => ({
      package_id: insertedPackage.id,
      variant_name: v.name,
      base_price: v.price,
      extra_safa_price: pkg.extra_safa_price,
    }))

    const { error: variantsError } = await supabase
      .from('package_variants')
      .insert(variantsToInsert)

    if (variantsError) {
      console.error(`❌ Error inserting variants for ${pkg.name}:`, variantsError)
    } else {
      console.log(`   📦 Added ${pkg.variants.length} variants`)
    }
  }

  console.log(`\n✅ Successfully created ${packageSets.length} package sets`)
}

async function main() {
  console.log('🚀 Demo Data Seeding Script')
  console.log('=' .repeat(50))
  
  try {
    await seedProducts()
    await seedPackages()
    
    console.log('\n' + '=' .repeat(50))
    console.log('✨ Demo data seeding completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   • ${productData.length} products added`)
    console.log(`   • ${packageSets.length} package sets added`)
    console.log(`   • ${packageSets.reduce((sum, pkg) => sum + pkg.variants.length, 0)} package variants added`)
    console.log('\n💡 You can now select products and packages in your booking forms!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
