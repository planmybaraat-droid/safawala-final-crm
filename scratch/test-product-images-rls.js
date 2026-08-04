const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, anonKey);

  console.log("Testing product_images access with Anon Key...");

  // 1. Fetch products
  const { data: products, error: prodErr } = await supabase.from("products").select("id, name").limit(1);
  if (prodErr || !products || products.length === 0) {
    console.error("❌ Failed to fetch products with anon key:", prodErr ? prodErr.message : "No products found");
    return;
  }
  const product = products[0];
  console.log(`Fetched product: ${product.name} (ID: ${product.id})`);

  // 2. Fetch images for this product
  console.log(`\nFetching images for product ${product.id} with anon key...`);
  const { data: images, error: imgErr } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", product.id);

  if (imgErr) {
    console.error("❌ Failed to fetch images with anon key:", imgErr.message);
  } else {
    console.log(`✅ Successfully fetched ${images.length} images:`, images);
  }

  // 3. Try inserting an image for this product
  console.log(`\nAttempting to insert a test image record with anon key...`);
  const testImage = {
    product_id: product.id,
    url: "https://test.com/anon-test.jpg",
    is_main: false,
    order: 999
  };

  const { data: insertData, error: insertErr } = await supabase
    .from("product_images")
    .insert([testImage])
    .select();

  if (insertErr) {
    console.error("❌ Failed to insert image with anon key:", insertErr.message);
  } else {
    console.log("✅ Successfully inserted image with anon key!", insertData);
    // Cleanup
    const { error: delErr } = await supabase.from("product_images").delete().eq("id", insertData[0].id);
    if (delErr) {
      console.error("❌ Failed to clean up inserted image:", delErr.message);
    } else {
      console.log("🧹 Cleaned up test image record successfully");
    }
  }
}

run();
