const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Checking unique constraints by testing duplicate updates...");

  // 1. Fetch two products
  const { data: products, error: fetchErr } = await supabase
    .from("products")
    .select("id, name, barcode, barcode_number")
    .limit(2);

  if (fetchErr || !products || products.length < 2) {
    console.error("❌ Failed to fetch two products for testing:", fetchErr?.message || "Not enough products");
    return;
  }

  const p1 = products[0];
  const p2 = products[1];

  console.log(`Product 1: ${p1.name} (ID: ${p1.id}, Barcode: ${p1.barcode}, Barcode_Number: ${p1.barcode_number})`);
  console.log(`Product 2: ${p2.name} (ID: ${p2.id}, Barcode: ${p2.barcode}, Barcode_Number: ${p2.barcode_number})`);

  // 2. Test duplicate on barcode column
  const testVal = `DUP-${Date.now().toString().slice(-4)}`;
  console.log(`\nAttempting to set duplicate value '${testVal}' on barcode column...`);

  // Update product 1 to testVal
  const { error: err1 } = await supabase.from("products").update({ barcode: testVal }).eq("id", p1.id);
  if (err1) {
    console.error("Failed to update product 1:", err1.message);
    return;
  }

  // Try updating product 2 to the same testVal
  const { error: err2 } = await supabase.from("products").update({ barcode: testVal }).eq("id", p2.id);
  
  if (err2) {
    console.log(`❌ Update to duplicate barcode FAILED: ${err2.message} (Code: ${err2.code})`);
    if (err2.code === '23505') {
      console.log("👉 Confirming: UNIQUE constraint exists on products(barcode)!");
    }
  } else {
    console.log("✅ Update to duplicate barcode SUCCEEDED. No unique constraint on products(barcode).");
  }

  // Restore original barcodes
  console.log("\nRestoring original values...");
  await supabase.from("products").update({ barcode: p1.barcode }).eq("id", p1.id);
  await supabase.from("products").update({ barcode: p2.barcode }).eq("id", p2.id);

  // 3. Test duplicate on barcode_number column
  console.log(`\nAttempting to set duplicate value '${testVal}' on barcode_number column...`);
  const { error: bnErr1 } = await supabase.from("products").update({ barcode_number: testVal }).eq("id", p1.id);
  if (bnErr1) {
    console.error("Failed to update barcode_number for product 1:", bnErr1.message);
    return;
  }

  const { error: bnErr2 } = await supabase.from("products").update({ barcode_number: testVal }).eq("id", p2.id);
  if (bnErr2) {
    console.log(`❌ Update to duplicate barcode_number FAILED: ${bnErr2.message} (Code: ${bnErr2.code})`);
    if (bnErr2.code === '23505') {
      console.log("👉 Confirming: UNIQUE constraint exists on products(barcode_number)!");
    }
  } else {
    console.log("✅ Update to duplicate barcode_number SUCCEEDED. No unique constraint on products(barcode_number).");
  }

  // Restore original values
  console.log("\nRestoring original values...");
  await supabase.from("products").update({ barcode_number: p1.barcode_number }).eq("id", p1.id);
  await supabase.from("products").update({ barcode_number: p2.barcode_number }).eq("id", p2.id);
}

run();
