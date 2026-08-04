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
  console.log('Querying database tables...');
  
  // Query for table list
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `
  });

  if (error) {
    console.log('Direct RPC execute_sql failed, trying standard metadata query...');
    // If execute_sql function doesn't exist, we can try to query a known table to see if it works,
    // or run a basic query on some common tables.
    const tables = ['bookings', 'product_orders', 'package_bookings', 'direct_sales_orders', 'tasks', 'deliveries', 'returns'];
    for (const t of tables) {
      const { data: testData, error: testError } = await supabase.from(t).select('count', { count: 'exact', head: true });
      if (testError) {
        console.log(`Table "${t}": does NOT exist or error:`, testError.message);
      } else {
        console.log(`Table "${t}": EXISTS`);
      }
    }
  } else {
    console.log('Tables found in public schema:');
    data.forEach(row => console.log(`- ${row.table_name}`));
  }
}

run();
