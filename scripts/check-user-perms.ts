import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'new@safawala.com')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('User:', data.name || data.email);
  console.log('Role:', data.role);
  console.log('Franchise ID:', data.franchise_id);
  console.log('Permissions:', JSON.stringify(data.permissions, null, 2));
  
  // Check which permissions are true
  const enabledPerms = Object.entries(data.permissions || {})
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
  
  console.log('\n✅ Enabled permissions:', enabledPerms.join(', ') || 'NONE');
  
  const disabledPerms = Object.entries(data.permissions || {})
    .filter(([_, value]) => value === false)
    .map(([key]) => key);
  
  console.log('❌ Disabled permissions:', disabledPerms.join(', ') || 'NONE');
}

checkUser();
