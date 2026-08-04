const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Fetching franchises...");
  const { data: franchises, error } = await serviceClient
    .from("franchises")
    .select("*");
  console.log("Franchises:", franchises, error);
}

run();
