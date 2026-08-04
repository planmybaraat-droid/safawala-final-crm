// Script to test customer data
// Read environment variables directly from Next.js .env.local file
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found');
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const matches = line.match(/^([^=]+)=(.*)$/);
    if (matches) {
      const key = matches[1].trim();
      const value = matches[2].trim();
      envVars[key] = value;
    }
  });
  
  return envVars;
}

const env = loadEnv();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Testing Supabase Connection...');
  
  try {
    // Check franchises
    const { data: franchises, error: franchiseError } = await supabase
      .from('franchises')
      .select('*');
    
    if (franchiseError) {
      throw franchiseError;
    }
    
    console.log(`Found ${franchises.length} franchises:`);
    franchises.forEach(f => console.log(`- ${f.name} (ID: ${f.id}, Code: ${f.code})`));
    
    // Check customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*');
    
    if (customerError) {
      throw customerError;
    }
    
    console.log(`\nFound ${customers.length} customers:`);
    customers.forEach(c => console.log(`- ${c.name} (ID: ${c.id}, Franchise ID: ${c.franchise_id})`));
    
    // Check users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*');
    
    if (userError) {
      throw userError;
    }
    
    console.log(`\nFound ${users.length} users:`);
    users.forEach(u => console.log(`- ${u.email} (ID: ${u.id}, Role: ${u.role}, Franchise ID: ${u.franchise_id})`));
    
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
  }
}

main();