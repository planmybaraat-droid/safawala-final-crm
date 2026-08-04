const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);
  const today = new Date().toISOString().split("T")[0];

  console.log("Testing FIXED CRM queries...");

  // 1. bookingsToday
  const { data: bookingsToday, error: err1 } = await supabase
    .from("product_orders")
    .select("id, order_number, event_date, total_amount, status, customer:customers(name, phone)")
    .eq("event_date", today)
    .limit(10);
  
  if (err1) {
    console.error("❌ bookingsToday failed:", err1.message);
  } else {
    console.log("✅ bookingsToday success:", bookingsToday.length);
  }

  // 2. pendingPayments
  const { data: pendingPayments, error: err2 } = await supabase
    .from("product_orders")
    .select("id, order_number, total_amount, amount_paid, customer:customers(name, phone)")
    .in("status", ["pending", "partial"])
    .order("created_at", { ascending: false })
    .limit(10);
  
  if (err2) {
    console.error("❌ pendingPayments failed:", err2.message);
  } else {
    console.log("✅ pendingPayments success:", pendingPayments.length);
  }

  // 3. lowStock
  const { data: products, error: err3 } = await supabase
    .from("products")
    .select("id, name, stock_available, reorder_level, category")
    .eq("is_active", true);
  
  if (err3) {
    console.error("❌ lowStock fetch failed:", err3.message);
  } else {
    const lowStock = (products || []).filter(p => p.stock_available <= (p.reorder_level || 0));
    console.log("✅ lowStock success, found low stock items count:", lowStock.length);
  }

  // 4. todayDeliveries
  const { data: todayDeliveries, error: err4 } = await supabase
    .from("deliveries")
    .select("id, delivery_date, delivery_type, status, customer:customers(name, phone)")
    .eq("delivery_date", today)
    .limit(10);
  
  if (err4) {
    console.error("❌ todayDeliveries failed:", err4.message);
  } else {
    console.log("✅ todayDeliveries success:", todayDeliveries.length);
  }

  // 5. recentLeads
  const { data: recentLeads, error: err5 } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  
  if (err5) {
    console.error("❌ recentLeads failed:", err5.message);
  } else {
    console.log("✅ recentLeads success:", recentLeads.length);
  }

  // 6. recentBookings
  const { data: recentBookings, error: err6 } = await supabase
    .from("product_orders")
    .select("id, order_number, event_date, total_amount, status, customer:customers(name, phone)")
    .order("created_at", { ascending: false })
    .limit(5);
  
  if (err6) {
    console.error("❌ recentBookings failed:", err6.message);
  } else {
    console.log("✅ recentBookings success:", recentBookings.length);
  }
}

run();
