import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simulate what ensurePermissions does now
function ensurePermissions(permissions: any, role: string) {
  // If user has explicit permissions in DB, use those (don't override with defaults)
  if (permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0) {
    // Just ensure all required keys exist by filling in missing ones with false
    const allKeys = [
      'dashboard', 'bookings', 'customers', 'inventory', 'sales', 'laundry',
      'purchases', 'expenses', 'deliveries', 'reports', 'financials',
      'invoices', 'franchises', 'staff', 'settings'
    ];
    
    const result = { ...permissions };
    for (const key of allKeys) {
      if (!(key in result)) {
        result[key] = false;
      }
    }
    return result;
  }
  
  // Only use defaults if permissions is null/empty
  return getDefaultPermissions(role);
}

function getDefaultPermissions(role: string) {
  // ... defaults based on role
  return { dashboard: true, bookings: true }; // simplified
}

async function testUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'new@safawala.com')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📊 Testing permission logic for:', data.name);
  console.log('Role:', data.role);
  
  console.log('\n📥 Raw permissions from DB:');
  console.log(JSON.stringify(data.permissions, null, 2));
  
  console.log('\n🔄 After ensurePermissions():');
  const processed = ensurePermissions(data.permissions, data.role);
  console.log(JSON.stringify(processed, null, 2));
  
  console.log('\n✅ User should have access to:');
  Object.entries(processed)
    .filter(([_, val]) => val === true)
    .forEach(([key]) => console.log(`   - ${key}`));
  
  console.log('\n❌ User should NOT have access to:');
  Object.entries(processed)
    .filter(([_, val]) => val === false)
    .forEach(([key]) => console.log(`   - ${key}`));
  
  // Test specific permission checks
  console.log('\n🧪 Permission checks:');
  console.log(`   bookings: ${processed.bookings ? '✅ ALLOWED' : '❌ DENIED'}`);
  console.log(`   staff: ${processed.staff ? '✅ ALLOWED' : '❌ DENIED'}`);
  console.log(`   financials: ${processed.financials ? '✅ ALLOWED' : '❌ DENIED'}`);
  console.log(`   reports: ${processed.reports ? '✅ ALLOWED' : '❌ DENIED'}`);
}

testUser();
