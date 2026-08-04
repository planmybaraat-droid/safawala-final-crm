/**
 * WhatsApp Notification Triggers
 * Call these functions when business events occur
 */

import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import {
  sendBookingConfirmation,
  sendPaymentReceived,
  sendDeliveryReminder,
  sendReturnReminder,
  sendPaymentReminder,
  sendBookingCancelled,
  sendBookingStatusUpdate,
  sendDirectSaleConfirmation,
  sendReviewRequest,
  sendLeadWelcome,
} from "@/lib/services/wati-service"
import { format, differenceInDays } from "date-fns"

interface NotificationSettings {
  booking_confirmation: boolean
  payment_received: boolean
  delivery_reminder: boolean
  return_reminder: boolean
  invoice_sent: boolean
  delivery_reminder_hours: number
  return_reminder_hours: number
  business_hours_only: boolean
  business_start_time: string
  business_end_time: string
}

/**
 * Get notification settings for a franchise
 */
async function getNotificationSettings(franchiseId: string): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await supabase
      .from("whatsapp_notification_settings")
      .select("*")
      .eq("franchise_id", franchiseId)
      .single()

    if (error || !data) {
      // Return defaults if no settings exist
      return {
        booking_confirmation: true,
        payment_received: true,
        delivery_reminder: true,
        return_reminder: true,
        invoice_sent: true,
        delivery_reminder_hours: 24,
        return_reminder_hours: 24,
        business_hours_only: true,
        business_start_time: "09:00:00",
        business_end_time: "18:00:00",
      }
    }

    return data as NotificationSettings
  } catch (error) {
    console.error("[WhatsApp Triggers] Error fetching settings:", error)
    return null
  }
}

/**
 * Check if we're within business hours
 */
function isWithinBusinessHours(settings: NotificationSettings): boolean {
  if (!settings.business_hours_only) return true

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const [startHour, startMinute] = settings.business_start_time.split(":").map(Number)
  const [endHour, endMinute] = settings.business_end_time.split(":").map(Number)

  const startTime = startHour * 60 + startMinute
  const endTime = endHour * 60 + endMinute

  return currentTime >= startTime && currentTime <= endTime
}

/**
 * Helper to fetch complete booking/order/sale details dynamically
 */
