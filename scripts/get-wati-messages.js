const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_PHONE = '917016020144';

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

  // Try Ext V3 endpoint first
  console.log(`━━━ Fetching messages for ${TEST_PHONE} via Ext V3 API ━━━`);
  const resV3 = await fetch(`${config.base_url}/api/ext/v3/conversations/${TEST_PHONE}/messages?page_number=1&page_size=10`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });
  console.log('V3 Status:', resV3.status);
  const textV3 = await resV3.text();
  try {
    const data = JSON.parse(textV3);
    console.log('V3 Response (first 3 messages):', JSON.stringify(data.messages?.slice(0, 3), null, 2));
  } catch (e) {
    console.log('V3 Response was not JSON:', textV3.slice(0, 300));
  }

  // Try V1 getMessages endpoint as fallback
  console.log(`\n━━━ Fetching messages for ${TEST_PHONE} via V1 API ━━━`);
  const resV1 = await fetch(`${config.base_url}/api/v1/getMessages/${TEST_PHONE}?pageSize=10&pageNumber=1`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });
  console.log('V1 Status:', resV1.status);
  const textV1 = await resV1.text();
  try {
    const data = JSON.parse(textV1);
    console.log('V1 Response:', JSON.stringify(data.messages?.slice(0, 3), null, 2));
  } catch (e) {
    console.log('V1 Response was not JSON:', textV1.slice(0, 300));
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
