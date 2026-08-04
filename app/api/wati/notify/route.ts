import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import {
  sendBookingConfirmation,
  sendPaymentReceived,
  sendDeliveryReminder,
  sendReturnReminder,
  sendInvoice,
} from "@/lib/services/wati-service"

export const dynamic = 'force-dynamic'

/**
 * POST /api/wati/notify
 * Send business notifications via WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const body = await req.json()
    const { notificationType, ...params } = body

    if (!notificationType) {
      return NextResponse.json({ error: "notificationType is required" }, { status: 400 })
    }

    if (!params.phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 })
    }

    let result

    switch (notificationType) {
      case 'booking_confirmation':
        if (!params.customerName || !params.bookingNumber || !params.bookingDate || !params.totalAmount) {
          return NextResponse.json({ 
            error: "Required: customerName, bookingNumber, bookingDate, totalAmount" 
          }, { status: 400 })
        }
        result = await sendBookingConfirmation(params)
        break

      case 'payment_received':
        if (!params.customerName || !params.bookingNumber || !params.amountPaid || params.remainingBalance === undefined) {
          return NextResponse.json({ 
            error: "Required: customerName, bookingNumber, amountPaid, remainingBalance" 
          }, { status: 400 })
        }
        result = await sendPaymentReceived(params)
        break

      case 'delivery_reminder':
        if (!params.customerName || !params.bookingNumber || !params.deliveryDate || !params.deliveryTime) {
          return NextResponse.json({ 
            error: "Required: customerName, bookingNumber, deliveryDate, deliveryTime" 
          }, { status: 400 })
        }
        result = await sendDeliveryReminder(params)
        break

      case 'return_reminder':
        if (!params.customerName || !params.bookingNumber || !params.returnDate) {
          return NextResponse.json({ 
            error: "Required: customerName, bookingNumber, returnDate" 
          }, { status: 400 })
        }
        result = await sendReturnReminder(params)
        break

      case 'invoice':
        if (!params.customerName || !params.bookingNumber || !params.invoiceUrl) {
          return NextResponse.json({ 
            error: "Required: customerName, bookingNumber, invoiceUrl" 
          }, { status: 400 })
        }
        result = await sendInvoice(params)
        break

      default:
        return NextResponse.json({ 
          error: "Invalid notificationType. Use: booking_confirmation, payment_received, delivery_reminder, return_reminder, invoice" 
        }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${notificationType} notification sent successfully`,
    })
  } catch (error: any) {
    console.error("[API] /api/wati/notify error:", error)
    return NextResponse.json({ error: error.message || "Failed to send notification" }, { status: 500 })
  }
}
