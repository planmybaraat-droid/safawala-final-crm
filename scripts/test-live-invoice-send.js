/**
 * Live API test — simulates exactly what the browser does when clicking
 * the WhatsApp send button on the invoices page.
 * Run: node scripts/test-live-invoice-send.js <orderId> <orderType>
 * 
 * Example:
 *   node scripts/test-live-invoice-send.js b4e6105c-3d35-459c-8d8e-58c49ca37723 product_order
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const orderId   = process.argv[2];
const orderType = process.argv[3] || 'product_order'; // product_order | package_booking | direct_sale

if (!orderId) {
  console.error('Usage: node scripts/test-live-invoice-send.js <orderId> [orderType]');
  process.exit(1);
}

async function getWatiConfig() {
  const { data } = await supabase
    .from('integration_settings')
    .select('api_key, base_url')
    .eq('integration_name', 'whatsapp-wati')
    .single();
  return data;
}

function formatPhone(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

async function main() {
  console.log(`\n🔍 Testing live send for order: ${orderId} (${orderType})\n`);

  // ── 1. Fetch order ──────────────────────────────────────────────────────────
  const tableMap = {
    product_order: 'product_orders',
    package_booking: 'package_bookings',
    direct_sale: 'direct_sales_orders',
  };
  const table = tableMap[orderType];
  const { data: order, error: orderErr } = await supabase.from(table).select('*').eq('id', orderId).single();

  if (orderErr || !order) {
    console.error('❌ Order not found:', orderErr?.message);
    process.exit(1);
  }
  console.log('✅ Order found:');
  console.log('   Number:', order.order_number || order.package_number || order.sale_number);
  console.log('   customer_id:', order.customer_id);
  console.log('   total_amount:', order.total_amount);

  // ── 2. Fetch customer ────────────────────────────────────────────────────────
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('name, phone, whatsapp')
    .eq('id', order.customer_id)
    .single();

  if (custErr || !customer) {
    console.error('❌ Customer not found:', custErr?.message);
    process.exit(1);
  }
  console.log('\n✅ Customer found:');
  console.log('   Name:', customer.name);
  console.log('   Phone:', customer.phone);
  console.log('   WhatsApp:', customer.whatsapp);

  const rawPhone = customer.whatsapp || customer.phone;
  if (!rawPhone) {
    console.error('❌ Customer has no phone/WhatsApp number — cannot send');
    process.exit(1);
  }

  const phone = formatPhone(rawPhone);
  console.log('   Formatted phone for WATI:', phone);

  let itemsSummary = "";
  if (orderType === "package_booking") {
    // 1. Fetch package booking items
    const { data: bookingItems } = await supabase
      .from("package_booking_items")
      .select("variant_name, variant_inclusions, reserved_products")
      .eq("booking_id", orderId);
    
    // 2. Fetch selected products from database
    const { data: productItems } = await supabase
      .from("package_booking_product_items")
      .select(`
        quantity,
        products ( name, category )
      `)
      .eq("package_booking_id", orderId);

    if (bookingItems && bookingItems.length > 0) {
      itemsSummary = bookingItems.map((item) => {
        const inclusionsStr = Array.isArray(item.variant_inclusions)
          ? item.variant_inclusions.join(", ")
          : (typeof item.variant_inclusions === "string" ? item.variant_inclusions : "");

        let productsStr = "";
        const reserved = Array.isArray(item.reserved_products)
          ? item.reserved_products
          : (typeof item.reserved_products === "string" ? JSON.parse(item.reserved_products) : []);
        if (reserved.length > 0) {
          productsStr = reserved.map((p) => `${p.name} x${p.qty || p.quantity || 1}`).join(", ");
        } else if (productItems && productItems.length > 0) {
          productsStr = productItems.map((p) => `${p.products?.name || p.products?.category || "Item"} x${p.quantity}`).join(", ");
        }

        let summary = `${item.variant_name || "Package Item"}`;
        const details = [];
        if (inclusionsStr) {
          details.push(`Inclusions: ${inclusionsStr}`);
        }
        if (productsStr) {
          details.push(`Products: ${productsStr}`);
        }
        if (details.length > 0) {
          summary += ` (${details.join("; ")})`;
        }
        return summary;
      }).join(", ");
    } else {
      itemsSummary = "Wedding Accessories";
    }
  } else {
    // Fetch product order items
    const { data: items } = await supabase
      .from("product_order_items")
      .select(`quantity, product_name, products ( name, category )`)
      .eq("order_id", orderId);

    const finalItems = (items || []).map((it) => ({
      product_name: it.product_name || it.products?.name || it.products?.category || "Item",
      quantity: it.quantity
    }));

    if (order.package_id) {
      const { data: pkgSet } = await supabase.from("package_sets").select("name").eq("id", order.package_id).maybeSingle();
      const { data: pkgVar } = await supabase.from("package_variants").select("name, inclusions").eq("id", order.variant_id).maybeSingle();
      
      const pkgName = `${pkgSet?.name || "Package"} - ${pkgVar?.name || "Variant"}`;
      const inclusionsStr = pkgVar?.inclusions ? (Array.isArray(pkgVar.inclusions) ? pkgVar.inclusions.join(", ") : String(pkgVar.inclusions)) : "";
      
      const productsStr = finalItems.map((i) => `${i.product_name || "Item"} x${i.quantity || 1}`).join(", ");
      
      let summary = pkgName;
      const details = [];
      if (inclusionsStr) {
        details.push(`Inclusions: ${inclusionsStr}`);
      }
      if (productsStr) {
        details.push(`Products: ${productsStr}`);
      }
      if (details.length > 0) {
        summary += ` (${details.join("; ")})`;
      }
      itemsSummary = summary;
    } else {
      if (finalItems.length > 0) {
        itemsSummary = finalItems.map((it) => `${it.product_name || "Item"} x${it.quantity}`).join(", ");
      } else {
        itemsSummary = "Wedding Accessories";
      }
    }
  }

  if (itemsSummary.length > 900) {
    itemsSummary = itemsSummary.slice(0, 900) + "...";
  }

  // ── 4. Build template params ─────────────────────────────────────────────────
  const { format } = require('date-fns');
  const eventDate = order.event_date ? format(new Date(order.event_date), 'dd MMM yyyy') : 'TBD';
  const eventTime = order.delivery_time || order.event_time || 'TBD';
  const venue     = order.venue_name || order.venue_address || 'TBD';
  const total     = `₹${(order.total_amount || 0).toLocaleString('en-IN')}`;
  const payStatus = order.amount_paid > 0 ? `Advance ₹${order.amount_paid.toLocaleString('en-IN')} Paid` : 'Pending';

  console.log('\n📋 Template Parameters:');
  console.log('   {{1}} Customer:', customer.name);
  console.log('   {{2}} BookingID:', order.order_number || order.package_number);
  console.log('   {{3}} EventDate:', eventDate);
  console.log('   {{4}} EventTime:', eventTime);
  console.log('   {{5}} Venue:', venue);
  console.log('   {{6}} Items:', itemsSummary);
  console.log('   {{7}} Total:', total);
  console.log('   {{8}} PayStatus:', payStatus);

  // ── 5. Send via WATI ─────────────────────────────────────────────────────────
  const config = await getWatiConfig();
  const payload = {
    broadcast_name: `live_test_${Date.now()}`,
    template_name: 'booking_invoice_document_v3',
    receivers: [{
      whatsappNumber: phone,
      mediaUrl: 'https://pdfobject.com/pdf/sample.pdf',
      customParams: [
        { name: '1', value: customer.name },
        { name: '2', value: order.order_number || order.package_number || orderId.slice(0,8) },
        { name: '3', value: eventDate },
        { name: '4', value: eventTime },
        { name: '5', value: venue },
        { name: '6', value: itemsSummary },
        { name: '7', value: total },
        { name: '8', value: payStatus },
        { name: 'mediaUrl', value: 'https://pdfobject.com/pdf/sample.pdf' },
      ],
    }],
  };

  console.log('\n📤 Sending to WATI...');
  const res = await fetch(`${config.base_url}/api/v1/sendTemplateMessages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  console.log('\n📥 WATI Response (HTTP', res.status, '):');
  console.log(JSON.stringify(result, null, 2));

  if (result.result) {
    console.log(`\n✅ SUCCESS — Message sent to ${rawPhone} (${phone})`);
  } else {
    console.log('\n❌ FAILED');
    if (result.errors?.invalidWhatsappNumbers?.length) {
      console.log('   Invalid numbers:', result.errors.invalidWhatsappNumbers);
    }
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
