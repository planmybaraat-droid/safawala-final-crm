const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking returns table...");
  const { data: returnsData, error: returnsError } = await supabase
    .from('returns')
    .select('*')
    .limit(1);

  if (returnsError) {
    console.error("Error fetching from returns:", returnsError);
  } else {
    console.log("returns columns:", returnsData.length > 0 ? Object.keys(returnsData[0]) : "No rows in table to extract keys");
  }

  console.log("\nChecking deliveries table...");
  const { data: delData, error: delError } = await supabase
    .from('deliveries')
    .select('*')
    .limit(1);

  if (delError) {
    console.error("Error fetching from deliveries:", delError);
  } else {
    console.log("deliveries columns:", delData.length > 0 ? Object.keys(delData[0]) : "No rows in table to extract keys");
  }

  // Also query postgres schema table info if empty
  console.log("\nQuerying postgres column metadata directly...");
  const { data: columns, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'returns' });
  if (colError) {
    console.log("RPC get_table_columns not available. Trying to select from information_schema if permitted:");
    const { data: schemaCols, error: schemaError } = await supabase
      .from('_columns') // sometimes exposed
      .select('*')
      .limit(1);
    console.log("Schema query:", { schemaError });
  } else {
    console.log("returns column metadata:", columns);
  }
}

main().catch(console.error);
