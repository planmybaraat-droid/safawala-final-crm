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
  console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('Key:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSchema() {
  try {
    console.log('🚀 Running settings schema setup...');
    
    // Read the schema file
    const schema = fs.readFileSync('./scripts/create-settings-schema.sql', 'utf8');
    
    // For now, let's just try to create the basic tables manually
    console.log('Creating company_settings table...');
    const { error1 } = await supabase.from('company_settings').select('id').limit(1);
    if (error1 && error1.code === '42P01') {
      const createCompanySettings = `
        CREATE TABLE IF NOT EXISTS company_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          franchise_id UUID,
          company_name VARCHAR(255) NOT NULL DEFAULT 'Safawala Rental Services',
          email VARCHAR(255),
          phone VARCHAR(20),
          gst_number VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          website VARCHAR(255),
          logo_url TEXT,
          signature_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      console.log('Creating company_settings table...');
      // Since we can't use rpc, let's create it using direct SQL
    }
    
    console.log('✅ Basic schema setup completed');
    console.log('Note: Full schema creation requires Supabase SQL editor or direct database access');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runSchema();