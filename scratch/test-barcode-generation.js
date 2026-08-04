const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role to bypass RLS policies for testing
  const supabase = createClient(url, key);

  // 1. Fetch a product to test with
  console.log("Fetching a sample product...");
  const { data: products, error: prodErr } = await supabase.from("products").select("*").limit(1);
  if (prodErr || !products || products.length === 0) {
    console.error("Error fetching product:", prodErr ? prodErr.message : "No products found");
    return;
  }
  const product = products[0];
  console.log(`Found product: ${product.name} (ID: ${product.id}, code: ${product.product_code || 'none'})`);

  // 2. Test inserting into product_barcodes table
  console.log("\nAttempting to insert a barcode into product_barcodes...");
  const testBarcode = `TEST-${Date.now().toString().slice(-6)}`;
  const { data: insertData, error: insertErr } = await supabase
    .from("product_barcodes")
    .insert({
      product_id: product.id,
      franchise_id: product.franchise_id || "11111111-1111-1111-1111-111111111111", // default if null
      barcode_number: testBarcode,
      sequence_number: 9999,
      status: 'available',
      is_new: true
    })
    .select();

  if (insertErr) {
    console.error("❌ Failed to insert into product_barcodes:", insertErr.message, insertErr.code);
  } else {
    console.log("✅ Successfully inserted into product_barcodes:", insertData);
    // Cleanup
    await supabase.from("product_barcodes").delete().eq("barcode_number", testBarcode);
  }

  // 3. Test inserting into barcodes table (legacy)
  console.log("\nAttempting to insert a barcode into barcodes (legacy)...");
  const { data: legacyData, error: legacyErr } = await supabase
    .from("barcodes")
    .insert({
      product_id: product.id,
      barcode_number: testBarcode,
      barcode_type: 'CODE128',
      is_active: true
    })
    .select();

  if (legacyErr) {
    console.error("❌ Failed to insert into barcodes:", legacyErr.message, legacyErr.code);
  } else {
    console.log("✅ Successfully inserted into barcodes:", legacyData);
    await supabase.from("barcodes").delete().eq("barcode_number", testBarcode);
  }
}

run();
