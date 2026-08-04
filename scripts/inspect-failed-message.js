const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_PHONE = '916353583148';

async function getWatiConfig() {
  const { data } = await supabase
    .from('integration_settings')
    .select('api_key, base_url')
    .eq('integration_name', 'whatsapp-wati')
    .single();
  return data;
}

async function main() {
  const config = await getWatiConfig();

  const res = await fetch(`${config.base_url}/api/v1/getMessages/${TEST_PHONE}?pageSize=10&pageNumber=1`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });
  const data = await res.json();
  
  if (data.messages && data.messages.items && data.messages.items.length > 0) {
    console.log('--- RAW FIRST MESSAGE DETAILS ---');
    console.log(JSON.stringify(data.messages.items[0], null, 2));
  } else {
    console.log('No messages found:', data);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
