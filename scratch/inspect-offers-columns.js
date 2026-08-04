const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Inspecting 'offers' table columns...");
  const { data, error } = await supabase.from("offers").select("*").limit(1);
  if (error) {
    console.error("Error fetching from offers:", error.message);
  } else {
    console.log("offers table columns:", Object.keys(data[0] || {}));
  }
}

run();
