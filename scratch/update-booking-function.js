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
  
  // Replace the target line with the casted UUID version
  const target = `COALESCE(p_franchise_id, v_customer_record.franchise_id), p_created_by,`;
  const replacement = `COALESCE(p_franchise_id, v_customer_record.franchise_id), NULLIF(p_created_by, '')::UUID,`;
  
  if (!content.includes(target)) {
    console.error(`Error: Could not find target string in SQL content:\n"${target}"`);
    // Check if it's due to CRLF
    const targetCRLF = target.replace(/\n/g, '\r\n');
    if (content.includes(targetCRLF)) {
      console.log('Found CRLF version of target string.');
    } else {
      process.exit(1);
    }
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
