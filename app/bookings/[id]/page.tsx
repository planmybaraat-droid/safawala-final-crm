"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Edit, RefreshCw, Calendar, MapPin, Phone, Mail, Package, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Booking, Customer } from "@/lib/types"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BookingWorkflowStepper } from "@/components/shared"

// Local view model to align with fields used by this page
type BookingView = Booking & {
  type?: "rental" | "direct_sale"
  return_date?: string | null
  delivery_date?: string | null
  event_date?: string | null
  booking_items?: Array<{
    id: string
    quantity: number
    unit_price: number
    total_price: number
    product?: { name?: string; category?: string; barcode?: string | null; product_code?: string | null }
  }>
  customer?: (Customer & { area?: string | null }) | null
  settlement_locked?: boolean
  deposit_amount?: number | null
}

export default function BookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [booking, setBooking] = useState<BookingView | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [returnsSummary, setReturnsSummary] = useState<{ damaged: number; lost: number }>({ damaged: 0, lost: 0 })
  const [feeOverrides, setFeeOverrides] = useState<Record<string, { damage_fee?: number; lost_fee?: number }>>({})
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [settlementNotes, setSettlementNotes] = useState<string>("")
  const [finalizing, setFinalizing] = useState(false)
  const [settlementInvoice, setSettlementInvoice] = useState<{ id: string; invoice_number: string; pdf_url?: string | null } | null>(null)
  const [salesStaffName, setSalesStaffName] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadBooking(params.id as string)
    }
  }, [params.id])

  // Auto-scroll to Returns & Settlement if hash present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#returns-settlement') {
      setTimeout(() => {
        const el = document.getElementById('returns-settlement')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [])

  const loadBooking = async (bookingId: string) => {
    try {
      if (!bookingId || bookingId.trim() === "" || bookingId === "undefined") {
        router.replace("/bookings")
        return
      }

      if (bookingId === "new") {
        router.replace("/bookings/new")
        return
      }

      if (bookingId === "create") {
        router.replace("/bookings/create")
        return
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(bookingId)) {
        throw new Error("Invalid booking ID format")
      }

      setLoading(true)
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(name, phone, email, address, whatsapp, city),
          franchise:franchises(name),
          booking_items(
            id,
            quantity,
            unit_price,
            total_price,
            product:products(name, category, barcode, product_code)
          )
        `)
        .eq("id", bookingId)
        .single()

      if (error) throw error
      // Enrich with optional fields to match view model
      setBooking({
        ...data,
        booking_items: (data as any).booking_items || [],
        settlement_locked: (data as any).settlement_locked ?? false,
        deposit_amount: (data as any).deposit_amount ?? (data as any).security_deposit ?? 0,
      } as BookingView)
      // Load sales staff name (best-effort)
      try {
        const staffId = (data as any).sales_closed_by_id || (data as any).sales_closed_by
        if (staffId) {
          const { data: staff } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', staffId)
            .maybeSingle()
          if (staff) {
            const name = [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim()
            setSalesStaffName(name || staff.email || null)
          } else {
            setSalesStaffName(null)
          }
        } else {
          setSalesStaffName(null)
        }
      } catch {
        setSalesStaffName(null)
      }
      // Load latest settlement invoice (if any)
      try {
        const { data: sInv } = await supabase
          .from("invoices")
          .select("id, invoice_number, pdf_url, created_at")
          .eq("booking_id", bookingId)
          .ilike("invoice_number", "SETTLE-%")
          .order("created_at", { ascending: false })
          .maybeSingle()
        setSettlementInvoice(sInv || null)
      } catch (e) {
        setSettlementInvoice(null)
      }
      // Load returns totals (best-effort)
      const { data: retIds } = await supabase.from("rental_returns").select("id").eq("booking_id", bookingId)
      const ids = (retIds || []).map((r: any) => r.id)
      if (ids.length > 0) {
        const { data: agg } = await supabase
          .from("rental_return_items")
          .select("qty_damaged, qty_lost")
          .in("return_id", ids)
        const damaged = (agg || []).reduce((s: number, r: any) => s + Number(r.qty_damaged || 0), 0)
        const lost = (agg || []).reduce((s: number, r: any) => s + Number(r.qty_lost || 0), 0)
        setReturnsSummary({ damaged, lost })
      } else {
        setReturnsSummary({ damaged: 0, lost: 0 })
      }
    } catch (error) {
      console.error("Error loading booking:", error)
      toast({
        title: "Error",
        description: "Failed to load booking details. Please try again.",
        variant: "destructive",
      })
      router.push("/bookings")
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (newStatus: Booking["status"]) => {
    if (!booking) return

    try {
      setUpdatingStatus(true)
      const { error } = await supabase
        .from("bookings")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)

      if (error) throw error

  setBooking({ ...booking, status: newStatus })

      try {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: booking.customer?.whatsapp || booking.customer?.phone,
            message: {
              type: "text",
              text: {
                body: `Hi ${booking.customer?.name || "Customer"},\n\nYour booking #${booking.booking_number} status has been updated to: ${newStatus.toUpperCase()}\n\nEvent Date: ${booking.event_date ? format(new Date(booking.event_date), "PPP") : "Not set"}\nTotal Amount: ₹${booking.total_amount.toLocaleString()}\n\nFor any queries, contact us at +91 97252 95692\n\nThank you for choosing Safawala!`,
              },
            },
          }),
        })
      } catch (whatsappError) {
        console.error("WhatsApp notification failed:", whatsappError)
      }

      toast({
        title: "Status Updated",
        description: `Booking status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const downloadInvoicePDF = async () => {
    try {
      const response = await fetch("/api/generate-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: booking!.id,
          template: "modern",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate invoice")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
  a.download = `invoice-${booking!.booking_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      })
    } catch (error) {
      console.error("Error downloading invoice:", error)
      toast({
        title: "Error",
        description: "Failed to download invoice PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const finalizeSettlement = async () => {
    if (!booking) return
    try {
      setFinalizing(true)
      const res = await fetch(`/api/settlements/${booking.id}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeOverrides, payment: { method: paymentMethod }, notes: settlementNotes })
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      toast({ title: 'Settlement finalized', description: `Invoice ${json.invoiceNumber} created` })
      await loadBooking(booking.id)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to finalize settlement', variant: 'destructive' })
    } finally {
      setFinalizing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_payment: { label: "Pending Payment", variant: "secondary" as const },
      pending_selection: { label: "Pending Selection", variant: "outline" as const },
      delivered: { label: "Delivered", variant: "default" as const },
      returned: { label: "Rental Completed", variant: "outline" as const },
      order_complete: { label: "Order Complete", variant: "default" as const },
      cancelled: { label: "Cancelled", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type?: string) => {
    return type === "rental" ? <Badge variant="outline">Rental</Badge> : <Badge variant="secondary">Direct Sale</Badge>
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
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Booking not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The booking you're looking for doesn't exist or has been deleted.
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
          <Button variant="outline" onClick={() => router.push("/bookings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Booking Details</h2>
            <p className="text-muted-foreground">#{booking.booking_number}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => loadBooking(params.id as string)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={downloadInvoicePDF}>
            <Download className="mr-2 h-4 w-4" />
            Download Invoice PDF
          </Button>
          {settlementInvoice?.pdf_url && (
            <Button
              variant="outline"
              onClick={() => {
                try { window.open(settlementInvoice.pdf_url!, "_blank") } catch {}
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Settlement Invoice
            </Button>
          )}
          <Button onClick={() => router.push(`/bookings/${booking.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Booking
          </Button>
        </div>
      </div>

      <BookingWorkflowStepper
        currentStep="booking"
        customerId={booking.customer_id || booking.customer?.id}
        bookingId={booking.id}
        bookingNumber={booking.booking_number}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Booking Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Overview</CardTitle>
              <div className="flex space-x-2">
                {getStatusBadge(booking.status)}
                {getTypeBadge(booking.type)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Change Status</p>
                  <p className="text-xs text-muted-foreground">Update booking status and notify customer</p>
                </div>
                <Select value={booking.status} onValueChange={updateBookingStatus} disabled={updatingStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="pending_selection">Pending Selection</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="returned">Rental Completed</SelectItem>
                    <SelectItem value="order_complete">Order Complete</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Booking Number</p>
                <p className="text-lg font-semibold">{booking.booking_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">₹{booking.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Deposit</p>
                <p className="text-lg font-semibold">₹{Number(booking.deposit_amount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Refundable</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payable Now</p>
                <p className="text-lg font-semibold">₹{(Number(booking.total_amount || 0) + Number(booking.deposit_amount || 0)).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total + Deposit</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event Date</p>
                <p className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  {booking.event_date ? format(new Date(booking.event_date), "PPP") : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p>{format(new Date(booking.created_at), "PPP")}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Sales Closed By</p>
                <p className="text-sm">{salesStaffName || '—'}</p>
              </div>
            </div>

            {booking.delivery_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
                <p>{format(new Date(booking.delivery_date), "PPP")}</p>
              </div>
            )}

            {booking.return_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Return Date</p>
                <p>{format(new Date(booking.return_date), "PPP")}</p>
              </div>
            )}

            {booking.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm bg-gray-50 p-3 rounded-md">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">{booking.customer?.name}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{booking.customer?.phone}</span>
              </div>
              {booking.customer?.email && (
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.customer.email}</span>
                </div>
              )}
              {booking.customer?.address && (
                <div className="flex items-start">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{booking.customer.address}</span>
                </div>
              )}
              {booking.customer?.area && (
                <div className="flex items-center">
                  <span className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.customer.area}</span>
                </div>
              )}
              {booking.customer?.city && (
                <div className="flex items-center">
                  <span className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.customer.city}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event & Wedding Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event & Wedding Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.groom_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Groom Name</p>
                <p className="font-semibold">{booking.groom_name}</p>
              </div>
            )}
            {booking.bride_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bride Name</p>
                <p className="font-semibold">{booking.bride_name}</p>
              </div>
            )}
            {booking.venue_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Venue Name</p>
                <p className="font-semibold">{booking.venue_name}</p>
              </div>
            )}
            {booking.venue_address && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Venue Address</p>
                <p className="text-sm">{booking.venue_address}</p>
              </div>
            )}
            {booking.event_type && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event Type</p>
                <p className="capitalize">{booking.event_type}</p>
              </div>
            )}
            {booking.event_for && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event For</p>
                <p className="capitalize">{booking.event_for}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Items */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(booking.status === 'pending_selection' || !booking.booking_items || booking.booking_items.length === 0) && (
              <div className="p-4 border rounded-md bg-amber-50 flex items-center justify-between">
                <div>
                  <p className="font-medium">Product selection is pending</p>
                  <p className="text-sm text-muted-foreground">Add products to this booking to proceed</p>
                </div>
                <Button onClick={() => router.push(`/bookings/${booking.id}/select-products`)}>Select Products</Button>
              </div>
            )}
            {booking.booking_items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{item.product?.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.product?.category}</p>
                  {(item.product?.barcode || item.product?.product_code) && (
                    <p className="text-xs text-muted-foreground">Barcode: {item.product?.barcode || item.product?.product_code}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">Qty: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">₹{item.unit_price} each</p>
                  <p className="font-semibold">₹{item.total_price.toLocaleString()}</p>
                </div>
              </div>
            ))}

            {(!booking.booking_items || booking.booking_items.length === 0) && (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This booking doesn't have any items associated with it.
                </p>
                <div className="mt-4">
                  <Button onClick={() => router.push(`/bookings/${booking.id}/select-products`)}>Select Products</Button>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Amount:</span>
            <span>₹{booking.total_amount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Returns Summary and Settlement */}
      {booking && (
        <Card>
          <CardHeader>
            <CardTitle id="returns-settlement">Rental Return & Settlement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-md bg-gray-50">
                <p className="text-sm text-muted-foreground">Damaged</p>
                <p className="text-2xl font-semibold">{returnsSummary.damaged}</p>
              </div>
              <div className="p-3 rounded-md bg-gray-50">
                <p className="text-sm text-muted-foreground">Lost</p>
                <p className="text-2xl font-semibold">{returnsSummary.lost}</p>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Deposit Collected</p>
                  <p className="text-lg font-semibold">₹{Number(booking.deposit_amount || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Finance Notes</label>
                  <Textarea value={settlementNotes} onChange={(e) => setSettlementNotes(e.target.value)} placeholder="Add notes (optional)" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <Input placeholder="Cash / UPI / Credit Card / Debit Card / Bank Transfer" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
                </div>
                <div className="text-sm text-muted-foreground">You can override per-unit fees during finalization via API payload.</div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={finalizeSettlement} disabled={finalizing || booking.settlement_locked}>
                {finalizing ? 'Finalizing…' : 'Finalize Settlement'}
              </Button>
            </div>
            {settlementInvoice && (
              <div className="flex justify-between items-center pt-2 text-sm text-muted-foreground">
                <span>Settlement Invoice: {settlementInvoice.invoice_number}</span>
                {settlementInvoice.pdf_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try { window.open(settlementInvoice.pdf_url!, "_blank") } catch {}
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Open PDF
                  </Button>
                ) : (
                  <span className="italic">PDF not generated yet</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
