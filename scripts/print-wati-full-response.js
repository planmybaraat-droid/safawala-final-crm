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

  const resV1 = await fetch(`${config.base_url}/api/v1/getMessages/${TEST_PHONE}?pageSize=10&pageNumber=1`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });
  const data = await resV1.json();
  
  if (data.messages && data.messages.items) {
    console.log('--- WATI MESSAGE HISTORY DETAILS ---');
    data.messages.items.forEach((item, idx) => {
      console.log(`\n[Message ${idx+1}]`);
      console.log(`- Time: ${item.created || item.time}`);
      console.log(`- Status: ${item.status || item.messageStatus || item.statusString}`);
      console.log(`- eventDescription: ${item.eventDescription}`);
      console.log(`- type: ${item.type}`);
      console.log(`- text: ${item.text || item.finalText?.slice(0, 80) + '...'}`);
    });
  } else {
    console.log('No messages found:', JSON.stringify(data, null, 2));
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
