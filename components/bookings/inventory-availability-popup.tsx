"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Package, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { format, addDays, subDays } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"

interface Product {
  id: string
  name: string
  stock_total: number
  stock_available: number
  stock_booked: number
  stock_damaged: number
  stock_in_laundry: number
}

interface DailyBooking {
  date: string
  bookings: {
    booking_number: string
    customer_name: string
    quantity: number
    source: 'package' | 'product'
    booking_id: string
  }[]
  totalQuantity: number
}

interface ProductAvailability {
  product: Product
  dailyBookings: DailyBooking[]
  totalBooked: number
}

interface InventoryAvailabilityPopupProps {
  packageId?: string
  variantId?: string
  productId?: string
  eventDate?: Date
  deliveryDate?: Date
  returnDate?: Date
  children: React.ReactNode
}

export function InventoryAvailabilityPopup({
  packageId,
  variantId,
  productId,
  eventDate,
  deliveryDate,
  returnDate,
  children,
}: InventoryAvailabilityPopupProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [availabilityData, setAvailabilityData] = useState<ProductAvailability[]>([])
  const [activeFranchiseId, setActiveFranchiseId] = useState("")
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    getCurrentUser()
      .then((user) => {
        if (mounted && user?.franchise_id) {
          setActiveFranchiseId(user.franchise_id)
        }
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [])

  const checkAvailability = async () => {
    if (!eventDate) {
      toast({
        title: "Date Required",
        description: "Please select an event date first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const franchiseId = activeFranchiseId || (await getCurrentUser())?.franchise_id || ""

      // Calculate date range (2 days before event, event day, 2 days after = 5 days)
      const startDate = subDays(eventDate, 2)
      const endDate = addDays(eventDate, 2)
      
      // Generate 5 dates (event date +/- 2 days)
      const dates: string[] = []
      for (let i = 0; i < 5; i++) {
        dates.push(format(addDays(startDate, i), 'yyyy-MM-dd'))
      }      console.log(`Checking availability for dates:`, dates)

      // Get products to check
      let productIds: string[] = []

      if (productId) {
        productIds = [productId]
      } else if (variantId) {
        let query = supabase.from("products").select("id").eq("is_active", true)
        if (franchiseId) {
          query = query.eq("franchise_id", franchiseId)
        }
        const { data: allProducts } = await query
        productIds = allProducts?.map((p) => p.id) || []
      } else {
        let query = supabase.from("products").select("id").eq("is_active", true)
        if (franchiseId) {
          query = query.eq("franchise_id", franchiseId)
        }
        const { data: allProducts } = await query
        productIds = allProducts?.map((p) => p.id) || []
      }

      // Get product details
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("is_active", true)
        .eq("franchise_id", franchiseId)

      if (!products || products.length === 0) {
        setAvailabilityData([])
        return
      }

      // Get all package bookings that overlap with our date range
      const { data: packageBookings } = await supabase
        .from("package_bookings")
        .select(`
          id,
          package_number,
          event_date,
          delivery_date,
          return_date,
          status,
          customer_id,
          customers(name)
        `)
        .lte('delivery_date', format(endDate, 'yyyy-MM-dd'))
        .gte('return_date', format(startDate, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')
        .eq('franchise_id', franchiseId)

      // Get package booking items
      const packageBookingIds = packageBookings?.map(b => b.id) || []
      const { data: packageItems } = await supabase
        .from("package_booking_items")
        .select("booking_id, reserved_products")
        .in("booking_id", packageBookingIds)

      // Get all product orders that overlap with our date range
      const { data: productOrders } = await supabase
        .from("product_orders")
        .select(`
          id,
          order_number,
          event_date,
          delivery_date,
          return_date,
          status,
          customer_id,
          customers(name)
        `)
        .lte('delivery_date', format(endDate, 'yyyy-MM-dd'))
        .gte('return_date', format(startDate, 'yyyy-MM-dd'))
        .neq('status', 'cancelled')
        .eq('franchise_id', franchiseId)

      // Get product order items
      const productOrderIds = productOrders?.map(o => o.id) || []
      const { data: productOrderItems } = await supabase
        .from("product_order_items")
        .select("order_id, product_id, quantity")
        .in("order_id", productOrderIds)
        .in("product_id", productIds)

      // Build availability data for each product
      const availability: ProductAvailability[] = products.map(product => {
        const dailyBookings: DailyBooking[] = dates.map(date => {
          const bookings: DailyBooking['bookings'] = []

          // Check package bookings for this date - check if date falls within delivery_date to return_date
          packageBookings?.forEach(booking => {
            const deliveryDate = booking.delivery_date || booking.event_date
            const returnDate = booking.return_date || booking.event_date
            
            // Check if the current date falls within the booking period
            if (date >= deliveryDate && date <= returnDate) {
              // Check if any package items have this product in reserved_products
              const items = packageItems?.filter(item => item.booking_id === booking.id) || []
              items.forEach(item => {
                if (item.reserved_products) {
                  const reserved = Array.isArray(item.reserved_products) 
                    ? item.reserved_products 
                    : []
                  
                  const productInReserved = reserved.find((r: any) => r.id === product.id || r.product_id === product.id)
                  if (productInReserved) {
                    const qty = productInReserved.quantity || 1
                    bookings.push({
                      booking_number: booking.package_number || booking.id.slice(0, 8),
                      customer_name: (booking.customers as any)?.name || 'Unknown',
                      quantity: qty,
                      source: 'package',
                      booking_id: booking.id
                    })
                  }
                }
              })
            }
          })

          // Check product orders for this date - check if date falls within delivery_date to return_date
          productOrders?.forEach(order => {
            const deliveryDate = order.delivery_date || order.event_date
            const returnDate = order.return_date || order.event_date
            
            // Check if the current date falls within the booking period
            if (date >= deliveryDate && date <= returnDate) {
              const items = productOrderItems?.filter(item => 
                item.order_id === order.id && item.product_id === product.id
              ) || []
              
              items.forEach(item => {
                bookings.push({
                  booking_number: order.order_number || order.id.slice(0, 8),
                  customer_name: (order.customers as any)?.name || 'Unknown',
                  quantity: item.quantity,
                  source: 'product',
                  booking_id: order.id
                })
              })
            }
          })

          const totalQuantity = bookings.reduce((sum, b) => sum + b.quantity, 0)

          return {
            date,
            bookings,
            totalQuantity
          }
        })

        const totalBooked = dailyBookings.reduce((sum, day) => sum + day.totalQuantity, 0)

        return {
          product,
          dailyBookings,
          totalBooked
        }
      })

      setAvailabilityData(availability)
      console.log(`Availability check complete for ${availability.length} products`)
    } catch (error) {
      console.error("Error checking availability:", error)
      toast({
        title: "Error",
        description: "Failed to check inventory availability",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      checkAvailability()
    }
  }

  const isEventDate = (dateStr: string) => {
    return eventDate && dateStr === format(eventDate, 'yyyy-MM-dd')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Calendar className="h-4 w-4" />
            5-Day Booking Overview
          </DialogTitle>
          {eventDate && (
            <p className="text-xs text-gray-500">
              {returnDate 
                ? `Rental Period: ${format(eventDate, "MMM dd")} - ${format(returnDate, "MMM dd, yyyy")}`
                : `${format(subDays(eventDate, 2), "MMM dd")} - ${format(addDays(eventDate, 2), "MMM dd, yyyy")}`
              }
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {availabilityData.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <>
                {availabilityData.map((data) => (
                  <Card key={data.product.id} className="border">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{data.product.name}</CardTitle>
                        <div className="flex items-center gap-3 text-xs">
                          <div><span className="text-gray-500">Stock:</span> <span className="font-bold">{data.product.stock_total}</span></div>
                          <div><span className="text-gray-500">Available:</span> <span className="font-semibold text-green-600">{data.product.stock_available}</span></div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 p-3 pt-0">
                      {/* Daily breakdown */}
                      {data.dailyBookings.map((day, index) => {
                        const isEvent = isEventDate(day.date)
                        const hasBookings = day.bookings.length > 0
                        
                        return (
                          <div 
                            key={day.date} 
                            className={cn(
                              "border rounded p-2 text-xs",
                              isEvent && "border-blue-500 bg-blue-50",
                              !isEvent && hasBookings && "bg-orange-50 border-orange-200",
                              !hasBookings && "bg-gray-50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                <span className="font-medium text-xs">
                                  {format(new Date(day.date), "EEE, MMM dd")}
                                </span>
                                {isEvent && (
                                  <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                    Event Date
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {hasBookings ? (
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                    {day.totalQuantity} Booked
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                    Available
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Booking details */}
                            {hasBookings && (
                              <div className="space-y-1 mt-1.5">
                                {day.bookings.map((booking, idx) => (
                                  <div 
                                    key={idx}
                                    className="flex items-center justify-between p-1.5 bg-white rounded border text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant={booking.source === 'package' ? 'default' : 'secondary'}
                                        className="text-[10px] h-4 px-1.5"
                                      >
                                        {booking.source === 'package' ? '📦' : '🛒'}
                                      </Badge>
                                      <div>
                                        <div className="font-medium text-xs">
                                          {booking.customer_name}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                          {booking.booking_number}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="font-bold text-orange-600 text-xs">
                                      Qty: {booking.quantity}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Summary */}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Total bookings in 5 days:</span>
                          <span className="font-bold text-sm">{data.totalBooked} units</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
