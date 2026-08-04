"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Package,
  DollarSign,
  FileText,
  Edit,
  Truck,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Send,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Booking } from "@/lib/types"

interface DetailedBookingViewDialogProps {
  booking: Booking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingItems: any[]
  onStatusUpdate?: (bookingId: string, status: any, source?: string) => Promise<void>
}

export function DetailedBookingViewDialog({
  booking,
  open,
  onOpenChange,
  bookingItems = [],
  onStatusUpdate,
}: DetailedBookingViewDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [localItems, setLocalItems] = useState<any[]>(bookingItems || [])
  const [loadingItems, setLoadingItems] = useState(false)

  // Map booking.source to the backend's expected orderType string
  const mapSourceToOrderType = (source?: string) => {
    if (source === "product_orders") return "product_order"
    if (source === "package_bookings") return "package_booking"
    if (source === "direct_sales" || source === "direct_sales_orders") return "direct_sale"
    return "product_order" // Default fallback
  }

  useEffect(() => {
    if (bookingItems && bookingItems.length > 0) {
      setLocalItems(bookingItems)
      return
    }

    const fetchItems = async () => {
      if (!booking?.id) return
      setLoadingItems(true)
      try {
        const source = mapSourceToOrderType(booking.source)
        const res = await fetch(`/api/bookings-items?id=${booking.id}&source=${source}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.items)) {
            setLocalItems(data.items)
          }
        }
      } catch (err) {
        console.error("Failed to fetch booking items dynamically:", err)
      } finally {
        setLoadingItems(false)
      }
    }

    fetchItems()
  }, [booking?.id, bookingItems])

  if (!booking) return null

  // Calculate actual payment details
  const totalAmount = booking.total_amount || 0
  const paidAmount = booking.paid_amount || booking.amount_paid || 0
  const pendingAmount = Math.max(0, totalAmount - paidAmount)
  const isFullyPaid = pendingAmount <= 0
  const isUnpaid = paidAmount === 0
  const isPartiallyPaid = paidAmount > 0 && pendingAmount > 0

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "order_complete":
      case "completed":
      case "returned":
        return "success"
      case "pending":
      case "pending_payment":
      case "pending_selection":
        return "warning"
      case "cancelled":
        return "destructive"
      case "confirmed":
        return "indigo"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending_selection":
        return "Selection Pending"
      case "pending_payment":
        return "Payment Pending"
      case "confirmed":
        return booking.type === "sale" ? "Ready for Delivery" : "Confirmed"
      case "returned":
        return "Rental Completed"
      case "order_complete":
        return "Order Complete"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/create-invoice?mode=edit&id=${booking.id}`)
  }

  const handlePrint = () => {
    window.open(`/create-invoice?mode=edit&id=${booking.id}&print=true`, "_blank")
  }

  const handleSendWhatsapp = async () => {
    setSendingWhatsapp(true)
    try {
      const orderType = mapSourceToOrderType(booking.source)
      console.log(`[WhatsApp Dialog] Sending invoice PDF for booking ${booking.id} (${orderType})`)

      const response = await fetch("/api/whatsapp/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: booking.id,
          orderType: orderType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send WhatsApp message")
      }

      toast({
        title: "WhatsApp Invoice Sent",
        description: `Successfully sent the invoice PDF to ${booking.customer?.name}`,
      })
    } catch (error: any) {
      console.error("[WhatsApp Dialog] Error:", error)
      toast({
        title: "Failed to send WhatsApp",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSendingWhatsapp(false)
    }
  }

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!onStatusUpdate) return
    setUpdatingStatus(true)
    try {
      await onStatusUpdate(booking.id, newStatus, booking.source)
    } catch (error) {
      console.error("[Status Change] Error:", error)
    } finally {
      setUpdatingStatus(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header section with modern background */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-t-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">Booking Details</h2>
                <Badge variant={getStatusColor(booking.status) as any} className="font-semibold px-2.5 py-0.5 shadow-sm text-xs">
                  {getStatusLabel(booking.status)}
                </Badge>
                {booking.type && (
                  <Badge variant="outline" className="text-white border-white/20 capitalize font-medium text-xs">
                    {booking.type}
                  </Badge>
                )}
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Booking Reference: <code className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded">{booking.booking_number}</code>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:self-center">
              <Button size="sm" variant="secondary" onClick={handleEdit} className="h-8 shadow-sm">
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
              <Button size="sm" variant="secondary" onClick={handlePrint} className="h-8 shadow-sm">
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Invoice
              </Button>
              <Button size="sm" variant="indigo" onClick={handleSendWhatsapp} disabled={sendingWhatsapp} className="h-8 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                {sendingWhatsapp ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                WhatsApp Invoice
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10 rounded-full flex items-center justify-center ml-1"
                title="Close"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Column */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-500" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block font-medium">Customer Name</label>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{booking.customer?.name || "N/A"}</span>
                </div>
                {booking.customer?.phone && (
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">Phone Number</label>
                    <span className="font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {booking.customer.phone}
                    </span>
                  </div>
                )}
                {booking.customer?.whatsapp && (
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">WhatsApp Number</label>
                    <span className="font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Send className="h-3.5 w-3.5 text-emerald-500 rotate-45" />
                      {booking.customer.whatsapp}
                    </span>
                  </div>
                )}
                {booking.customer?.email && (
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">Email Address</label>
                    <span className="text-slate-700 dark:text-slate-300">{booking.customer.email}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground block font-medium">Billing/Shipping Address</label>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                    {booking.customer?.address || "N/A"}
                    {booking.customer?.city && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {booking.customer.city}, {booking.customer.state || ""} {booking.customer.pincode || ""}
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Event & Logistics Column */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  Event & Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">Event Date</label>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">Event Time</label>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{booking.event_time || "N/A"}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block font-medium">Event Type</label>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{booking.event_type?.replace("_", " ") || "N/A"}</span>
                </div>

                {(booking.groom_name || booking.bride_name) && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50 grid grid-cols-2 gap-3">
                    {booking.groom_name && (
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">🤵 Groom</label>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{booking.groom_name}</span>
                      </div>
                    )}
                    {booking.bride_name && (
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">👰 Bride</label>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{booking.bride_name}</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground block font-medium">Venue</label>
                  <p className="text-slate-700 dark:text-slate-300 font-semibold">{booking.venue_name || "N/A"}</p>
                  {booking.venue_address && (
                    <span className="text-xs text-muted-foreground block mt-0.5 leading-relaxed">{booking.venue_address}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dates & Scheduling Column */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-500" />
                  Delivery & Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block font-medium">Delivery Schedule</label>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    {booking.delivery_date ? new Date(booking.delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                    {booking.delivery_time && ` at ${booking.delivery_time}`}
                  </span>
                </div>

                {booking.type === "rental" && (
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">Pickup/Return Schedule</label>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-4 w-4 text-rose-500" />
                      {booking.pickup_date ? new Date(booking.pickup_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                      {booking.return_time && ` at ${booking.return_time}`}
                    </span>
                  </div>
                )}

                {booking.priority && (
                  <div>
                    <label className="text-xs text-muted-foreground block font-medium">Order Priority</label>
                    <Badge variant={booking.priority.toLowerCase() === "high" ? "destructive" : "secondary"} className="mt-1 font-semibold text-xs">
                      {booking.priority} Priority
                    </Badge>
                  </div>
                )}

                {booking.special_instructions && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-lg">
                    <label className="text-xs text-amber-700 dark:text-amber-400 font-bold block flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Special Instructions
                    </label>
                    <p className="text-xs text-amber-900 dark:text-amber-300 mt-1 leading-relaxed whitespace-pre-wrap">
                      {booking.special_instructions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Purchased Items Table */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-500" />
                Purchased / Rental Items ({localItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingItems ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                  <span className="text-sm text-slate-500">Loading items...</span>
                </div>
              ) : localItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-1.5">
                  <Package className="h-8 w-8 stroke-[1.5]" />
                  <span className="text-sm font-medium">No items added to this booking</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-950/50">
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Item / Product Name</TableHead>
                        <TableHead>SKU / Variant</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {localItems.map((item, idx) => (
                        <TableRow key={item.id || idx}>
                          <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.product?.name || item.package?.name || "Unknown Product"}
                            </div>
                            {item.extra_safas > 0 && (
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                Extra Safas: {item.extra_safas}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-semibold px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                              {item.product?.sku || item.product?.product_code || "N/A"}
                            </code>
                            {item.variant_name && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
                                Variant: {item.variant_name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold">{item.quantity || 1}</TableCell>
                          <TableCell className="text-right font-medium">₹{(item.unit_price || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">
                            ₹{(item.total_price || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Notes Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Notes Card */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 md:col-span-2">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Order Notes & Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {booking.notes ? (
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes added to this order.</p>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary Card */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-indigo-500" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-sm">
                <div className="space-y-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{(booking.subtotal_amount || 0).toLocaleString()}</span>
                  </div>

                  {booking.discount_amount && booking.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount</span>
                      <span className="font-medium">-₹{booking.discount_amount.toLocaleString()}</span>
                    </div>
                  )}

                  {booking.coupon_code && booking.coupon_discount && booking.coupon_discount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Coupon Discount ({booking.coupon_code})</span>
                      <span className="font-medium">-₹{booking.coupon_discount.toLocaleString()}</span>
                    </div>
                  )}

                  {booking.tax_amount && booking.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>GST Tax</span>
                      <span className="font-medium">₹{booking.tax_amount.toLocaleString()}</span>
                    </div>
                  )}

                  {booking.security_deposit && booking.security_deposit > 0 && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Security Deposit
                      </span>
                      <span className="font-medium">₹{booking.security_deposit.toLocaleString()}</span>
                    </div>
                  )}

                  {booking.payment_method && (
                    <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-1 rounded">
                      <span className="font-medium">Payment Mode</span>
                      <span className="font-semibold uppercase">{booking.payment_method}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1 border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded border border-slate-100 dark:border-slate-800/80">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Grand Total</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                      ₹{totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center px-1 text-xs">
                    <span className="text-muted-foreground font-medium">Amount Received</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ₹{paidAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  {isFullyPaid ? (
                    <div className="flex items-center justify-center p-3 bg-green-500/10 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-bold text-sm gap-2">
                      <CheckCircle className="h-4 w-4" />
                      FULLY PAID (No Due)
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 p-3 bg-rose-500/10 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider">Balance Outstanding</span>
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <span className="text-xl font-extrabold block">
                        ₹{pendingAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Quick Status Transits */}
        {onStatusUpdate && (
          <DialogFooter className="p-4 bg-slate-100 dark:bg-slate-950/50 border-t border-slate-200/80 dark:border-slate-800/60 rounded-b-xl flex-row flex-wrap sm:justify-between items-center gap-4">
            <div className="text-xs text-muted-foreground font-medium">
              Update Status:
            </div>
            <div className="flex flex-wrap gap-2">
              {booking.status !== "pending_payment" && (
                <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange("pending_payment")} disabled={updatingStatus || booking.status === "pending_payment"} className="h-8">
                  Payment Pending
                </Button>
              )}
              {booking.status !== "pending_selection" && booking.type === "rental" && (
                <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange("pending_selection")} disabled={updatingStatus} className="h-8">
                  Selection Pending
                </Button>
              )}
              {booking.status !== "confirmed" && (
                <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange("confirmed")} disabled={updatingStatus} className="h-8">
                  {booking.type === "sale" ? "Ready for Delivery" : "Confirmed"}
                </Button>
              )}
              {booking.status !== "delivered" && (
                <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange("delivered")} disabled={updatingStatus} className="h-8">
                  Delivered
                </Button>
              )}
              {booking.status !== "returned" && booking.type === "rental" && (
                <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange("returned")} disabled={updatingStatus} className="h-8">
                  Rental Completed
                </Button>
              )}
              {booking.status !== "order_complete" && (
                <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange("order_complete")} disabled={updatingStatus} className="h-8">
                  Order Complete
                </Button>
              )}

              {booking.status !== "cancelled" && (
                <Button size="sm" variant="destructive" onClick={() => handleQuickStatusChange("cancelled")} disabled={updatingStatus} className="h-8">
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Cancel Order
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
