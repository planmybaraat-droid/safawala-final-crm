const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: packagesCategories, error } = await supabase
    .from('packages_categories')
    .select('*');
  
  if (error) {
    console.error('Error fetching packages_categories:', error);
    return;
  }
  
  console.log('Packages Categories found:');
  console.log(JSON.stringify(packagesCategories, null, 2));
}

run();
