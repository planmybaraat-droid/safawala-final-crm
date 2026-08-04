"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isBefore, startOfDay } from "date-fns"
import { Search, CalendarIcon, Package, Eye, Wrench, Lock, Trash2, User, MapPin, Loader2, Scissors } from "lucide-react"
import { ItemsDisplayDialog, ItemsSelectionDialog, CompactItemsDisplayDialog } from "@/components/shared"
import type { SelectedItem } from "@/components/shared/types/items"
import { PincodeService } from "@/lib/pincode-service"
import { useToast } from "@/hooks/use-toast"

interface BookingData {
  id: string
  booking_number: string
  customer_name: string
  customer_phone: string
  event_date: string
  delivery_date: string
  return_date: string
  modification_date?: string
  modification_time?: string
  modifications_details?: string
  has_modifications?: boolean
  event_type: string
  venue_name: string
  venue_address: string
  area_name?: string
  total_amount: number
  paid_amount?: number
  status: string
  assigned_staff_name?: string
  total_safas?: number
  booking_items: {
    product_name: string
    quantity: number
  }[]
  customer: {
    name: string
    city: string
    address: string
  }
}

interface BookingCalendarProps {
  franchiseId?: string
  compact?: boolean
  mini?: boolean // ultra-compact size
  onViewDetails?: (booking: any) => void
}

