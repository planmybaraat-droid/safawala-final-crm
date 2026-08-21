"use client"

import MainCrmBookingsPage from "@/app/bookings/page"

/**
 * The Booking Portal intentionally renders the same module as the main CRM.
 * Route-aware navigation inside the shared module keeps portal staff within
 * /portal/booking while preserving the main CRM's existing routes.
 */
export default function BookingPortalBookingsPage() {
  return <MainCrmBookingsPage />
}
