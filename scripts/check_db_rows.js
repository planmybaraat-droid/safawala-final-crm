const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const tables = ['product_orders', 'package_bookings', 'direct_sales_orders', 'invoices', 'bookings', 'whatsapp_messages'];
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`Table ${table}: error:`, error.message);
      } else {
        console.log(`Table ${table} row count:`, count);
      }
    } catch (e) {
      console.log(`Table ${table} failed:`, e.message);
    }
  }
}

run();
