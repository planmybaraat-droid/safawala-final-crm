const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*');
  
  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }
  
  console.log('Categories found:');
  console.log(JSON.stringify(categories, null, 2));
}

run();
