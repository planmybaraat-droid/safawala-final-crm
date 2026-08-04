const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const tables = ['product_orders', 'package_bookings', 'direct_sales_orders', 'invoices', 'bookings'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`Table ${table}: error:`, error.message);
      } else {
        const row = data[0] || {};
        console.log(`Table ${table} keys:`, Object.keys(row));
      }
    } catch (e) {
      console.log(`Table ${table} failed:`, e.message);
    }
  }
}

run();
