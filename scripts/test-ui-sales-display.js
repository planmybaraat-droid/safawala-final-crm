#!/usr/bin/env node

/**
 * Quick UI Test - Simulates what the frontend will see
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUIData() {
  console.log('\n🎨 TESTING UI DATA (Simulating QuoteService.getAll())\n');
  
  // Simulate the quote service logic
  try {
    // Fetch product orders
    const { data: productOrders } = await supabase
      .from('product_orders')
      .select('*')
      .eq('is_quote', true)
      .limit(3);
    
    // Fetch package bookings
    const { data: packageBookings } = await supabase
      .from('package_bookings')
      .select('*')
      .eq('is_quote', true)
      .limit(3);
    
    // Map to quote objects
    const productQuotes = (productOrders || []).map(order => ({
      id: order.id,
      sales_closed_by: order.sales_closed_by_id,
      sales_staff_name: null,
      total_amount: order.total_amount,
      created_at: order.created_at
    }));
    
    const packageQuotes = (packageBookings || []).map(booking => ({
      id: booking.id,
      sales_closed_by: booking.sales_closed_by_id,
      sales_staff_name: null,
      total_amount: booking.total_amount,
      created_at: booking.created_at
    }));
    
    const allQuotes = [...productQuotes, ...packageQuotes];
    
    console.log(`📋 Found ${allQuotes.length} quotes total`);
    console.log(`   - ${productQuotes.length} product orders`);
    console.log(`   - ${packageQuotes.length} package bookings\n`);
    
    // Fetch staff names (FIXED VERSION - using 'users' table)
    const quotesWithStaff = allQuotes.filter(q => q.sales_closed_by);
    console.log(`👥 ${quotesWithStaff.length} quotes have sales_closed_by_id\n`);
    
    if (quotesWithStaff.length > 0) {
      const staffIds = [...new Set(quotesWithStaff.map(q => q.sales_closed_by))];
      
      console.log('🔍 Fetching staff names from USERS table...');
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', staffIds);
      
      if (staffError) {
        console.error('❌ Error fetching staff:', staffError.message);
        return;
      }
      
      console.log(`✅ Found ${staffData?.length || 0} staff members\n`);
      
      if (staffData && staffData.length > 0) {
        const staffMap = new Map(staffData.map(s => [s.id, s.name]));
        
        // Map staff names to quotes
        allQuotes.forEach(quote => {
          if (quote.sales_closed_by) {
            quote.sales_staff_name = staffMap.get(quote.sales_closed_by) || null;
          }
        });
        
        // Display results like the UI would
        console.log('=' .repeat(70));
        console.log('📊 WHAT THE UI WILL SHOW:');
        console.log('='.repeat(70));
        
        allQuotes.forEach((quote, idx) => {
          console.log(`\n${idx + 1}. Quote ID: ${quote.id.substring(0, 13)}...`);
          console.log(`   Amount: ₹${quote.total_amount?.toLocaleString() || 'N/A'}`);
          console.log(`   Created: ${new Date(quote.created_at).toLocaleDateString()}`);
          console.log(`   Sales Closed By ID: ${quote.sales_closed_by ? quote.sales_closed_by.substring(0, 13) + '...' : 'NULL'}`);
          
          if (quote.sales_staff_name) {
            console.log(`   ✅ Sales Staff Name: ${quote.sales_staff_name}`);
            console.log(`   👉 UI WILL SHOW: "Sales Information" card with "${quote.sales_staff_name}"`);
          } else if (quote.sales_closed_by) {
            console.log(`   ⚠️  Sales Staff Name: NOT FOUND (ID exists but no matching user)`);
            console.log(`   👉 UI WILL HIDE: "Sales Information" card (no name available)`);
          } else {
            console.log(`   ⚠️  Sales Staff Name: N/A (no sales_closed_by_id)`);
            console.log(`   👉 UI WILL HIDE: "Sales Information" card (no data)`);
          }
        });
        
        console.log('\n' + '='.repeat(70));
        
        // Summary
        const quotesWithNames = allQuotes.filter(q => q.sales_staff_name).length;
        const quotesWithIdsButNoNames = allQuotes.filter(q => q.sales_closed_by && !q.sales_staff_name).length;
        const quotesWithoutIds = allQuotes.filter(q => !q.sales_closed_by).length;
        
        console.log('\n📈 SUMMARY:');
        console.log(`   ✅ Quotes with sales staff names: ${quotesWithNames}/${allQuotes.length} (${((quotesWithNames/allQuotes.length)*100).toFixed(1)}%)`);
        console.log(`   ⚠️  Quotes with IDs but no names: ${quotesWithIdsButNoNames}`);
        console.log(`   ⚠️  Quotes without sales staff: ${quotesWithoutIds}`);
        
        if (quotesWithNames === allQuotes.length) {
          console.log('\n🎉 PERFECT! All quotes will show sales staff information!');
        } else if (quotesWithNames > 0) {
          console.log(`\n✅ ${quotesWithNames} quotes will show sales staff information.`);
          if (quotesWithIdsButNoNames > 0) {
            console.log(`⚠️  ${quotesWithIdsButNoNames} quotes have orphaned IDs (staff member deleted?).`);
          }
          if (quotesWithoutIds > 0) {
            console.log(`ℹ️  ${quotesWithoutIds} quotes don't have sales staff assigned (old data?).`);
          }
        } else {
          console.log('\n❌ NO quotes will show sales staff information!');
        }
        
        console.log('\n');
      }
    } else {
      console.log('⚠️  No quotes have sales_closed_by_id set.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testUIData();
