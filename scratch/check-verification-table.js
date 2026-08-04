const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Checking if table "verification_codes" exists...');
  const { data, error } = await supabase.from('verification_codes').select('count', { count: 'exact', head: true });
  if (error) {
    console.log('Table "verification_codes" does NOT exist or error:', error.message);
  } else {
    console.log('Table "verification_codes" EXISTS!');
  }
}

run();
