/**
 * DirectSalesOrderDetails Component
 * 
 * Comprehensive view for direct sales orders with all fields:
 * 1. Order header (quick glance)
 * 2. Customer info
 * 3. Payment breakdown
 * 4. Delivery details
 * 5. Products table
 * 6. Contact persons (if applicable)
 * 7. Notes and metadata
 */

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Package,
  User,
  DollarSign,
  Truck,
  Phone,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { PricingBreakdownDialog } from "./pricing-breakdown-dialog"
import { InvoiceFormatDialog } from "@/components/invoices"
import type { Booking } from "@/lib/types"
import { formatTime12Hour } from "@/lib/utils"

interface DirectSalesOrderDetailsProps {
  booking: Booking & {
    bookingItems?: any[]
    booking_type?: string
    source?: string
  }
}

export function DirectSalesOrderDetails({ booking }: DirectSalesOrderDetailsProps) {
  const [showPricingBreakdown, setShowPricingBreakdown] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  if (!booking) return null

  // Cast to access direct sales specific fields
  const bookingData = booking as any

  // Ensure this is a direct sales order
  if (bookingData.source !== 'direct_sales' && bookingData.booking_type !== 'sale') {
    return null
  }

  // Helper function to format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₹0'
    return `₹${amount.toLocaleString()}`
  }

  // Helper function to format date
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Helper function to format time
  const formatTime = (time: string | undefined) => {
    return formatTime12Hour(time)
  }

  // Helper function to format datetime
  const formatDateTime = (date: string | undefined, time?: string) => {
    if (!date) return 'N/A'
    const dateStr = formatDate(date)
    if (time && time !== 'N/A') return `${dateStr} at ${formatTime(time)}`
    return dateStr
  }

  // Get status badge
  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      'confirmed': { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'delivered': { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'order_complete': { label: 'Order Complete', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }
    const statusInfo = statusMap[status || 'confirmed'] || statusMap.confirmed
    const Icon = statusInfo.icon
    return (
      <Badge className={statusInfo.color}>
        <Icon className="w-3 h-3 mr-1 inline" />
        {statusInfo.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* ===== 1️⃣ ORDER HEADER - Quick Glance ===== */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Sale #</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {booking.booking_number || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Customer</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {booking.customer?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Status</p>
              <div className="mt-1">
                {getStatusBadge(booking.status)}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Total Amount</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(booking.total_amount)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-muted-foreground">
              Sale Date: {formatDate(booking.event_date)} | Created: {formatDate(booking.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== 2️⃣ CUSTOMER INFORMATION ===== */}
      <Card>
        <CardHeader className="bg-blue-50 dark:bg-blue-950">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            👤 Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{booking.customer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{booking.customer?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{booking.customer?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full Address</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {[
                  booking.customer?.address,
                  booking.customer?.city,
                  booking.customer?.state,
                  booking.customer?.pincode
                ].filter(Boolean).join(', ') || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== 3️⃣ PAYMENT & BILLING BREAKDOWN ===== */}
      <Card>
        <CardHeader className="bg-amber-50 dark:bg-amber-950">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            💳 Payment & Billing Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Payment Method and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase">Payment Method</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                  {(booking as any).payment_method ? 
                    ((booking as any).payment_method === 'cash' ? '💵 Cash' : 
                     (booking as any).payment_method === 'card' ? '💳 Card' : 
                     (booking as any).payment_method === 'bank_transfer' ? '🏦 Bank Transfer' :
                     (booking as any).payment_method === 'upi' ? '📱 UPI' :
                     (booking as any).payment_method === 'cheque' ? '📄 Cheque' :
                     (booking as any).payment_method)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase">Payment Type</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                  {(booking as any).payment_type ? 
                    ((booking as any).payment_type === 'full' ? '💰 Full Payment' : 
                     (booking as any).payment_type === 'advance' ? '💵 Advance Payment' : 
                     (booking as any).payment_type === 'partial' ? '💳 Partial Payment' : 
                     (booking as any).payment_type)
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Amount Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-medium">{formatCurrency((booking as any).subtotal_amount || booking.total_amount)}</span>
              </div>

              {(booking as any).discount_amount && (booking as any).discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">💸 Discount</span>
                  <span className="font-medium text-green-600">-{formatCurrency((booking as any).discount_amount)}</span>
                </div>
              )}

              {(booking as any).coupon_code && (booking as any).coupon_discount && (booking as any).coupon_discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">🎟️ Coupon ({(booking as any).coupon_code})</span>
                  <span className="font-medium text-green-600">-{formatCurrency((booking as any).coupon_discount)}</span>
                </div>
              )}

              {(booking as any).tax_amount && (booking as any).tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">📊 Tax</span>
                  <span className="font-medium">+{formatCurrency((booking as any).tax_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-3" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg bg-emerald-50 dark:bg-emerald-950 p-3 rounded">
                <span>Grand Total</span>
                <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(booking.total_amount)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex justify-between font-medium text-sm bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  <span className="text-muted-foreground">Amount Paid ✅</span>
                  <span className="text-green-600">{formatCurrency(booking.paid_amount)}</span>
                </div>
                {((booking.total_amount || 0) - (booking.paid_amount || 0)) > 0 && (
                  <div className="flex justify-between font-medium text-sm bg-orange-50 dark:bg-orange-950 p-2 rounded">
                    <span className="text-muted-foreground">Pending ⏳</span>
                    <span className="text-orange-600">
                      {formatCurrency((booking.total_amount || 0) - (booking.paid_amount || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== 4️⃣ DELIVERY DETAILS ===== */}
      {booking.delivery_date && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="bg-indigo-50 dark:bg-indigo-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              📦 Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="font-bold text-indigo-700 dark:text-indigo-400">
                  {formatDate(booking.delivery_date)}
                </p>
              </div>
              {(booking as any).delivery_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Time</p>
                  <p className="font-bold text-indigo-700 dark:text-indigo-400">
                    {formatTime((booking as any).delivery_time)}
                  </p>
                </div>
              )}
            </div>
            {bookingData.delivery_address && (
              <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                  {bookingData.delivery_address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== 5️⃣ PRODUCTS ORDERED ===== */}
      {booking.bookingItems && booking.bookingItems.length > 0 && (
        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              🛍️ Products Ordered ({booking.bookingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 text-muted-foreground">Product</th>
                    <th className="text-center py-2 px-2 text-muted-foreground">Qty</th>
                    <th className="text-right py-2 px-2 text-muted-foreground">Unit Price</th>
                    <th className="text-right py-2 px-2 text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.bookingItems.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {item.product_name || item.product?.name || 'Product'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.product?.category || item.category || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-medium">{item.quantity || 1}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-2 text-right font-bold">
                        {formatCurrency(item.total_price || (item.quantity || 1) * (item.unit_price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== 6️⃣ CONTACT PERSONS (if applicable) ===== */}
      {((booking as any).groom_name || (booking as any).bride_name) && (
        <Card>
          <CardHeader className="bg-pink-50 dark:bg-pink-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              ☎️ Contact Persons
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(booking as any).groom_name && (
                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                  <p className="font-bold text-lg mb-2">🤵 Primary Contact</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{(booking as any).groom_name}</p>
                    </div>
                    {(booking as any).groom_whatsapp && (
                      <div>
                        <p className="text-sm text-muted-foreground">📱 WhatsApp</p>
                        <p className="font-medium">{(booking as any).groom_whatsapp}</p>
                      </div>
                    )}
                    {(booking as any).groom_address && (
                      <div>
                        <p className="text-sm text-muted-foreground">📍 Address</p>
                        <p className="font-medium text-sm">{(booking as any).groom_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(booking as any).bride_name && (
                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                  <p className="font-bold text-lg mb-2">👰 Secondary Contact</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{(booking as any).bride_name}</p>
                    </div>
                    {(booking as any).bride_whatsapp && (
                      <div>
                        <p className="text-sm text-muted-foreground">📱 WhatsApp</p>
                        <p className="font-medium">{(booking as any).bride_whatsapp}</p>
                      </div>
                    )}
                    {(booking as any).bride_address && (
                      <div>
                        <p className="text-sm text-muted-foreground">📍 Address</p>
                        <p className="font-medium text-sm">{(booking as any).bride_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== 7️⃣ NOTES & METADATA ===== */}
      {booking.notes && (
        <Card>
          <CardHeader className="bg-cyan-50 dark:bg-cyan-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              📝 Notes & Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="bg-cyan-50 dark:bg-cyan-950/30 border-l-4 border-cyan-500 p-4 rounded">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {booking.notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== 8️⃣ ORDER METADATA ===== */}
      <Card className="bg-slate-50 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            📋 Order Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sale Number</p>
              <p className="font-monospace font-bold">{booking.booking_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Source</p>
              <p className="font-monospace font-bold">Direct Sales (DSL)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created At</p>
              <p className="font-medium">{formatDateTime(booking.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Updated At</p>
              <p className="font-medium">{formatDateTime(booking.updated_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Customer ID</p>
              <p className="font-monospace text-xs">{booking.customer_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sale Status</p>
              <p className="font-medium">{getStatusBadge(booking.status)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-4 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
        <p className="text-sm text-muted-foreground">
          ✅ Complete direct sales order details for <strong>{booking.booking_number}</strong> | Total: <strong>{formatCurrency(booking.total_amount)}</strong> | Status: {getStatusBadge(booking.status)}
        </p>
      </div>

      {/* Pricing Breakdown Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowPricingBreakdown(true)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          View Detailed Pricing Breakdown
        </Button>
        <Button
          onClick={() => setShowInvoiceDialog(true)}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </div>

      {/* Pricing Breakdown Dialog */}
      <Dialog open={showPricingBreakdown} onOpenChange={setShowPricingBreakdown}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment & Pricing Details
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <PricingBreakdownDialog
              booking={booking}
              bookingType="direct_sale"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <InvoiceFormatDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        booking={booking}
        bookingItems={booking.bookingItems || []}
      />
    </div>
  )
}
