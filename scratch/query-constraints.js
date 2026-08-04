const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = 'REDACTED_JWT';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const query = `
    SELECT
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='products';
  `;

  const { data, error } = await supabase.rpc('run_sql', { sql_query: query });
  
  if (error) {
    // If run_sql RPC doesn't exist or fail, let's try direct postgres check if we can or check schema
    console.error('Error querying constraints:', error);
    return;
  }
  
  console.log('Products Table Constraints:');
  console.log(JSON.stringify(data, null, 2));
}

run();