async function fetchBookingDetails(bookingId: string) {
  // 1. Try package_bookings first
  const { data: pkgBooking } = await supabase
    .from("package_bookings")
    .select(`*, customer:customers(*)`)
    .eq("id", bookingId)
    .maybeSingle()

  if (pkgBooking) {
    // 1. Fetch package booking items
    const { data: bookingItems } = await supabase
      .from("package_booking_items")
      .select("variant_name, variant_inclusions, reserved_products")
      .eq("booking_id", bookingId)
    
    // 2. Fetch selected products from database
    const { data: productItems } = await supabase
      .from("package_booking_product_items")
      .select(`
        quantity,
        products ( name, category )
      `)
      .eq("package_booking_id", bookingId)

    let itemsSummary = "Wedding Accessories"
    if (bookingItems && bookingItems.length > 0) {
      itemsSummary = bookingItems.map((item: any) => {
        const inclusionsStr = Array.isArray(item.variant_inclusions)
          ? item.variant_inclusions.join(", ")
          : (typeof item.variant_inclusions === "string" ? item.variant_inclusions : "")

        let productsStr = ""
        const reserved = Array.isArray(item.reserved_products)
          ? item.reserved_products
          : (typeof item.reserved_products === "string" ? JSON.parse(item.reserved_products) : [])
        if (reserved.length > 0) {
          productsStr = reserved.map((p: any) => `${p.name} x${p.qty || p.quantity || 1}`).join(", ")
        } else if (productItems && productItems.length > 0) {
          productsStr = productItems.map((p: any) => `${p.products?.name || p.products?.category || "Item"} x${p.quantity}`).join(", ")
        }

        let summary = `${item.variant_name || "Package Item"}`
        const details: string[] = []
        if (inclusionsStr) {
          details.push(`Inclusions: ${inclusionsStr}`)
        }
        if (productsStr) {
          details.push(`Products: ${productsStr}`)
        }
        if (details.length > 0) {
          summary += ` (${details.join("; ")})`
        }
        return summary
      }).join(", ")
    }

    if (itemsSummary.length > 900) {
      itemsSummary = itemsSummary.slice(0, 900) + "..."
    }

    return {
      bookingId: pkgBooking.id,
      bookingNumber: pkgBooking.package_number,
      customerPhone: pkgBooking.customer?.whatsapp || pkgBooking.customer?.phone,
      customerName: pkgBooking.customer?.name || "Customer",
      eventDate: pkgBooking.event_date,
      eventTime: pkgBooking.event_time,
      venueName: pkgBooking.venue_name || pkgBooking.venue_address || "TBD",
      totalAmount: Number(pkgBooking.total_amount) || 0,
      amountPaid: Number(pkgBooking.amount_paid) || 0,
      paymentStatus: (pkgBooking.amount_paid >= pkgBooking.total_amount) ? "Paid" : (pkgBooking.amount_paid > 0 ? "Advance Paid" : "Pending"),
      itemsSummary,
      type: "package_booking" as const
    }
  }

  // 2. Try product_orders
  const { data: prodOrder } = await supabase
    .from("product_orders")
    .select(`*, customer:customers(*)`)
    .eq("id", bookingId)
    .maybeSingle()

  if (prodOrder) {
    // Fetch items
    const { data: items } = await supabase
      .from("product_order_items")
      .select(`quantity, product_name, products ( name, category )`)
      .eq("order_id", bookingId)

    const finalItems = (items || []).map((it: any) => ({
      product_name: it.product_name || it.products?.name || it.products?.category || "Item",
      quantity: it.quantity
    }))

    let itemsSummary = "Wedding Accessories"
    if (prodOrder.package_id) {
      const { data: pkgSet } = await supabase.from("package_sets").select("name").eq("id", prodOrder.package_id).maybeSingle()
      const { data: pkgVar } = await supabase.from("package_variants").select("name, inclusions").eq("id", prodOrder.variant_id).maybeSingle()
      
      const pkgName = `${pkgSet?.name || "Package"} - ${pkgVar?.name || "Variant"}`
      const inclusionsStr = pkgVar?.inclusions ? (Array.isArray(pkgVar.inclusions) ? pkgVar.inclusions.join(", ") : String(pkgVar.inclusions)) : ""
      
      const productsStr = finalItems.map((i: any) => `${i.product_name || "Item"} x${i.quantity || 1}`).join(", ")
      
      let summary = pkgName
      const details: string[] = []
      if (inclusionsStr) {
        details.push(`Inclusions: ${inclusionsStr}`)
      }
      if (productsStr) {
        details.push(`Products: ${productsStr}`)
      }
      if (details.length > 0) {
        summary += ` (${details.join("; ")})`
      }
      itemsSummary = summary
    } else {
      if (finalItems.length > 0) {
        itemsSummary = finalItems.map((it: any) => `${it.product_name || "Item"} x${it.quantity}`).join(", ")
      }
    }

    if (itemsSummary.length > 900) {
      itemsSummary = itemsSummary.slice(0, 900) + "..."
    }

    return {
      bookingId: prodOrder.id,
      bookingNumber: prodOrder.order_number,
      customerPhone: prodOrder.customer?.whatsapp || prodOrder.customer?.phone,
      customerName: prodOrder.customer?.name || "Customer",
      eventDate: prodOrder.event_date,
      eventTime: prodOrder.event_time || "10:00",
      venueName: prodOrder.venue_address || "TBD",
      totalAmount: Number(prodOrder.total_amount) || 0,
      amountPaid: Number(prodOrder.amount_paid) || 0,
      paymentStatus: (prodOrder.amount_paid >= prodOrder.total_amount) ? "Paid" : (prodOrder.amount_paid > 0 ? "Advance Paid" : "Pending"),
      itemsSummary,
      type: "product_order" as const
    }
  }

  // 3. Try direct_sales_orders
  const { data: directSale } = await supabase
    .from("direct_sales_orders")
    .select(`*, customer:customers(*)`)
    .eq("id", bookingId)
    .maybeSingle()

  if (directSale) {
    let itemsSummary = "Direct Sale"
    const { data: items } = await supabase
      .from("direct_sales_items")
      .select("product_name, quantity")
      .eq("sale_id", bookingId)
    if (items && items.length > 0) {
      itemsSummary = items.map(it => `${it.product_name || 'Item'} (x${it.quantity})`).join(", ")
    }

    return {
      bookingId: directSale.id,
      bookingNumber: directSale.sale_number,
      customerPhone: directSale.customer?.whatsapp || directSale.customer?.phone,
      customerName: directSale.customer?.name || "Customer",
      eventDate: directSale.sale_date || directSale.created_at,
      eventTime: "10:00",
      venueName: directSale.venue_address || "TBD",
      totalAmount: Number(directSale.total_amount) || 0,
      amountPaid: Number(directSale.amount_paid) || 0,
      paymentStatus: (directSale.amount_paid >= directSale.total_amount) ? "Paid" : (directSale.amount_paid > 0 ? "Advance Paid" : "Pending"),
      itemsSummary,
      type: "direct_sale" as const
    }
  }

  return null
}