export function BookingCalendar({ franchiseId, compact = false, mini = false, onViewDetails }: BookingCalendarProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = React.useState<Date>()
  const [showDateDetails, setShowDateDetails] = React.useState(false)
  const [bookings, setBookings] = React.useState<BookingData[]>([])
  const [dateBookings, setDateBookings] = React.useState<BookingData[]>([])
  const [lockedDates, setLockedDates] = React.useState<string[]>([])
  const [lockedDateObjects, setLockedDateObjects] = React.useState<any[]>([])
  const [deletingLockId, setDeletingLockId] = React.useState<string | null>(null)
  const [editingLockId, setEditingLockId] = React.useState<string | null>(null)
  const [editLockForm, setEditLockForm] = React.useState<{ whatsapp_number: string; notes: string }>({ whatsapp_number: '', notes: '' })
  const [savingLockId, setSavingLockId] = React.useState<string | null>(null)
  const [userRole, setUserRole] = React.useState<string>("")
  const [modificationBookings, setModificationBookings] = React.useState<BookingData[]>([])
  const [activeTab, setActiveTab] = React.useState<'events' | 'modifications' | 'locked'>('events')
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  const [selectedCalendarBooking, setSelectedCalendarBooking] = React.useState<BookingData | null>(null)
  const [convertTypeBooking, setConvertTypeBooking] = React.useState<BookingData | null>(null)
  
  // Items display dialog states - matching bookings page architecture
  const [showProductDialog, setShowProductDialog] = React.useState(false)
  const [productDialogBooking, setProductDialogBooking] = React.useState<BookingData | null>(null)
  const [productDialogType, setProductDialogType] = React.useState<'items' | 'pending'>('items')
  const [bookingItems, setBookingItems] = React.useState<Record<string, any[]>>({})
  const [itemsLoading, setItemsLoading] = React.useState<Record<string, boolean>>({})
  const [itemsError, setItemsError] = React.useState<Record<string, string>>({})
  
  // Product selection states
  const [showItemsSelection, setShowItemsSelection] = React.useState(false)
  const [currentBookingForItems, setCurrentBookingForItems] = React.useState<BookingData | null>(null)
  const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([])
  
  // Product data states
  const [products, setProducts] = React.useState<any[]>([])
  const [packages, setPackages] = React.useState<any[]>([])
  const [categories, setCategories] = React.useState<any[]>([])
  const [subcategories, setSubcategories] = React.useState<any[]>([])

  React.useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { const u = JSON.parse(raw); setUserRole(u.role || "") } catch {} }
    fetchBookings()
    fetchProductsAndCategories()
    fetchLockedDates()
  }, [franchiseId])

  const fetchLockedDates = () => {
    fetch("/api/locked-dates")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setLockedDates(d.data.map((ld: any) => ld.locked_date as string))
          setLockedDateObjects(d.data)
        }
      })
      .catch(() => {})
  }

  const handleUnlockDate = async (id: string) => {
    setDeletingLockId(id)
    try {
      const res = await fetch(`/api/locked-dates?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      setLockedDateObjects(prev => prev.filter(ld => ld.id !== id))
      setLockedDates(prev => {
        const removed = lockedDateObjects.find(ld => ld.id === id)
        return removed ? prev.filter(d => d !== removed.locked_date) : prev
      })
    } catch {} finally {
      setDeletingLockId(null)
    }
  }

  const handleSaveLockEdit = async (id: string) => {
    setSavingLockId(id)
    try {
      const res = await fetch(`/api/locked-dates?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLockForm)
      })
      if (res.ok) {
        const { data } = await res.json()
        setLockedDateObjects(prev => prev.map(ld => ld.id === id ? { ...ld, ...data } : ld))
        setEditingLockId(null)
        toast({ title: 'Updated', description: 'Locked date updated successfully' })
      } else {
        toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setSavingLockId(null)
    }
  }

  // Fetch products and categories for items selection
  const fetchProductsAndCategories = async () => {
    try {
      // Fetch products
      const productsRes = await fetch('/api/products', { cache: 'no-store' })
      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.data || [])
      }

      // Fetch categories
      const categoriesRes = await fetch('/api/categories', { cache: 'no-store' })
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.data || [])
      }

      // Fetch subcategories
      const subcategoriesRes = await fetch('/api/subcategories', { cache: 'no-store' })
      if (subcategoriesRes.ok) {
        const data = await subcategoriesRes.json()
        setSubcategories(data.data || [])
      }

      // Fetch packages
      const packagesRes = await fetch('/api/packages', { cache: 'no-store' })
      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.data || [])
      }
    } catch (error) {
      console.error('[Calendar] Error fetching products/categories:', error)
    }
  }

  // Helper to get payment status details
  const getPaymentStatus = (booking: BookingData) => {
    const totalAmount = booking.total_amount || 0
    const paidAmount = booking.paid_amount || 0
    const pendingAmount = Math.max(0, totalAmount - paidAmount)

    const isFullyPaid = paidAmount >= totalAmount
    const isUnpaid = paidAmount === 0
    const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount
    const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

    return {
      isFullyPaid,
      isUnpaid,
      isPartiallyPaid,
      paidAmount,
      pendingAmount,
      paymentPercentage,
    }
  }

  const fetchBookings = async () => {
    try {
      setLoading(true)
      // Always use server API which applies franchise isolation via session.
      const res = await fetch('/api/bookings', { cache: 'no-store' })
      if (!res.ok) {
        console.error('[v0] Error fetching bookings via /api/bookings:', res.status, await res.text().catch(()=>''))
        return
      }
      const json = await res.json()
      const rows: any[] = json?.bookings || json?.data || []

      const toDateOnly = (v: any) => (v ? format(new Date(v), 'yyyy-MM-dd') : '')
      
      // Process bookings with area and venue extraction
      const formattedBookings: BookingData[] = await Promise.all(rows.map(async (r: any) => {
        let area_name = 'Not Specified'
        let venue_name = 'Not Specified'

        // 1. Get area from pincode using pincode API (silent - no toast)
        if (r.customer?.pincode) {
          try {
            const pincodeData = await PincodeService.lookup(r.customer.pincode, false)
            if (pincodeData) {
              area_name = pincodeData.area
            }
          } catch (error) {
            console.error(`Error looking up pincode ${r.customer.pincode}:`, error)
            area_name = 'Not Specified'
          }
        }

        // 2. Extract venue name from venue_address using venue extraction API
        if (r.venue_address) {
          try {
            const extractRes = await fetch('/api/venue-area-extractor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: r.venue_address }),
            })
            if (extractRes.ok) {
              const extractData = await extractRes.json()
              if (extractData.success && extractData.data) {
                venue_name = extractData.data.venue_name
              }
            }
          } catch (error) {
            console.error(`Error extracting venue from address "${r.venue_address}":`, error)
            venue_name = r.venue_address?.split(/[,\n]/)[0]?.trim() || 'Not Specified'
          }
        }

        return {
          id: r.id,
          booking_number: r.booking_number,
          customer_name: r.customer?.name || 'Unknown Customer',
          customer_phone: r.customer?.phone || '',
          event_date: toDateOnly(r.event_date),
          delivery_date: toDateOnly(r.delivery_date),
          return_date: toDateOnly(r.pickup_date), // API field name
          modification_date: r.modification_date ? toDateOnly(r.modification_date) : undefined,
          modification_time: r.modification_date ? format(new Date(r.modification_date), 'hh:mm a') : undefined,
          modifications_details: r.modifications_details || undefined,
          has_modifications: r.has_modifications || false,
          event_type: r.event_type,
          venue_name,
          venue_address: r.venue_address || '',
          area_name,
          total_amount: Number(r.total_amount) || 0,
          paid_amount: Number(r.paid_amount) || 0,
          status: r.status,
          total_safas: Number(r.total_safas) || 0,
          assigned_staff_name: undefined,
          booking_items: [],
          customer: {
            name: r.customer?.name || 'Unknown Customer',
            city: r.customer?.city || 'Not Specified',
            address: r.customer?.address || 'Not Specified',
          },
          has_items: r.has_items || false,
          source: r.source || 'product_orders',
          type: r.type || 'rental',
          package_details: r.package_details || null,
          variant_name: r.variant_name || null,
          extra_safas: r.extra_safas || 0,
        } as any
      }))

      setBookings(formattedBookings)
    } catch (error) {
      console.error("[v0] Error in fetchBookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return bookings.filter(
      (booking) =>
        booking.event_date === dateStr,
    )
  }

  const getModificationsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return bookings.filter(
      (booking) =>
        booking.has_modifications && booking.modification_date === dateStr,
    )
  }

  // Save selected items
  const saveSelectedItems = async (bookingId: string, items: SelectedItem[]) => {
    try {
      console.log(`[Calendar] Saving ${items.length} items for booking ${bookingId}`)
      
      const payload = {
        bookingId,
        items: items.map((item: any) => ({
          product_id: item.product_id || null,
          package_id: item.package_id || null,
          variant_id: item.variant_id || null,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          security_deposit: item.security_deposit || 0,
        })),
        source: 'product_orders',
      }
      
      const response = await fetch('/api/bookings-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save items')
      }
      
      // Refresh bookings to get updated data
      await fetchBookings()
      
      return true
    } catch (error: any) {
      console.error('[Calendar] Save failed:', error)
      return false
    }
  }
  // Fetch items for a specific booking when dialog opens - matching bookings page
  React.useEffect(() => {
    if (showProductDialog && productDialogBooking && productDialogType === 'items') {
      (async () => {
        const bookingId = productDialogBooking.id
        const bookingNumber = productDialogBooking.booking_number
        
        try {
          setItemsLoading(prev => ({ ...prev, [bookingId]: true }))
          console.log(`[Calendar] Fetching items for ${bookingNumber}...`)
          
          // Use the source field from booking to determine the API parameter
          const source = (productDialogBooking as any).source || 'product_order'
          const normalizedSource = source.endsWith('s') ? source.slice(0, -1) : source
          
          const url = `/api/bookings-items?id=${bookingId}&source=${normalizedSource}`
          console.log(`[Calendar] GET ${url}`)
          
          const res = await fetch(url)
          
          if (!res.ok) {
            const errorText = await res.text()
            console.error(`[Calendar] HTTP ${res.status}:`, errorText)
            setItemsError(prev => ({ ...prev, [bookingId]: `HTTP ${res.status}` }))
            setItemsLoading(prev => ({ ...prev, [bookingId]: false }))
            return
          }
          
          const data = await res.json()
          
          if (Array.isArray(data.items)) {
            setBookingItems(prev => ({ ...prev, [bookingId]: data.items }))
            console.log(`[Calendar] ✓ Loaded ${data.items.length} items for ${bookingNumber}`)
            setItemsError(prev => ({ ...prev, [bookingId]: '' }))
          } else {
            const errorDetail = data.details || data.error || 'Unknown error'
            console.warn(`[Calendar] API returned error:`, errorDetail)
            setItemsError(prev => ({ ...prev, [bookingId]: errorDetail }))
          }
        } catch (e: any) {
          console.error(`[Calendar] Fetch error for ${bookingNumber}:`, e)
          setItemsError(prev => ({ ...prev, [bookingId]: e.message || 'Network error' }))
        } finally {
          setItemsLoading(prev => ({ ...prev, [bookingId]: false }))
        }
      })()
    }
  }, [showProductDialog, productDialogBooking?.id, productDialogType])

  const getDateStatus = (date: Date) => {
    const today = startOfDay(new Date())
    const currentDate = startOfDay(date)

    // Past dates - grey
    if (isBefore(currentDate, today)) {
      return "past"
    }

    const dayBookings = getBookingsForDate(date)
    const bookingCount = dayBookings.length

    // Count-based coloring
    // bookingCount === 0 => zero
    // 1 <= bookingCount < 20 => low
    // bookingCount >= 20 => high
    if (bookingCount === 0) {
      const dayModifications = getModificationsForDate(date)
      if (dayModifications.length > 0) {
        return "modification"
      }
      return "zero" // 0 bookings
    }

    if (bookingCount > 10) {
      return "high" // 11+ bookings = red
    }

    return "low" // 1-10 bookings
  }

  const handleDateClick = (date: Date) => {
    console.log("[v0] Date clicked:", format(date, "yyyy-MM-dd"))
    const dayBookings = getBookingsForDate(date)
    const dayModifications = getModificationsForDate(date)
    console.log("[v0] Bookings found for date:", dayBookings.length)
    console.log("[v0] Modifications found for date:", dayModifications.length)
    const dateStr = format(date, "yyyy-MM-dd")
    const isLocked = lockedDates.includes(dateStr)
    setDateBookings(dayBookings)
    setModificationBookings(dayModifications)
    setSelectedCalendarBooking(dayBookings.length > 0 ? dayBookings[0] : null)
    setActiveTab(dayBookings.length > 0 ? 'events' : isLocked ? 'locked' : (dayModifications.length > 0 ? 'modifications' : 'events'))
    setShowDateDetails(true)
    console.log("[v0] Popup should open, showDateDetails:", true)
    // Clear selection immediately to prevent black selected state
    setTimeout(() => setSelectedDate(undefined), 0)
  }

  const filteredDateBookings = dateBookings.filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.city?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOfWeek = firstDay.getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days: (Date | null)[] = []
    
    // Previous month padding
    for (let i = 0; i < startOfWeek; i++) {
      days.push(null)
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
    
    // Next month padding to make complete rows of 7
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        days.push(null)
      }
    }
    
    return days
  }

  const parseLockNote = (noteStr: string) => {
    try {
      const parsed = JSON.parse(noteStr)
      return {
        personName: parsed.personName || "Date Locked",
        reason: parsed.reason || ""
      }
    } catch {
      return {
        personName: noteStr || "Date Locked",
        reason: ""
      }
    }
  }

  const getApiType = (source: string) => {
    if (source === "product_orders" || source === "product_order") return "product_order"
    if (source === "package_bookings" || source === "package_booking") return "package_booking"
    return "unified"
  }

  const dayModifiers = React.useMemo(() => {
    const modifiers: Record<string, Date[]> = {
      past: [],    // Past dates (grey)
      zero: [],    // 0 bookings (green)
      low: [],     // 1-19 bookings (blue)
      high: [],    // 20+ bookings (red)
      modification: [], // Has modifications (amber)
    }

    // Generate dates for the current month and next few months
    const today = new Date()
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0) // 3 months ahead

    for (let d = new Date(today.getFullYear(), today.getMonth() - 1, 1); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d)
      const status = getDateStatus(currentDate)
      if (modifiers[status]) modifiers[status].push(new Date(currentDate))
    }

    return modifiers
  }, [bookings])

  const dayClassNames = {
    // Past dates → grey
    past: "!bg-gray-300 !text-gray-600 !opacity-60 !cursor-not-allowed hover:!bg-gray-300 dark:!bg-gray-700 dark:!text-gray-400",
  // 0 bookings → green
  zero: "!bg-green-500/90 !text-white hover:!bg-green-600 !cursor-pointer !border !border-green-600/30 shadow-sm font-semibold",
  // 1-10 bookings → blue
  low: "!bg-blue-500/90 !text-white hover:!bg-blue-600 !cursor-pointer !border !border-blue-600/30 shadow-sm font-semibold",
    // 11+ bookings → red
    high: "!bg-red-500/90 !text-white hover:!bg-red-600 !cursor-pointer !border !border-red-600/30 shadow-sm font-semibold",
    // Has modifications → amber
    modification: "!bg-orange-400 !text-white hover:!bg-orange-500 !cursor-pointer !border !border-orange-500/30 shadow-sm font-semibold",
  }

  return (
    <Card className="shadow-md border-border/40 w-full">
      <CardHeader className="pb-4 px-6 border-b bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-extrabold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            Booking Schedule
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 font-bold">
              &lt;
            </Button>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 font-bold">
              &gt;
            </Button>
          </div>

          <div className="flex items-center gap-4 text-[11px] flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white border border-slate-300 dark:border-slate-700 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">0 Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">1-10 Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-100 dark:bg-orange-950 border border-orange-300 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">10+ Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Past Date</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scissors className="h-3 w-3 text-amber-500" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Modifications</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Locked Date</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="w-full p-6">
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="bg-slate-50 dark:bg-slate-900/60 p-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b dark:border-slate-800">
              {day}
            </div>
          ))}
          {getCalendarDays().map((day, idx) => {
            if (!day) {
              return (
                <div key={`empty-${idx}`} className="bg-slate-50/40 dark:bg-slate-950/20 min-h-[110px]" />
              )
            }
            
            const dateStr = format(day, "yyyy-MM-dd")
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
            const dayBookings = getBookingsForDate(day)
            const dayModifications = getModificationsForDate(day)
            const isLocked = lockedDates.includes(dateStr)
            const lockedDetails = lockedDateObjects.find(ld => ld.locked_date === dateStr)
            
            const isPastDate = isBefore(startOfDay(day), startOfDay(new Date()))
            let cellBgClass = "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            if (isPastDate) {
              cellBgClass = "bg-slate-100 dark:bg-slate-900/65 text-slate-400 dark:text-slate-500 opacity-80 cursor-not-allowed"
            } else if (dayBookings.length > 0 && dayBookings.length <= 10) {
              cellBgClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/10"
            } else if (dayBookings.length > 10) {
              cellBgClass = "bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-300 border-orange-100 dark:border-orange-900/10"
            }
            
            return (
              <div 
                key={dateStr} 
                onClick={() => handleDateClick(day)}
                className={`${cellBgClass} min-h-[110px] p-2 flex flex-col justify-between border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer group ${
                  isToday ? "ring-1 ring-inset ring-indigo-500 bg-indigo-50/5" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold flex items-center justify-center h-5 w-5 rounded-full ${
                    isToday ? "bg-indigo-600 text-white font-extrabold" : isPastDate ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {day.getDate()}
                  </span>
                  
                  {dayModifications.length > 0 && (
                    <span className="animate-pulse" title="Modifications Pending">
                      <Scissors className="h-3 w-3 text-amber-500" />
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] scrollbar-none">
                  {dayBookings.slice(0, 3).map(b => {
                    const isRental = (b as any).type === "rental"
                    const isPackage = (b as any).booking_kind === "package" || (b as any).type === "package"
                    return (
                      <div 
                        key={b.id} 
                        onClick={(e) => {
                           e.stopPropagation()
                           setSelectedCalendarBooking(b)
                           setSelectedDate(day)
                           setDateBookings(dayBookings)
                           setModificationBookings(dayModifications)
                           setShowDateDetails(true)
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold truncate transition-colors ${
                          isRental 
                            ? "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30"
                            : isPackage
                              ? "bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/30"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30"
                        }`}
                      >
                        {isRental ? "👗" : isPackage ? "📦" : "🛍️"} {b.booking_number} ({b.customer_name})
                      </div>
                    )
                  })}
                  {dayBookings.length > 3 && (
                    <div className="text-[8px] text-slate-400 font-bold pl-1">
                      +{dayBookings.length - 3} more...
                    </div>
                  )}
                  {isLocked && (
                    <div className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30 px-1.5 py-0.5 rounded font-semibold truncate flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Locked ({lockedDetails?.notes ? parseLockNote(lockedDetails.notes).personName : "Date Locked"})</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog
        open={showDateDetails}
        onOpenChange={(open) => {
          console.log("[v0] Dialog onOpenChange:", open)
          setShowDateDetails(open)
        }}
      >
        <DialogContent className={`${compact ? 'max-w-md' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-5 h-5" />
              Bookings — {selectedDate && format(selectedDate, "MMMM dd, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'events' | 'modifications' | 'locked')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Events ({dateBookings.length})
              </TabsTrigger>
              <TabsTrigger value="modifications" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Mod. ({modificationBookings.length})
              </TabsTrigger>
              <TabsTrigger value="locked" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Locked ({lockedDateObjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-3">
              {dateBookings.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <div className="text-slate-500 font-medium">No events scheduled for this date</div>
                  <div className="mt-4">
                    <Button size="sm" asChild>
                      <a href="/create-invoice">+ Create Booking</a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Print All button + search bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Search name, booking..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs bg-slate-50"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => {
                        const printWindow = window.open("", "_blank")
                        if (!printWindow) return
                        const rows = filteredDateBookings.map((b: any, i: number) => {
                          const safaInfo = b.package_details
                            ? `${b.package_details.name}${b.variant_name ? ' / ' + b.variant_name : ''} (${b.total_safas || 0} safas${b.extra_safas ? '+' + b.extra_safas : ''})`
                            : b.total_safas ? `${b.total_safas} safas` : 'No items'
                          return `<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
                            <td style="border:1px solid #e5e7eb;padding:8px;font-weight:600;color:#4f46e5">${b.booking_number}</td>
                            <td style="border:1px solid #e5e7eb;padding:8px">${b.customer_name}<br/><span style="color:#6b7280;font-size:11px">${b.customer_phone||''}</span></td>
                            <td style="border:1px solid #e5e7eb;padding:8px">${b.event_type||'-'}<br/><span style="color:#6b7280;font-size:11px">${b.event_date||''}</span></td>
                            <td style="border:1px solid #e5e7eb;padding:8px">${safaInfo}</td>
                            <td style="border:1px solid #e5e7eb;padding:8px">${b.venue_name||'-'}</td>
                            <td style="border:1px solid #e5e7eb;padding:8px;text-align:right">&#8377;${(b.total_amount||0).toLocaleString()}</td>
                            <td style="border:1px solid #e5e7eb;padding:8px">${b.status||'-'}</td>
                          </tr>`
                        }).join('')
                        printWindow.document.write(`<html><head><title>Bookings \u2013 ${selectedDate ? format(selectedDate,'dd MMM yyyy') : ''}</title>
                          <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#4f46e5;color:#fff;padding:8px;text-align:left}h2{color:#1e1b4b}</style></head>
                          <body><h2>Bookings \u2014 ${selectedDate ? format(selectedDate,'MMMM dd, yyyy') : ''}</h2>
                          <p style="color:#6b7280;font-size:12px">Printed: ${new Date().toLocaleString('en-IN')}</p>
                          <table><thead><tr><th>Booking #</th><th>Customer</th><th>Event</th><th>Safas / Items</th><th>Venue</th><th style="text-align:right">Amount</th><th>Status</th></tr></thead>
                          <tbody>${rows}</tbody></table>
                          <script>window.onload=function(){window.print();window.close()}</script></body></html>`)
                        printWindow.document.close()
                      }}
                    >
                      🖨️ Print Date List ({filteredDateBookings.length})
                    </Button>
                  </div>

                  {/* Bookings Row Table */}
                  <div className="border rounded-xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b">
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Event Date & Time</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Total Safas / Package</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Venue</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDateBookings.map((b: any) => {
                            const isRental = b.type === "rental"
                            const isPackage = b.booking_kind === "package" || b.type === "package"
                            const paidAmt = b.paid_amount || 0
                            const totalAmt = b.total_amount || 0
                            const isPaid = paidAmt >= totalAmt && totalAmt > 0
                            const due = totalAmt - paidAmt

                            // Safa / Package info
                            const totalSafas = b.total_safas || 0
                            const extraSafas = b.extra_safas || 0
                            const pkgName = b.package_details?.name || null
                            const variantName = b.variant_name || null

                            return (
                              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                {/* Customer */}
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-slate-800">{b.customer_name}</div>
                                  <div className="mt-0.5">
                                    <Badge variant={isRental ? "info" : isPackage ? "secondary" : "success"} className="text-[9px] px-1 py-0">
                                      {isRental ? "Rental" : isPackage ? "Package" : "Sale"}
                                    </Badge>
                                  </div>
                                </td>
                                {/* Phone */}
                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{b.customer_phone || '—'}</td>
                                {/* Event Date */}
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <div className="font-medium text-slate-700">{b.event_date}</div>
                                  <div className="text-[10px] text-slate-400">{b.event_type || '—'}</div>
                                </td>
                                {/* Safas / Package */}
                                <td className="px-3 py-2.5">
                                  {isPackage ? (
                                    pkgName ? (
                                      <div>
                                        <div className="font-semibold text-indigo-700 text-[11px]">{pkgName}</div>
                                        {variantName && <div className="text-[10px] text-slate-500">{variantName}</div>}
                                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                                          👤 {totalSafas} Safas{extraSafas > 0 ? ` +${extraSafas} extra` : ''}
                                        </div>
                                      </div>
                                    ) : totalSafas > 0 ? (
                                      <div className="text-[11px] text-slate-600">👤 {totalSafas} Safas</div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">Pending selection</span>
                                    )
                                  ) : totalSafas > 0 ? (
                                    <div>
                                      <div className="font-semibold text-slate-700 text-[11px]">👤 {totalSafas} Safas</div>
                                      <div className="text-[10px] text-slate-400">Barati Safa</div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No items</span>
                                  )}
                                </td>
                                {/* Payment */}
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <div className="font-bold text-slate-800">₹{totalAmt.toLocaleString()}</div>
                                  <div className={`text-[10px] font-medium ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                                    {isPaid ? 'Paid ✓' : `Due ₹${due.toLocaleString()}`}
                                  </div>
                                </td>
                                {/* Venue */}
                                <td className="px-3 py-2.5 max-w-[140px]">
                                  <div className="text-slate-700 truncate" title={b.venue_name}>{b.venue_name || '—'}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{b.area_name && b.area_name !== 'Not Specified' ? b.area_name : ''}</div>
                                </td>
                                {/* Actions */}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-blue-50 hover:text-blue-700"
                                      title="View Details"
                                      onClick={() => { if (onViewDetails) { setShowDateDetails(false); onViewDetails(b) } }}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-slate-100"
                                      title="Edit Booking"
                                      onClick={() => window.open(`/create-invoice?mode=edit&id=${b.id}`, '_blank')}>
                                      <span className="text-xs">✏️</span>
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-green-50 hover:text-green-700"
                                      title="Print Invoice"
                                      onClick={() => window.open(`/create-invoice?mode=edit&id=${b.id}&print=true`, '_blank')}>
                                      <span className="text-xs">🖨️</span>
                                    </Button>
                                    <Button size="icon" variant="ghost"
                                      className="h-7 w-7 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded"
                                      title="Convert to New Invoice"
                                      onClick={() => setConvertTypeBooking(b)}>
                                      <span className="text-xs">🔄</span>
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                                      title="Archive"
                                      onClick={async () => {
                                        if (!confirm('Archive this booking?')) return
                                        try {
                                          const apiType = getApiType(b.source)
                                          const res = await fetch(`/api/bookings/${b.id}?type=${apiType}`, {
                                            method: 'PATCH', headers: {'Content-Type':'application/json'},
                                            body: JSON.stringify({ is_archived: true })
                                          })
                                          if (res.ok) { toast({ title: 'Archived' }); fetchBookings(); setShowDateDetails(false) }
                                        } catch { toast({ title: 'Error', variant: 'destructive' }) }
                                      }}>
                                      <span className="text-xs">📦</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="modifications" className="space-y-4">
              {modificationBookings.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-orange-500">{modificationBookings.length} modifications pending</Badge>
                </div>
              )}

              {modificationBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <div className="text-muted-foreground">No modifications for this date</div>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="border-r border-muted px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[150px]">
                          Customer Name
                        </th>
                        <th className="border-r border-muted px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[120px]">
                          Phone Number
                        </th>
                        <th className="border-r border-muted px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[180px]">
                          Modification Date & Time
                        </th>
                        <th className="border-muted px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Modification Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {modificationBookings.map((booking, index) => (
                        <tr
                          key={booking.id}
                          className={`border-b hover:bg-muted/40 ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                        >
                          <td className="border-r border-muted px-4 py-3 text-sm font-medium text-foreground">
                            {booking.customer_name}
                          </td>
                          <td className="border-r border-muted px-4 py-3 text-sm text-foreground">
                            {booking.customer_phone || "N/A"}
                          </td>
                          <td className="border-r border-muted px-4 py-3 text-sm text-foreground">
                            <div>
                              <div className="font-medium">
                                {booking.modification_date ? format(new Date(booking.modification_date), "dd-MMM-yyyy") : "N/A"}
                              </div>
                              {booking.modification_time && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {booking.modification_time}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border-muted px-4 py-3 text-sm text-foreground max-w-sm">
                            <div className="text-xs bg-orange-50 p-2 rounded border border-orange-200 text-orange-900">
                              {booking.modifications_details || "No details provided"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* 3rd Tab: Locked Dates */}
            <TabsContent value="locked" className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-sm text-green-700">All Locked Dates</span>
                <Badge className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{lockedDateObjects.length}</Badge>
              </div>

              {lockedDateObjects.length === 0 ? (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <div className="text-muted-foreground text-sm">No dates are locked</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {lockedDateObjects
                    .sort((a, b) => a.locked_date.localeCompare(b.locked_date))
                    .map((ld) => {
                      const rawNotes = ld.notes || ""
                      const personMatch = rawNotes.match(/^PERSON:\s*([^|]+)\|/)
                      const cityMatch = rawNotes.match(/\|CITY:\s*([^|]+)(\||$)/)
                      const noteMatch = rawNotes.match(/\|NOTE:\s*([\s\S]*)$/)
                      const personName = personMatch ? personMatch[1].trim() : ""
                      const city = cityMatch ? cityMatch[1].trim() : ""
                      const note = noteMatch ? noteMatch[1].trim() : (!personMatch ? rawNotes : "")
                      const isToday = ld.locked_date === format(new Date(), "yyyy-MM-dd")
                      const isPast = ld.locked_date < format(new Date(), "yyyy-MM-dd")
                       return (
                         <div key={ld.id} className={`rounded-lg px-3 py-2.5 border ${isToday ? "bg-green-100 border-green-300" : isPast ? "bg-gray-50 border-gray-200 opacity-60" : "bg-green-50 border-green-200"}`}>
                           <div className="flex items-start justify-between">
                             <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <Lock className={`h-3.5 w-3.5 shrink-0 ${isToday ? "text-green-600" : "text-green-400"}`} />
                                 <span className={`text-sm font-bold ${isToday ? "text-green-700" : "text-green-600"}`}>
                                   {format(new Date(ld.locked_date + "T00:00:00"), "EEE, dd MMM yyyy")}
                                 </span>
                                 {isToday && <Badge className="text-[9px] bg-green-600 text-white px-1 py-0">TODAY</Badge>}
                                 {isPast && <Badge variant="secondary" className="text-[9px] px-1 py-0">Past</Badge>}
                               </div>
                               {personName && (
                                 <div className="flex items-center gap-3 mt-1 pl-5">
                                   <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                     <User className="h-3 w-3" /> {personName}
                                   </span>
                                   {city && city !== "—" && (
                                     <span className="text-xs text-slate-500 flex items-center gap-1">
                                       <MapPin className="h-3 w-3" /> {city}
                                     </span>
                                   )}
                                 </div>
                               )}
                               {ld.whatsapp_number && (
                                 <p className="text-[11px] text-slate-500 mt-0.5 pl-5">📞 {ld.whatsapp_number}</p>
                               )}
                               {note && <p className="text-[11px] text-slate-600 mt-0.5 pl-5 truncate max-w-xs">{note}</p>}
                             </div>
                             {(userRole === "franchise_admin" || userRole === "franchise_owner" || userRole === "super_admin") && (
                               <div className="flex items-center gap-1 ml-2 shrink-0">
                                 <button
                                   onClick={() => {
                                     setEditingLockId(editingLockId === ld.id ? null : ld.id)
                                     setEditLockForm({ whatsapp_number: ld.whatsapp_number || '', notes: ld.notes || '' })
                                   }}
                                   className="text-slate-400 hover:text-blue-600 p-1 rounded"
                                   title="Edit locked date"
                                 >
                                   <span className="text-xs">✏️</span>
                                 </button>
                                 <button
                                   onClick={() => { if (confirm('Remove this locked date?')) handleUnlockDate(ld.id) }}
                                   disabled={deletingLockId === ld.id}
                                   className="text-red-400 hover:text-red-600 p-1 rounded"
                                   title="Delete locked date"
                                 >
                                   {deletingLockId === ld.id
                                     ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                     : <Trash2 className="h-3.5 w-3.5" />}
                                 </button>
                               </div>
                             )}
                           </div>
                           {/* Inline edit form */}
                           {editingLockId === ld.id && (
                             <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                               <div>
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">WhatsApp Number</label>
                                 <input
                                   type="text"
                                   value={editLockForm.whatsapp_number}
                                   onChange={(e) => setEditLockForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                                   className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                   placeholder="e.g. 9876543210"
                                 />
                               </div>
                               <div>
                                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
                                 <textarea
                                   value={editLockForm.notes}
                                   onChange={(e) => setEditLockForm(f => ({ ...f, notes: e.target.value }))}
                                   className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                   rows={2}
                                   placeholder="Notes..."
                                 />
                               </div>
                               <div className="flex gap-2">
                                 <button
                                   onClick={() => handleSaveLockEdit(ld.id)}
                                   disabled={savingLockId === ld.id}
                                   className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60"
                                 >
                                   {savingLockId === ld.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                   Save
                                 </button>
                                 <button
                                   onClick={() => setEditingLockId(null)}
                                   className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200"
                                 >
                                   Cancel
                                 </button>
                               </div>
                             </div>
                           )}
                         </div>
                       )
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Convert to Invoice Modal */}
      {convertTypeBooking && (
        <Dialog open={!!convertTypeBooking} onOpenChange={(o) => { if (!o) setConvertTypeBooking(null) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🔄 Convert to New Invoice
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-slate-600">
                Converting booking <span className="font-bold text-indigo-700">{convertTypeBooking.booking_number}</span> for <span className="font-bold">{convertTypeBooking.customer_name}</span>.
              </p>
              <p className="text-xs text-slate-500">Select type of new invoice to create:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 bg-green-50 hover:bg-green-100 rounded-xl text-green-800 font-semibold text-sm transition-colors"
                  onClick={() => {
                    const b = convertTypeBooking
                    const params = new URLSearchParams({
                      mode: 'create',
                      type: 'sale',
                      customer_name: b.customer_name || '',
                      customer_phone: b.customer_phone || '',
                      prefill: '1'
                    })
                    window.open(`/create-invoice?${params.toString()}`, '_blank')
                    setConvertTypeBooking(null)
                  }}
                >
                  <span className="text-2xl">🛍️</span>
                  Sales Invoice
                </button>
                <button
                  className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-800 font-semibold text-sm transition-colors"
                  onClick={() => {
                    const b = convertTypeBooking
                    const params = new URLSearchParams({
                      mode: 'create',
                      type: 'rental',
                      customer_name: b.customer_name || '',
                      customer_phone: b.customer_phone || '',
                      prefill: '1'
                    })
                    window.open(`/create-invoice?${params.toString()}`, '_blank')
                    setConvertTypeBooking(null)
                  }}
                >
                  <span className="text-2xl">🎩</span>
                  Rental Invoice
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Customer details will be pre-filled automatically</p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {productDialogBooking && productDialogType === 'items' && !itemsLoading[productDialogBooking.id] && !itemsError[productDialogBooking.id] && bookingItems[productDialogBooking.id] && (
        <CompactItemsDisplayDialog
          open={showProductDialog}
          onOpenChange={async (open) => {
            if (!open && productDialogBooking) {
              // When closing, save any changes
              const bookingType = (productDialogBooking as any).type || 'rental'
              const source = bookingType === 'package' ? 'package_bookings' : 'product_orders'
              await saveSelectedItems(productDialogBooking.id, selectedItems)
            }
            setShowProductDialog(open)
          }}
          items={(() => {
            const items = bookingItems[productDialogBooking.id] || []
            return items.map((item: any) => {
              if (item.package_name) {
                return {
                  id: item.id || `item-${Math.random()}`,
                  package_id: item.package_id || item.id,
                  variant_id: item.variant_id,
                  package: {
                    id: item.package_id || item.id,
                    name: item.package_name,
                    description: item.package_description,
                  },
                  variant: item.variant_name ? {
                    id: item.variant_id,
                    name: item.variant_name,
                    price: item.unit_price || item.price || 0,
                  } : undefined,
                  quantity: item.quantity || 1,
                  extra_safas: item.extra_safas || 0,
                  variant_inclusions: item.variant_inclusions || [],
                  unit_price: item.unit_price || item.price || 0,
                  total_price: item.price || item.total_price || 0,
                } as any
              } else {
                return {
                  id: item.product_id || item.id || `item-${Math.random()}`,
                  product_id: item.product_id || item.id,
                  product: {
                    id: item.product_id || item.id,
                    name: item.product?.name || item.product_name || 'Item',
                    barcode: item.product?.barcode || item.barcode || item.product_code,
                    product_code: item.product?.product_code || item.product_code,
                    category: item.product?.category || item.category_name,
                    image_url: item.product?.image_url,
                  },
                  quantity: item.quantity || 1,
                  unit_price: item.unit_price || item.price || 0,
                  total_price: (item.unit_price || item.price || 0) * (item.quantity || 1),
                  variant_name: item.variant_name,
                } as any
              }
            })
          })()}
          title={`📦 ${productDialogBooking.booking_number}`}
          onEditProducts={() => {
            setShowProductDialog(false)
            setCurrentBookingForItems(productDialogBooking)
            const items = bookingItems[productDialogBooking.id] || []
            setSelectedItems(items.map((item: any) => {
              if (item.package_name) {
                return {
                  id: item.id || `item-${Math.random()}`,
                  package_id: item.package_id || item.id,
                  variant_id: item.variant_id,
                  package: {
                    id: item.package_id || item.id,
                    name: item.package_name,
                  },
                  variant: item.variant_name ? {
                    id: item.variant_id,
                    name: item.variant_name,
                  } : undefined,
                  quantity: item.quantity || 1,
                  extra_safas: item.extra_safas || 0,
                } as any
              } else {
                return {
                  id: item.product_id || item.id || `item-${Math.random()}`,
                  product_id: item.product_id || item.id,
                  product: {
                    id: item.product_id || item.id,
                    name: item.product?.name || item.product_name || 'Item',
                  },
                  quantity: item.quantity || 1,
                } as any
              }
            }))
            setShowItemsSelection(true)
          }}
          onRemoveItem={(itemId) => {
            setSelectedItems(prev => prev.filter(item => item.id !== itemId))
          }}
          showPricing={true}
        />
      )}

      {/* Product Selection Dialog - Matching Bookings Page */}
      {currentBookingForItems && (
        <ItemsSelectionDialog
          open={showItemsSelection}
          onOpenChange={async (open) => {
            if (!open && currentBookingForItems) {
              // When modal closes, save the selected items
              const bookingType = (currentBookingForItems as any).type || 'rental'
              const source = bookingType === 'package' ? 'package_bookings' : 'product_orders'
              await saveSelectedItems(currentBookingForItems.id, selectedItems)
            }
            setShowItemsSelection(open)
          }}
          mode="select"
          type="product"
          items={products}
          categories={categories}
          subcategories={subcategories}
          context={{
            bookingType: (currentBookingForItems as any).type === 'package' ? 'sale' : 'rental',
            eventDate: currentBookingForItems.event_date,
            deliveryDate: currentBookingForItems.delivery_date,
            returnDate: currentBookingForItems.return_date,
            onItemSelect: (item) => {
              // Check if item already exists in selectedItems
              const existingItem = selectedItems.find(si => {
                if ('variants' in item || 'package_variants' in item) {
                  return 'package_id' in si && si.package_id === item.id
                } else {
                  return 'product_id' in si && si.product_id === item.id
                }
              })

              if (existingItem) {
                // Item already selected, remove it
                setSelectedItems(prev => prev.filter(si => si.id !== existingItem.id))
              } else {
                // Add new item
                if ('variants' in item || 'package_variants' in item) {
                  // Package item
                  const newItem: SelectedItem = {
                    id: `pkg-${item.id}-${Date.now()}`,
                    package_id: item.id,
                    variant_id: undefined,
                    package: item as any,
                    variant: undefined,
                    quantity: (item as any).requestedQuantity || 1,
                    extra_safas: 0,
                    variant_inclusions: [],
                    unit_price: 0,
                    total_price: 0,
                  } as any
                  setSelectedItems(prev => [...prev, newItem])
                } else {
                  // Product item
                  const prod = item as any
                  const newItem: SelectedItem = {
                    id: `prod-${item.id}-${Date.now()}`,
                    product_id: item.id,
                    product: prod,
                    quantity: (item as any).requestedQuantity || 1,
                    unit_price: prod.rental_price || 0,
                    total_price: (prod.rental_price || 0) * ((item as any).requestedQuantity || 1),
                  } as any
                  setSelectedItems(prev => [...prev, newItem])
                }
              }
            },
            onQuantityChange: (itemId: string, qty: number) => {
              setSelectedItems(prev => prev.map(si => {
                const id = 'product_id' in si ? si.product_id : si.package_id
                if (id === itemId) {
                  return { ...si, quantity: qty, total_price: (si.unit_price || 0) * qty }
                }
                return si
              }))
            },
          }}
          selectedItems={selectedItems}
        />
      )}
    </Card>
  )
}
