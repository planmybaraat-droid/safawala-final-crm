"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
// Switch to server APIs instead of direct client Supabase to respect franchise isolation and current schema
import { useToast } from "@/hooks/use-toast"
import { BookingForm } from "@/components/bookings/booking-form"
import type { Booking, Customer, Product } from "@/lib/types"

export default function EditBookingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadData(params.id as string)
    }
  }, [params.id, searchParams])

  const loadData = async (bookingId: string) => {
    try {
      setLoading(true)

      const typeParam = searchParams.get('type')
      const tryUrls = [
        typeParam ? `/api/bookings/details?id=${bookingId}&type=${typeParam}` : '',
        `/api/bookings/details?id=${bookingId}`,
        `/api/bookings/details?id=${bookingId}&type=product_order`,
        `/api/bookings/details?id=${bookingId}&type=package_booking`,
      ].filter(Boolean) as string[]

      let apiBooking: any = null
      let lastErr: any = null
      for (const url of tryUrls) {
        try {
          const r = await fetch(url)
          if (!r.ok) { lastErr = await r.text().catch(()=>r.statusText); continue }
          const json = await r.json()
          apiBooking = json.booking
          if (apiBooking) break
        } catch (e) { lastErr = e }
      }
      if (!apiBooking) throw new Error(`Failed to fetch booking${lastErr?`: ${lastErr}`:''}`)

      // Load customers/products via existing UI hooks/APIs
      const [cRes, pRes] = await Promise.all([
        fetch('/api/customers').then(r=>r.ok?r.json():{data:[]}).catch(()=>({data:[]})),
        fetch('/api/products').then(r=>r.ok?r.json():{data:[]}).catch(()=>({data:[]})),
      ])

      setBooking(apiBooking)
      setCustomers(cRes.data||[])
      setProducts(pRes.data||[])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load booking data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBooking = async (bookingData: any) => {
    try {
      const payload = {
        customer_id: bookingData.isNewCustomer ? null : bookingData.customer,
        type: bookingData.bookingType,
        payment_type: bookingData.paymentType,
        status: booking?.status || 'pending',
        event_date: bookingData.eventDate?.toISOString(),
        delivery_date: bookingData.deliveryDate?.toISOString(),
        return_date: bookingData.returnDate?.toISOString(),
        total_amount: bookingData.totalAmount,
        notes: bookingData.notes,
        groom_name: bookingData.groomName,
        groom_additional_whatsapp: bookingData.groomWhatsapp,
        groom_home_address: bookingData.groomHomeAddress,
        bride_name: bookingData.brideName,
        bride_additional_whatsapp: bookingData.brideWhatsapp,
        bride_home_address: bookingData.brideHomeAddress,
        venue_name: bookingData.venueName,
        venue_address: bookingData.venueAddress,
        event_type: bookingData.eventType,
        event_for: bookingData.eventFor,
      }

      const typeParam = searchParams.get('type') || (booking as any)?.source
      const tryUrls = [
        typeParam ? `/api/bookings/${params.id}?type=${typeParam}` : '',
        `/api/bookings/${params.id}`,
        `/api/bookings/${params.id}?type=product_order`,
        `/api/bookings/${params.id}?type=package_booking`,
      ].filter(Boolean) as string[]

      let ok = false, lastErr: any = null
      for (const url of tryUrls) {
        try {
          const r = await fetch(url, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
          if (r.ok) { ok = true; break }
          lastErr = await r.text().catch(()=>r.statusText)
        } catch (e) { lastErr = e }
      }
      if (!ok) throw new Error(`Failed to update booking${lastErr?`: ${lastErr}`:''}`)

      toast({
        title: "Success",
        description: "Booking updated successfully!",
      })

  router.push(`/bookings/${params.id}`)
    } catch (error) {
      console.error("Error updating booking:", error)
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-8">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Booking not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The booking you're trying to edit doesn't exist or has been deleted.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push("/bookings")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Bookings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push(`/bookings/${params.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Edit Booking</h2>
            <p className="text-muted-foreground">#{booking.booking_number}</p>
          </div>
        </div>
      </div>

      <BookingForm customers={customers} products={products} onSubmit={handleUpdateBooking} initialBooking={booking} />
    </div>
  )
}
