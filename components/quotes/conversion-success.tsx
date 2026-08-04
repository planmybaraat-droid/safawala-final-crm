"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight, Calendar, User, DollarSign, Package } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface ConversionSuccessProps {
  quote: {
    quote_number: string
    customer_name?: string
    total_amount: number
  }
  booking: {
    id: string
    booking_number: string
    status: string
    event_date?: string
    delivery_date?: string
  }
  onClose?: () => void
}

export function ConversionSuccess({ quote, booking, onClose }: ConversionSuccessProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>Quote Converted Successfully!</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center space-x-4 py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Quote</div>
            <Badge variant="outline" className="font-mono">
              {quote.quote_number}
            </Badge>
          </div>
          
          <ArrowRight className="h-6 w-6 text-green-600" />
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Booking</div>
            <Badge className="bg-green-600 font-mono">
              {booking.booking_number}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{quote.customer_name || 'Customer'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>₹{quote.total_amount.toLocaleString()}</span>
          </div>

          {booking.event_date && (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Event: {format(new Date(booking.event_date), "MMM dd, yyyy")}</span>
            </div>
          )}

          {booking.delivery_date && (
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Delivery: {format(new Date(booking.delivery_date), "MMM dd, yyyy")}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-2 pt-4">
          <Link href={`/bookings/${booking.id}`}>
            <Button size="sm">
              View Booking Details
            </Button>
          </Link>
          <Link href="/bookings">
            <Button variant="outline" size="sm">
              All Bookings
            </Button>
          </Link>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}