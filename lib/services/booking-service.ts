import { supabase } from "@/lib/supabase"
import type { Quote, Booking } from "@/lib/types"

export class BookingService {
  static async createInvoiceFromBooking(booking: any, customer: any): Promise<string> {
    try {
      console.log("Creating invoice from booking:", booking.id)

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      // Calculate due date (15 days from issue date)
      const issueDate = new Date()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 15)

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_name: customer.name || booking.customer_name || "Unknown Customer",
          customer_email: customer.email || booking.customer_email || "",
          customer_phone: customer.phone || booking.customer_phone || "",
          customer_address: customer.address || booking.customer_address || "",
          issue_date: issueDate.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          subtotal_amount: booking.total_amount - (booking.tax_amount || 0),
          tax_amount: booking.tax_amount || 0,
          discount_amount: booking.discount_amount || 0,
          total_amount: booking.total_amount,
          paid_amount: booking.amount_paid || 0,
          balance_amount: booking.pending_amount || booking.total_amount,
          status: booking.amount_paid >= booking.total_amount ? "paid" : "sent",
          notes: `Generated from booking ${booking.booking_number}`,
          terms_conditions: "Payment due within 15 days. Late payment charges applicable.",
        })
        .select()
        .single()

      if (invoiceError) {
        console.error("Error creating invoice:", invoiceError)
        throw new Error("Failed to create invoice")
      }

      // Create invoice items from booking items
      if (booking.booking_items && booking.booking_items.length > 0) {
        const invoiceItems = booking.booking_items.map((item: any) => ({
          invoice_id: invoice.id,
          item_name: item.products?.name || item.product_name || "Unknown Item",
          description: `${item.products?.product_code || ""} - Quantity: ${item.quantity}`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.total_price,
        }))

        const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

        if (itemsError) {
          console.error("Error creating invoice items:", itemsError)
          throw new Error("Failed to create invoice items")
        }
      }

      // Update booking to mark invoice as generated
      await supabase.from("bookings").update({ invoice_generated: true }).eq("id", booking.id)

      console.log("Invoice created successfully:", invoice.id)
      return invoice.id
    } catch (error) {
      console.error("Error creating invoice from booking:", error)
      throw error
    }
  }

  static async createFromQuote(quote: Quote): Promise<string> {
    try {
      console.log("Converting quote to booking:", quote.id)

      let customerId = quote.customer_id

      if (!customerId && quote.customer_name) {
        // Create or find customer using quote customer details
        const customerData = {
          name: quote.customer_name,
          phone: quote.customer_phone || "",
          whatsapp: quote.customer_whatsapp,
          email: quote.customer_email,
          address: quote.customer_address,
          city: quote.customer_city,
          pincode: quote.customer_pincode,
          state: quote.customer_state,
          franchise_id: quote.franchise_id || "",
          credit_limit: 0,
          outstanding_balance: 0,
        }

        // Try to find existing customer by phone or email
        let existingCustomer = null
        if (quote.customer_phone) {
          let customerQuery = supabase.from("customers").select("id").eq("phone", quote.customer_phone)
          if (quote.franchise_id) {
            customerQuery = customerQuery.eq("franchise_id", quote.franchise_id)
          }
          const { data } = await customerQuery.single()
          existingCustomer = data
        }

        if (!existingCustomer && quote.customer_email) {
          let customerQuery = supabase.from("customers").select("id").eq("email", quote.customer_email)
          if (quote.franchise_id) {
            customerQuery = customerQuery.eq("franchise_id", quote.franchise_id)
          }
          const { data } = await customerQuery.single()
          existingCustomer = data
        }

        if (existingCustomer) {
          customerId = existingCustomer.id
          console.log("Found existing customer:", customerId)
        } else {
          // Generate customer code
          const { data: customerCode, error: codeError } = await supabase.rpc("generate_customer_code")
          if (codeError) {
            console.error("Error generating customer code:", codeError)
            throw new Error("Failed to generate customer code")
          }

          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({ ...customerData, customer_code: customerCode })
            .select("id")
            .single()

          if (customerError) {
            console.error("Error creating customer:", customerError)
            throw new Error("Failed to create customer")
          }

          customerId = newCustomer.id
          console.log("Created new customer:", customerId)
        }
      }

      if (!customerId) {
        throw new Error("Unable to determine customer for booking")
      }

      let franchiseId = quote.franchise_id
      if (!franchiseId) {
        throw new Error("Quote is missing franchise context. Please refresh the quote and try again.")
      }

      let createdBy = quote.created_by
      if (!createdBy) {
        // Try to get current user from auth
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          createdBy = user.id
        } else {
          throw new Error("Unable to determine authenticated user for booking creation")
        }
      }

      // Generate booking number
      const { data: bookingNumber, error: numberError } = await supabase.rpc("generate_booking_number")
      if (numberError) {
        console.error("Error generating booking number:", numberError)
        throw new Error("Failed to generate booking number")
      }

      // Determine if quote has selectable items
      const validQuoteItemsPre = (quote as any).quote_items?.filter((item: any) => item && item.product_id) || []

      // Create booking data from quote
      const bookingData = {
        booking_number: bookingNumber,
        customer_id: customerId,
        franchise_id: franchiseId,
        event_type: quote.event_type,
        event_date: quote.event_date,
        delivery_date: quote.delivery_date,
        return_date: quote.return_date,
        venue_name: quote.venue_name,
        venue_address: quote.venue_address,
        groom_name: quote.groom_name,
        bride_name: quote.bride_name,
        event_for: quote.event_for,
        total_amount: quote.total_amount,
        tax_amount: quote.tax_amount,
        discount_amount: quote.discount_amount,
        security_deposit: quote.security_deposit,
        special_instructions: quote.special_instructions,
  notes: `Converted from quote ${quote.quote_number}`,
  // If no items present on quote, mark as pending_selection to let user pick products
  status: validQuoteItemsPre.length > 0 ? "confirmed" : "pending_selection",
        type: quote.type || "rental",
        payment_type: "full",
        amount_paid: 0,
        pending_amount: quote.total_amount,
        created_by: createdBy, // Use resolved created_by value
        priority: 1,
        invoice_generated: false,
        whatsapp_sent: false,
        sales_closed_by_id: (quote as any).sales_closed_by_id || (quote as any).sales_closed_by || null,
      }

      // Insert booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select()
        .single()

      if (bookingError) {
        console.error("Error creating booking:", bookingError)
        throw new Error("Failed to create booking")
      }

      console.log("Created booking:", booking.id)

      // Create booking items from quote items
      if (quote.quote_items && quote.quote_items.length > 0) {
        const validQuoteItems = quote.quote_items.filter((item) => {
          if (!item.product_id) {
            console.warn(`Quote item ${item.id} missing product_id, skipping...`)
            return false
          }
          return true
        })

        if (validQuoteItems.length === 0) {
          console.warn("No valid quote items with product_id found")
        } else {
          const bookingItems = validQuoteItems.map((item) => ({
            booking_id: booking.id,
            product_id: item.product_id, // Now guaranteed to be non-null
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            security_deposit: item.security_deposit || 0,
            discount_percent: 0,
            condition_on_delivery: null,
            condition_on_return: null,
            cleaning_required: false,
            damage_cost: 0,
          }))

          const { error: itemsError } = await supabase.from("booking_items").insert(bookingItems)

          if (itemsError) {
            console.error("Error creating booking items:", itemsError)
            throw new Error("Failed to create booking items")
          }

          console.log("Created booking items:", bookingItems.length)
        }
      }

      try {
        // Get customer details for invoice
        const { data: customer } = await supabase.from("customers").select("*").eq("id", customerId).single()

        // Get booking with items for invoice creation
        const { data: bookingWithItems } = await supabase
          .from("bookings")
          .select(`
            *,
            booking_items(*, products(name, product_code))
          `)
          .eq("id", booking.id)
          .eq("franchise_id", franchiseId)
          .single()

        if (bookingWithItems && customer) {
          await this.createInvoiceFromBooking(bookingWithItems, customer)
          console.log("Invoice created automatically for booking")
        }
      } catch (invoiceError) {
        console.error("Error creating invoice for booking:", invoiceError)
        // Don't fail the booking creation if invoice creation fails
      }

      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          customer_id: customerId,
          converted_to_booking_id: booking.id,
          converted_at: new Date().toISOString(),
        })
        .eq("id", quote.id)

      if (updateError) {
        console.error("Error updating quote:", updateError)
        throw new Error("Failed to update quote")
      }

      console.log("Quote converted successfully")
      return booking.id
    } catch (error) {
      console.error("Error converting quote to booking:", error)
      throw error
    }
  }

  static async getAll(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          customers (
            name,
            phone,
            email
          ),
          booking_items (
            *,
            products (
              name,
              product_code
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching bookings:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Error in getAll:", error)
      throw error
    }
  }
}
