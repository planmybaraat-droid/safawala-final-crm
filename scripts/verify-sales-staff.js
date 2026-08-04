#!/usr/bin/env node

/**
 * Sales Staff Verification Service
 * Checks and updates sales_closed_by_id for all quotes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAndUpdateSalesStaff() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SALES STAFF VERIFICATION SERVICE');
  console.log('='.repeat(60));

  try {
    // 1. Check available staff members
    console.log('\n📋 Step 1: Checking available staff members...');
    const { data: staffMembers, error: staffError } = await supabase
      .from('users')
      .select('id, name, email, role, is_active')
      .in('role', ['staff', 'franchise_admin', 'admin'])
      .order('created_at');

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError.message);
      return;
    }

    if (!staffMembers || staffMembers.length === 0) {
      console.error('⚠️  No staff members found!');
      console.log('Please create users with role: staff, franchise_admin, or admin');
      return;
    }

    console.log(`✅ Found ${staffMembers.length} staff members:`);
    staffMembers.forEach(staff => {
      console.log(`   - ${staff.name} (${staff.email}) - Role: ${staff.role} - Active: ${staff.is_active}`);
    });

    // 2. Check product_orders
    console.log('\n📦 Step 2: Checking product orders...');
    const { data: productOrders, error: poError } = await supabase
      .from('product_orders')
      .select('id, sales_closed_by_id')
      .eq('is_quote', true);

    if (poError) {
      console.error('❌ Error fetching product orders:', poError.message);
    } else {
      const totalPO = productOrders?.length || 0;
      const poWithStaff = productOrders?.filter(p => p.sales_closed_by_id).length || 0;
      const poWithoutStaff = totalPO - poWithStaff;

      console.log(`   📊 Total product orders (quotes): ${totalPO}`);
      console.log(`   ✅ With sales staff: ${poWithStaff}`);
      console.log(`   ⚠️  Without sales staff: ${poWithoutStaff}`);
    }

    // 3. Check package_bookings
    console.log('\n📦 Step 3: Checking package bookings...');
    const { data: packageBookings, error: pbError } = await supabase
      .from('package_bookings')
      .select('id, sales_closed_by_id')
      .eq('is_quote', true);

    if (pbError) {
      console.error('❌ Error fetching package bookings:', pbError.message);
    } else {
      const totalPB = packageBookings?.length || 0;
      const pbWithStaff = packageBookings?.filter(p => p.sales_closed_by_id).length || 0;
      const pbWithoutStaff = totalPB - pbWithStaff;

      console.log(`   📊 Total package bookings (quotes): ${totalPB}`);
      console.log(`   ✅ With sales staff: ${pbWithStaff}`);
      console.log(`   ⚠️  Without sales staff: ${pbWithoutStaff}`);
    }

    // 4. Update quotes without sales staff
    const firstStaff = staffMembers[0];
    console.log('\n🔧 Step 4: Updating quotes without sales staff...');
    console.log(`   Using staff: ${firstStaff.name} (${firstStaff.id})`);

    // Update product_orders
    const { error: updatePOError } = await supabase
      .from('product_orders')
      .update({ sales_closed_by_id: firstStaff.id })
      .eq('is_quote', true)
      .is('sales_closed_by_id', null);

    if (updatePOError) {
      console.error('   ❌ Error updating product orders:', updatePOError.message);
    } else {
      console.log('   ✅ Updated product orders');
    }

    // Update package_bookings
    const { error: updatePBError } = await supabase
      .from('package_bookings')
      .update({ sales_closed_by_id: firstStaff.id })
      .eq('is_quote', true)
      .is('sales_closed_by_id', null);

    if (updatePBError) {
      console.error('   ❌ Error updating package bookings:', updatePBError.message);
    } else {
      console.log('   ✅ Updated package bookings');
    }

    // 5. Final verification
    console.log('\n✨ Step 5: Final verification...');
    
    const { data: poFinal } = await supabase
      .from('product_orders')
      .select('id, sales_closed_by_id, customer_id')
      .eq('is_quote', true);

    const { data: pbFinal } = await supabase
      .from('package_bookings')
      .select('id, sales_closed_by_id, customer_id')
      .eq('is_quote', true);

    const poWithStaffFinal = poFinal?.filter(p => p.sales_closed_by_id).length || 0;
    const pbWithStaffFinal = pbFinal?.filter(p => p.sales_closed_by_id).length || 0;

    console.log(`   ✅ Product orders with sales staff: ${poWithStaffFinal}/${poFinal?.length || 0}`);
    console.log(`   ✅ Package bookings with sales staff: ${pbWithStaffFinal}/${pbFinal?.length || 0}`);

    // 6. Show sample data with staff names
    console.log('\n👥 Step 6: Sample quotes with sales staff...');
    
    if (poFinal && poFinal.length > 0) {
      const samplePO = poFinal.slice(0, 3);
      for (const order of samplePO) {
        if (order.sales_closed_by_id) {
          const staff = staffMembers.find(s => s.id === order.sales_closed_by_id);
          console.log(`   📝 Product Order ${order.id.substring(0, 8)}... → Staff: ${staff?.name || 'Unknown'}`);
        }
      }
    }

    if (pbFinal && pbFinal.length > 0) {
      const samplePB = pbFinal.slice(0, 3);
      for (const booking of samplePB) {
        if (booking.sales_closed_by_id) {
          const staff = staffMembers.find(s => s.id === booking.sales_closed_by_id);
          console.log(`   📝 Package Booking ${booking.id.substring(0, 8)}... → Staff: ${staff?.name || 'Unknown'}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 VERIFICATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your quotes page');
    console.log('   2. Open any quote detail');
    console.log('   3. Look for the "Sales Information" card with staff name');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Run the service
verifyAndUpdateSalesStaff();
