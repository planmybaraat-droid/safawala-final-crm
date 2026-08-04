const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying a single row from bookings table...');
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  if (error) {
    console.error('Error fetching bookings:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns (keys) in bookings:', Object.keys(data[0]));
  } else {
    console.log('No bookings records found. Querying table definition...');
    // If table is empty, we can check by selecting fields that might exist
    // Or let's insert a temporary empty object to get keys or inspect using other tables
    const { data: cols, error: colsErr } = await supabase.from('bookings').select().limit(0);
    if (colsErr) {
      console.error('Error querying columns:', colsErr.message);
    } else {
      console.log('Query structure returned data:', cols);
    }
  }
}

run();
