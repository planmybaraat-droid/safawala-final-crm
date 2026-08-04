const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying table/view metadata...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name IN ('bookings', 'product_orders') 
        AND table_schema = 'public';
    `
  });

  if (error) {
    console.error('Error executing query:', error.message);
  } else {
    console.log('Table types:', data);
  }
}

run();
