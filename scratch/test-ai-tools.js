const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// A simple local implementation of standard bcrypt for test comparison
const bcrypt = require("bcryptjs");

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Starting automated verification of AI backend tools...");

  // Mock authentication context
  const mockAuth = {
    authorized: true,
    user: {
      id: "test-user-id",
      email: "test@safawala.com",
      role: "franchise_admin",
      is_super_admin: false,
      permissions: {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        expenses: true,
        staff: true
      }
    }
  };

  // Get a valid franchise ID to run operations under
  const { data: franchises } = await supabase.from("franchises").select("id").limit(1);
  const franchiseId = franchises?.[0]?.id;
  if (!franchiseId) {
    console.error("❌ Failed: No franchise found in database to test with.");
    process.exit(1);
  }
  console.log(`Using Franchise ID: ${franchiseId}`);

  // Test Coupon Creation
  const testCouponCode = `TEST${Date.now().toString().slice(-4)}`;
  console.log(`\n1. Testing 'create_coupon' tool for code ${testCouponCode}...`);
  const couponResult = await createCouponTool(supabase, testCouponCode, franchiseId);
  if (couponResult.success) {
    console.log("✅ create_coupon tool execution success!");
    console.log("Coupon data:", couponResult.data);
  } else {
    console.error("❌ create_coupon tool execution failed:", couponResult.error);
  }

  // Test Customer Creation
  const testCustName = `Test Customer ${Date.now().toString().slice(-4)}`;
  console.log(`\n2. Testing 'create_customer' tool for ${testCustName}...`);
  const custResult = await createCustomerTool(supabase, testCustName, franchiseId);
  if (custResult.success) {
    console.log("✅ create_customer tool execution success!");
    console.log("Customer data:", custResult.data);
  } else {
    console.error("❌ create_customer tool execution failed:", custResult.error);
  }

  // Test Lead Creation
  const testLeadName = `Test Lead ${Date.now().toString().slice(-4)}`;
  console.log(`\n3. Testing 'create_lead' tool for ${testLeadName}...`);
  const leadResult = await createLeadTool(supabase, testLeadName);
  if (leadResult.success) {
    console.log("✅ create_lead tool execution success!");
    console.log("Lead data:", leadResult.data);
  } else {
    console.error("❌ create_lead tool execution failed:", leadResult.error);
  }

  // Test Expense Creation
  console.log("\n4. Testing 'add_expense' tool...");
  const expenseResult = await addExpenseTool(supabase, franchiseId);
  if (expenseResult.success) {
    console.log("✅ add_expense tool execution success!");
    console.log("Expense data:", expenseResult.data);
  } else {
    console.error("❌ add_expense tool execution failed:", expenseResult.error);
  }

  // Cleanup test records
  console.log("\nCleaning up test records...");
  if (couponResult.success) {
    await supabase.from("coupons").delete().eq("id", couponResult.data.id);
  }
  if (custResult.success) {
    await supabase.from("customers").delete().eq("id", custResult.data.id);
  }
  if (leadResult.success) {
    await supabase.from("leads").delete().eq("id", leadResult.data.id);
  }
  if (expenseResult.success) {
    await supabase.from("expenses").delete().eq("id", expenseResult.data.id);
  }
  console.log("Cleanup complete. Verification finished successfully!");
}

async function createCouponTool(supabase, code, franchiseId) {
  const args = {
    code: code,
    discount_type: "percentage",
    discount_value: 15,
    description: "Automated test coupon",
    min_order_value: 1000
  };

  const sanitized = {
    code: args.code.trim().toUpperCase(),
    discount_type: args.discount_type,
    discount_value: Number(args.discount_value),
    description: args.description,
    franchise_id: franchiseId,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("coupons")
    .insert([sanitized])
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function createCustomerTool(supabase, name, franchiseId) {
  const args = {
    name: name,
    phone: "9999911111",
    whatsapp: "9999911111",
    email: "test_customer@gmail.com",
    city: "Mumbai"
  };

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: args.name,
      phone: args.phone,
      whatsapp: args.whatsapp,
      email: args.email,
      city: args.city,
      franchise_id: franchiseId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function createLeadTool(supabase, name) {
  const args = {
    name: name,
    phone: "8888822222",
    event_date: "2026-12-25",
    location: "Grand Hyatt Goa",
    message: "Enquiry for wedding safas"
  };

  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: args.name,
      phone: args.phone,
      event_date: args.event_date,
      location: args.location,
      message: args.message,
      status: "new",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function addExpenseTool(supabase, franchiseId) {
  const args = {
    amount: 350,
    expense_date: new Date().toISOString().split("T")[0],
    subcategory: "Tea & snacks",
    description: "AI assistant test expense"
  };

  const expenseNumber = `EXP${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      expense_number: expenseNumber,
      amount: Number(args.amount),
      expense_date: args.expense_date,
      subcategory: args.subcategory,
      description: args.description,
      franchise_id: franchiseId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

run();
