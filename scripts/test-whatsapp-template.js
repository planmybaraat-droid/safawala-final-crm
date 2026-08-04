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
  console.log('✅ WATI config loaded\n');

  // From the template body we can see:
  // • Total Amount: {{7}}  <-- NO ₹ prefix in template!
  // So we pass "₹5,000" (include ₹ in our value)

  const payload = {
    broadcast_name: `test_fixed_${Date.now()}`,
    template_name: 'booking_invoice_document_v3',
    receivers: [
      {
        whatsappNumber: '917016020144',
        customParams: [
          { name: 'mediaUrl', value: 'https://pdfobject.com/pdf/sample.pdf' },
          { name: '1', value: 'Rahul Test' },
          { name: '2', value: 'INV-TEST-002' },
          { name: '3', value: '04 Jun 2026' },
          { name: '4', value: '10:00' },
          { name: '5', value: 'TBD' },
          { name: '6', value: 'Royal Turban x1, Kalgi x1' },
          { name: '7', value: '₹5,000' },  // Include ₹ since template has just {{7}}
          { name: '8', value: 'Pending' },
        ],
        mediaUrl: 'https://pdfobject.com/pdf/sample.pdf'
      },
      {
        whatsappNumber: '916353583148',
        customParams: [
          { name: 'mediaUrl', value: 'https://pdfobject.com/pdf/sample.pdf' },
          { name: '1', value: 'Rahul Test' },
          { name: '2', value: 'INV-TEST-002' },
          { name: '3', value: '04 Jun 2026' },
          { name: '4', value: '10:00' },
          { name: '5', value: 'TBD' },
          { name: '6', value: 'Royal Turban x1, Kalgi x1' },
          { name: '7', value: '₹5,000' },  // Include ₹ since template has just {{7}}
          { name: '8', value: 'Pending' },
        ],
        mediaUrl: 'https://pdfobject.com/pdf/sample.pdf'
      }
    ],
  };

  console.log('📤 Sending booking_invoice_document template...');
  console.log('   Template body has: • Total Amount: {{7}}');
  console.log('   So passing value: "₹5,000"\n');

  const res = await fetch(`${config.base_url}/api/v1/sendTemplateMessages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`📥 Response (${res.status}):`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
