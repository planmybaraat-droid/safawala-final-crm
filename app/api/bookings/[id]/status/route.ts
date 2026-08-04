import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { NotificationService } from "@/lib/notification-service"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const validStatuses = [
      "pending_payment",
      "pending_selection",
      "confirmed",
      "delivered",
      "returned",
      "order_complete",
      "cancelled",
    ]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      )
    }

    // Verify booking exists and get customer info
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        booking_number,
        franchise_id,
        customer:customers(name, phone)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, existingBooking.franchise_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentStatus = existingBooking.status as string
    const invalidTransitions: Record<string, string[]> = {
      order_complete: ["pending_payment", "pending_selection"],
      cancelled: ["delivered", "order_complete"],
    }

    if (invalidTransitions[status as string] && invalidTransitions[status as string].includes(currentStatus)) {
      return NextResponse.json({ error: `Cannot change status from ${currentStatus} to ${status}` }, { status: 400 })
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("franchise_id", existingBooking.franchise_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    try {
      if (existingBooking.customer?.phone && currentStatus !== status) {
        console.log("[v0] Sending status update notification to:", existingBooking.customer.phone)

        const bookingWithCustomerInfo = {
          ...updatedBooking,
          customer_name: existingBooking.customer.name,
          customer_phone: existingBooking.customer.phone,
        }

        await NotificationService.notifyBookingStatusChange(bookingWithCustomerInfo, status)
        console.log("[v0] Status update notification sent successfully")
      }
    } catch (notificationError) {
      console.error("[v0] Failed to send status update notification:", notificationError)
      // Don't fail the status update if notification fails
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
