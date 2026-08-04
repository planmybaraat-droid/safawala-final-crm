// Load environment variables manually from .env.local
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value;
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCompanySettingsTable() {
  try {
    console.log('🔍 Checking company_settings table structure...\n');
    
    // First, let's check if the table exists by trying to describe it
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'company_settings');
      
    if (tablesError || !tables || tables.length === 0) {
      console.log('❌ company_settings table does not exist');
      return;
    }
    
    console.log('✅ company_settings table exists');
    
    // Get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'company_settings')
      .order('ordinal_position');
      
    if (columnsError) {
      console.log('❌ Error getting columns:', columnsError.message);
      return;
    }
    
    console.log('\n📋 Table Columns:');
    console.log('================');
    columns.forEach(col => {
      console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- NOT NULL' : ''}`);
    });
    
    // Try to get sample data
    const { data: sampleData, error: dataError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1);
      
    if (dataError) {
      console.log('\n⚠️ Error getting sample data:', dataError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log('\n📊 Sample Data:');
      console.log('==============');
      console.log(JSON.stringify(sampleData[0], null, 2));
    } else {
      console.log('\n📊 No data found in company_settings table');
    }
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

checkCompanySettingsTable().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(err => {
  console.log('❌ Script error:', err.message);
  process.exit(1);
});