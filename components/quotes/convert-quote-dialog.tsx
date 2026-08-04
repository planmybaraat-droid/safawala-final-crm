"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  CheckCircle, 
  CalendarIcon, 
  User, 
  Package, 
  DollarSign, 
  MapPin,
  Clock,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Quote } from "@/lib/types"

interface ConvertQuoteDialogProps {
  quote: Quote
  trigger?: React.ReactNode
  onSuccess?: (bookingId: string) => void
}

interface ConversionData {
  delivery_date: Date | null
  pickup_date: Date | null
  advance_amount: number
  payment_method: "cash" | "card" | "upi" | "bank_transfer" | "cheque"
  notes: string
  assigned_staff?: string
  special_instructions: string
}

export function ConvertQuoteDialog({ quote, trigger, onSuccess }: ConvertQuoteDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  const [conversionData, setConversionData] = useState<ConversionData>({
    delivery_date: quote.delivery_date ? new Date(quote.delivery_date) : null,
    pickup_date: quote.return_date ? new Date(quote.return_date) : null,
    advance_amount: 0,
    payment_method: "cash",
    notes: quote.notes || "",
    special_instructions: quote.special_instructions || ""
  })

  const handleConvert = async () => {
    try {
      setLoading(true)

      // Convert quote to booking
      const response = await fetch("/api/quotes/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quote_id: quote.id,
          booking_type: quote.booking_type || "product"
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to convert quote")
      }

      const result = await response.json()
      
      toast({
        title: "Success!",
        description: `Quote converted to booking ${result.booking_number}`,
      })

      setOpen(false)
      onSuccess?.(result.booking_id)
      
    } catch (error) {
      console.error("Error converting quote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert quote",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const isValidForConversion = quote.status === "generated" || quote.status === "quote" || quote.status === "sent" || quote.status === "accepted"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            className="bg-green-600 hover:bg-green-700"
            disabled={!isValidForConversion}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Convert to Booking
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Convert Quote to Booking</span>
          </DialogTitle>
        </DialogHeader>

        {!isValidForConversion && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Quote must be accepted or sent to convert to booking
            </span>
          </div>
        )}

        <div className="space-y-6">
          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Quote Number</div>
                  <div className="font-medium">{quote.quote_number}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Status</div>
                  <Badge variant={quote.status === 'accepted' ? 'default' : 'secondary'}>
                    {quote.status}
                  </Badge>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Customer</div>
                  <div className="font-medium">{quote.customer_name}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-muted-foreground">Total Amount</div>
                  <div className="font-bold text-lg">₹{quote.total_amount.toLocaleString()}</div>
                </div>
              </div>
              
              {quote.event_date && (
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Event Date: {format(new Date(quote.event_date), "PPP")}</span>
                </div>
              )}
              
              {quote.venue_name && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Venue: {quote.venue_name}</span>
                </div>
              )}

              {/* Quote Items */}
              {quote.quote_items && quote.quote_items.length > 0 && (
                <div>
                  <div className="font-semibold text-sm text-muted-foreground mb-2">Items</div>
                  <div className="space-y-2">
                    {quote.quote_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.quantity} × ₹{item.unit_price.toLocaleString()}
                          </div>
                        </div>
                        <div className="font-medium">₹{item.total_price.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_date">Delivery Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !conversionData.delivery_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {conversionData.delivery_date 
                          ? format(conversionData.delivery_date, "PPP") 
                          : "Pick delivery date"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={conversionData.delivery_date || undefined}
                        onSelect={(date) => setConversionData({ 
                          ...conversionData, 
                          delivery_date: date || null 
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="pickup_date">Pickup Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !conversionData.pickup_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {conversionData.pickup_date 
                          ? format(conversionData.pickup_date, "PPP") 
                          : "Pick pickup date"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={conversionData.pickup_date || undefined}
                        onSelect={(date) => setConversionData({ 
                          ...conversionData, 
                          pickup_date: date || null 
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="advance_amount">Advance Payment</Label>
                  <Input
                    id="advance_amount"
                    type="number"
                    value={conversionData.advance_amount}
                    onChange={(e) => setConversionData({ 
                      ...conversionData, 
                      advance_amount: parseFloat(e.target.value) || 0 
                    })}
                    placeholder="0"
                    min="0"
                    max={quote.total_amount}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Max: ₹{quote.total_amount.toLocaleString()}
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={conversionData.payment_method}
                    onValueChange={(value: typeof conversionData.payment_method) => 
                      setConversionData({ ...conversionData, payment_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={conversionData.special_instructions}
                  onChange={(e) => setConversionData({ 
                    ...conversionData, 
                    special_instructions: e.target.value 
                  })}
                  placeholder="Any special delivery or setup instructions..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={conversionData.notes}
                  onChange={(e) => setConversionData({ 
                    ...conversionData, 
                    notes: e.target.value 
                  })}
                  placeholder="Any additional notes for this booking..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">₹{quote.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advance Payment:</span>
                  <span className="font-medium text-green-600">
                    ₹{conversionData.advance_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Pending Amount:</span>
                  <span className="text-red-600">
                    ₹{(quote.total_amount - conversionData.advance_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConvert}
              disabled={loading || !isValidForConversion || !conversionData.delivery_date}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Convert to Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}