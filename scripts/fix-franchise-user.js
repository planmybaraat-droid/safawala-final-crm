// Script to verify and fix franchise ID for the current user
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
  console.log('Checking user and franchise settings...');
  
  try {
    // Get user with email contentyouworkplace@gmail.com
    const userEmail = 'contentyouworkplace@gmail.com';
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      throw new Error(`Error fetching user: ${userError.message}`);
    }
    
    console.log('Current user configuration:');
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Franchise ID: ${user.franchise_id || 'None'}`);
    
    // Get the Safawala Main Branch franchise
    const { data: franchise, error: franchiseError } = await supabase
      .from('franchises')
      .select('*')
      .eq('code', 'MAIN001')
      .single();
    
    if (franchiseError) {
      throw new Error(`Error fetching franchise: ${franchiseError.message}`);
    }
    
    console.log('\nMain franchise information:');
    console.log(`- Name: ${franchise.name}`);
    console.log(`- Code: ${franchise.code}`);
    console.log(`- ID: ${franchise.id}`);
    
    // Check if the user's franchise ID matches the main franchise
    if (user.franchise_id !== franchise.id) {
      console.log('\n⚠️ User franchise ID does not match the main franchise ID!');
      
      // Update the user's franchise ID
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ franchise_id: franchise.id })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Error updating user: ${updateError.message}`);
      }
      
      console.log('\n✅ User franchise ID has been updated!');
      console.log(`- Previous: ${user.franchise_id}`);
      console.log(`- Updated to: ${updatedUser.franchise_id}`);
    } else {
      console.log('\n✅ User franchise ID is already correctly set.');
    }
    
    // Also check if there are any customers without franchise ID
    const { data: customersWithoutFranchise, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .is('franchise_id', null);
    
    if (customerError) {
      throw new Error(`Error checking customers: ${customerError.message}`);
    }
    
    if (customersWithoutFranchise.length > 0) {
      console.log(`\n⚠️ Found ${customersWithoutFranchise.length} customers without franchise ID!`);
      
      // Update these customers to use the main franchise
      const { data: updatedCustomers, error: updateCustomerError } = await supabase
        .from('customers')
        .update({ franchise_id: franchise.id })
        .is('franchise_id', null)
        .select('id, name');
      
      if (updateCustomerError) {
        throw new Error(`Error updating customers: ${updateCustomerError.message}`);
      }
      
      console.log('\n✅ Customers have been updated with the correct franchise ID!');
      console.log(`- Updated ${updatedCustomers.length} customers`);
    } else {
      console.log('\n✅ All customers have franchise IDs set correctly.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();