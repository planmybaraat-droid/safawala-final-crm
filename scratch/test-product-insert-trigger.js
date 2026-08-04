const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Testing new product insertion to verify triggers...");

  // Fetch franchise
  const { data: franchises } = await supabase.from("franchises").select("id").limit(1);
  const franchiseId = franchises?.[0]?.id;

  if (!franchiseId) {
    console.error("❌ No franchise found to associate the test product with.");
    return;
  }

  console.log(`Using franchise ID: ${franchiseId}`);

  // Attempt to insert product without a barcode (this should trigger set_product_barcode)
  console.log("\nInserting product without barcode...");
  const { data: prodData, error: prodErr } = await supabase
    .from("products")
    .insert({
      name: "TEST TRIGGER PRODUCT",
      category: "Test Category",
      franchise_id: franchiseId,
      price: 999,
      rental_price: 499,
      stock_total: 10,
      stock_available: 10,
      is_active: true
    })
    .select();

  if (prodErr) {
    console.error("❌ Product insert failed:", prodErr.message, prodErr.code);
  } else {
    console.log("✅ Product insert succeeded! Generated product:", prodData);
    
    // Clean up
    await supabase.from("products").delete().eq("id", prodData[0].id);
  }
}

run();
