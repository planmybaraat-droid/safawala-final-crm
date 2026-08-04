const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Checking product_barcodes table...");
  const { data: pbData, error: pbErr } = await supabase.from("product_barcodes").select("*").limit(1);
  if (pbErr) {
    console.error("product_barcodes error:", pbErr.message);
  } else {
    console.log("product_barcodes exists! Columns:", Object.keys(pbData[0] || {}));
  }

  console.log("\nChecking barcodes table...");
  const { data: bData, error: bErr } = await supabase.from("barcodes").select("*").limit(1);
  if (bErr) {
    console.error("barcodes error:", bErr.message);
  } else {
    console.log("barcodes exists! Columns:", Object.keys(bData[0] || {}));
  }
}

run();
