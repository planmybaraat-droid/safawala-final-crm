import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const supabase = createClient()
    const user = auth.user!
    const { quote_id, booking_type } = await request.json()

    console.log("[Convert Quote] Starting conversion:", { quote_id, booking_type })

    if (!quote_id) {
      return NextResponse.json(
        { error: "Quote ID is required" },
        { status: 400 }
      )
    }

    // Determine which table to query based on booking_type
    const tableName = booking_type === "package" ? "package_bookings" : "product_orders"

    // Fetch the quote
    let quoteQuery = supabase
      .from(tableName)
      .select("*")
      .eq("id", quote_id)
      .eq("is_quote", true)

    if (!user.is_super_admin && user.franchise_id) {
      quoteQuery = quoteQuery.eq("franchise_id", user.franchise_id)
    }

    const { data: quote, error: quoteError } = await quoteQuery.single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    // Check if quote is already converted (status is not 'quote')
    if (quote.status !== "generated" && quote.status !== "quote" && quote.status !== "sent" && quote.status !== "accepted") {
      return NextResponse.json(
        { error: "Quote has already been converted or has invalid status" },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, quote.franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    // Convert the quote to a booking by:
    // 1. Creating a NEW booking entry (duplicate of quote)
    // 2. Marking the original quote as 'converted' (keeps it visible in quotes)
    
    // First, update the quote status to 'converted'
    const { error: quoteUpdateError } = await supabase
      .from(tableName)
      .update({
        status: "converted",
        updated_at: new Date().toISOString()
      })
      .eq("id", quote_id)
      .eq("franchise_id", quote.franchise_id)

    if (quoteUpdateError) {
      console.error("Error updating quote status:", quoteUpdateError)
      throw new Error("Failed to update quote status")
    }

    // Second, create a NEW booking entry (duplicate ALL data from quote)
    // Generate new unique order/package number
    const timestamp = Date.now()
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const newBookingNumber = tableName === "package_bookings" 
      ? `PKG-${timestamp}${randomSuffix}`
      : `BO-${timestamp}${randomSuffix}`
    
    // Copy ALL fields from quote except id, created_at, updated_at, and number fields
    const bookingData: any = {
      ...quote, // Copy ALL quote data
      id: undefined, // Remove ID to create new record
      is_quote: false, // This is a booking, not a quote
      status: "confirmed", // Customer already confirmed, skip pending_payment
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Set the appropriate number field based on table type
    if (tableName === "package_bookings") {
      bookingData.package_number = newBookingNumber
    } else {
      bookingData.order_number = newBookingNumber
    }

    // Add package-specific fields if it's a package booking
    if (booking_type === "package") {
      bookingData.package_id = quote.package_id
      bookingData.variant_id = quote.variant_id
    }

    // Add sales staff if present
    if (quote.sales_closed_by_id) {
      bookingData.sales_closed_by_id = quote.sales_closed_by_id
    }

    const { data: newBooking, error: createError } = await supabase
      .from(tableName)
      .insert(bookingData)
      .select()
      .single()

    if (createError) {
      console.error("Error creating booking:", createError)
      console.error("Booking data:", bookingData)
      throw new Error(`Failed to create booking from quote: ${createError.message}`)
    }

    // If product order, duplicate the order items for the new booking
    if (booking_type !== "package" && newBooking) {
      const { data: quoteItems, error: itemsFetchError } = await supabase
        .from("product_order_items")
        .select("*")
        .eq("order_id", quote_id)

      if (!itemsFetchError && quoteItems && quoteItems.length > 0) {
        const newItems = quoteItems.map(item => ({
          ...item,
          id: undefined, // Remove ID to create new records
          order_id: newBooking.id // Link to new booking
        }))

        await supabase
          .from("product_order_items")
          .insert(newItems)
      }
    }

    // For product orders, update inventory (reduce stock)
    if (booking_type !== "package" && newBooking) {
      // Fetch the NEW booking's product order items
      const { data: items, error: itemsError } = await supabase
        .from("product_order_items")
        .select("*, product:products(id, name, total_quantity)")
        .eq("order_id", newBooking.id)

      if (!itemsError && items && items.length > 0) {
        for (const item of items) {
          if (item.product) {
            const newQuantity = (item.product.total_quantity || 0) - item.quantity
            
            // Update product stock
            await supabase
              .from("products")
              .update({ total_quantity: newQuantity })
              .eq("id", item.product_id)
              .eq("franchise_id", newBooking.franchise_id)
          }
        }
      }
    }

    // Create invoice for the new booking
    let invoiceId = null
    let invoiceNumber = null
    
    try {
      // Generate invoice number
      invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      // Calculate due date (15 days from now)
      const issueDate = new Date()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 15)

      // Fetch customer details
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", newBooking.customer_id)
        .eq("franchise_id", newBooking.franchise_id)
        .single()

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: newBooking.customer_id,
          customer_name: customer?.name || newBooking.customer_name || quote.customer_name || "Unknown Customer",
          customer_email: customer?.email || newBooking.customer_email || quote.customer_email || "",
          customer_phone: customer?.phone || newBooking.customer_phone || quote.customer_phone || "",
          customer_address: customer?.address || newBooking.customer_address || quote.customer_address || "",
          franchise_id: newBooking.franchise_id,
          issue_date: issueDate.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          subtotal_amount: (newBooking.subtotal_amount || newBooking.total_amount) - (newBooking.tax_amount || 0),
          tax_amount: newBooking.tax_amount || 0,
          discount_amount: newBooking.discount_amount || 0,
          total_amount: newBooking.total_amount,
          paid_amount: newBooking.amount_paid || 0,
          balance_amount: newBooking.pending_amount || newBooking.total_amount,
          status: (newBooking.amount_paid || 0) >= newBooking.total_amount ? "paid" : "unpaid",
          notes: `Auto-generated from quote ${quote.quote_number || quote.order_number || quote.package_number}`,
          terms_conditions: "Payment due within 15 days.",
        })
        .select()
        .single()

      if (invoiceError) {
        console.error("Error creating invoice:", invoiceError)
      } else if (invoice) {
        invoiceId = invoice.id

        // Create invoice items from booking items
        if (booking_type !== "package") {
          // For product orders, get items
          const { data: bookingItems } = await supabase
            .from("product_order_items")
            .select("*, product:products(name, product_code)")
            .eq("order_id", newBooking.id)

          if (bookingItems && bookingItems.length > 0) {
            const invoiceItems = bookingItems.map((item: any) => ({
              invoice_id: invoice.id,
              item_name: item.product?.name || item.product_name || "Unknown Item",
              description: `${item.product?.product_code || ""} - Quantity: ${item.quantity}`,
              quantity: item.quantity,
              unit_price: item.unit_price || item.price || 0,
              line_total: item.total_price || (item.quantity * (item.unit_price || item.price || 0)),
            }))

            await supabase.from("invoice_items").insert(invoiceItems)
          }
        } else {
          // For package bookings, create a single line item
          await supabase.from("invoice_items").insert({
            invoice_id: invoice.id,
            item_name: `Package Booking: ${newBooking.package_number}`,
            description: `Event: ${newBooking.event_type || "Wedding"} on ${newBooking.event_date || "TBD"}`,
            quantity: 1,
            unit_price: newBooking.total_amount,
            line_total: newBooking.total_amount,
          })
        }

        console.log("Invoice created successfully:", invoiceNumber)
      }
    } catch (invoiceCreationError) {
      console.error("Error creating invoice (non-critical):", invoiceCreationError)
      // Don't fail the conversion if invoice creation fails
    }

    return NextResponse.json({
      success: true,
      booking_id: newBooking?.id,
      booking_number: tableName === "package_bookings" ? newBooking?.package_number : newBooking?.order_number,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      message: invoiceNumber 
        ? `Quote converted to booking and invoice ${invoiceNumber} created`
        : "Quote successfully converted to booking"
    })

  } catch (error: any) {
    console.error("[Convert Quote] Error in convert API:", error)
    console.error("[Convert Quote] Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
