"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  FileText,
  Download,
  Share2,
  Package,
  Clock,
  Calendar,
  User,
  AlertCircle,
  Check,
  DollarSign,
} from "lucide-react"
import type { Invoice } from "@/lib/types"

interface ProductRentalInvoiceProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductRentalInvoice({
  invoice,
  open,
  onOpenChange,
}: ProductRentalInvoiceProps) {
  const [copied, setCopied] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      paid: "bg-green-100 text-green-800",
      partial: "bg-yellow-100 text-yellow-800",
      pending: "bg-red-100 text-red-800",
      overdue: "bg-red-200 text-red-900",
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const rentalData = invoice as any

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rental Invoice - {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription>
            Complete rental invoice for product order #{invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-6 py-4">
            {/* Rental Type Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                  <Package className="h-3 w-3 mr-1" />
                  Product Rental
                </Badge>
                {rentalData.booking_subtype === "rental" && (
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Rental Period
                  </Badge>
                )}
              </div>
              <Badge
                className={`${getPaymentStatusColor(invoice.payment_status || "pending")}`}
              >
                {invoice.payment_status === "paid"
                  ? "Paid"
                  : invoice.payment_status === "partial"
                    ? "Partial"
                    : "Pending"}
              </Badge>
            </div>

            {/* Customer Information */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Customer Name:</span>
                    <p>{rentalData.customer_name || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>
                    <p>{rentalData.customer_phone || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Address:</span>
                  <p>{rentalData.venue_address || "N/A"}</p>
                </div>
                {rentalData.event_name && (
                  <div>
                    <span className="font-medium">Event:</span>
                    <p>{rentalData.event_name}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Rental Period Information */}
            <Card className="p-4 border-orange-200 bg-orange-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                Rental Period
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-orange-900">Pickup Date:</span>
                    <p className="text-lg font-semibold">
                      {invoice.delivery_date
                        ? formatDate(invoice.delivery_date)
                        : "N/A"}
                    </p>
                    {(rentalData.delivery_time || invoice.delivery_date) && (
                      <p className="text-sm text-gray-600">
                        Time:{" "}
                        {rentalData.delivery_time ||
                          new Date(invoice.delivery_date).toLocaleTimeString(
                            "en-IN",
                            { hour: "2-digit", minute: "2-digit", hour12: true }
                          )}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Return Date:</span>
                    <p className="text-lg font-semibold">
                      {invoice.return_date
                        ? formatDate(invoice.return_date)
                        : "N/A"}
                    </p>
                    {(rentalData.return_time || invoice.return_date) && (
                      <p className="text-sm text-gray-600">
                        Time:{" "}
                        {rentalData.return_time ||
                          new Date(invoice.return_date).toLocaleTimeString(
                            "en-IN",
                            { hour: "2-digit", minute: "2-digit", hour12: true }
                          )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rental Duration Calculation */}
                {invoice.delivery_date && invoice.return_date && (
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <p className="text-sm font-medium text-orange-900">
                      Duration:{" "}
                      {Math.ceil(
                        (new Date(invoice.return_date).getTime() -
                          new Date(invoice.delivery_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </p>
                  </div>
                )}

                {rentalData.special_instructions && (
                  <div>
                    <span className="font-medium">Special Instructions:</span>
                    <p className="text-sm text-gray-700 mt-1">
                      {rentalData.special_instructions}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Invoice Details */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Invoice #</span>
                  <p className="font-semibold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <span className="text-gray-600">Created</span>
                  <p className="font-semibold">
                    {formatDate(invoice.created_at)}
                  </p>
                </div>
                {rentalData.payment_method && (
                  <div>
                    <span className="text-gray-600">Payment Method</span>
                    <p className="font-semibold">
                      {rentalData.payment_method === "full"
                        ? "Full Payment"
                        : rentalData.payment_method === "advance"
                          ? "Advance"
                          : "Partial"}
                    </p>
                  </div>
                )}
                {rentalData.order_status && (
                  <div>
                    <span className="text-gray-600">Order Status</span>
                    <p className="font-semibold capitalize">
                      {rentalData.order_status}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Rental Items */}
            {rentalData.invoice_items &&
              rentalData.invoice_items.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Rental Items ({rentalData.invoice_items.length})
                  </h3>
                  <div className="space-y-4">
                    {rentalData.invoice_items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
                      >
                        {/* Product Info */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-lg">
                              {item.product_name}
                            </h4>
                            {item.category && (
                              <Badge
                                variant="secondary"
                                className="mt-1 text-xs"
                              >
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          {item.barcode && (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.barcode}
                            </code>
                          )}
                        </div>

                        {/* Variant if exists */}
                        {item.variant_name && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <div className="text-sm font-semibold text-blue-900 mb-2">
                              Variant: {item.variant_name}
                            </div>
                            {item.variant_inclusions &&
                              item.variant_inclusions.length > 0 && (
                                <div className="text-xs text-blue-800 space-y-1">
                                  <p className="font-medium">Included:</p>
                                  {item.variant_inclusions.map(
                                    (inc: any, idx: number) => (
                                      <div key={idx} className="ml-2">
                                        • {inc.product_name} × {inc.quantity}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        )}

                        {/* Pricing */}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm">
                            <span className="text-gray-600">
                              {item.quantity || 1} × Included
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Line Total</p>
                            <p className="text-lg font-bold">
                              Included
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            {/* Financial Summary */}
            <Card className="p-4 border-green-200 bg-green-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Financial Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (Items)</span>
                  <span>{formatCurrency(rentalData.subtotal || 0)}</span>
                </div>
                {rentalData.gst_amount && rentalData.gst_amount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({rentalData.gst_percentage || 0}%)</span>
                    <span>{formatCurrency(rentalData.gst_amount)}</span>
                  </div>
                )}
                {rentalData.discount_amount && rentalData.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(rentalData.discount_amount)}</span>
                  </div>
                )}
                {rentalData.security_deposit &&
                  rentalData.security_deposit > 0 && (
                    <div className="flex justify-between">
                      <span>Security Deposit</span>
                      <span>{formatCurrency(rentalData.security_deposit)}</span>
                    </div>
                  )}
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span className="text-green-700">
                    {formatCurrency(
                      rentalData.total_amount ||
                        rentalData.amount_due ||
                        rentalData.balance_amount ||
                        0
                    )}
                  </span>
                </div>

                {/* Payment Status */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>Amount Paid</span>
                    <span className="font-semibold">
                      {formatCurrency(rentalData.amount_paid || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Amount</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(rentalData.pending_amount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <Card className="p-4 border-yellow-200 bg-yellow-50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Notes
                </h3>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Download PDF functionality
                  }}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Rental Invoice #${invoice.invoice_number}`
                    )
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
