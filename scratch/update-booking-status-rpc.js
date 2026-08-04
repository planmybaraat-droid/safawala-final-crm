const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.join(__dirname, '../scripts/create-booking-transaction-function.sql');
  console.log(`Reading SQL from: ${sqlPath}`);
  
  let content = fs.readFileSync(sqlPath, 'utf8');
  
  // Replace pending_payment with pending in the INSERT values
  const target = `v_booking_number, p_customer_id, p_event_date, p_venue_name, 'pending_payment',`;
  const replacement = `v_booking_number, p_customer_id, p_event_date, p_venue_name, 'pending',`;
  
  if (!content.includes(target)) {
    console.error(`Error: Could not find target string in SQL content:\n"${target}"`);
    process.exit(1);
  }

  content = content.replace(target, replacement);
  
  console.log('Applying updated SQL definition to database via exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: content });

  if (error) {
    console.error('Failed to redefine function in database:', error);
  } else {
    console.log('Function redefined successfully in database!', data);
    // Write back to the SQL file
    fs.writeFileSync(sqlPath, content, 'utf8');
    console.log('Updated SQL file successfully.');
  }
}

run();
