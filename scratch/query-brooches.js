const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = 'REDACTED_JWT';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', 'e914d0bf-f7ef-4c24-b517-cf9b72695faa')
    .limit(10);
  
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  console.log(`Products in Brooch category (found ${products.length}):`);
  console.log(JSON.stringify(products, null, 2));
}

run();
