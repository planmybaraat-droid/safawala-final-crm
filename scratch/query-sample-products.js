const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .limit(3);
  
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  console.log('Sample Products:');
  console.log(JSON.stringify(products, null, 2));
}

run();
