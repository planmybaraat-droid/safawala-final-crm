const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing supabase keys in env");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const today = new Date().toISOString().split("T")[0];

  console.log("Testing CRM queries...");
  
  const queries = {
    bookingsToday: supabase
      .from("product_orders")
      .select("id, order_number, event_date, total_amount, payment_status, customer:customers(name, phone)")
      .eq("event_date", today)
      .limit(5),
    pendingPayments: supabase
      .from("product_orders")
      .select("id, order_number, total_amount, paid_amount, customer:customers(name, phone)")
      .in("payment_status", ["pending", "partial"])
      .limit(5),
    lowStock: supabase
      .from("products")
      .select("id, name, stock_available, reorder_level")
      .filter("stock_available", "lte", "reorder_level")
      .limit(5),
    todayDeliveries: supabase
      .from("deliveries")
      .select("id, delivery_date, delivery_type, status, customer:customers(name, phone)")
      .eq("delivery_date", today)
      .limit(5),
    recentLeads: supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    recentBookings: supabase
      .from("product_orders")
      .select("id, order_number, event_date, total_amount, payment_status, customer:customers(name, phone)")
      .order("created_at", { ascending: false })
      .limit(5),
  };

  for (const [name, query] of Object.entries(queries)) {
    try {
      const { data, error } = await query;
      if (error) {
        console.error(`❌ Query [${name}] failed:`, error.message);
      } else {
        console.log(`✅ Query [${name}] success, returned ${data?.length || 0} items`);
      }
    } catch (e) {
      console.error(`❌ Exception in [${name}]:`, e.message);
    }
  }
}

run();
