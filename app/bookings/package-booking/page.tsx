"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PackageBookingForm } from "@/components/bookings/package-booking-form"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { NotificationService } from "@/lib/notification-service"
import { getCurrentUser } from "@/lib/auth"

export default function PackageBookingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    getCurrentUser()
      .then((user) => {
        if (mounted) setCurrentUser(user)
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [])

  const handleBookingSubmit = async (bookingData: any) => {
    try {
      setLoading(true)
      console.log("[v0] Creating package booking:", bookingData)

      // Create customer if new
      let customerId = bookingData.customer
      let customerInfo = null

      if (bookingData.isNewCustomer) {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .insert([
            {
              ...bookingData.customer,
              franchise_id: currentUser?.franchise_id || bookingData.customer?.franchise_id || null,
            },
          ])
          .select()
          .single()

        if (customerError) throw customerError
        customerId = customerData.id
        customerInfo = customerData
        console.log("[v0] New customer created:", customerId)
      } else {
        // Fetch existing customer info for notifications
        let customerQuery = supabase.from("customers").select("*").eq("id", customerId)
        if (currentUser?.franchise_id) {
          customerQuery = customerQuery.eq("franchise_id", currentUser.franchise_id)
        }
        const { data: existingCustomer } = await customerQuery.single()
        customerInfo = existingCustomer
      }

      // Generate booking number
      const bookingNumber = `PKG-${Date.now()}`

      // Create booking
      const bookingInsert = {
        booking_number: bookingNumber,
        customer_id: customerId,
        franchise_id: currentUser?.franchise_id || customerInfo?.franchise_id || null,
        type: "package_booking",
        status: "pending_payment",
        booking_status: bookingData.bookingStatus,
        event_date: bookingData.eventDate,
        delivery_date: bookingData.deliveryDate,
        return_date: bookingData.pickupDate,
        total_amount: bookingData.totalAmount,
        amount_paid: bookingData.paymentStatus === "paid" ? bookingData.totalAmount : bookingData.advanceAmount || 0,
        pending_amount:
          bookingData.paymentStatus === "paid" ? 0 : bookingData.totalAmount - (bookingData.advanceAmount || 0),
        assigned_staff_id: bookingData.assignedStaff,
        notes: bookingData.notes,
        package_id: bookingData.selectedPackage?.id,
        variant_id: bookingData.selectedVariant?.id,
        skip_product_selection: bookingData.skipProductSelection,
        payment_method: bookingData.paymentMethod || "Cash / Offline Payment",
        discount_amount: bookingData.discountAmount || 0,
        coupon_code: bookingData.couponCode || null,
        coupon_discount: bookingData.couponDiscount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert([bookingInsert])
        .select()
        .single()

      if (bookingError) throw bookingError

      console.log("[v0] Package booking created successfully:", booking.id)

      try {
        if (customerInfo?.phone) {
          console.log("[v0] Sending WhatsApp notification to:", customerInfo.phone)

          const bookingWithCustomerInfo = {
            ...booking,
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            venue: bookingData.venue || "Package Booking",
          }

          await NotificationService.notifyBookingCreated(bookingWithCustomerInfo)
          console.log("[v0] WhatsApp notification sent successfully")
        } else {
          console.log("[v0] No customer phone found, skipping WhatsApp notification")
        }
      } catch (notificationError) {
        console.error("[v0] Failed to send WhatsApp notification:", notificationError)
        // Don't fail the booking creation if notification fails
      }

      toast({
        title: "Success",
        description: `Package booking ${bookingNumber} created successfully!`,
      })

      router.push(`/bookings/${booking.id}`)
    } catch (error) {
      console.error("Error creating package booking:", error)
      toast({
        title: "Error",
        description: "Failed to create package booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/bookings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create Package Booking</h2>
            <p className="text-muted-foreground">Book packages with optional product selection</p>
          </div>
        </div>
      </div>

      <PackageBookingForm onSubmit={handleBookingSubmit} currentUser={currentUser} />
    </div>
  )
}
