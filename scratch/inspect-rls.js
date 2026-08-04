const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying RLS status for product_images...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'product_images';
    `
  });
  console.log("RLS Status:", data, error);

  console.log('\nQuerying policies for product_images...');
  const { data: policies, error: polError } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT * FROM pg_policies WHERE tablename = 'product_images';
    `
  });
  console.log("Policies:", policies, polError);
}

run();
