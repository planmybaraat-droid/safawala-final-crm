const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Testing products and categories relation...");

  // Try category:categories(name)
  const { data: cat1, error: err1 } = await supabase
    .from("products")
    .select("id, name, category:categories(name)")
    .limit(1);
  if (err1) {
    console.log("❌ category:categories(name) failed:", err1.message);
  } else {
    console.log("✅ category:categories(name) succeeded!");
  }

  // Try category:product_categories(name)
  const { data: cat2, error: err2 } = await supabase
    .from("products")
    .select("id, name, category:product_categories(name)")
    .limit(1);
  if (err2) {
    console.log("❌ category:product_categories(name) failed:", err2.message);
  } else {
    console.log("✅ category:product_categories(name) succeeded!");
  }

  // Fetch products and filter in JS for low stock
  const { data: lowStockProds, error: lowStockErr } = await supabase
    .from("products")
    .select("id, name, stock_available, reorder_level, category:categories(name)");
  
  if (lowStockErr) {
    console.log("❌ Fetching products failed:", lowStockErr.message);
  } else {
    const lowStock = lowStockProds.filter(p => p.stock_available <= (p.reorder_level || 0));
    console.log(`✅ Fetched products, found ${lowStock.length} low stock items out of ${lowStockProds.length}`);
  }
}

run();
