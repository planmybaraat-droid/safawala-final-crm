const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: customers, error: custError } = await supabase.from('customers').select('id').limit(1);
  console.log("Service key fetch customers:", customers, custError);
}
run();
