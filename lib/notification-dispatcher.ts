import { whatsappService } from "./whatsapp-service"
import { supabaseServer as supabase } from "./supabase-server-simple"

interface NotificationData {
  type: string
  recipient: string
  data: Record<string, any>
  templateName?: string
}

export class NotificationDispatcher {
  static async dispatch(notification: NotificationData): Promise<boolean> {
    console.log(`[v0] Dispatching notification: ${notification.type} to ${notification.recipient}`)

    try {
      // Log notification to database for tracking
      await supabase.from("notifications").insert({
        type: notification.type,
        recipient: notification.recipient,
        data: notification.data,
        template_name: notification.templateName,
        status: "sending",
        created_at: new Date().toISOString(),
      })

      let success = false

      switch (notification.type) {
        case "booking_created":
          success = await whatsappService.sendBookingConfirmation(notification.recipient, notification.data)
          break
        case "direct_sale_created":
          success = await whatsappService.sendDirectSaleConfirmation(notification.recipient, notification.data)
          break
        case "booking_updated":
          success = await whatsappService.sendBookingUpdate(
            notification.recipient,
            notification.data,
            notification.data.status,
          )
          break
        case "payment_received":
          success = await whatsappService.sendPaymentConfirmation(notification.recipient, notification.data)
          break
        case "task_assigned":
          success = await whatsappService.sendTaskAssignment(notification.recipient, notification.data)
          break
        case "inventory_low_stock":
          success = await whatsappService.sendInventoryAlert(notification.recipient, notification.data)
          break
        case "quote_ready":
          success = await whatsappService.sendQuoteReady(notification.recipient, notification.data)
          break
        case "daily_summary":
          success = await whatsappService.sendDailySummary(notification.recipient, notification.data)
          break
        default:
          console.log(`[v0] Unknown notification type: ${notification.type}`)
          return false
      }

      // Update notification status
      await supabase
        .from("notifications")
        .update({
          status: success ? "sent" : "failed",
          sent_at: success ? new Date().toISOString() : null,
        })
        .eq("recipient", notification.recipient)
        .eq("type", notification.type)
        .order("created_at", { ascending: false })
        .limit(1)

      console.log(
        `[v0] Notification ${notification.type} ${success ? "sent successfully" : "failed"} to ${notification.recipient}`,
      )
      return success
    } catch (error) {
      console.error(`[v0] Error dispatching notification:`, error)
      return false
    }
  }

  static async notifyBookingCreated(booking: any) {
    if (booking.customer_phone) {
      const isSale = booking.type === "sale" || booking.booking_type === "sale"
      await this.dispatch({
        type: isSale ? "direct_sale_created" : "booking_created",
        recipient: booking.customer_phone,
        data: booking,
        templateName: isSale ? "direct_sale_confirmation" : "booking_confirmation",
      })
    }
  }

  static async notifyBookingUpdated(booking: any, newStatus: string) {
    if (booking.customer_phone) {
      await this.dispatch({
        type: "booking_updated",
        recipient: booking.customer_phone,
        data: { ...booking, status: newStatus },
        templateName: "booking_status_update",
      })
    }
  }

  static async notifyPaymentReceived(payment: any) {
    if (payment.customer_phone) {
      await this.dispatch({
        type: "payment_received",
        recipient: payment.customer_phone,
        data: payment,
        templateName: "payment_confirmation",
      })
    }
  }

  static async notifyTaskAssigned(task: any) {
    if (task.assignee_phone) {
      await this.dispatch({
        type: "task_assigned",
        recipient: task.assignee_phone,
        data: task,
        templateName: "task_assignment",
      })
    }
  }

  static async notifyLowStock(product: any, staffPhones: string[]) {
    const promises = staffPhones.map((phone) =>
      this.dispatch({
        type: "inventory_low_stock",
        recipient: phone,
        data: product,
        templateName: "inventory_low_stock_alert",
      }),
    )
    await Promise.all(promises)
  }

  static async notifyQuoteReady(quote: any) {
    if (quote.customer_phone) {
      await this.dispatch({
        type: "quote_ready",
        recipient: quote.customer_phone,
        data: quote,
        templateName: "quote_ready",
      })
    }
  }

  static async sendDailySummary(managerPhone: string, summaryData: any) {
    await this.dispatch({
      type: "daily_summary",
      recipient: managerPhone,
      data: summaryData,
      templateName: "daily_business_summary",
    })
  }
}
