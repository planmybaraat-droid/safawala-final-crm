const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const envVars = {};

envLines.forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=');
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBasicTables() {
  try {
    console.log('🔧 Creating basic settings tables...');
    
    // Test if company_settings table exists
    console.log('Testing company_settings table...');
    const { error: companyError } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1);
    
    if (companyError) {
      console.log('company_settings table missing, will be created in Supabase dashboard');
    } else {
      console.log('✅ company_settings table exists');
    }

    // Test banking_details table
    console.log('Testing banking_details table...');
    const { error: bankError } = await supabase
      .from('banking_details')
      .select('id')
      .limit(1);
    
    if (bankError) {
      console.log('banking_details table missing, will be created in Supabase dashboard');
    } else {
      console.log('✅ banking_details table exists');
    }

    console.log('\n📋 Schema Creation Steps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and run the SQL from scripts/create-settings-schema.sql');
    console.log('4. This will create all required tables for the settings');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createBasicTables();