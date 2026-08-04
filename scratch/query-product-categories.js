const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = 'REDACTED_JWT';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: productCategories, error } = await supabase
    .from('product_categories')
    .select('*');
  
  if (error) {
    console.error('Error fetching product_categories:', error);
    return;
  }
  
  console.log('Product Categories found:');
  console.log(JSON.stringify(productCategories, null, 2));
}

run();
