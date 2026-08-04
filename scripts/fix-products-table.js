const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixProductsTable() {
  console.log('🔧 Fixing products table - Adding missing columns...');
  console.log('─'.repeat(50));
  
  const queries = [
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS rental_price DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_available INTEGER DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(50)',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT'
  ];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const columnName = query.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0];
    
    console.log(`${i + 1}/${queries.length}: Adding ${columnName} column...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error && !error.message.includes('already exists')) {
        console.error('❌ Error:', error.message);
      } else {
        console.log('✅ Success');
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }
  
  // Update default values
  console.log('\n📊 Updating default values...');
  const updateQueries = [
    'UPDATE products SET stock_available = 100 WHERE stock_available IS NULL OR stock_available = 0',
    'UPDATE products SET is_active = true WHERE is_active IS NULL'
  ];
  
  for (const query of updateQueries) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error) {
        console.error('❌ Error updating values:', error.message);
      } else {
        console.log('✅ Default values updated');
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }
  
  console.log('\n🎉 Products table fix completed!');
  console.log('✅ Custom product creation should work now.');
}

fixProductsTable().catch(console.error);