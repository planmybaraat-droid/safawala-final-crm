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

  console.log(`━━━ Opting in contact ${TEST_PHONE} via WATI API ━━━`);
  const optInRes = await fetch(`${config.base_url}/api/v1/updateContactOptin/${TEST_PHONE}?optedIn=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    }
  });
  console.log('Opt-In HTTP Status:', optInRes.status);
  const optInText = await optInRes.text();
  console.log('Opt-In Response:', optInText);

  // Check details again
  const res = await fetch(`${config.base_url}/api/v1/getContact/${TEST_PHONE}`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });
  const data = await res.json();
  console.log('\nUpdated WATI Contact Details:');
  console.log(`- optedIn: ${data.contact?.optedIn}`);
  console.log(`- isInFlow: ${data.contact?.isInFlow}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
