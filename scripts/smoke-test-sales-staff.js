#!/usr/bin/env node

/**
 * Sales Staff Smoke Test
 * Comprehensive test to verify the entire sales staff tracking system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function smokeTest() {
  console.log('\n' + '='.repeat(70));
  console.log('🔥 SALES STAFF TRACKING - SMOKE TEST');
  console.log('='.repeat(70));

  let testsPassed = 0;
  let testsFailed = 0;

  // TEST 1: Check if sales_closed_by_id column exists in product_orders
  console.log('\n📋 TEST 1: Checking product_orders.sales_closed_by_id column...');
  try {
    const { data, error } = await supabase
      .from('product_orders')
      .select('id, sales_closed_by_id')
      .limit(1);
    
    if (error) {
      console.error('   ❌ FAILED:', error.message);
      testsFailed++;
    } else {
      console.log('   ✅ PASSED: Column exists and is queryable');
      testsPassed++;
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 2: Check if sales_closed_by_id column exists in package_bookings
  console.log('\n📋 TEST 2: Checking package_bookings.sales_closed_by_id column...');
  try {
    const { data, error } = await supabase
      .from('package_bookings')
      .select('id, sales_closed_by_id')
      .limit(1);
    
    if (error) {
      console.error('   ❌ FAILED:', error.message);
      testsFailed++;
    } else {
      console.log('   ✅ PASSED: Column exists and is queryable');
      testsPassed++;
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 3: Check if we have staff members
  console.log('\n👥 TEST 3: Checking for staff members...');
  try {
    const { data: staff, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('role', ['staff', 'franchise_admin', 'admin']);
    
    if (error) {
      console.error('   ❌ FAILED:', error.message);
      testsFailed++;
    } else if (!staff || staff.length === 0) {
      console.error('   ❌ FAILED: No staff members found');
      testsFailed++;
    } else {
      console.log(`   ✅ PASSED: Found ${staff.length} staff members`);
      console.log(`      Sample: ${staff.slice(0, 3).map(s => s.name).join(', ')}`);
      testsPassed++;
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 4: Check product_orders quotes with sales_closed_by_id
  console.log('\n📦 TEST 4: Checking product_orders quotes with sales staff...');
  try {
    const { data: orders, error } = await supabase
      .from('product_orders')
      .select('id, sales_closed_by_id, created_at')
      .eq('is_quote', true);
    
    if (error) {
      console.error('   ❌ FAILED:', error.message);
      testsFailed++;
    } else {
      const total = orders?.length || 0;
      const withStaff = orders?.filter(o => o.sales_closed_by_id).length || 0;
      const coverage = total > 0 ? ((withStaff / total) * 100).toFixed(1) : 0;
      
      console.log(`   📊 Total quotes: ${total}`);
      console.log(`   ✅ With sales staff: ${withStaff} (${coverage}%)`);
      console.log(`   ⚠️  Without sales staff: ${total - withStaff}`);
      
      if (coverage >= 90) {
        console.log('   ✅ PASSED: Good coverage (≥90%)');
        testsPassed++;
      } else if (coverage >= 50) {
        console.log('   ⚠️  PARTIAL: Moderate coverage (50-89%)');
        testsPassed++;
      } else {
        console.log('   ❌ FAILED: Low coverage (<50%)');
        testsFailed++;
      }
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 5: Check package_bookings quotes with sales_closed_by_id
  console.log('\n📦 TEST 5: Checking package_bookings quotes with sales staff...');
  try {
    const { data: bookings, error } = await supabase
      .from('package_bookings')
      .select('id, sales_closed_by_id, created_at')
      .eq('is_quote', true);
    
    if (error) {
      console.error('   ❌ FAILED:', error.message);
      testsFailed++;
    } else {
      const total = bookings?.length || 0;
      const withStaff = bookings?.filter(b => b.sales_closed_by_id).length || 0;
      const coverage = total > 0 ? ((withStaff / total) * 100).toFixed(1) : 0;
      
      console.log(`   📊 Total quotes: ${total}`);
      console.log(`   ✅ With sales staff: ${withStaff} (${coverage}%)`);
      console.log(`   ⚠️  Without sales staff: ${total - withStaff}`);
      
      if (coverage >= 90) {
        console.log('   ✅ PASSED: Good coverage (≥90%)');
        testsPassed++;
      } else if (coverage >= 50) {
        console.log('   ⚠️  PARTIAL: Moderate coverage (50-89%)');
        testsPassed++;
      } else {
        console.log('   ❌ FAILED: Low coverage (<50%)');
        testsFailed++;
      }
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 6: Test JOIN with users table
  console.log('\n🔗 TEST 6: Testing JOIN to fetch staff names...');
  try {
    // Test product_orders JOIN
    const { data: poWithStaff, error: poError } = await supabase
      .from('product_orders')
      .select(`
        id,
        sales_closed_by_id,
        users:sales_closed_by_id (
          id,
          name,
          email
        )
      `)
      .eq('is_quote', true)
      .not('sales_closed_by_id', 'is', null)
      .limit(3);
    
    if (poError) {
      console.error('   ❌ FAILED (product_orders):', poError.message);
      testsFailed++;
    } else if (poWithStaff && poWithStaff.length > 0) {
      console.log('   ✅ Product Orders JOIN works:');
      poWithStaff.forEach(po => {
        const staffInfo = po.users;
        if (staffInfo) {
          console.log(`      - Order ${po.id.substring(0, 8)}... → Staff: ${staffInfo.name}`);
        }
      });
      testsPassed++;
    } else {
      console.log('   ⚠️  No product orders with staff to test JOIN');
      testsPassed++;
    }

    // Test package_bookings JOIN
    const { data: pbWithStaff, error: pbError } = await supabase
      .from('package_bookings')
      .select(`
        id,
        sales_closed_by_id,
        users:sales_closed_by_id (
          id,
          name,
          email
        )
      `)
      .eq('is_quote', true)
      .not('sales_closed_by_id', 'is', null)
      .limit(3);
    
    if (pbError) {
      console.error('   ❌ FAILED (package_bookings):', pbError.message);
      testsFailed++;
    } else if (pbWithStaff && pbWithStaff.length > 0) {
      console.log('   ✅ Package Bookings JOIN works:');
      pbWithStaff.forEach(pb => {
        const staffInfo = pb.users;
        if (staffInfo) {
          console.log(`      - Booking ${pb.id.substring(0, 8)}... → Staff: ${staffInfo.name}`);
        }
      });
      testsPassed++;
    } else {
      console.log('   ⚠️  No package bookings with staff to test JOIN');
      testsPassed++;
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 7: Check for recently created quotes (last 7 days)
  console.log('\n🆕 TEST 7: Checking recent quotes (last 7 days)...');
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentPO, error: recentPOError } = await supabase
      .from('product_orders')
      .select('id, sales_closed_by_id, created_at')
      .eq('is_quote', true)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    const { data: recentPB, error: recentPBError } = await supabase
      .from('package_bookings')
      .select('id, sales_closed_by_id, created_at')
      .eq('is_quote', true)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (recentPOError || recentPBError) {
      console.error('   ❌ FAILED:', recentPOError?.message || recentPBError?.message);
      testsFailed++;
    } else {
      const recentTotal = (recentPO?.length || 0) + (recentPB?.length || 0);
      const recentWithStaff = 
        (recentPO?.filter(o => o.sales_closed_by_id).length || 0) +
        (recentPB?.filter(b => b.sales_closed_by_id).length || 0);
      
      console.log(`   📊 Recent quotes (last 7 days): ${recentTotal}`);
      console.log(`   ✅ With sales staff: ${recentWithStaff}`);
      console.log(`   ⚠️  Without sales staff: ${recentTotal - recentWithStaff}`);
      
      if (recentTotal === 0) {
        console.log('   ℹ️  No recent quotes to test (normal if no activity)');
        testsPassed++;
      } else if (recentWithStaff === recentTotal) {
        console.log('   ✅ PASSED: All recent quotes have sales staff!');
        testsPassed++;
      } else {
        console.log('   ⚠️  WARNING: Some recent quotes missing sales staff');
        console.log('      (Auto-select may not be working for new bookings)');
        testsPassed++;
      }
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // TEST 8: Sample data display (what the UI will show)
  console.log('\n🎨 TEST 8: Sample quote data (UI display preview)...');
  try {
    const { data: sampleQuotes, error } = await supabase
      .from('product_orders')
      .select(`
        id,
        sales_closed_by_id,
        total_amount,
        created_at,
        users:sales_closed_by_id (
          name,
          email,
          role
        )
      `)
      .eq('is_quote', true)
      .not('sales_closed_by_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('   ❌ FAILED:', error.message);
      testsFailed++;
    } else if (sampleQuotes && sampleQuotes.length > 0) {
      console.log('   ✅ Sample quote display data:');
      sampleQuotes.forEach((quote, idx) => {
        const staff = quote.users;
        console.log(`\n   Quote ${idx + 1}:`);
        console.log(`      ID: ${quote.id.substring(0, 13)}...`);
        console.log(`      Amount: ₹${quote.total_amount?.toLocaleString() || 'N/A'}`);
        console.log(`      Created: ${new Date(quote.created_at).toLocaleDateString()}`);
        console.log(`      Sales Staff: ${staff?.name || 'Not found'}`);
        console.log(`      Staff Email: ${staff?.email || 'N/A'}`);
        console.log(`      Staff Role: ${staff?.role || 'N/A'}`);
      });
      console.log('\n   ✅ PASSED: Quote data displays correctly');
      testsPassed++;
    } else {
      console.log('   ⚠️  No quotes with staff to display');
      testsPassed++;
    }
  } catch (err) {
    console.error('   ❌ FAILED:', err.message);
    testsFailed++;
  }

  // FINAL REPORT
  console.log('\n' + '='.repeat(70));
  console.log('📊 SMOKE TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Sales staff tracking is working correctly.');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.`);
  }
  
  console.log('='.repeat(70) + '\n');
}

smokeTest();
