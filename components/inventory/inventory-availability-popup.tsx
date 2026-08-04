"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Package, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/auth"

interface Product {
  id: string
  name: string
  stock_available: number
  stock_booked: number
  stock_total: number
}

interface BookingConflict {
  booking_id: string
  delivery_date: string
  return_date: string
  quantity: number
  customer_name: string
  return_status?: 'returned' | 'in_progress'
}

interface AvailabilityData {
  product: Product
  availableQuantity: number
  conflicts: BookingConflict[]
  nextAvailableDate: string | null
}

interface InventoryAvailabilityPopupProps {
  isOpen: boolean
  onClose: () => void
  productIds: string[]
  bookingDate: string
  returnDate?: string
  requiredQuantities: { [productId: string]: number }
}

export default function InventoryAvailabilityPopup({
  isOpen,
  onClose,
  productIds,
  bookingDate,
  returnDate,
  requiredQuantities,
}: InventoryAvailabilityPopupProps) {
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    let mounted = true
    getCurrentUser()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user)
          setUserLoaded(true)
        }
      })
      .catch(() => {
        if (mounted) setUserLoaded(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (isOpen && productIds.length > 0 && bookingDate && userLoaded) {
      checkAvailability()
    }
  }, [isOpen, productIds, bookingDate, returnDate, userLoaded])

  const checkAvailability = async () => {
    setLoading(true)
    try {
      const bookingDateObj = new Date(bookingDate)
      const startDate = new Date(bookingDateObj)
      startDate.setDate(startDate.getDate() - 2)
      const endDate = new Date(bookingDateObj)
      endDate.setDate(endDate.getDate() + 2)

      console.log("[v0] Checking availability for date range:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        productIds,
        requiredQuantities,
      })

      let productsQuery = supabase
        .from("products")
        .select("id, name, stock_available, stock_booked, stock_total")
        .in("id", productIds)

      if (currentUser?.role !== "super_admin" && currentUser?.franchise_id) {
        productsQuery = productsQuery.eq("franchise_id", currentUser.franchise_id)
      }

      const { data: products, error: productsError } = await productsQuery

      if (productsError) throw productsError

      let bookingsQuery = supabase
        .from("bookings")
        .select(`
          id,
          delivery_date,
          return_date,
          customers!inner(name),
          booking_items!inner(
            product_id,
            quantity
          )
        `)
        .gte("delivery_date", startDate.toISOString().split("T")[0])
        .lte("return_date", endDate.toISOString().split("T")[0])
        .in("booking_items.product_id", productIds)
        .neq("status", "cancelled")

      if (currentUser?.role !== "super_admin" && currentUser?.franchise_id) {
        bookingsQuery = bookingsQuery.eq("franchise_id", currentUser.franchise_id)
      }

      const { data: bookingConflicts, error: conflictsError } = await bookingsQuery

      if (conflictsError) throw conflictsError

      // Get barcode status for each booking to determine return status
      const bookingIds = bookingConflicts?.map((b: any) => b.id) || []
      const { data: barcodeData } = await supabase
        .from("booking_barcode_assignments")
        .select("booking_id, status, returned_at")
        .in("booking_id", bookingIds)
        .eq("booking_type", "product")

      // Create a map of booking_id to return status
      const returnStatusMap = new Map<string, { returned: number; pending: number }>()
      barcodeData?.forEach((bc) => {
        if (!returnStatusMap.has(bc.booking_id)) {
          returnStatusMap.set(bc.booking_id, { returned: 0, pending: 0 })
        }
        const stats = returnStatusMap.get(bc.booking_id)!
        if (bc.status === "returned" || bc.status === "completed") {
          stats.returned++
        } else {
          stats.pending++
        }
      })

      const availabilityResults: AvailabilityData[] =
        products?.map((product) => {
          const requiredQty = requiredQuantities[product.id] || 1
          const conflicts =
            bookingConflicts
              ?.filter((booking: any) => booking.booking_items.some((item: any) => item.product_id === product.id))
              .map((booking: any) => {
                // Determine return status for this booking
                const barcodeStats = returnStatusMap.get(booking.id)
                let returnStatus: 'returned' | 'in_progress' | undefined
                if (barcodeStats) {
                  if (barcodeStats.pending > 0) {
                    returnStatus = 'in_progress'
                  } else if (barcodeStats.returned > 0) {
                    returnStatus = 'returned'
                  }
                }
                
                return {
                  booking_id: booking.id,
                  delivery_date: booking.delivery_date,
                  return_date: booking.return_date,
                  quantity: booking.booking_items.find((item: any) => item.product_id === product.id)?.quantity || 0,
                  customer_name: booking.customers.name,
                  return_status: returnStatus,
                }
              }) || []

          const totalConflictQuantity = conflicts.reduce((sum, conflict) => sum + conflict.quantity, 0)
          const availableQuantity = Math.max(0, product.stock_available - totalConflictQuantity)

          let nextAvailableDate = null
          if (availableQuantity < requiredQty) {
            const sortedConflicts = conflicts.sort(
              (a, b) => new Date(a.return_date).getTime() - new Date(b.return_date).getTime(),
            )
            if (sortedConflicts.length > 0) {
              const lastReturnDate = new Date(sortedConflicts[sortedConflicts.length - 1].return_date)
              lastReturnDate.setDate(lastReturnDate.getDate() + 1)
              nextAvailableDate = lastReturnDate.toISOString().split("T")[0]
            }
          }

          return {
            product,
            availableQuantity,
            conflicts,
            nextAvailableDate,
          }
        }) || []

      setAvailabilityData(availabilityResults)
      console.log("[v0] Availability check completed:", availabilityResults)
    } catch (error) {
      console.error("[v0] Error checking availability:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAvailabilityStatus = (data: AvailabilityData) => {
    const required = requiredQuantities[data.product.id] || 1
    if (data.availableQuantity >= required) {
      return { status: "available", color: "bg-green-100 text-green-800", icon: CheckCircle }
    } else if (data.availableQuantity > 0) {
      return { status: "limited", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle }
    } else {
      return { status: "unavailable", color: "bg-red-100 text-red-800", icon: AlertTriangle }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Availability Check
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {returnDate ? (
              <>
                Booking Period: <strong>{new Date(bookingDate).toLocaleDateString()}</strong> to{" "}
                <strong>{new Date(returnDate).toLocaleDateString()}</strong>
              </>
            ) : (
              <>
                Checking availability for {new Date(bookingDate).toLocaleDateString()}
                (±2 days range)
              </>
            )}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Checking availability...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {availabilityData.map((data) => {
              const required = requiredQuantities[data.product.id] || 1
              const { status, color, icon: Icon } = getAvailabilityStatus(data)

              return (
                <div key={data.product.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{data.product.name}</h3>
                      <p className="text-sm text-gray-600">Required: {required} units</p>
                    </div>
                    <Badge className={color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {status === "available" ? "Available" : status === "limited" ? "Limited Stock" : "Unavailable"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-semibold">{data.product.stock_total}</div>
                      <div className="text-xs text-gray-600">Total Stock</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-lg font-semibold text-blue-600">{data.availableQuantity}</div>
                      <div className="text-xs text-gray-600">Available</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="text-lg font-semibold text-orange-600">{data.product.stock_booked}</div>
                      <div className="text-xs text-gray-600">Booked</div>
                    </div>
                  </div>

                  {data.conflicts.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Booking Conflicts ({data.conflicts.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {data.conflicts.map((conflict, index) => (
                          <div key={index} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-200">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div className="flex-1">
                                <div className="font-medium">{conflict.customer_name}</div>
                                <div className="text-gray-600">
                                  {new Date(conflict.delivery_date).toLocaleDateString()} -{" "}
                                  {new Date(conflict.return_date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {conflict.quantity} units
                                </Badge>
                                
                                {/* Return Status Badges */}
                                {conflict.return_status === 'returned' && (
                                  <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                                    Returned
                                  </Badge>
                                )}
                                {conflict.return_status === 'in_progress' && (
                                  <>
                                    <Badge variant="secondary" className="bg-orange-500 text-white text-[10px] px-1.5 py-0">
                                      In Progress
                                    </Badge>
                                    <span className="text-[10px] text-orange-600 font-medium">
                                      Return: {new Date(conflict.return_date).toLocaleString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true 
                                      })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.nextAvailableDate && (
                    <div className="mt-3 p-2 bg-blue-50 rounded flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        Next available: <strong>{new Date(data.nextAvailableDate).toLocaleDateString()}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
