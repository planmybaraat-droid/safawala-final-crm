"use client"

import { useState, useEffect } from "react"
import { format, differenceInDays } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageLoader } from "@/components/ui/skeleton-loader"
import { 
  Shirt, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  Check, 
  AlertTriangle, 
  MessageSquare, 
  RefreshCw, 
  Clock,
  ArrowLeft
} from "lucide-react"

interface BookingItem {
  id: string
  quantity: number
  product?: {
    id: string
    name: string
    product_code: string
  }
}

interface Booking {
  id: string
  booking_number: string
  status: string
  event_date: string
  has_modifications: boolean
  modifications_details: string | null
  modification_date: string | null
  created_at: string
  source: string
  customer?: {
    id: string
    name: string
    phone: string
  }
  items?: BookingItem[]
}

export default function ModificationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "upcoming">("all")
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending")
  const [completedList, setCompletedList] = useState<Booking[]>([])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchModifications()
  }, [])

  const fetchModifications = async () => {
    setLoading(true)
    try {
      // 1. Fetch bookings from unified bookings API endpoint
      const res = await fetch("/api/bookings")
      if (!res.ok) throw new Error("Failed to fetch bookings list")
      const json = await res.json()
      const allBookings = (json.bookings || []) as Booking[]

      // 2. Filter to active modification bookings
      const activeModBookings = allBookings.filter(b => b.has_modifications)

      // 3. Concurrently fetch items for active modification bookings
      const bookingsWithItems = await Promise.all(
        activeModBookings.map(async (booking) => {
          try {
            const source = booking.source
            const normalizedSource = source.endsWith('s') ? source.slice(0, -1) : source
            const itemRes = await fetch(`/api/bookings-items?id=${booking.id}&source=${normalizedSource}`)
            if (itemRes.ok) {
              const itemJson = await itemRes.json()
              return {
                ...booking,
                items: (itemJson.items || []).map((item: any) => ({
                  id: item.id,
                  quantity: item.quantity,
                  product: {
                    id: item.product_id || item.product?.id,
                    name: item.product_name || item.product?.name || "Unknown Product",
                    product_code: item.product_code || item.product?.product_code || "N/A"
                  }
                }))
              }
            }
          } catch (e) {
            console.error(`Error fetching items for booking ${booking.booking_number}:`, e)
          }
          return { ...booking, items: [] }
        })
      )

      setBookings(bookingsWithItems)
    } catch (err: any) {
      console.error("[Modifications] Error fetching data:", err)
      toast({
        title: "Error loading modifications",
        description: err.message || "Could not retrieve stitching tasks.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getApiType = (source: string) => {
    if (source === "product_orders" || source === "product_order") return "product_order"
    if (source === "package_bookings" || source === "package_booking") return "package_booking"
    return "unified"
  }

  const handleMarkCompleted = async (booking: Booking) => {
    try {
      const apiType = getApiType(booking.source)
      const res = await fetch(`/api/bookings/${booking.id}?type=${apiType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_modifications: false }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update booking")
      }

      toast({
        title: "Modification Complete",
        description: `Stitching for order #${booking.booking_number} marked as completed!`,
      })

      // Add to completed session list
      setCompletedList(prev => [{ ...booking, has_modifications: false }, ...prev])

      // Remove from active list
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, has_modifications: false } : b))
    } catch (err: any) {
      console.error("[Modifications] Complete error:", err)
      toast({
        title: "Failed to mark complete",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const handleSendWhatsapp = (booking: Booking) => {
    if (!booking.customer?.phone) return
    const text = `Hello ${booking.customer.name},\n\nWe wanted to update you that modifications and custom stitching for your order #${booking.booking_number} are completed and ready!\n\nThank you for choosing Safawala.`
    window.open(`https://wa.me/${booking.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`, "_blank")
  }

  // Filter lists based on tab & filters
  const displayedBookings = bookings.filter(b => {
    // Tab Filter
    if (activeTab === "pending" && !b.has_modifications) return false
    if (activeTab === "completed" && b.has_modifications) return false

    // Search Filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm ||
      b.booking_number?.toLowerCase().includes(searchLower) ||
      b.customer?.name?.toLowerCase().includes(searchLower) ||
      b.customer?.phone?.includes(searchLower)

    if (!matchesSearch) return false

    // Target Date Filter
    if (!b.modification_date) return timeFilter === "all"
    
    const targetDate = new Date(b.modification_date)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const diffDays = differenceInDays(targetDate, today)

    if (timeFilter === "today") return diffDays === 0
    if (timeFilter === "week") return diffDays >= 0 && diffDays <= 7
    if (timeFilter === "upcoming") return diffDays > 7

    return true
  })

  // Add the newly completed ones if viewing completed tab
  const finalBookings = activeTab === "completed" 
    ? [...completedList, ...displayedBookings].filter((v, i, self) => self.findIndex(t => t.id === v.id) === i)
    : displayedBookings

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Shirt className="h-6 w-6" />
              </span>
              Modifications & Stitching
            </h1>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
              Track custom apparel alterations, tailor notes, and completion schedules.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchModifications} className="self-start md:self-auto gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Tasks
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-1">
            <TabsTrigger value="pending" className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" />
              Pending Alterations
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                {bookings.filter(b => b.has_modifications).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2 font-semibold">
              <Check className="h-4 w-4" />
              Completed Stitching
            </TabsTrigger>
          </TabsList>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={timeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("all")}
              className="text-xs h-8 px-3 rounded-lg"
            >
              All Time
            </Button>
            <Button
              variant={timeFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("today")}
              className="text-xs h-8 px-3 rounded-lg"
            >
              Today
            </Button>
            <Button
              variant={timeFilter === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("week")}
              className="text-xs h-8 px-3 rounded-lg"
            >
              This Week
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-md mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by order #, customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-sm shadow-sm"
          />
        </div>

        {loading ? (
          <PageLoader />
        ) : finalBookings.length === 0 ? (
          <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <Shirt className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">No alterations found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                There are no custom modifications matching your search or filters at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalBookings.map((booking) => {
              const daysLeft = booking.modification_date 
                ? differenceInDays(new Date(booking.modification_date), new Date()) 
                : null
              const isUrgent = daysLeft !== null && daysLeft <= 3 && booking.has_modifications

              return (
                <Card 
                  key={booking.id} 
                  className={`transition-all duration-300 shadow-sm border hover:shadow-md ${
                    isUrgent 
                      ? "border-red-200 bg-red-50/5 dark:border-red-950 dark:bg-red-950/5" 
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                          #{booking.booking_number}
                        </span>
                        <Badge variant="outline" className="text-[11px] capitalize py-0.5 font-medium border-slate-200 dark:border-slate-700">
                          {booking.source.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      {booking.modification_date && (
                        <div className="flex items-center gap-2">
                          {isUrgent && (
                            <Badge variant="destructive" className="animate-pulse flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              URGENT
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {format(new Date(booking.modification_date + "T00:00:00"), "dd MMM yyyy")}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4 flex flex-col gap-4">
                    {/* Customer */}
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Customer Info
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {booking.customer?.name || "Anonymous"}
                          </span>
                        </div>
                        {booking.customer?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {booking.customer.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stitching / Alteration details */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/80 dark:border-amber-900/30">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Shirt className="h-3.5 w-3.5 text-amber-600" />
                        Alteration Instructions
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                        {booking.modifications_details || "No instruction details recorded."}
                      </p>
                    </div>

                    {/* Items Involved */}
                    {booking.items && booking.items.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Items to modify
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                          {booking.items.map((item) => (
                            <div key={item.id} className="p-2.5 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {item.product?.name || "Unknown Product"}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                {item.product?.product_code || "N/A"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 border-t pt-4 mt-1 border-slate-100 dark:border-slate-800">
                      {booking.customer?.phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendWhatsapp(booking)}
                          className="h-9 gap-1.5 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <MessageSquare className="h-4 w-4 text-emerald-500" />
                          WhatsApp Alert
                        </Button>
                      )}

                      {booking.has_modifications ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkCompleted(booking)}
                          className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          <Check className="h-4 w-4" />
                          Mark Completed
                        </Button>
                      ) : (
                        <Badge variant="outline" className="h-8 border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </Tabs>
    </div>
  )
}
