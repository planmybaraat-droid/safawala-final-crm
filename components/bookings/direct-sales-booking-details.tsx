/**
 * DirectSalesBookingDetails Component
 * 
 * Comprehensive view for direct sales product orders with all 9 sections:
 * 1. Order header (quick glance)
 * 2. Customer info
 * 3. Payment breakdown
 * 4. Delivery details (if any)
 * 5. Products table
 * 6. Contact persons (if applicable)
 * 7. Modifications (if applicable)
 * 8. Event/booking metadata
 * 9. Special instructions (if any)
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
  Wrench,
  FileText,
  AlertCircle,
} from "lucide-react"
import { PricingBreakdownDialog } from "./pricing-breakdown-dialog"
import { InvoiceFormatDialog } from "@/components/invoices"
import type { Booking } from "@/lib/types"
import { formatTime12Hour } from "@/lib/utils"

interface DirectSalesBookingDetailsProps {
  booking: Booking & {
    bookingItems?: any[]
    booking_type?: string
    source?: string
  }
}

export function DirectSalesBookingDetails({ booking }: DirectSalesBookingDetailsProps) {
  const [showPricingBreakdown, setShowPricingBreakdown] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  if (!booking) return null

  const bookingType = (booking as any).booking_type || (booking as any).booking_subtype || 'sale'
  const isSale = bookingType === 'sale' || (booking as any).source === 'product_orders'

  if (!isSale) return null // Only show for direct sales

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

  // Helper function to format datetime
  const formatDateTime = (date: string | undefined, time?: string) => {
    if (!date) return 'N/A'
    const dateStr = formatDate(date)
    if (time) return `${dateStr} at ${formatTime12Hour(time)}`
    return dateStr
  }

  // Get status badge
  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'confirmed': { label: 'Confirmed ✅', color: 'bg-green-100 text-green-800' },
      'delivered': { label: 'Delivered 📦', color: 'bg-blue-100 text-blue-800' },
      'order_complete': { label: 'Order Complete ✅', color: 'bg-purple-100 text-purple-800' },
      'pending': { label: 'Pending ⏳', color: 'bg-yellow-100 text-yellow-800' },
      'cancelled': { label: 'Cancelled ❌', color: 'bg-red-100 text-red-800' },
    }
    const statusInfo = statusMap[status || 'pending']
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* ===== 1️⃣ ORDER HEADER - Quick Glance ===== */}
      <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-semibold">Order #</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {booking.booking_number || (booking as any).order_number || 'N/A'}
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
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(booking.total_amount)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
            <p className="text-sm text-muted-foreground">
              Created: {formatDate(booking.created_at)}
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
              <p className="text-sm text-muted-foreground">WhatsApp</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {(booking.customer as any)?.whatsapp_number || booking.customer?.phone || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{booking.customer?.email || 'N/A'}</p>
            </div>
            <div className="col-span-2">
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
                <span className="font-medium">{formatCurrency((booking as any).subtotal || booking.total_amount)}</span>
              </div>

              {(booking as any).discount_amount && (booking as any).discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">💸 Discount</span>
                  <span className="font-medium text-green-600">-{formatCurrency((booking as any).discount_amount)}</span>
                </div>
              )}

              {booking.coupon_code && booking.coupon_discount && booking.coupon_discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">🎟️ Coupon ({booking.coupon_code})</span>
                  <span className="font-medium text-green-600">-{formatCurrency(booking.coupon_discount)}</span>
                </div>
              )}

              {booking.tax_amount && booking.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">📊 Tax ({(booking as any).tax_percentage || 5}%)</span>
                  <span className="font-medium">+{formatCurrency(booking.tax_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-3" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg bg-green-50 dark:bg-green-950 p-3 rounded">
                <span>Grand Total</span>
                <span className="text-green-700 dark:text-green-400">{formatCurrency(booking.total_amount)}</span>
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

      {/* ===== 4️⃣ DELIVERY DATE & TIME (if applicable) ===== */}
      {booking.delivery_date && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardContent className="pt-4 flex items-center gap-3">
            <Truck className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">📦 Delivery</p>
              <p className="font-bold text-indigo-700 dark:text-indigo-400">
                {formatDateTime(booking.delivery_date, (booking as any).delivery_time)}
              </p>
            </div>
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
                    <th className="text-right py-2 px-2 text-muted-foreground">Price</th>
                    <th className="text-right py-2 px-2 text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.bookingItems.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.product_name || item.product?.name || 'Item'}</p>
                          <p className="text-xs text-muted-foreground">{item.category_name || item.product?.category || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-medium">{item.quantity || 1}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.unit_price || item.price)}</td>
                      <td className="py-3 px-2 text-right font-bold">
                        {formatCurrency((item.quantity || 1) * (item.unit_price || item.price || 0))}
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
      {(booking.groom_name || booking.bride_name) && (
        <Card>
          <CardHeader className="bg-pink-50 dark:bg-pink-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              ☎️ Contact Persons
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booking.groom_name && (
                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                  <p className="font-bold text-lg mb-2">🤵 Primary Contact</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{booking.groom_name}</p>
                    </div>
                    {booking.groom_additional_whatsapp && (
                      <div>
                        <p className="text-sm text-muted-foreground">📱 WhatsApp</p>
                        <p className="font-medium">{booking.groom_additional_whatsapp}</p>
                      </div>
                    )}
                    {booking.groom_home_address && (
                      <div>
                        <p className="text-sm text-muted-foreground">📍 Address</p>
                        <p className="font-medium text-sm">{booking.groom_home_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {booking.bride_name && (
                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                  <p className="font-bold text-lg mb-2">👰 Secondary Contact</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{booking.bride_name}</p>
                    </div>
                    {booking.bride_additional_whatsapp && (
                      <div>
                        <p className="text-sm text-muted-foreground">📱 WhatsApp</p>
                        <p className="font-medium">{booking.bride_additional_whatsapp}</p>
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

      {/* ===== 7️⃣ MODIFICATIONS (if applicable) ===== */}
      {((booking as any).has_modifications || (booking as any).modifications_details) && (
        <Card>
          <CardHeader className="bg-orange-50 dark:bg-orange-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              🔧 Modifications Required
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {(booking as any).modifications_details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase">Details</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 bg-orange-50 dark:bg-orange-950/30 p-3 rounded mt-1">
                    {(booking as any).modifications_details}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(booking as any).modification_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase">Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {formatDate((booking as any).modification_date)}
                    </p>
                  </div>
                )}

                {(booking as any).modification_time && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase">Time</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                      {(booking as any).modification_time}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* ===== 9️⃣ SPECIAL INSTRUCTIONS (if any) ===== */}
      {booking.special_instructions && (
        <Card>
          <CardHeader className="bg-cyan-50 dark:bg-cyan-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              📝 Special Instructions & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="bg-cyan-50 dark:bg-cyan-950/30 border-l-4 border-cyan-500 p-4 rounded">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {booking.special_instructions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Summary */}
      <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
        <p className="text-sm text-muted-foreground">
          ✅ All information captured for direct sales order <strong>{booking.booking_number || (booking as any).order_number}</strong>
        </p>
      </div>

      {/* Pricing Breakdown Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowPricingBreakdown(true)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
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
              bookingType="rental"
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
