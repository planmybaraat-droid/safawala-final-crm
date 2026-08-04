const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  // 1. Check if table exists
  const { data: tableCheck, error: tableErr } = await sb
    .from('product_variations')
    .select('id')
    .limit(1);

  if (tableErr) {
    console.log('❌ TABLE ERROR:', tableErr.message);
    console.log('   → You need to run the migration SQL first in Supabase Dashboard SQL Editor');
    return;
  }
  console.log('✅ product_variations table exists');

  // 2. Get products
  const { data: products, error: prodErr } = await sb
    .from('products')
    .select('id, name, price, franchise_id, barcode')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (prodErr) {
    console.log('❌ Products error:', prodErr.message);
    return;
  }

  console.log(`\n📦 Found ${products.length} products:`);
  products.forEach((p, i) =>
    console.log(`   ${i + 1}. ${p.name} | ₹${p.price} | ID: ${p.id.substring(0, 8)}...`)
  );

  if (products.length === 0) {
    console.log('❌ No products found. Add a product first.');
    return;
  }

  // Pick first product as demo
  const product = products[0];
  console.log(`\n🎯 Adding demo variations to: "${product.name}" (₹${product.price})`);

  // 3. Demo variations with free internet images (Unsplash placeholder images)
  const demoVariations = [
    {
      product_id: product.id,
      franchise_id: product.franchise_id,
      variation_name: 'Red Silk',
      color: 'Red',
      design: 'Embroidered',
      material: 'Silk',
      size: 'Free Size',
      price_adjustment: 200,
      rental_price_adjustment: 50,
      stock_total: 10,
      stock_available: 8,
      stock_booked: 1,
      stock_damaged: 1,
      image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&h=200&fit=crop',
      is_active: true,
    },
    {
      product_id: product.id,
      franchise_id: product.franchise_id,
      variation_name: 'White Cotton',
      color: 'White',
      design: 'Plain',
      material: 'Cotton',
      size: 'Free Size',
      price_adjustment: 0,
      rental_price_adjustment: 0,
      stock_total: 15,
      stock_available: 12,
      stock_booked: 2,
      stock_damaged: 1,
      image_url: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200&h=200&fit=crop',
      is_active: true,
    },
    {
      product_id: product.id,
      franchise_id: product.franchise_id,
      variation_name: 'Golden Zari',
      color: 'Gold',
      design: 'Zari Work',
      material: 'Banarasi Silk',
      size: 'Free Size',
      price_adjustment: 500,
      rental_price_adjustment: 100,
      stock_total: 5,
      stock_available: 4,
      stock_booked: 1,
      stock_damaged: 0,
      image_url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=200&h=200&fit=crop',
      is_active: true,
    },
  ];

  // 4. Insert variations
  const { data: inserted, error: insertErr } = await sb
    .from('product_variations')
    .insert(demoVariations)
    .select();

  if (insertErr) {
    console.log('❌ Insert error:', insertErr.message);
    return;
  }

  console.log(`\n✅ Successfully added ${inserted.length} demo variations:\n`);
  inserted.forEach((v) => {
    const mrp = product.price + (v.price_adjustment || 0);
    console.log(`   🏷️  "${v.variation_name}"`);
    console.log(`      Color: ${v.color} | Material: ${v.material} | Design: ${v.design}`);
    console.log(`      Stock: ${v.stock_total} total (${v.stock_available} avail, ${v.stock_booked} booked, ${v.stock_damaged} damaged)`);
    console.log(`      Barcode: ${v.barcode} (auto-generated)`);
    console.log(`      MRP: ₹${mrp}/- (base ₹${product.price} + adj ₹${v.price_adjustment})`);
    console.log(`      Image: ${v.image_url}`);
    console.log('');
  });

  console.log('🎉 Done! Go to your inventory → Edit this product to see the variations.');
  console.log(`   URL: https://mysafawala.com/inventory/edit/${product.id}`);
}

run().catch(console.error);
