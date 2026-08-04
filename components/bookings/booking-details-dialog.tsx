"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  Eye
} from "lucide-react"
import { format } from "date-fns"
import type { Booking } from "@/lib/types"
import { useRouter } from "next/navigation"

interface BookingDetailsDialogProps {
  booking: Booking
  trigger?: React.ReactNode
  onEdit?: (booking: Booking) => void
  onStatusUpdate?: (bookingId: string, status: string) => void
}

export function BookingDetailsDialog({ 
  booking, 
  trigger,
  onEdit,
  onStatusUpdate 
}: BookingDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const getStatusColor = (status: string) => {
    const colors = {
      pending_selection: "bg-blue-500",
      confirmed: "bg-green-500",
      delivered: "bg-purple-500",
      returned: "bg-gray-500",
      order_complete: "bg-emerald-500",
      cancelled: "bg-red-500"
    }
    return colors[status as keyof typeof colors] || "bg-gray-500"
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending_selection: "Selection Pending", 
      confirmed: "Confirmed",
      delivered: "Delivered",
      returned: "Rental Completed",
      order_complete: "Complete",
      cancelled: "Cancelled"
    }
    return labels[status as keyof typeof labels] || status
  }

  const getNextStatus = (currentStatus: string) => {
    const flow = {
      pending_selection: "confirmed", 
      confirmed: "delivered",
      delivered: "returned",
      returned: "order_complete"
    }
    return flow[currentStatus as keyof typeof flow]
  }

  const getStatusAction = (status: string) => {
    const actions = {
      pending_selection: "Confirm Selection",
      confirmed: "Mark as Delivered", 
      delivered: "Mark as Rental Completed",
      returned: "Complete Order"
    }
    return actions[status as keyof typeof actions]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Booking Details - {booking.booking_number}</span>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(booking.status) + " text-white"}>
                {getStatusLabel(booking.status)}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(booking)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.customer?.name || 'N/A'}</span>
              </div>
              {booking.customer?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.customer.phone}</span>
                </div>
              )}
              {booking.customer?.email && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm">📧</span>
                  <span>{booking.customer.email}</span>
                </div>
              )}
              {booking.customer?.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div>{booking.customer.address}</div>
                    {booking.customer?.city && (
                      <div className="text-sm text-muted-foreground">
                        {booking.customer.city}, {booking.customer?.state || ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Event Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {booking.event_date ? format(new Date(booking.event_date), "PPP") : 'Not set'}
                </span>
              </div>
              {booking.event_type && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm">🎉</span>
                  <span className="capitalize">{booking.event_type}</span>
                </div>
              )}
              {booking.venue_name && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">{booking.venue_name}</div>
                    {booking.venue_address && (
                      <div className="text-sm text-muted-foreground">{booking.venue_address}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <span>Delivery Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.delivery_date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Delivery: {format(new Date(booking.delivery_date), "PPP")}</span>
                </div>
              )}
              {booking.pickup_date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Pickup: {format(new Date(booking.pickup_date), "PPP")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>💰 Price Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price Breakdown */}
              <div className="space-y-2">
                {/* Items Subtotal */}
                {booking.subtotal_amount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span>Items Subtotal</span>
                    <span className="font-medium">₹{(booking.subtotal_amount || 0).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Manual Discount */}
                {booking.discount_amount && booking.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount (40%)</span>
                    <span className="font-medium">-₹{booking.discount_amount.toLocaleString()}</span>
                  </div>
                )}

                {/* Coupon Discount */}
                {booking.coupon_code && booking.coupon_discount && booking.coupon_discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon ({booking.coupon_code})</span>
                    <span className="font-medium">-₹{booking.coupon_discount.toLocaleString()}</span>
                  </div>
                )}

                {/* After Discounts */}
                {((booking.discount_amount && booking.discount_amount > 0) || 
                  (booking.coupon_discount && booking.coupon_discount > 0)) && (
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>After Discounts</span>
                    <span>₹{(
                      (booking.subtotal_amount || 0) - 
                      (booking.discount_amount || 0) - 
                      (booking.coupon_discount || 0)
                    ).toLocaleString()}</span>
                  </div>
                )}
                
                {/* GST */}
                {booking.tax_amount && booking.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>GST (5%)</span>
                    <span className="font-medium">₹{booking.tax_amount.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Grand Total */}
                <div className="flex justify-between font-bold text-base border-t pt-2 bg-green-50 p-2 rounded">
                  <span>Grand Total</span>
                  <span className="text-green-700 text-lg">₹{(booking.total_amount || 0).toLocaleString()}</span>
                </div>

                {/* Payment Method */}
                {booking.payment_method && (
                  <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                    <span>💳 Payment Method:</span>
                    <span className="font-medium text-blue-700">{booking.payment_method}</span>
                  </div>
                )}

                {/* Security Deposit */}
                {booking.security_deposit && booking.security_deposit > 0 && (
                  <div className="flex justify-between text-sm bg-blue-50 p-2 rounded border border-blue-200">
                    <span className="flex items-center gap-1">
                      <span>🔒 Refundable Security Deposit</span>
                    </span>
                    <span className="font-medium text-blue-700">₹{booking.security_deposit.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Payment Status */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="text-green-600 font-medium">₹{(booking.paid_amount || booking.amount_paid || 0).toLocaleString()}</span>
                </div>
                
                {booking.total_amount > (booking.paid_amount || booking.amount_paid || 0) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="text-red-600 font-bold text-lg">
                      ₹{(booking.total_amount - (booking.paid_amount || booking.amount_paid || 0)).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {booking.total_amount === (booking.paid_amount || booking.amount_paid || 0) && booking.total_amount > 0 && (
                  <div className="flex items-center justify-center p-2 bg-green-50 rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-600 font-medium text-sm">Fully Paid</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        {booking.items && booking.items.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Order Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {booking.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × ₹{(item.unit_price || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₹{(item.total_price || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {booking.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Status Actions */}
        {(onStatusUpdate && getNextStatus(booking.status)) && (
          <div className="mt-6 flex justify-end space-x-2">
            {booking.status === 'delivered' ? (
              <Button
                onClick={() => {
                  // Close the dialog then navigate to booking details (Returns & Settlement)
                  setOpen(false)
                  router.push(`/bookings/${booking.id}#returns-settlement`)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {getStatusAction(booking.status)}
              </Button>
            ) : (
              <Button
                onClick={() => onStatusUpdate(booking.id, getNextStatus(booking.status)!)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {getStatusAction(booking.status)}
              </Button>
            )}
            {booking.status !== 'cancelled' && (
              <Button
                variant="destructive"
                onClick={() => onStatusUpdate(booking.id, 'cancelled')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}