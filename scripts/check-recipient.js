const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecipient() {
  const orderId = 'b4e6105c-3d35-459c-8d8e-58c49ca37723';
  const { data: order } = await supabase.from('product_orders').select('customer_id').eq('id', orderId).single();
  if (order) {
    const { data: customer } = await supabase.from('customers').select('name, phone, whatsapp').eq('id', order.customer_id).single();
    if (customer) {
      console.log("Recipient customer details:");
      console.log(`- Name: ${customer.name}`);
      console.log(`- Phone: ${customer.phone}`);
      console.log(`- WhatsApp: ${customer.whatsapp}`);
    } else {
      console.log("Customer not found");
    }
  } else {
    console.log("Order not found");
  }
}

checkRecipient();
