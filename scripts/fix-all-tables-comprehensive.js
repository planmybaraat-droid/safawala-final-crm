const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixAllTables() {
  console.log('🔧 COMPREHENSIVE DATABASE FIX - Adding All Missing Columns');
  console.log('═'.repeat(60));
  
  // ============================================
  // 1. PRODUCT_ORDERS TABLE
  // ============================================
  console.log('\n📦 Fixing PRODUCT_ORDERS table...');
  const productOrdersColumns = [
    // Financial columns
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS coupon_code TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS distance_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS distance_km INTEGER DEFAULT 0',
    
    // Payment & Status
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS payment_method TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT \'full\'',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT \'quote\'',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT false',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'pending\'',
    
    // Order details
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS order_number TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT \'rental\'',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS booking_subtype TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT \'wedding\'',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS event_participant TEXT DEFAULT \'both\'',
    
    // Dates & Times
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS event_date DATE',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS event_time TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS delivery_date DATE',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS delivery_time TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS return_date DATE',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS return_time TEXT',
    
    // Addresses
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS venue_address TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT',
    
    // Customer & Event details
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS customer_id UUID',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS franchise_id UUID',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS groom_name TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS groom_whatsapp TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS groom_address TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS bride_name TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS bride_whatsapp TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS bride_address TEXT',
    
    // Metadata
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS special_instructions TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS created_by UUID',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS sales_closed_by_id UUID',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
    
    // Modifications (for direct sales)
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS has_modifications BOOLEAN DEFAULT false',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS modifications_details TEXT',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS modification_date TIMESTAMPTZ',
    
    // Archive
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
    'ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS archived_by UUID',
  ];
  
  await runQueries('product_orders', productOrdersColumns);
  
  // ============================================
  // 2. PRODUCT_ORDER_ITEMS TABLE
  // ============================================
  console.log('\n📦 Fixing PRODUCT_ORDER_ITEMS table...');
  const productOrderItemsColumns = [
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS order_id UUID',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS product_id UUID',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS rate DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS variant_id UUID',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS variant_name TEXT',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()',
  ];
  
  await runQueries('product_order_items', productOrderItemsColumns);
  
  // ============================================
  // 3. PACKAGE_BOOKINGS TABLE
  // ============================================
  console.log('\n📦 Fixing PACKAGE_BOOKINGS table...');
  const packageBookingsColumns = [
    // Financial columns
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS distance_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS distance_km INTEGER DEFAULT 0',
    
    // Payment & Status
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS payment_method TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT \'full\'',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT \'quote\'',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT false',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'pending\'',
    
    // Dates & Times
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS event_date DATE',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS event_time TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS delivery_date DATE',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS delivery_time TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS return_date DATE',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS return_time TEXT',
    
    // Customer & Event details
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS customer_id UUID',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS franchise_id UUID',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS venue_address TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS groom_name TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS groom_whatsapp TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS bride_name TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS bride_whatsapp TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT \'wedding\'',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS event_participant TEXT DEFAULT \'both\'',
    
    // Metadata
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS special_instructions TEXT',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS created_by UUID',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS sales_closed_by_id UUID',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
    
    // Archive
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false',
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
    
    // Has Items flag
    'ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS has_items BOOLEAN DEFAULT false',
  ];
  
  await runQueries('package_bookings', packageBookingsColumns);
  
  // ============================================
  // 4. BOOKINGS TABLE (Legacy)
  // ============================================
  console.log('\n📦 Fixing BOOKINGS table...');
  const bookingsColumns = [
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT false',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS distance_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS distance_km INTEGER DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_time TEXT',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_time TEXT',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_time TEXT',
    'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_instructions TEXT',
  ];
  
  await runQueries('bookings', bookingsColumns);
  
  // ============================================
  // 5. CUSTOMERS TABLE
  // ============================================
  console.log('\n📦 Fixing CUSTOMERS table...');
  const customersColumns = [
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS franchise_id UUID',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by UUID',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()',
    'ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
  ];
  
  await runQueries('customers', customersColumns);
  
  // ============================================
  // 6. PRODUCTS TABLE
  // ============================================
  console.log('\n📦 Fixing PRODUCTS table...');
  const productsColumns = [
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(50)',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS name VARCHAR(255)',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100)',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS rental_price DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_available INTEGER DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_total INTEGER DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(255)',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS franchise_id UUID',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
  ];
  
  await runQueries('products', productsColumns);
  
  // ============================================
  // 7. QUOTES TABLE (if exists)
  // ============================================
  console.log('\n📦 Fixing QUOTES table...');
  const quotesColumns = [
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS coupon_code TEXT',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_method TEXT',
  ];
  
  await runQueries('quotes', quotesColumns);
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 COMPREHENSIVE DATABASE FIX COMPLETED!');
  console.log('═'.repeat(60));
  console.log('\n✅ All tables should now have all required columns.');
  console.log('✅ You can now save quotes and create orders without column errors.');
}

async function runQueries(tableName, queries) {
  let success = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const query of queries) {
    try {
      const columnMatch = query.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
      const columnName = columnMatch ? columnMatch[1] : 'unknown';
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      
      if (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          skipped++;
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          // Table doesn't exist, skip silently
          skipped++;
        } else {
          console.log(`  ⚠️  ${columnName}: ${error.message}`);
          failed++;
        }
      } else {
        success++;
      }
    } catch (err) {
      failed++;
    }
  }
  
  console.log(`  ✅ Success: ${success} | ⏭️  Skipped: ${skipped} | ❌ Failed: ${failed}`);
}

fixAllTables().catch(console.error);