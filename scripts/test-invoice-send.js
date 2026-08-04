const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSend() {
  const orderId = 'b4e6105c-3d35-459c-8d8e-58c49ca37723';
  const orderType = 'product_order';
  const franchiseId = '1a518dde-85b7-44ef-8bc4-092f53ddfd99';

  console.log("Starting manual test send for booking:", orderId);

  // 1. Load the trigger methods
  const { onInvoiceCreated } = require('../lib/services/whatsapp-triggers');

  console.log("Triggering onInvoiceCreated...");
  try {
    const res = await onInvoiceCreated({
      orderId,
      orderType,
      franchiseId
    });
    console.log("Result:", res);
  } catch (err) {
    console.error("Trigger failed with error:", err);
  }
}

testSend();
