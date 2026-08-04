const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Checking triggers on products table...");

  // Query triggers from database pg_trigger using execute_sql rpc if it exists,
  // or via pg system catalog tables.
  const { data, error } = await supabase.rpc("execute_sql", {
    sql_query: `
      SELECT tgname as trigger_name, 
             proname as function_name,
             tgenabled as status
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'products'
    `
  });

  if (error) {
    console.error("❌ Failed to query pg_trigger directly. Error:", error.message);
    
    // Attempting a simpler RPC run_sql
    const { data: runSqlData, error: runSqlErr } = await supabase.rpc("run_sql", {
      sql_query: `
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'products'
      `
    });

    if (runSqlErr) {
      console.error("❌ Failed to query information_schema.triggers via run_sql. Error:", runSqlErr.message);
    } else {
      console.log("✅ Triggers found (via run_sql):", runSqlData);
    }
  } else {
    console.log("✅ Triggers found (via execute_sql):", data);
  }
}

run();
