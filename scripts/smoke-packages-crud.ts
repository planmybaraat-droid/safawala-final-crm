import { createClient } from '@supabase/supabase-js'

function envOrThrow(name: string) {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!v || !k) throw new Error('Missing Supabase env vars')
  return { url: v, key: k }
}

async function columnExists(supabase: any, table: string, column: string) {
  const { error } = await supabase.from(table).select(column).limit(1)
  return !error
}

async function run() {
  const { url, key } = envOrThrow('SUPABASE')
  const supabase = createClient(url, key)

  const created: any = { packages: [], variants: [], pricings: [], categories: [] }

  // 1) Find two franchises
  const { data: franchises, error: fErr } = await supabase.from('franchises').select('id, name').eq('is_active', true).limit(2)
  if (fErr) throw fErr
  if (!franchises || franchises.length < 1) throw new Error('Need at least 1 franchise in DB')
  const fA = franchises[0]
  const fB = franchises[1] || franchises[0]

  // 2) Create a category
  const { data: cat, error: cErr } = await supabase.from('packages_categories').insert({
    name: `QA Category ${Date.now()}`,
    description: 'QA temp category',
    is_active: true,
    display_order: 999,
    created_at: new Date().toISOString(),
  }).select('*').single()
  if (cErr) throw cErr
  created.categories.push(cat.id)

  // 3) Create packages tied to franchises
  const makePackage = async (fr: any, name: string) => {
    const { data: pkg, error: pErr } = await supabase.from('package_sets').insert({
      name,
      description: 'QA temp package',
      base_price: 1000,
      security_deposit: 0,
      extra_safa_price: 0,
      franchise_id: fr.id,
      is_active: true,
      display_order: 999,
      category_id: cat.id,
      created_at: new Date().toISOString(),
    }).select('*').single()
    if (pErr) throw pErr
    created.packages.push(pkg.id)
    return pkg
  }

  const pkgA = await makePackage(fA, `QA Package A ${Date.now()}`)
  const pkgB = await makePackage(fB, `QA Package B ${Date.now()}`)

  // 4) Create variants under those packages
  const makeVariant = async (pkg: any, name: string) => {
    const { data: variant, error: vErr } = await supabase.from('package_variants').insert({
      name,
      description: 'QA temp variant',
      base_price: 100,
      inclusions: ['A','B'],
      package_id: pkg.id,
      is_active: true,
      display_order: 1,
      created_at: new Date().toISOString(),
    }).select('*').single()
    if (vErr) throw vErr
    created.variants.push(variant.id)
    return variant
  }

  const va = await makeVariant(pkgA, 'Variant A')
  const vb = await makeVariant(pkgB, 'Variant B')

  // 5) Create distance pricing entries with schema fallback
  const hasBase = await columnExists(supabase, 'distance_pricing', 'base_price_addition')
  const hasExtra = await columnExists(supabase, 'distance_pricing', 'extra_price')
  const hasMult = await columnExists(supabase, 'distance_pricing', 'price_multiplier')
  const hasFrCol = await columnExists(supabase, 'distance_pricing', 'franchise_id')

  const makePricing = async (variant: any, fr: any, min_km: number, max_km: number, addition: number) => {
    const payload: any = {
      variant_id: variant.id,
      distance_range: `${min_km}-${max_km} km`,
      min_km,
      max_km,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (hasBase) payload.base_price_addition = addition
    else if (hasExtra) {
      payload.extra_price = addition
      if (hasMult) payload.price_multiplier = 1.0
    }
    if (hasFrCol) payload.franchise_id = fr.id

    const { data: pricing, error: prErr } = await supabase.from('distance_pricing').insert(payload).select('*').single()
    if (prErr) throw prErr
    created.pricings.push(pricing.id)
    return pricing
  }

  await makePricing(va, fA, 0, 10, 0)
  await makePricing(vb, fB, 0, 10, 50)

  // 6) Validate isolation with filtered reads (mimic UI)
  const { data: listA, error: lErrA } = await supabase.from('package_sets').select('*').eq('franchise_id', fA.id)
  if (lErrA) throw lErrA
  if (!listA?.find((x:any)=> x.id === pkgA.id)) throw new Error('Franchise A missing its package')
  if (listA?.find((x:any)=> x.id === pkgB.id)) throw new Error('Franchise A can see B package (isolation failed)')

  const { data: listB, error: lErrB } = await supabase.from('package_sets').select('*').eq('franchise_id', fB.id)
  if (lErrB) throw lErrB
  if (!listB?.find((x:any)=> x.id === pkgB.id)) throw new Error('Franchise B missing its package')
  if (fB.id !== fA.id && listB?.find((x:any)=> x.id === pkgA.id)) throw new Error('Franchise B can see A package (isolation failed)')

  console.log('CRUD + isolation checks passed for packages.')

  // 7) Cleanup
  await supabase.from('distance_pricing').delete().in('id', created.pricings)
  await supabase.from('package_variants').delete().in('id', created.variants)
  await supabase.from('package_sets').delete().in('id', created.packages)
  await supabase.from('packages_categories').delete().in('id', created.categories)

  console.log('Cleanup completed.')
}

run().catch((e)=>{
  console.error('Smoke test failed:', e)
  process.exit(1)
})
