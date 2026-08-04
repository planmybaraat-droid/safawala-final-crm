// Test script to simulate API requests with proper headers
const fs = require('fs');
const path = require('path');
const http = require('http');

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
  try {
    // Get current user details
    const userEmail = 'contentyouworkplace@gmail.com';
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      throw new Error(`Error fetching user: ${userError.message}`);
    }
    
    console.log('User found:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Franchise ID: ${user.franchise_id || 'None'}`);
    
    // Now make a direct request to the customers API to simulate browser request
    console.log('\nMaking HTTP request to /api/customers...');
    
    // Create options for the HTTP request
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/customers',
      method: 'GET',
      headers: {
        'X-User-ID': user.id,
        'X-User-Email': user.email,
        'X-Session-ID': `test-session-${Date.now()}`
      }
    };
    
    // Make the HTTP request
    const req = http.request(options, (res) => {
      console.log(`\nAPI Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('\nAPI Response:');
          
          if (parsedData.success) {
            console.log(`✅ Success: ${parsedData.message}`);
            console.log(`- Total customers: ${parsedData.data.customers.length}`);
            
            if (parsedData.data.customers.length > 0) {
              console.log('\nFirst few customers:');
              parsedData.data.customers.slice(0, 3).forEach((c, i) => {
                console.log(`${i+1}. ${c.name} (ID: ${c.id}, Franchise: ${c.franchise_id})`);
              });
            } else {
              console.log('⚠️ No customers found in API response!');
            }
          } else {
            console.log(`❌ Error: ${parsedData.error || 'Unknown error'}`);
          }
        } catch (e) {
          console.log('Error parsing response:', e.message);
          console.log('Raw response:', data);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('HTTP Request Error:', e.message);
    });
    
    req.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();