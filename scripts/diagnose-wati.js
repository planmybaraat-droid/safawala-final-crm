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

  // 1. Fetch templates
  const res = await fetch(`${config.base_url}/api/v1/getMessageTemplates`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });
  const data = await res.json();
  const templates = data.messageTemplates || [];

  const turbanTemplate = templates.find(t => t.name === 'booking_invoice_document_v2' || t.elementName === 'booking_invoice_document_v2');
  if (turbanTemplate) {
    console.log('━━━ Found booking_invoice_document_v2 template ━━━');
    console.log(JSON.stringify(turbanTemplate, null, 2));
  } else {
    console.log('booking_invoice_document_v2 template not found!');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
