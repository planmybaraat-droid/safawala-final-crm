// Script to test customer data access for current user
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
  console.log('Testing User-Customer Franchise Relationship...');
  
  try {
    // We want to look for the user email contentyouworkplace@gmail.com
    const userEmail = 'contentyouworkplace@gmail.com';
    
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      throw new Error(`Error fetching user: ${userError.message}`);
    }
    
    console.log('User found:');
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Franchise ID: ${user.franchise_id || 'None'}`);
    
    // Get franchise details for this user
    if (user.franchise_id) {
      const { data: franchise, error: franchiseError } = await supabase
        .from('franchises')
        .select('*')
        .eq('id', user.franchise_id)
        .single();
      
      if (franchiseError) {
        throw new Error(`Error fetching franchise: ${franchiseError.message}`);
      }
      
      console.log('\nUser\'s franchise:');
      console.log(`- Name: ${franchise.name}`);
      console.log(`- Code: ${franchise.code}`);
      console.log(`- ID: ${franchise.id}`);
    }
    
    // Get customers that should be visible to this user
    let customerQuery = supabase.from('customers').select('*');
    
    // If user is not super_admin, filter by franchise
    if (user.role !== 'super_admin' && user.franchise_id) {
      customerQuery = customerQuery.eq('franchise_id', user.franchise_id);
    }
    
    const { data: customers, error: customerError } = await customerQuery;
    
    if (customerError) {
      throw new Error(`Error fetching customers: ${customerError.message}`);
    }
    
    console.log(`\nCustomers accessible to ${user.email}: ${customers.length}`);
    customers.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} (Franchise ID: ${c.franchise_id})`);
    });
    
    // Check any mismatch between user's franchise and customers
    if (user.franchise_id) {
      const allCustomers = await supabase.from('customers').select('*');
      const mismatched = allCustomers.data.filter(c => 
        c.franchise_id === user.franchise_id && 
        !customers.some(uc => uc.id === c.id)
      );
      
      if (mismatched.length > 0) {
        console.log('\nMismatch found! These customers have the same franchise ID but are not accessible:');
        mismatched.forEach((c, i) => {
          console.log(`${i+1}. ${c.name} (Franchise ID: ${c.franchise_id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();