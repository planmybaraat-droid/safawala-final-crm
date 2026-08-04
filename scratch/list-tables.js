const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Listing database tables...");
  
  // Query tables from pg_catalog
  const { data, error } = await supabase.rpc("inspect_schema_tables");
  if (error) {
    // If inspect_schema_tables RPC doesn't exist, we can try running a custom query if we can, 
    // or run a select query on pg_tables using raw sql if we have an RPC, 
    // or just run a query on some tables.
    console.error("RPC inspection failed:", error.message);
    
    console.log("Trying individual select on tables we guess...");
    const tablesToTry = [
      "users", "franchises", "customers", "leads", "products", "product_orders", 
      "deliveries", "expenses", "coupons", "offers", "vouchers", "package_bookings"
    ];
    for (const table of tablesToTry) {
      const { error: tblErr } = await supabase.from(table).select("*").limit(0);
      if (tblErr) {
        console.log(`❌ ${table} (Error: ${tblErr.message})`);
      } else {
        console.log(`✅ ${table} exists!`);
      }
    }
  } else {
    console.log("Tables list:", data);
  }
}

run();
