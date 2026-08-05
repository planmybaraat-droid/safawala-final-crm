const https = require('https');

const SUPABASE_URL = 'https://xplnyaxkusvuajtmorss.supabase.co';
const SUPABASE_KEY = '';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'xplnyaxkusvuajtmorss.supabase.co',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function generateRandomBarcode() {
  let barcode = '';
  for (let i = 0; i < 11; i++) {
    barcode += Math.floor(Math.random() * 10);
  }
  return barcode;
}

async function generateBarcodesForExistingProducts() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   GENERATE 11-DIGIT BARCODES FOR EXISTING PRODUCTS  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Step 1: Fetch all products without barcodes
  console.log('📦 Step 1: Fetching all products...');
  const productsResult = await makeRequest('GET', '/rest/v1/products?select=id,name&limit=500');
  const products = productsResult.data || [];
  console.log(`✅ Found ${products.length} products\n`);

  if (products.length === 0) {
    console.log('❌ No products found!\n');
    return;
  }

  // Step 2: Generate unique random barcodes
  console.log('🔢 Step 2: Generating unique 11-digit random barcodes...');
  const usedBarcodes = new Set();
  const updates = [];

  for (let i = 0; i < products.length; i++) {
    let barcode;
    do {
      barcode = generateRandomBarcode();
    } while (usedBarcodes.has(barcode));
    usedBarcodes.add(barcode);

    updates.push({
      id: products[i].id,
      barcode: barcode
    });

    if ((i + 1) % 20 === 0) {
      console.log(`  Generated ${i + 1}/${products.length}...`);
    }
  }
  console.log(`✅ Generated ${products.length} unique barcodes\n`);

  // Step 3: Update products with barcodes (batch update)
  console.log('💾 Step 3: Updating products table with barcodes...');
  const batchSize = 100;
  let updated = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`  Batch ${batchNum}/${Math.ceil(updates.length / batchSize)} (${batch.length} items)...`);

    for (const update of batch) {
      const result = await makeRequest('PATCH', `/rest/v1/products?id=eq.${update.id}`, {
        barcode: update.barcode
      });

      if (result.status === 200) {
        updated++;
      }
    }
  }
  console.log(`✅ Updated ${updated}/${products.length} products\n`);

  // Step 4: Verify
  console.log('📊 Step 4: Verifying barcodes were assigned...');
  const verifyResult = await makeRequest('GET', '/rest/v1/products?select=id,barcode&limit=500');
  const productsWithBarcodes = verifyResult.data.filter(p => p.barcode !== null);
  console.log(`✅ Products with barcodes: ${productsWithBarcodes.length}/${verifyResult.data.length}\n`);

  // Display results
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║              ✅ BARCODES GENERATED ✅              ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║ Total Products:              ${String(products.length).padEnd(24)}║`);
  console.log(`║ Barcodes Assigned:           ${String(updated).padEnd(24)}║`);
  console.log(`║ Format:  11 random digits (e.g., 2389939440)       ║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log('📝 Sample Generated Barcodes:');
  for (let i = 0; i < Math.min(10, updates.length); i++) {
    console.log(`   ${i + 1}. ${updates[i].barcode}`);
  }
  console.log(`   ... and ${updates.length - 10} more\n`);
}

generateBarcodesForExistingProducts().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
