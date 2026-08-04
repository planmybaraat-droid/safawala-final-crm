// Quick audit script: list all products grouped by category
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function audit() {
  // 1. Fetch all categories
  const { data: cats, error: catErr } = await supabase
    .from('product_categories')
    .select('id, name, parent_id, is_active')
    .order('name')

  if (catErr) { console.error('Cat error:', catErr); return }

  console.log('\n=== ALL CATEGORIES ===')
  for (const c of cats || []) {
    console.log(`  ${c.name} (id: ${c.id}) | parent: ${c.parent_id || 'ROOT'} | active: ${c.is_active}`)
  }

  // 2. Fetch ALL active products with their category info
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, category_id, is_active, price, rental_price, stock_available, stock_total')
    .eq('is_active', true)
    .order('name')

  if (prodErr) { console.error('Prod error:', prodErr); return }

  console.log(`\n=== TOTAL ACTIVE PRODUCTS: ${products?.length || 0} ===\n`)

  // Group products by category
  const grouped: Record<string, { catName: string; products: any[] }> = {}
  const catMap: Record<string, string> = {}
  for (const c of cats || []) catMap[c.id] = c.name

  for (const p of products || []) {
    const catId = p.category_id || 'NO_CATEGORY'
    const catName = catId === 'NO_CATEGORY' ? '(No Category)' : (catMap[catId] || `Unknown (${catId})`)
    if (!grouped[catId]) grouped[catId] = { catName, products: [] }
    grouped[catId].products.push(p)
  }

  // Print grouped results
  let keepCount = 0
  let deleteCount = 0

  for (const [catId, group] of Object.entries(grouped)) {
    const isSafaCategory = group.catName.toLowerCase().includes('safa') || group.catName.toLowerCase().includes('barati')
    const action = isSafaCategory ? '✅ KEEP' : '❌ DELETE'
    
    if (isSafaCategory) keepCount += group.products.length
    else deleteCount += group.products.length

    console.log(`\n${action} | Category: "${group.catName}" (${group.products.length} products)`)
    console.log('  ' + '-'.repeat(70))
    for (const p of group.products) {
      console.log(`  - ${p.name} | Price: ₹${p.price} | Rental: ₹${p.rental_price} | Stock: ${p.stock_available}/${p.stock_total}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`SUMMARY:`)
  console.log(`  ✅ KEEP:   ${keepCount} products (Barati Safa category)`)
  console.log(`  ❌ DELETE: ${deleteCount} products (all other categories)`)
  console.log(`  📦 TOTAL:  ${(products || []).length} products`)
  console.log('='.repeat(60))
}

audit().catch(console.error)
