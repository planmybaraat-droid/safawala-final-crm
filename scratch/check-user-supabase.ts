import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE URL or SERVICE ROLE KEY not set');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('users').select('id, email, role, department, is_active');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log(data);
  }
}

run();
