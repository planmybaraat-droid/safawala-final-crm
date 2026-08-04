"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Percent, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react"

interface PricingBreakdownProps {
  booking: any
  bookingType: 'package_full' | 'package_advance' | 'package_partial' | 'rental' | 'direct_sale'
}

export function PricingBreakdownDialog({ booking, bookingType }: PricingBreakdownProps) {
  // Helper function to format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₹0'
    return `₹${amount.toLocaleString()}`
  }

  // Extract payment data
  const totalAmount = booking?.total_amount || 0
  const paidAmount = booking?.paid_amount || booking?.amount_paid || 0
  const securityDeposit = booking?.security_deposit || 0
  const paymentType = booking?.payment_type || 'full'
  const customAmount = booking?.custom_amount || 0
  const discountAmount = booking?.discount_amount || 0
  const couponDiscount = booking?.coupon_discount || 0
  const taxAmount = booking?.tax_amount || 0
  const gstPercentage = booking?.gst_percentage || 5
  const subtotalAmount = booking?.subtotal_amount || 0

  // Calculate derived values
  const pendingAmount = Math.max(0, totalAmount - paidAmount)
  const isFullyPaid = paidAmount >= totalAmount
  const isUnpaid = paidAmount === 0
  const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount
  const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  // Determine payment status
  const getPaymentStatus = () => {
    if (isFullyPaid) return { label: 'Fully Paid', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' }
    if (isUnpaid) return { label: 'Unpaid', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' }
    return { label: 'Pending Payment', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
  }

  const paymentStatus = getPaymentStatus()
  const StatusIcon = paymentStatus.icon

  // ==========================================
  // 1. PACKAGE BOOKING - FULL PAYMENT
  // ==========================================
  if (bookingType === 'package_full') {
    return (
      <div className="space-y-4">
        {/* Header Card */}
        <Card className={`border-2 ${paymentStatus.color.replace('text', 'border')} ${paymentStatus.bg}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                📦 Package Booking - Full Payment
              </CardTitle>
              <Badge variant={isFullyPaid ? 'default' : 'warning'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {paymentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Price Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Package Price</p>
                <p className="text-2xl font-bold">{formatCurrency(subtotalAmount || totalAmount)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">GST ({gstPercentage}%)</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(taxAmount)}</p>
              </div>
            </div>

            {/* Discount Info */}
            {(discountAmount > 0 || couponDiscount > 0) && (
              <div className="border-t pt-3 space-y-2">
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Manual Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon ({booking?.coupon_code})</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Total & Deposit */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Grand Total</span>
                <span className="text-green-700">{formatCurrency(totalAmount)}</span>
              </div>
              {securityDeposit > 0 && (
                <div className="flex justify-between items-center text-amber-600 font-semibold">
                  <span>+ Refundable Deposit</span>
                  <span>{formatCurrency(securityDeposit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold text-xl border-t pt-2 text-green-700">
                <span>💰 Payable Now</span>
                <span>{formatCurrency(totalAmount + securityDeposit)}</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="border-t pt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, paymentPercentage)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isFullyPaid ? '✓ Complete' : `${Math.round(paymentPercentage)}% received`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================
  // 2. PACKAGE BOOKING - ADVANCE PAYMENT (50/50)
  // ==========================================
  if (bookingType === 'package_advance') {
    const advanceAmount = totalAmount / 2
    const remainingAmount = totalAmount - advanceAmount

    return (
      <div className="space-y-4">
        {/* Header Card */}
        <Card className={`border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                📦 Package Booking - Advance Payment (50/50)
              </CardTitle>
              <Badge variant={isFullyPaid ? 'default' : 'warning'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {paymentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Breakdown */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Package Price</p>
                <p className="font-semibold">{formatCurrency(subtotalAmount || totalAmount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">GST ({gstPercentage}%)</p>
                <p className="font-semibold text-blue-600">{formatCurrency(taxAmount)}</p>
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Split */}
            <div className="space-y-3 border-t pt-3">
              {/* Paid Now */}
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-green-700">✓ Paid Now (50%)</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(advanceAmount)}</span>
                </div>
                {securityDeposit > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>+ Deposit</span>
                    <span>{formatCurrency(securityDeposit)}</span>
                  </div>
                )}
                <div className="border-t border-green-200 dark:border-green-800 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-green-700">Total Due Now</span>
                  <span className="text-green-700">{formatCurrency(advanceAmount + securityDeposit)}</span>
                </div>
              </div>

              {/* Remaining Later */}
              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-orange-700">📅 Due Later (50%)</span>
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(remainingAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment Status Progress */}
            <div className="border-t pt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-semibold">{Math.round(paymentPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, paymentPercentage)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600">Paid: {formatCurrency(paidAmount)}</span>
                {" | "}
                <span className="text-orange-600">Pending: {formatCurrency(pendingAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================
  // 3. PACKAGE BOOKING - PARTIAL PAYMENT
  // ==========================================
  if (bookingType === 'package_partial') {
    const remainingPackage = Math.max(0, totalAmount - customAmount)

    return (
      <div className="space-y-4">
        {/* Header Card */}
        <Card className={`border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                📦 Package Booking - Partial Payment
              </CardTitle>
              <Badge variant={isFullyPaid ? 'default' : 'warning'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {paymentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Breakdown */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Package Price</p>
                <p className="font-semibold">{formatCurrency(subtotalAmount || totalAmount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">GST ({gstPercentage}%)</p>
                <p className="font-semibold text-purple-600">{formatCurrency(taxAmount)}</p>
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>Grand Total</span>
                <span className="text-purple-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Split */}
            <div className="space-y-3 border-t pt-3">
              {/* Paid Now */}
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-green-700">✓ Paid Now (Custom)</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(customAmount || paidAmount)}</span>
                </div>
                <p className="text-xs text-green-600 mt-1">Only package amount - no deposit collected</p>
              </div>

              {/* Remaining Later */}
              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-orange-700">📅 Due Later</span>
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(remainingPackage + securityDeposit)}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Remaining Package</span>
                    <span>{formatCurrency(remainingPackage)}</span>
                  </div>
                  {securityDeposit > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>+ Refundable Deposit</span>
                      <span>{formatCurrency(securityDeposit)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Status Progress */}
            <div className="border-t pt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-semibold">{Math.round(paymentPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, paymentPercentage)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600">Paid: {formatCurrency(customAmount || paidAmount)}</span>
                {" | "}
                <span className="text-orange-600">Pending: {formatCurrency(remainingPackage + securityDeposit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================
  // 4. RENTAL / PRODUCT ORDER
  // ==========================================
  if (bookingType === 'rental') {
    const totalWithDeposit = totalAmount + securityDeposit
    const paidWithDeposit = Math.min(paidAmount, totalWithDeposit)
    const paymentPercentageWithDeposit = totalWithDeposit > 0 ? (paidWithDeposit / totalWithDeposit) * 100 : 0

    return (
      <div className="space-y-4">
        <Card className={`border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                🚚 Product Rental / Order
              </CardTitle>
              <Badge variant={paidWithDeposit >= totalWithDeposit ? 'default' : 'warning'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {paymentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price</span>
                <span className="font-semibold">{formatCurrency(subtotalAmount || totalAmount)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({gstPercentage}%)</span>
                  <span className="font-semibold text-indigo-600">{formatCurrency(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Package Total</span>
                <span className="text-indigo-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Deposit Section (if applicable) */}
            {securityDeposit > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center text-amber-700 font-semibold">
                  <span>+ Refundable Security Deposit</span>
                  <span>{formatCurrency(securityDeposit)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                  <span className="text-indigo-700">💰 Total Payable Now</span>
                  <span className="text-indigo-700">{formatCurrency(totalAmount + securityDeposit)}</span>
                </div>
              </div>
            )}

            {/* Payment Status */}
            <div className="border-t pt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, paymentPercentageWithDeposit)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {paidWithDeposit >= totalWithDeposit ? '✓ Complete' : `${Math.round(paymentPercentageWithDeposit)}% received, ${formatCurrency(totalWithDeposit - paidWithDeposit)} pending`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================
  // 5. DIRECT SALES
  // ==========================================
  if (bookingType === 'direct_sale') {
    const totalWithDeposit = totalAmount + securityDeposit
    const paidWithDeposit = Math.min(paidAmount, totalWithDeposit)
    const paymentPercentageWithDeposit = totalWithDeposit > 0 ? (paidWithDeposit / totalWithDeposit) * 100 : 0

    return (
      <div className="space-y-4">
        <Card className={`border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                🛍️ Direct Sales Order
              </CardTitle>
              <Badge variant={paidWithDeposit >= totalWithDeposit ? 'default' : 'warning'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {paymentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotalAmount || totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon</span>
                  <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({gstPercentage}%)</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount</span>
                <span className="text-emerald-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Deposit Section (if applicable) */}
            {securityDeposit > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center text-amber-700 font-semibold">
                  <span>+ Additional Security Deposit</span>
                  <span>{formatCurrency(securityDeposit)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                  <span className="text-emerald-700">💰 Total Payable Now</span>
                  <span className="text-emerald-700">{formatCurrency(totalAmount + securityDeposit)}</span>
                </div>
              </div>
            )}

            {/* Payment Status */}
            <div className="border-t pt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, paymentPercentageWithDeposit)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {paidWithDeposit >= totalWithDeposit ? '✓ Complete' : `${Math.round(paymentPercentageWithDeposit)}% received, ${formatCurrency(totalWithDeposit - paidWithDeposit)} pending`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
