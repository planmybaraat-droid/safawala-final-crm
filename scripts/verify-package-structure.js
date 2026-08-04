#!/usr/bin/env node

/**
 * Verify Package Structure Migration
 * Checks if all tables and columns exist after migration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStructure() {
  console.log('🔍 Verifying Package Structure Migration...\n');

  try {
    // Check package_levels table
    console.log('1️⃣ Checking package_levels table...');
    const { data: levels, error: levelsError, count: levelsCount } = await supabase
      .from('package_levels')
      .select('*', { count: 'exact', head: true });
    
    if (levelsError) {
      console.log('   ❌ package_levels table not found or error:', levelsError.message);
      console.log('   ⚠️  You need to run CREATE_PACKAGE_LEVELS_TABLE.sql first!');
    } else {
      console.log('   ✅ package_levels table exists');
      
      const { count } = await supabase
        .from('package_levels')
        .select('*', { count: 'exact', head: true });
      console.log(`   📊 Records: ${count || 0} levels found`);
    }

    // Check package_variants has category_id
    console.log('\n2️⃣ Checking package_variants.category_id...');
    const { data: variants, error: variantsError } = await supabase
      .from('package_variants')
      .select('id, category_id, franchise_id, display_order')
      .limit(1);
    
    if (variantsError) {
      console.log('   ❌ Error:', variantsError.message);
    } else if (variants && variants.length > 0) {
      const hasCategory = 'category_id' in variants[0];
      const hasFranchise = 'franchise_id' in variants[0];
      const hasDisplayOrder = 'display_order' in variants[0];
      
      console.log(`   ${hasCategory ? '✅' : '❌'} category_id column exists`);
      console.log(`   ${hasFranchise ? '✅' : '❌'} franchise_id column exists`);
      console.log(`   ${hasDisplayOrder ? '✅' : '❌'} display_order column exists`);
    }

    // Check distance_pricing has level_id
    console.log('\n3️⃣ Checking distance_pricing.level_id...');
    const { data: pricing, error: pricingError } = await supabase
      .from('distance_pricing')
      .select('id, level_id, variant_id')
      .limit(1);
    
    if (pricingError) {
      console.log('   ❌ Error:', pricingError.message);
    } else if (pricing && pricing.length > 0) {
      const hasLevelId = 'level_id' in pricing[0];
      console.log(`   ${hasLevelId ? '✅' : '❌'} level_id column exists`);
    } else {
      console.log('   ℹ️  No distance_pricing records found (this is OK if none exist yet)');
    }

    // Show current hierarchy
    console.log('\n4️⃣ Current Data Structure:');
    
    const { data: categories, error: catError } = await supabase
      .from('packages_categories')
      .select('id, name')
      .eq('is_active', true)
      .limit(3);
    
    if (categories && categories.length > 0) {
      console.log(`   📦 Categories: ${categories.length} active`);
      
      for (const cat of categories) {
        const { count: varCount } = await supabase
          .from('package_variants')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);
        
        console.log(`      └─ ${cat.name}: ${varCount || 0} variants (packages)`);
      }
    }

    // Check if data migration is needed
    console.log('\n5️⃣ Migration Status:');
    
    const { data: variantsWithoutCategory } = await supabase
      .from('package_variants')
      .select('id', { count: 'exact', head: true })
      .is('category_id', null);
    
    const variantsNeedingLink = variantsWithoutCategory?.length || 0;
    
    if (variantsNeedingLink > 0) {
      console.log(`   ⚠️  ${variantsNeedingLink} variants need category_id linking`);
      console.log('   📝 Run the migration queries from PACKAGE_RESTRUCTURE_IMPLEMENTATION.md');
    } else {
      console.log('   ✅ All variants are linked to categories');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyStructure();
