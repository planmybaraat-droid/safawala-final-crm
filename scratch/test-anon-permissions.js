const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, anonKey);

  console.log("Using Anon Key for permission testing...");

  // Fetch product
  const { data: products, error: prodErr } = await supabase.from("products").select("id, name, franchise_id, barcode").limit(1);
  if (prodErr || !products || products.length === 0) {
    console.error("❌ Failed to fetch products with anon key:", prodErr ? prodErr.message : "No products found");
    return;
  }
  const product = products[0];
  console.log(`Fetched product: ${product.name} (ID: ${product.id})`);

  // Try updating the products table (simulating client-side barcode-generator-enhanced.tsx line 46)
  console.log(`\nAttempting to update product barcode field with anon key...`);
  const originalBarcode = product.barcode;
  const newBarcode = `TEST-ANON-${Date.now().toString().slice(-4)}`;
  const { data: updateData, error: updateErr } = await supabase
    .from("products")
    .update({ barcode: newBarcode })
    .eq("id", product.id)
    .select();

  if (updateErr) {
    console.error("❌ Failed to update product barcode with anon key:", updateErr.message);
  } else {
    console.log("✅ Successfully updated product barcode with anon key! Result:", updateData);
    // Revert
    await supabase.from("products").update({ barcode: originalBarcode }).eq("id", product.id);
  }

  // Try inserting into product_barcodes table with anon key (simulating custom-product-dialog.tsx calling generateBarcodesForProduct)
  console.log(`\nAttempting to insert into product_barcodes with anon key...`);
  const { data: insertData, error: insertErr } = await supabase
    .from("product_barcodes")
    .insert({
      product_id: product.id,
      franchise_id: product.franchise_id || "11111111-1111-1111-1111-111111111111",
      barcode_number: `ANON-BAR-${Date.now().toString().slice(-4)}`,
      sequence_number: 9998,
      status: 'available',
      is_new: true
    })
    .select();

  if (insertErr) {
    console.error("❌ Failed to insert into product_barcodes with anon key:", insertErr.message);
  } else {
    console.log("✅ Successfully inserted into product_barcodes with anon key!", insertData);
    // Cleanup
    await supabase.from("product_barcodes").delete().eq("sequence_number", 9998);
  }
}

run();
