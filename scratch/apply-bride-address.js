const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.join(__dirname, '../scripts/add-bride-home-address.sql');
  console.log(`Reading SQL from: ${sqlPath}`);
  
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found!');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running SQL via exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

  if (error) {
    console.error('Failed to apply SQL:', error);
  } else {
    console.log('SQL applied successfully!', data);
  }
}

run();
