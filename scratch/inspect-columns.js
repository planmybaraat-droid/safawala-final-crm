const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  // Get one row from product_orders to see keys
  const { data: orders, error: orderErr } = await supabase.from("product_orders").select("*").limit(1);
  if (orderErr) {
    console.error("Error fetching product_orders:", orderErr.message);
  } else {
    console.log("product_orders columns:", Object.keys(orders[0] || {}));
  }

  // Get one row from products to see keys
  const { data: products, error: prodErr } = await supabase.from("products").select("*").limit(1);
  if (prodErr) {
    console.error("Error fetching products:", prodErr.message);
  } else {
    console.log("products columns:", Object.keys(products[0] || {}));
  }
}

run();
