const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCustomTest() {
  const orderId = 'b4e6105c-3d35-459c-8d8e-58c49ca37723';
  const orderType = 'product_order';
  const franchiseId = '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  const testNumber = '916353583148';

  console.log("1. Finding customer linked to order:", orderId);
  const { data: order, error: orderErr } = await supabase
    .from('product_orders')
    .select('customer_id')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    console.error("Failed to fetch order:", orderErr);
    return;
  }

  const customerId = order.customer_id;
  console.log(`- Found customer ID: ${customerId}`);

  console.log(`2. Updating customer ${customerId} phone and whatsapp to ${testNumber}...`);
  const { error: updateErr } = await supabase
    .from('customers')
    .update({
      phone: testNumber,
      whatsapp: testNumber
    })
    .eq('id', customerId);

  if (updateErr) {
    console.error("Failed to update customer:", updateErr);
    return;
  }
  console.log("- Customer updated successfully.");

  // 3. Trigger sending
  console.log("3. Triggering E2E invoice send...");
  const { onInvoiceCreated } = require('../lib/services/whatsapp-triggers');
  try {
    const res = await onInvoiceCreated({
      orderId,
      orderType,
      franchiseId
    });
    console.log("Trigger Result:", res);
  } catch (err) {
    console.error("Trigger failed:", err);
  }
}

runCustomTest();
