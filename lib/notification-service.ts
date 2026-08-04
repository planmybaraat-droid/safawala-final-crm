import { whatsappService } from "./whatsapp-service"

export class NotificationService {
  // Booking notifications
  static async notifyBookingCreated(booking: any) {
    // Notify customer
    if (booking.customer_phone) {
      if (booking.type === "sale" || booking.booking_type === "sale") {
        await whatsappService.sendDirectSaleConfirmation(booking.customer_phone, booking)
      } else {
        await whatsappService.sendBookingConfirmation(booking.customer_phone, {
          customerName: booking.customer_name,
          eventDate: booking.event_date,
          venue: booking.venue,
          totalAmount: booking.total_amount,
          id: booking.id,
        })
      }
    }

    // Notify staff
    if (booking.assigned_staff_phone) {
      await whatsappService.sendMessage({
        to: booking.assigned_staff_phone,
        type: "text",
        text: {
          body: `📋 New Booking Alert\n\nBooking ID: ${booking.id}\nCustomer: ${booking.customer_name}\nEvent Date: ${booking.event_date}\nAmount: ₹${booking.total_amount}\n\nPlease prepare accordingly.`,
        },
      })
    }
  }

  static async notifyBookingStatusChange(booking: any, newStatus: string) {
    if (booking.customer_phone) {
      await whatsappService.sendBookingUpdate(booking.customer_phone, booking, newStatus)
    }
  }

  // Payment notifications
  static async notifyPaymentReceived(payment: any) {
    if (payment.customer_phone) {
      await whatsappService.sendPaymentConfirmation(payment.customer_phone, {
        customerName: payment.customer_name,
        amount: payment.amount,
        bookingId: payment.booking_id,
        transactionId: payment.transaction_id,
      })
    }
  }

  // Inventory notifications
  static async notifyLowStock(product: any, staffPhones: string[]) {
    const promises = staffPhones.map((phone) =>
      whatsappService.sendInventoryAlert(phone, {
        productName: product.name,
        currentStock: product.stock_quantity,
        minStock: product.min_stock_level,
      }),
    )
    await Promise.all(promises)
  }

  // Task notifications
  static async notifyTaskAssigned(task: any, assigneePhone: string) {
    await whatsappService.sendTaskAssignment(assigneePhone, {
      assigneeName: task.assignee_name,
      title: task.title,
      priority: task.priority,
      dueDate: task.due_date,
      description: task.description,
    })
  }

  // Daily summary for franchise owners
  static async sendDailySummary(franchiseOwnerPhone: string, summaryData: any) {
    await whatsappService.sendDailySummary(franchiseOwnerPhone, summaryData)
  }

  // Quote notifications
  static async notifyQuoteReady(quote: any) {
    if (quote.customer_phone) {
      await whatsappService.sendQuoteReady(quote.customer_phone, {
        customerName: quote.customer_name,
        totalAmount: quote.total_amount,
        validUntil: quote.valid_until,
        id: quote.id,
      })
    }
  }
}
