import { supabaseServer as supabase } from "./supabase-server-simple"

export interface NotificationData {
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  priority: "low" | "medium" | "high" | "urgent"
  user_id?: string
  franchise_id?: string
  action_url?: string
  metadata?: Record<string, any>
}

export class NotificationSystem {
  static async createNotification(data: NotificationData) {
    try {
      console.log("[v0] Creating notification:", data.title)

      const { data: notification, error } = await supabase
        .from("notifications")
        .insert({
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          user_id: data.user_id || null,
          franchise_id: data.franchise_id || null,
          action_url: data.action_url || null,
          metadata: data.metadata || {},
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error creating notification:", error)
        return null
      }

      console.log("[v0] Notification created successfully:", notification.id)
      return notification
    } catch (error) {
      console.error("[v0] Exception creating notification:", error)
      return null
    }
  }

  // Quote-related notifications
  static async notifyQuoteCreated(quoteData: any) {
    return this.createNotification({
      title: "📋 New Quote Generated",
      message: `Quote ${quoteData.quote_number} has been generated for ${quoteData.customer_name}`,
      type: "success",
      priority: "medium",
      user_id: quoteData.created_by,
      franchise_id: quoteData.franchise_id,
      action_url: `/quotes/${quoteData.id}`,
      metadata: { quote_id: quoteData.id, quote_number: quoteData.quote_number },
    })
  }

  static async notifyQuoteConverted(quoteData: any, bookingData: any) {
    return this.createNotification({
      title: "✅ Quote Converted to Booking",
      message: `Quote ${quoteData.quote_number} has been converted to booking ${bookingData.booking_number}`,
      type: "success",
      priority: "high",
      user_id: quoteData.created_by,
      franchise_id: quoteData.franchise_id,
      action_url: `/bookings/${bookingData.id}`,
      metadata: { quote_id: quoteData.id, booking_id: bookingData.id },
    })
  }

  // Booking-related notifications
  static async notifyBookingCreated(bookingData: any) {
    return this.createNotification({
      title: "🎉 New Booking Created",
      message: `Booking ${bookingData.booking_number} created for ${bookingData.customer_name || "customer"}`,
      type: "success",
      priority: "high",
      user_id: bookingData.created_by,
      franchise_id: bookingData.franchise_id,
      action_url: `/bookings/${bookingData.id}`,
      metadata: { booking_id: bookingData.id, booking_number: bookingData.booking_number },
    })
  }

  static async notifyBookingStatusChanged(bookingData: any, oldStatus: string, newStatus: string) {
    return this.createNotification({
      title: "📝 Booking Status Updated",
      message: `Booking ${bookingData.booking_number} status changed from ${oldStatus} to ${newStatus}`,
      type: "info",
      priority: "medium",
      franchise_id: bookingData.franchise_id,
      action_url: `/bookings/${bookingData.id}`,
      metadata: { booking_id: bookingData.id, old_status: oldStatus, new_status: newStatus },
    })
  }

  static async notifyDeliveryDue(bookingData: any) {
    return this.createNotification({
      title: "🚚 Delivery Due Today",
      message: `Booking ${bookingData.booking_number} is scheduled for delivery today`,
      type: "warning",
      priority: "high",
      franchise_id: bookingData.franchise_id,
      action_url: `/bookings/${bookingData.id}`,
      metadata: { booking_id: bookingData.id, delivery_date: bookingData.delivery_date },
    })
  }

  static async notifyReturnDue(bookingData: any) {
    return this.createNotification({
      title: "📦 Return Due Today",
      message: `Booking ${bookingData.booking_number} items are due for return today`,
      type: "warning",
      priority: "high",
      franchise_id: bookingData.franchise_id,
      action_url: `/bookings/${bookingData.id}`,
      metadata: { booking_id: bookingData.id, return_date: bookingData.return_date },
    })
  }

  // Payment-related notifications
  static async notifyPaymentReceived(paymentData: any) {
    return this.createNotification({
      title: "💰 Payment Received",
      message: `Payment of ₹${paymentData.amount} received for booking ${paymentData.booking_number}`,
      type: "success",
      priority: "medium",
      franchise_id: paymentData.franchise_id,
      action_url: `/payments/${paymentData.id}`,
      metadata: { payment_id: paymentData.id, amount: paymentData.amount },
    })
  }

  static async notifyPaymentOverdue(bookingData: any) {
    return this.createNotification({
      title: "⚠️ Payment Overdue",
      message: `Payment for booking ${bookingData.booking_number} is overdue`,
      type: "error",
      priority: "high",
      franchise_id: bookingData.franchise_id,
      action_url: `/bookings/${bookingData.id}`,
      metadata: { booking_id: bookingData.id, pending_amount: bookingData.pending_amount },
    })
  }

  // Inventory-related notifications
  static async notifyLowStock(productData: any) {
    return this.createNotification({
      title: "📦 Low Stock Alert",
      message: `${productData.name} is running low (${productData.stock_available} remaining)`,
      type: "warning",
      priority: "medium",
      franchise_id: productData.franchise_id,
      action_url: `/inventory`,
      metadata: { product_id: productData.id, stock_available: productData.stock_available },
    })
  }

  static async notifyOutOfStock(productData: any) {
    return this.createNotification({
      title: "🚨 Out of Stock",
      message: `${productData.name} is out of stock`,
      type: "error",
      priority: "high",
      franchise_id: productData.franchise_id,
      action_url: `/inventory`,
      metadata: { product_id: productData.id },
    })
  }

  // Task-related notifications
  static async notifyTaskAssigned(taskData: any) {
    return this.createNotification({
      title: "📋 New Task Assigned",
      message: `You have been assigned a new task: ${taskData.title}`,
      type: "info",
      priority: taskData.priority === "urgent" ? "urgent" : "medium",
      user_id: taskData.assigned_to,
      franchise_id: taskData.franchise_id,
      action_url: `/tasks`,
      metadata: { task_id: taskData.id, due_date: taskData.due_date },
    })
  }

  static async notifyTaskCompleted(taskData: any) {
    return this.createNotification({
      title: "✅ Task Completed",
      message: `Task "${taskData.title}" has been completed`,
      type: "success",
      priority: "low",
      user_id: taskData.assigned_by,
      franchise_id: taskData.franchise_id,
      action_url: `/tasks`,
      metadata: { task_id: taskData.id, completed_by: taskData.assigned_to },
    })
  }

  static async notifyTaskOverdue(taskData: any) {
    return this.createNotification({
      title: "⏰ Task Overdue",
      message: `Task "${taskData.title}" is overdue`,
      type: "error",
      priority: "high",
      user_id: taskData.assigned_to,
      franchise_id: taskData.franchise_id,
      action_url: `/tasks`,
      metadata: { task_id: taskData.id, due_date: taskData.due_date },
    })
  }

  // Expense-related notifications
  static async notifyExpenseSubmitted(expenseData: any) {
    return this.createNotification({
      title: "💳 Expense Submitted",
      message: `New expense of ₹${expenseData.amount} submitted for approval`,
      type: "info",
      priority: "medium",
      franchise_id: expenseData.franchise_id,
      action_url: `/expenses`,
      metadata: { expense_id: expenseData.id, amount: expenseData.amount },
    })
  }

  static async notifyExpenseApproved(expenseData: any) {
    return this.createNotification({
      title: "✅ Expense Approved",
      message: `Your expense of ₹${expenseData.amount} has been approved`,
      type: "success",
      priority: "medium",
      user_id: expenseData.created_by,
      franchise_id: expenseData.franchise_id,
      action_url: `/expenses`,
      metadata: { expense_id: expenseData.id, amount: expenseData.amount },
    })
  }

  // Customer-related notifications
  static async notifyCustomerCreated(customerData: any) {
    return this.createNotification({
      title: "👤 New Customer Added",
      message: `New customer ${customerData.name} has been added to the system`,
      type: "success",
      priority: "low",
      franchise_id: customerData.franchise_id,
      action_url: `/customers`,
      metadata: { customer_id: customerData.id, customer_name: customerData.name },
    })
  }

  static async notifyCustomerUpdated(customerData: any) {
    return this.createNotification({
      title: "👤 Customer Updated",
      message: `Customer ${customerData.name} information has been updated`,
      type: "info",
      priority: "low",
      franchise_id: customerData.franchise_id,
      action_url: `/customers`,
      metadata: { customer_id: customerData.id, customer_name: customerData.name },
    })
  }

  // Vendor-related notifications
  static async notifyVendorPaymentDue(vendorData: any) {
    return this.createNotification({
      title: "💳 Vendor Payment Due",
      message: `Payment of ₹${vendorData.amount} is due to ${vendorData.name}`,
      type: "warning",
      priority: "high",
      franchise_id: vendorData.franchise_id,
      action_url: `/vendors`,
      metadata: { vendor_id: vendorData.id, amount: vendorData.amount },
    })
  }

  // Package/Product notifications
  static async notifyPackageCreated(packageData: any) {
    return this.createNotification({
      title: "📦 New Package Created",
      message: `Package "${packageData.name}" has been added to the catalog`,
      type: "success",
      priority: "low",
      franchise_id: packageData.franchise_id,
      action_url: `/packages`,
      metadata: { package_id: packageData.id, package_name: packageData.name },
    })
  }

  static async notifyProductDamaged(productData: any) {
    return this.createNotification({
      title: "⚠️ Product Damaged",
      message: `${productData.name} has been marked as damaged`,
      type: "warning",
      priority: "medium",
      franchise_id: productData.franchise_id,
      action_url: `/inventory`,
      metadata: { product_id: productData.id, product_name: productData.name },
    })
  }

  // Staff/User notifications
  static async notifyStaffLogin(userData: any) {
    return this.createNotification({
      title: "👋 Staff Login",
      message: `${userData.name} has logged into the system`,
      type: "info",
      priority: "low",
      franchise_id: userData.franchise_id,
      action_url: `/dashboard`,
      metadata: { user_id: userData.id, user_name: userData.name },
    })
  }

  // Laundry notifications
  static async notifyLaundryReady(laundryData: any) {
    return this.createNotification({
      title: "🧺 Laundry Ready",
      message: `Laundry items for booking ${laundryData.booking_number} are ready`,
      type: "success",
      priority: "medium",
      franchise_id: laundryData.franchise_id,
      action_url: `/laundry`,
      metadata: { booking_id: laundryData.booking_id, booking_number: laundryData.booking_number },
    })
  }

  // General utility method for custom notifications
  static async createCustomNotification(
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    priority: "low" | "medium" | "high" | "urgent" = "medium",
    franchiseId?: string,
    userId?: string,
    actionUrl?: string,
    metadata?: Record<string, any>,
  ) {
    return this.createNotification({
      title,
      message,
      type,
      priority,
      franchise_id: franchiseId,
      user_id: userId,
      action_url: actionUrl,
      metadata,
    })
  }

  // System notifications
  static async notifySystemUpdate(message: string, priority: "low" | "medium" | "high" = "medium") {
    return this.createNotification({
      title: "🔄 System Update",
      message,
      type: "info",
      priority,
      action_url: "/dashboard",
      metadata: { system_notification: true },
    })
  }
}
