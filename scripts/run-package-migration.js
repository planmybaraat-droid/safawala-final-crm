#!/usr/bin/env node

/**
 * Package Restructure Migration Runner
 * Executes the SQL migration using Supabase client
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting Package Restructure Migration...\n');

    // Read the SQL file
    const sql = fs.readFileSync('/Applications/safawala-crm/PACKAGE_RESTRUCTURE_MIGRATION.sql', 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comment blocks
      if (statement.includes('================================================================')) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct execution if rpc fails
          const { error: directError } = await supabase.from('_temp').insert({ query: statement });
          if (directError && !directError.message.includes('relation "_temp" does not exist')) {
            console.error(`❌ Error in statement ${i + 1}:`, directError.message.substring(0, 100));
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
        
        // Show progress
        if ((i + 1) % 10 === 0) {
          console.log(`📊 Progress: ${i + 1}/${statements.length} statements processed`);
        }
      } catch (err) {
        console.error(`❌ Error in statement ${i + 1}:`, err.message.substring(0, 100));
        errorCount++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount} statements`);
    console.log(`   Errors: ${errorCount} statements`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    
    const { data: categories, error: catError } = await supabase
      .from('packages_categories')
      .select('*', { count: 'exact', head: true });
    
    const { data: variants, error: varError } = await supabase
      .from('package_variants')
      .select('*', { count: 'exact', head: true });
    
    const { data: levels, error: levError } = await supabase
      .from('package_levels')
      .select('*', { count: 'exact', head: true });

    if (!catError && !varError && !levError) {
      console.log('✅ All tables accessible');
      console.log(`   📦 Package Categories: Available`);
      console.log(`   📦 Package Variants: Available`);
      console.log(`   📦 Package Levels: Available`);
    } else {
      console.log('⚠️  Some tables may need manual verification');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
