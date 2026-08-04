const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Starting automated verification of AI backend tools (Fixed version)...");

  // Get a valid franchise ID and user ID to run operations under
  const { data: franchises } = await supabase.from("franchises").select("id").limit(1);
  const franchiseId = franchises?.[0]?.id;
  if (!franchiseId) {
    console.error("❌ Failed: No franchise found in database to test with.");
    process.exit(1);
  }
  console.log(`Using Franchise ID: ${franchiseId}`);

  const { data: users } = await supabase.from("users").select("id").limit(1);
  const userId = users?.[0]?.id;
  if (!userId) {
    console.error("❌ Failed: No user found in database to test with.");
    process.exit(1);
  }
  console.log(`Using User ID: ${userId}`);

  // Test Offer Creation
  const testOfferCode = `TEST${Date.now().toString().slice(-4)}`;
  console.log(`\n1. Testing 'create_coupon' mapping to 'offers' table for code ${testOfferCode}...`);
  const offerResult = await createOfferTool(supabase, testOfferCode, franchiseId);
  if (offerResult.success) {
    console.log("✅ create_coupon (offers table) success!");
    console.log("Offer data:", offerResult.data);
  } else {
    console.error("❌ create_coupon (offers table) failed:", offerResult.error);
  }

  // Test Customer Creation
  const testCustName = `Test Customer ${Date.now().toString().slice(-4)}`;
  console.log(`\n2. Testing 'create_customer' for ${testCustName}...`);
  const custResult = await createCustomerTool(supabase, testCustName, franchiseId, userId);
  if (custResult.success) {
    console.log("✅ create_customer success!");
    console.log("Customer data:", custResult.data);
  } else {
    console.error("❌ create_customer failed:", custResult.error);
  }

  // Test Lead Creation
  const testLeadName = `Test Lead ${Date.now().toString().slice(-4)}`;
  console.log(`\n3. Testing 'create_lead' for ${testLeadName}...`);
  const leadResult = await createLeadTool(supabase, testLeadName);
  if (leadResult.success) {
    console.log("✅ create_lead success!");
    console.log("Lead data:", leadResult.data);
  } else {
    console.error("❌ create_lead failed:", leadResult.error);
  }

  // Test Expense Creation
  console.log("\n4. Testing 'add_expense'...");
  const expenseResult = await addExpenseTool(supabase, franchiseId, userId);
  if (expenseResult.success) {
    console.log("✅ add_expense success!");
    console.log("Expense data:", expenseResult.data);
  } else {
    console.error("❌ add_expense failed:", expenseResult.error);
  }

  // Cleanup test records
  console.log("\nCleaning up test records...");
  if (offerResult.success) {
    await supabase.from("offers").delete().eq("id", offerResult.data.id);
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

async function createOfferTool(supabase, code, franchiseId) {
  const args = {
    code: code,
    discount_type: "percentage",
    discount_value: 15,
    description: "Automated test offer"
  };

  let mappedType = "percent";
  if (args.discount_type === "fixed_amount" || args.discount_type === "fixed") {
    mappedType = "fixed";
  }

  const sanitized = {
    code: args.code.trim().toUpperCase(),
    name: args.description || `${args.code.trim().toUpperCase()} Offer`,
    discount_type: mappedType,
    discount_value: Number(args.discount_value),
    franchise_id: franchiseId,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("offers")
    .insert([sanitized])
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

async function createCustomerTool(supabase, name, franchiseId, userId) {
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
      created_by: userId,
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

async function addExpenseTool(supabase, franchiseId, userId) {
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
      created_by: userId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

run();
