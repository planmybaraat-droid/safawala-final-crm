const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying function definition for create_booking_with_conflict_check...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'create_booking_with_conflict_check';
    `
  });

  if (error) {
    console.error('Error executing query:', error.message);
  } else {
    console.log('Raw data:', data);
    if (data && data.length > 0) {
      console.log('Function Definition:');
      console.log(data[0].definition || data[0]);
    } else {
      console.log('Function create_booking_with_conflict_check not found.');
    }
  }
}

run();
