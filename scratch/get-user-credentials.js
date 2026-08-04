const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying users from DB...');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, role, is_active')
    .limit(10);

  if (error) {
    console.error('Error querying users:', error);
    process.exit(1);
  }

  console.log('Registered Users:');
  users.forEach(u => {
    console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Active: ${u.is_active}`);
  });
}

run();