/**
 * Trigger: New booking created
 */
export async function onBookingCreated(params: {
  bookingId: string
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.booking_confirmation) {
      return { sent: false, error: "Booking confirmation notifications disabled" }
    }

    if (!isWithinBusinessHours(settings)) {
      console.log("[WhatsApp Triggers] Outside business hours, skipping notification")
      return { sent: false, error: "Outside business hours" }
    }

    const booking = await fetchBookingDetails(params.bookingId)
    if (!booking) {
      return { sent: false, error: "Booking details not found in database" }
    }

    if (!booking.customerPhone) {
      return { sent: false, error: "Customer phone number not available" }
    }

    const result = booking.type === "direct_sale"
      ? await sendDirectSaleConfirmation({
          phone: booking.customerPhone,
          customerName: booking.customerName,
          saleNumber: booking.bookingNumber,
          saleDate: booking.eventDate ? format(new Date(booking.eventDate), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy"),
          totalAmount: booking.totalAmount,
        })
      : await sendBookingConfirmation({
          phone: booking.customerPhone,
          customerName: booking.customerName,
          bookingNumber: booking.bookingNumber,
          eventDate: booking.eventDate ? format(new Date(booking.eventDate), "dd MMM yyyy") : "TBD",
          eventTime: booking.eventTime || "TBD",
          venueName: booking.venueName,
          itemsSummary: booking.itemsSummary,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
        })

    // Update message with booking reference
    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onBookingCreated error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Trigger: Booking status updated
 */
export async function onBookingStatusChange(params: {
  bookingId: string
  newStatus: string
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    // Map dashboard toggles to triggers
    if (!settings?.booking_confirmation) {
      return { sent: false, error: "Booking update notifications disabled" }
    }

    if (!isWithinBusinessHours(settings)) {
      return { sent: false, error: "Outside business hours" }
    }

    const booking = await fetchBookingDetails(params.bookingId)
    if (!booking) {
      return { sent: false, error: "Booking details not found in database" }
    }

    if (!booking.customerPhone) {
      return { sent: false, error: "Customer phone number not available" }
    }

    // Friendly status labels
    const statusLabels: Record<string, string> = {
      pending_payment: "Pending Payment",
      pending_selection: "Pending Item Selection",
      confirmed: "Confirmed",
      delivered: "Delivered",
      returned: "Returned / Completed",
      order_complete: "Order Completed",
      cancelled: "Cancelled",
      quote: "Quote Generated"
    }

    const friendlyStatus = statusLabels[params.newStatus] || params.newStatus.replace(/_/g, " ")

    let result
    if (params.newStatus === "returned" || params.newStatus === "order_complete") {
      result = await sendReviewRequest({
        phone: booking.customerPhone,
        customerName: booking.customerName,
      })
    } else {
      result = await sendBookingStatusUpdate({
        phone: booking.customerPhone,
        customerName: booking.customerName,
        bookingNumber: booking.bookingNumber,
        newStatus: friendlyStatus.toUpperCase(),
        updatedDate: format(new Date(), "dd MMM yyyy HH:mm"),
        nextAction: params.newStatus === 'confirmed' ? "Preparing accessories for handover" : "Contact store for any questions"
      })
    }

    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onBookingStatusChange error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Trigger: Booking cancelled
 */
export async function onBookingCancelled(params: {
  bookingId: string
  reason?: string
  refundAmount?: number
  refundStatus?: string
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.booking_confirmation) {
      return { sent: false, error: "Cancellation alerts disabled" }
    }

    const booking = await fetchBookingDetails(params.bookingId)
    if (!booking) {
      return { sent: false, error: "Booking details not found in database" }
    }

    if (!booking.customerPhone) {
      return { sent: false, error: "Customer phone number not available" }
    }

    const result = await sendBookingCancelled({
      phone: booking.customerPhone,
      customerName: booking.customerName,
      bookingNumber: booking.bookingNumber,
      cancellationDate: format(new Date(), "dd MMM yyyy"),
      reason: params.reason || "Order cancelled as requested",
      refundAmount: params.refundAmount || 0,
      refundStatus: params.refundStatus || "N/A"
    })

    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onBookingCancelled error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Trigger: Payment received
 */
export async function onPaymentReceived(params: {
  bookingId: string
  amountPaid: number
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.payment_received) {
      return { sent: false, error: "Payment notifications disabled" }
    }

    if (!isWithinBusinessHours(settings)) {
      return { sent: false, error: "Outside business hours" }
    }

    const booking = await fetchBookingDetails(params.bookingId)
    if (!booking) {
      return { sent: false, error: "Booking details not found in database" }
    }

    if (!booking.customerPhone) {
      return { sent: false, error: "Customer phone number not available" }
    }

    const remainingBalance = Math.max(0, booking.totalAmount - booking.amountPaid)

    const result = await sendPaymentReceived({
      phone: booking.customerPhone,
      customerName: booking.customerName,
      bookingNumber: booking.bookingNumber,
      amountPaid: params.amountPaid,
      remainingBalance: remainingBalance,
    })

    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onPaymentReceived error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Trigger: Delivery upcoming (called by cron job)
 */
export async function onDeliveryUpcoming(params: {
  bookingId: string
  bookingNumber: string
  customerPhone: string
  customerName: string
  deliveryDate: string
  deliveryTime: string
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.delivery_reminder) {
      return { sent: false, error: "Delivery reminder notifications disabled" }
    }

    const result = await sendDeliveryReminder({
      phone: params.customerPhone,
      customerName: params.customerName,
      bookingNumber: params.bookingNumber,
      deliveryDate: format(new Date(params.deliveryDate), "dd MMM yyyy"),
      deliveryTime: params.deliveryTime,
    })

    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onDeliveryUpcoming error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Trigger: Return due (called by cron job)
 */
export async function onReturnDue(params: {
  bookingId: string
  bookingNumber: string
  customerPhone: string
  customerName: string
  returnDate: string
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.return_reminder) {
      return { sent: false, error: "Return reminder notifications disabled" }
    }

    const result = await sendReturnReminder({
      phone: params.customerPhone,
      customerName: params.customerName,
      bookingNumber: params.bookingNumber,
      returnDate: format(new Date(params.returnDate), "dd MMM yyyy"),
    })

    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onReturnDue error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Trigger: Invoice/Order created — auto-send invoice on WhatsApp
 */
export async function onInvoiceCreated(params: {
  orderId: string
  orderType: "product_order" | "package_booking" | "direct_sale"
  orderNumber?: string
  customerPhone?: string
  customerName?: string
  totalAmount?: number
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.invoice_sent) {
      return { sent: false, error: "Invoice WhatsApp notifications disabled" }
    }

    if (!isWithinBusinessHours(settings)) {
      console.log("[WhatsApp Triggers] Outside business hours, skipping invoice notification")
      return { sent: false, error: "Outside business hours" }
    }

    // Call the server-side internal function directly to bypass cookie auth issues
    const { sendInvoicePDFAndWhatsAppInternal } = await import("@/app/api/whatsapp/send-invoice/route")
    const result = await sendInvoicePDFAndWhatsAppInternal({
      orderId: params.orderId,
      orderType: params.orderType,
      franchiseId: params.franchiseId,
    })

    return { sent: result.success }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onInvoiceCreated error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Process delivery reminders for bookings due tomorrow
 */
export async function processDeliveryReminders(): Promise<{ processed: number; sent: number; errors: string[] }> {
  const errors: string[] = []
  let processed = 0
  let sent = 0

  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd")

    // Get bookings with delivery tomorrow
    const { data: bookings, error } = await supabase
      .from("package_bookings")
      .select(`
        id, package_number, delivery_date, delivery_time, franchise_id,
        customer:customers(name, phone)
      `)
      .eq("delivery_date", tomorrowStr)
      .eq("is_archived", false)
      .is("delivery_reminder_sent", null)

    if (error) {
      console.error("[WhatsApp Triggers] Error fetching bookings:", error)
      return { processed: 0, sent: 0, errors: [error.message] }
    }

    for (const booking of bookings || []) {
      processed++
      
      if (!booking.customer?.phone) {
        errors.push(`${booking.package_number}: No phone number`)
        continue
      }

      const result = await onDeliveryUpcoming({
        bookingId: booking.id,
        bookingNumber: booking.package_number,
        customerPhone: booking.customer.phone,
        customerName: booking.customer.name || "Customer",
        deliveryDate: booking.delivery_date,
        deliveryTime: booking.delivery_time || "As scheduled",
        franchiseId: booking.franchise_id,
      })

      if (result.sent) {
        sent++
        // Mark as sent
        await supabase.from("package_bookings")
          .update({ delivery_reminder_sent: new Date().toISOString() })
          .eq("id", booking.id)
      } else {
        errors.push(`${booking.package_number}: ${result.error}`)
      }
    }
  } catch (error: any) {
    errors.push(error.message)
  }

  return { processed, sent, errors }
}

/**
 * Trigger: Payment reminder due (called by cron job)
 */
export async function onPaymentReminderDue(params: {
  bookingId: string
  bookingNumber: string
  customerPhone: string
  customerName: string
  pendingAmount: number
  eventDate: string
  daysUntilEvent: number
  franchiseId: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const settings = await getNotificationSettings(params.franchiseId)
    if (!settings?.payment_reminder) {
      return { sent: false, error: "Payment reminder notifications disabled" }
    }

    const result = await sendPaymentReminder({
      phone: params.customerPhone,
      customerName: params.customerName,
      bookingNumber: params.bookingNumber,
      pendingAmount: params.pendingAmount,
      eventDate: format(new Date(params.eventDate), "dd MMM yyyy"),
      daysUntilEvent: params.daysUntilEvent,
    })

    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ booking_id: params.bookingId, franchise_id: params.franchiseId })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onPaymentReminderDue error:", error)
    return { sent: false, error: error.message }
  }
}

/**
 * Process payment reminders for bookings with pending payments
 * Sends daily reminders starting 10 days before event date
 */
export async function processPaymentReminders(): Promise<{ processed: number; sent: number; errors: string[] }> {
  const errors: string[] = []
  let processed = 0
  let sent = 0

  try {
    const today = new Date()
    const todayStr = format(today, "yyyy-MM-dd")
    
    // Calculate the date 10 days from now
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 10)
    const maxDateStr = format(maxDate, "yyyy-MM-dd")

    // Get bookings with:
    // - Event date within next 10 days
    // - Pending amount > 0 (not fully paid)
    // - Not archived
    // - Not already sent payment reminder today
    const { data: bookings, error } = await supabase
      .from("package_bookings")
      .select(`
        id, package_number, event_date, total_amount, advance_amount, 
        pending_amount, franchise_id, payment_reminder_last_sent,
        customer:customers(name, phone)
      `)
      .gte("event_date", todayStr)
      .lte("event_date", maxDateStr)
      .gt("pending_amount", 0)
      .eq("is_archived", false)

    if (error) {
      console.error("[WhatsApp Triggers] Error fetching bookings for payment reminders:", error)
      return { processed: 0, sent: 0, errors: [error.message] }
    }

    for (const booking of bookings || []) {
      // Skip if already sent today
      if (booking.payment_reminder_last_sent) {
        const lastSentDate = format(new Date(booking.payment_reminder_last_sent), "yyyy-MM-dd")
        if (lastSentDate === todayStr) {
          continue
        }
      }

      processed++
      
      if (!booking.customer?.phone) {
        errors.push(`${booking.package_number}: No phone number`)
        continue
      }

      // Calculate days until event
      const eventDate = new Date(booking.event_date)
      const daysUntilEvent = differenceInDays(eventDate, today)

      const result = await onPaymentReminderDue({
        bookingId: booking.id,
        bookingNumber: booking.package_number,
        customerPhone: booking.customer.phone,
        customerName: booking.customer.name || "Customer",
        pendingAmount: booking.pending_amount || (booking.total_amount - (booking.advance_amount || 0)),
        eventDate: booking.event_date,
        daysUntilEvent,
        franchiseId: booking.franchise_id,
      })

      if (result.sent) {
        sent++
        // Mark last sent date
        await supabase.from("package_bookings")
          .update({ payment_reminder_last_sent: new Date().toISOString() })
          .eq("id", booking.id)
      } else {
        errors.push(`${booking.package_number}: ${result.error}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error: any) {
    errors.push(error.message)
  }

  return { processed, sent, errors }
}

/**
 * Process return reminders for bookings due tomorrow
 */
export async function processReturnReminders(): Promise<{ processed: number; sent: number; errors: string[] }> {
  const errors: string[] = []
  let processed = 0
  let sent = 0

  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd")

    // Get bookings with return tomorrow
    const { data: bookings, error } = await supabase
      .from("package_bookings")
      .select(`
        id, package_number, return_date, franchise_id,
        customer:customers(name, phone)
      `)
      .eq("return_date", tomorrowStr)
      .eq("is_archived", false)
      .is("return_reminder_sent", null)

    if (error) {
      console.error("[WhatsApp Triggers] Error fetching bookings:", error)
      return { processed: 0, sent: 0, errors: [error.message] }
    }

    for (const booking of bookings || []) {
      processed++
      
      if (!booking.customer?.phone) {
        errors.push(`${booking.package_number}: No phone number`)
        continue
      }

      const result = await onReturnDue({
        bookingId: booking.id,
        bookingNumber: booking.package_number,
        customerPhone: booking.customer.phone,
        customerName: booking.customer.name || "Customer",
        returnDate: booking.return_date,
        franchiseId: booking.franchise_id,
      })

      if (result.sent) {
        sent++
        // Mark as sent
        await supabase.from("package_bookings")
          .update({ return_reminder_sent: new Date().toISOString() })
          .eq("id", booking.id)
      } else {
        errors.push(`${booking.package_number}: ${result.error}`)
      }
    }
  } catch (error: any) {
    errors.push(error.message)
  }

  return { processed, sent, errors }
}

/**
 * Trigger: New Lead Created
 */
export async function onLeadCreated(params: {
  leadId: string
  franchiseId?: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    // 1. Fetch lead details
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.leadId)
      .single()

    if (error || !lead) {
      return { sent: false, error: "Lead not found in database" }
    }

    if (!lead.phone) {
      return { sent: false, error: "Lead has no phone number" }
    }

    // 2. Send welcome message
    const result = await sendLeadWelcome({
      phone: lead.phone,
      customerName: lead.name,
      packageName: lead.package_interest || undefined
    })

    // Update message log if needed
    if (result.success && result.messageId) {
      await supabase.from("whatsapp_messages")
        .update({ franchise_id: params.franchiseId || lead.franchise_id })
        .eq("wati_message_id", result.messageId)
    }

    return { sent: result.success, error: result.error }
  } catch (error: any) {
    console.error("[WhatsApp Triggers] onLeadCreated error:", error)
    return { sent: false, error: error.message }
  }
}
