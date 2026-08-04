const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Checking if generate_random_barcode RPC function exists...");
  const { data, error } = await supabase.rpc("generate_random_barcode");

  if (error) {
    console.error("❌ generate_random_barcode RPC failed:", error.message, error.code);
  } else {
    console.log("✅ generate_random_barcode RPC succeeded! Result:", data);
  }
}

run();
