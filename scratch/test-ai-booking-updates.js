const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  console.log("Starting automated verification of Booking & Update tools...");

  // Get franchise
  const { data: franchises } = await supabase.from("franchises").select("id").limit(1);
  const franchiseId = franchises?.[0]?.id;
  if (!franchiseId) {
    console.error("❌ Failed: No franchise found.");
    process.exit(1);
  }

  // Get user
  const { data: users } = await supabase.from("users").select("id").limit(1);
  const userId = users?.[0]?.id;
  if (!userId) {
    console.error("❌ Failed: No user found.");
    process.exit(1);
  }

  // Get customer belonging to this franchise
  const { data: customers } = await supabase.from("customers").select("id").eq("franchise_id", franchiseId).limit(1);
  let customerId = customers?.[0]?.id;
  let createdTestCustomer = false;

  if (!customerId) {
    console.log("No customer found for franchise. Creating a test customer...");
    const { data: newCust, error: custErr } = await supabase
      .from("customers")
      .insert({
        name: "Automated Booking Test Customer",
        phone: "9876543210",
        franchise_id: franchiseId
      })
      .select()
      .single();
    
    if (custErr) {
      console.error("❌ Failed: Could not create test customer:", custErr.message);
      process.exit(1);
    }
    customerId = newCust.id;
    createdTestCustomer = true;
    console.log(`Test customer created with ID: ${customerId}`);
  }

  // Get product with sufficient stock
  const { data: products } = await supabase
    .from("products")
    .select("id, name, rental_price, stock_quantity")
    .eq("is_active", true)
    .gte("stock_quantity", 2)
    .limit(1);

  let product;
  if (!products || products.length === 0) {
    console.log("No product with stock >= 2 found. Trying to find any active product and set its stock_quantity to 10...");
    const { data: anyProducts } = await supabase
      .from("products")
      .select("id, name, rental_price, stock_quantity")
      .eq("is_active", true)
      .limit(1);
    
    if (!anyProducts || anyProducts.length === 0) {
      console.error("❌ Failed: No active products found to test booking with.");
      process.exit(1);
    }
    
    product = anyProducts[0];
    const originalStock = product.stock_quantity || 0;
    console.log(`Setting stock of "${product.name}" (ID: ${product.id}) from ${originalStock} to 10 for testing...`);
    
    const { error: stockUpdateErr } = await supabase
      .from("products")
      .update({ stock_quantity: 10 })
      .eq("id", product.id);
      
    if (stockUpdateErr) {
      console.error("❌ Failed to set stock_quantity:", stockUpdateErr.message);
      process.exit(1);
    }
    
    // Schedule restoring stock at the end
    product.restoreStock = originalStock;
  } else {
    product = products[0];
  }
  console.log(`Using product for booking: ${product.name} (ID: ${product.id}, stock: ${product.stock_quantity})`);

  // Test Booking Creation
  console.log("\n1. Testing 'create_booking' via database RPC...");
  const eventDate = "2026-10-10";
  const venueName = "Verona Wedding Hall";
  const bookingItems = [{ product_id: product.id, quantity: 2 }];

  const { data: booking, error: bookingErr } = await supabase.rpc(
    "create_booking_with_conflict_check",
    {
      p_customer_id: customerId,
      p_event_date: eventDate,
      p_venue_name: venueName,
      p_franchise_id: franchiseId,
      p_created_by: userId,
      p_booking_data: {
        type: "rental",
        event_type: "wedding",
        payment_type: "advance",
        total_amount: 5000,
        subtotal: 5000,
        amount_paid: 0,
        pending_amount: 5000,
      },
      p_booking_items: bookingItems,
    }
  );

  if (bookingErr) {
    console.error("❌ create_booking failed:", bookingErr.message);
  } else {
    console.log("✅ create_booking success!");
    console.log("Booking created:", { id: booking.id, booking_number: booking.booking_number });
    
    // Test Booking Status Update
    console.log(`\n2. Testing 'update_booking_status' for booking ${booking.booking_number}...`);
    const { data: updatedBooking, error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: "delivered",
        amount_paid: 1500,
        pending_amount: Number(booking.total_amount || 5000) - 1500,
        updated_at: new Date().toISOString()
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateErr) {
      console.error("❌ update_booking_status failed:", updateErr.message);
    } else {
      console.log("✅ update_booking_status success!");
      console.log("Updated Booking details:", {
        id: updatedBooking.id,
        booking_number: updatedBooking.booking_number,
        status: updatedBooking.status,
        amount_paid: updatedBooking.amount_paid
      });
    }

    // Clean up created booking
    console.log("\nCleaning up created test booking...");
    // Delete booking items first
    await supabase.from("booking_items").delete().eq("booking_id", booking.id);
    await supabase.from("bookings").delete().eq("id", booking.id);
  }

  // Test Product Pricing Update
  console.log(`\n3. Testing 'update_product_pricing' on product: ${product.name}...`);
  const originalRentalPrice = product.rental_price;
  const newPrice = originalRentalPrice + 50;

  const { data: updatedProduct, error: prodUpdateErr } = await supabase
    .from("products")
    .update({
      rental_price: newPrice,
      updated_at: new Date().toISOString()
    })
    .eq("id", product.id)
    .select()
    .single();

  if (prodUpdateErr) {
    console.error("❌ update_product_pricing failed:", prodUpdateErr.message);
  } else {
    console.log("✅ update_product_pricing success!");
    console.log(`Updated product pricing from ₹${originalRentalPrice} to ₹${updatedProduct.rental_price}`);
    
    // Revert back
    await supabase.from("products").update({ rental_price: originalRentalPrice }).eq("id", product.id);
    console.log("Product pricing reverted back to original.");
  }

  console.log("\nVerification finished successfully!");
}

run();
