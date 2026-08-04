const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching users from DB...');
  const { data: users, error } = await supabase.from('users').select('id, email, name, session_token, session_created_at');
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log('Users:');
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}): Token="${u.session_token}" CreatedAt="${u.session_created_at}"`);
    });
  }
}

run();
