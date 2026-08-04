const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying constraint check definition for bookings_event_type_check...');
  
  const { data, error } = await supabase.rpc('run_sql', {
    sql_query: `
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conname = 'bookings_event_type_check';
    `
  });

  if (error) {
    console.error('Error executing query:', error.message);
  } else {
    console.log('Constraint details:', data);
  }
}

run();
