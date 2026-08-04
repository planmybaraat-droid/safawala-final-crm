// Cleanup script: soft-delete all products NOT in safa categories
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// The 3 safa category IDs to KEEP
const KEEP_CATEGORY_IDS = [
  '186f5b48-8b9d-4828-8dbc-807595f6cd65', // BARATI SAFA
  '39ad84c8-d294-4172-acb8-ab36c388b9de', // GROOM SAFA
  '674e6dce-4d33-441d-a786-7772b2eee5cb', // Velcro Safa
]

async function cleanup() {
  console.log('🔍 Fetching all active products...')

  // Fetch all active products
  const { data: allProducts, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, category_id, is_active')
    .eq('is_active', true)

  if (fetchErr) { console.error('Fetch error:', fetchErr); return }
  console.log(`📦 Total active products: ${allProducts?.length || 0}`)

  // Separate KEEP vs DELETE
  const toKeep = (allProducts || []).filter(p => KEEP_CATEGORY_IDS.includes(p.category_id))
  const toDelete = (allProducts || []).filter(p => !KEEP_CATEGORY_IDS.includes(p.category_id))

  console.log(`\n✅ KEEPING: ${toKeep.length} products (in safa categories)`)
  console.log(`❌ DELETING: ${toDelete.length} products (non-safa categories)\n`)

  // Show what we're deleting
  console.log('Products to be soft-deleted:')
  for (const p of toDelete) {
    console.log(`  ❌ ${p.name} (id: ${p.id})`)
  }

  // Perform soft-delete in batches of 50
  const deleteIds = toDelete.map(p => p.id)
  const batchSize = 50
  let deletedCount = 0

  for (let i = 0; i < deleteIds.length; i += batchSize) {
    const batch = deleteIds.slice(i, i + batchSize)
    const { error: updateErr, count } = await supabase
      .from('products')
      .update({ is_active: false })
      .in('id', batch)

    if (updateErr) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, updateErr)
    } else {
      deletedCount += batch.length
      console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: soft-deleted ${batch.length} products`)
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ DONE! Soft-deleted ${deletedCount} products.`)
  console.log(`✅ Kept ${toKeep.length} safa products active.`)
  console.log(`${'='.repeat(50)}`)

  // Verify final state
  const { count: remaining } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  console.log(`\n📊 Remaining active products: ${remaining}`)
}

cleanup().catch(console.error)
