"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { BookingWorkflowStepper } from "@/components/shared"
import { Search, Plus, Truck, Package, Clock, CheckCircle, CheckCircle2, XCircle, Eye, Edit, ArrowLeft, CalendarClock, Loader2, RotateCcw, PackageCheck, Play, Ban, Phone, RefreshCw } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { UnifiedHandoverDialog } from "@/components/deliveries/UnifiedHandoverDialog"
import { MarkDeliveredDialog } from "@/components/deliveries/MarkDeliveredDialog"
import { ProcessReturnDialog } from "@/components/deliveries/ProcessReturnDialog"
import { ReturnProcessingDialog } from "@/components/returns/ReturnProcessingDialog"
import { DialogFooter } from "@/components/ui/dialog"
import { formatTime12Hour } from "@/lib/utils"

const supabase = createClient()

interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
}

interface Booking {
  id: string
  booking_number: string
  customer_id: string
  status: string
  total_amount: number
  booking_date: string
  delivery_date: string
  delivery_address: string
  customers?: Customer
}

interface Delivery {
  id: string
  delivery_number: string
  customer_id?: string
  customer_name: string
  customer_phone: string
  pickup_address: string
  delivery_address: string
  delivery_date: string
  delivery_time?: string
  delivery_type?: string
  status: string
  driver_name: string
  vehicle_number: string
  delivery_charge: number
  fuel_cost: number
  total_amount: number
  special_instructions: string
  assigned_staff: string
  assigned_staff_id?: string
  // Link to a booking, so we can show and reschedule return
  booking_id?: string
  booking_number?: string
  booking?: {
    booking_number?: string
  }
  booking_source?: "product_order" | "package_booking"
  // If rescheduled, store the new time (ISO string). If not, UI falls back to booking's return_date
  rescheduled_return_at?: string
  // Confirmation fields
  delivered_at?: string
  delivery_confirmation_name?: string
  delivery_confirmation_phone?: string
  delivery_photo_url?: string
  delivery_notes?: string
  delivery_items_count?: number
  delivery_items_confirmed?: boolean
  // Return confirmation fields
  return_confirmation_name?: string
  return_confirmation_phone?: string
  return_photo_url?: string
  return_notes?: string
  returned_at?: string
}

interface Staff {
  id: string
  name: string
  role: string
  is_active: boolean
  franchise?: {
    name: string
  }
}

export default function DeliveriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("deliveries")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [showHandoverDialog, setShowHandoverDialog] = useState(false)
  const [showMarkDeliveredDialog, setShowMarkDeliveredDialog] = useState(false)
  const [showProcessReturnDialog, setShowProcessReturnDialog] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [returns, setReturns] = useState<any[]>([])
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null)
  const [showReturnProcessingDialog, setShowReturnProcessingDialog] = useState(false)
  const [returnStatusFilter, setReturnStatusFilter] = useState("all")
  const [returnSearchTerm, setReturnSearchTerm] = useState("")
  const [deliveryItems, setDeliveryItems] = useState<any[]>([])
  const [deliveryPackage, setDeliveryPackage] = useState<any>(null)
  const [loadingDeliveryItems, setLoadingDeliveryItems] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set())
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [assignedStaffIds, setAssignedStaffIds] = useState<Set<string>>(new Set())
  const [editAssignedStaffIds, setEditAssignedStaffIds] = useState<Set<string>>(new Set())
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_id: "",
    pickup_address: "",
    delivery_address: "",
    delivery_date: "",
    delivery_time: "",
    driver_name: "",
    vehicle_number: "",
    delivery_charge: "",
    fuel_cost: "",
    special_instructions: "",
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  // Unified bookings list from our API (aggregates product_orders + package_bookings)
  const [bookings, setBookings] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [tableNotFound, setTableNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [scheduleForm, setScheduleForm] = useState({
    customer_id: "",
    booking_id: "",
    booking_source: "",
    delivery_type: "package_rental",
    pickup_address: "",
    delivery_address: "",
    delivery_date: "",
    delivery_time: "",
    assigned_staff: "",
    driver_name: "",
    vehicle_number: "",
    delivery_charge: "",
    fuel_cost: "",
    special_instructions: "",
  })

  // The bookings API aggregates multiple source tables and uses plural source
  // names. Deliveries use the singular values consumed by the fulfilment APIs.
  const normalizeBookingSource = (source?: string | null) => {
    if (source === "package_bookings") return "package_booking"
    if (source === "product_orders") return "product_order"
    if (source === "direct_sales" || source === "direct_sales_orders") return "direct_sale"
    return source || ""
  }

  const [rescheduleForm, setRescheduleForm] = useState<{
    date: string
    time: string
  }>({ date: "", time: "18:00" })

  const [dateFilter, setDateFilter] = useState<{
    from: string
    to: string
  } | null>(null)

  const fetchCurrentUser = async () => {
    try {
      setAuthError(null)
      const userStr = localStorage.getItem("safawala_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user && user.id) {
          setCurrentUser(user)
          setAuthResolved(true)
          return
        }
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single()

        if (!error && userData) {
          setCurrentUser(userData)
          localStorage.setItem("safawala_user", JSON.stringify(userData))
          setAuthResolved(true)
          return
        }
      }

      setCurrentUser(null)
      setAuthError("Please log in to access deliveries.")
    } catch {
      setCurrentUser(null)
      setAuthError("Failed to load your session. Please sign in again.")
    } finally {
      setAuthResolved(true)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    fetchData()
  }, [dateFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch customers from API (handles franchise filtering)
      try {
        const res = await fetch("/api/customers", { cache: "no-store" })
        if (res.ok) {
          const json = await res.json()
          setCustomers(json?.data || [])
        } else {
          setCustomers([])
        }
      } catch {
        setCustomers([])
      }

      // Fetch bookings from unified API (includes product_orders and package_bookings)
      try {
        const res = await fetch("/api/bookings", { cache: "no-store" })
        if (!res.ok) throw new Error(`Bookings API error: ${res.status}`)
        const json = await res.json()
        setBookings(json?.data || [])
      } catch {
        setBookings([])
      }

      // Fetch staff from users table (staff members with deliveries permission)
      try {
        const staffRes = await fetch("/api/staff/delivery-team", { cache: "no-store" })
        if (staffRes.ok) {
          const staffJson = await staffRes.json()
          setStaff(staffJson?.data || [])
        } else {
          // Fallback: try direct query to users table
          const { data: staffData, error: staffError } = await supabase
            .from("users")
            .select("id, name, email, role, franchise_id")
            .in("role", ["staff", "franchise_admin", "super_admin"])
            .order("name")

          if (staffError) {
            setStaff([])
          } else {
            setStaff(staffData || [])
          }
        }
      } catch {
        setStaff([])
      }

      // Fetch deliveries from API
      try {
        const deliveriesRes = await fetch("/api/deliveries", { cache: "no-store" })
        
        if (!deliveriesRes.ok) {
          await deliveriesRes.json().catch(() => ({}))
          setDeliveries([])
        } else {
          setTableNotFound(false)
          const deliveriesJson = await deliveriesRes.json()
          
          // Map API response to UI format
          const mappedDeliveries = (deliveriesJson?.data || []).map((d: any) => ({
            id: d.id,
            delivery_number: d.delivery_number,
            customer_id: d.customer_id,
            customer_name: d.customer?.name || "Unknown",
            customer_phone: d.customer?.phone || "",
            pickup_address: d.pickup_address || "",
            delivery_address: d.delivery_address,
            delivery_date: d.delivery_date,
            delivery_time: d.delivery_time,
            status: d.status,
            driver_name: d.driver_name || "",
            vehicle_number: d.vehicle_number || "",
            delivery_charge: Number(d.delivery_charge) || 0,
            fuel_cost: Number(d.fuel_cost) || 0,
            total_amount: Number(d.total_amount) || 0,
            special_instructions: d.special_instructions || "",
            assigned_staff: d.assigned_staff_id || "",
            booking_id: d.booking_id || undefined,
            booking_source: d.booking_source || undefined,
            rescheduled_return_at: d.rescheduled_return_at || undefined,
            // Delivery confirmation fields
            delivered_at: d.delivered_at || undefined,
            delivery_confirmation_name: d.delivery_confirmation_name || undefined,
            delivery_confirmation_phone: d.delivery_confirmation_phone || undefined,
            delivery_photo_url: d.delivery_photo_url || undefined,
            delivery_items_count: d.delivery_items_count || undefined,
            delivery_items_confirmed: d.delivery_items_confirmed || undefined,
            delivery_notes: d.delivery_notes || undefined,
            // Return confirmation fields
            return_confirmation_name: d.return_confirmation_name || undefined,
            return_confirmation_phone: d.return_confirmation_phone || undefined,
            return_photo_url: d.return_photo_url || undefined,
            return_notes: d.return_notes || undefined,
            returned_at: d.returned_at || undefined,
          }))
          
          setDeliveries(mappedDeliveries)
        }
      } catch {
        setDeliveries([])
      }

      // Fetch returns from API
      try {
        const returnsRes = await fetch("/api/returns", { cache: "no-store" })
        if (returnsRes.ok) {
          const returnsJson = await returnsRes.json()
          setReturns(returnsJson?.returns || [])
        } else {
          setReturns([])
        }
      } catch {
        setReturns([])
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper: update URL query params without full reload
  const replaceQuery = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === "") params.delete(key)
      else params.set(key, String(value))
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`)
  }

  // Helper: clear action-related params
  const clearActionParams = () => replaceQuery({ action: null, delivery_id: null, return_id: null })

  // Status update handlers
  const handleStartTransit = async (deliveryId: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(deliveryId))
    try {
      const res = await fetch(`/api/deliveries/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delivery_id: deliveryId, status: "in_transit" }),
      })

      if (!res.ok) {
        // Handle non-JSON responses (like 404 HTML pages)
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json()
          throw new Error(error.error || error.message || "Failed to update status")
        } else {
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }

      toast({
        title: "Success",
        description: "Delivery marked as in transit",
      })

      await fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start transit",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev)
        next.delete(deliveryId)
        return next
      })
    }
  }

  const handleMarkDelivered = async (deliveryId: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(deliveryId))
    try {
      const res = await fetch(`/api/deliveries/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delivery_id: deliveryId, status: "delivered" }),
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json()
          throw new Error(error.error || error.message || "Failed to mark as delivered")
        } else {
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }

      const data = await res.json()

      toast({
        title: "Success",
        description: data.return_created
          ? "Delivery marked as delivered. Return automatically created."
          : "Delivery marked as delivered.",
      })
      // Open handover capture immediately to record 'not tied' quantities
      const justDelivered = deliveries.find(d => d.id === deliveryId) || null
      if (justDelivered) {
        setSelectedDelivery(justDelivered)
        setShowHandoverDialog(true)
        replaceQuery({ tab: "deliveries", action: "handover", delivery_id: deliveryId })
      }
      // Refresh list in background
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev)
        next.delete(deliveryId)
        return next
      })
    }
  }

  // Deep-link: apply URL params to UI state
  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab && tab === "deliveries" && tab !== activeTab) {
      setActiveTab(tab)
    }

    const action = searchParams?.get("action")
    if (!action) return

    // Handle delivery actions
    const did = searchParams?.get("delivery_id")
    if (did && deliveries.length) {
      const d = deliveries.find((x) => x.id === did)
      if (!d) return
      if (action === "view" && !showViewDialog) {
        setSelectedDelivery(d)
        setShowViewDialog(true)
      }
      if (action === "edit" && !showEditDialog) {
        ;(async () => {
          setSelectedDelivery(d)
          // Prefill same as Edit click
          let deliveryDate = d.delivery_date
          let deliveryTime = d.delivery_time || ""
          let deliveryAddress = d.delivery_address
          
          // Always try to fill from booking if not already filled
          if (d.booking_id) {
            const linkedBooking = bookings.find((b: any) => b.id === d.booking_id && b.source === d.booking_source)
            if (linkedBooking) {
              // Auto-fill from booking with priority to existing delivery values
              deliveryDate = deliveryDate || linkedBooking.delivery_date || ""
              deliveryTime = deliveryTime || linkedBooking.delivery_time || ""
              deliveryAddress = deliveryAddress || linkedBooking.delivery_address || ""
            }
          }
          
          // If delivery address still not filled, fetch from customer profile
          if (!deliveryAddress && d.customer_id) {
            try {
              const res = await fetch(`/api/customers/${d.customer_id}`)
              if (res.ok) {
                const json = await res.json()
                const customer = json.data || json
                if (customer?.address) {
                  deliveryAddress = customer.address
                }
              }
            } catch {
            }
          }
          
          setEditForm({
            customer_name: d.customer_name,
            customer_phone: d.customer_phone,
            customer_id: d.customer_id || "",
            pickup_address: d.pickup_address,
            delivery_address: deliveryAddress,
            delivery_date: deliveryDate,
            delivery_time: deliveryTime,
            driver_name: d.driver_name,
            vehicle_number: d.vehicle_number,
            delivery_charge: d.delivery_charge.toString(),
            fuel_cost: d.fuel_cost.toString(),
            special_instructions: d.special_instructions,
          })
          // Load existing staff assignments
          if (d.assigned_staff) {
            setEditAssignedStaffIds(new Set([d.assigned_staff]))
          } else {
            setEditAssignedStaffIds(new Set())
          }
          // Try to fetch all assigned staff from junction table
          try {
            const staffRes = await fetch(`/api/deliveries/${d.id}/staff`)
            if (staffRes.ok) {
              const staffJson = await staffRes.json()
              if (staffJson.data && staffJson.data.length > 0) {
                const staffIdSet = new Set(staffJson.data.map((s: any) => s.staff?.id || s.staff_id).filter(Boolean))
                if (staffIdSet.size > 0) {
                  setEditAssignedStaffIds(staffIdSet as Set<string>)
                }
              }
            }
          } catch {
          }
          if (d.customer_id) {
            setLoadingAddresses(true)
            try {
              const res = await fetch(`/api/customer-addresses?customer_id=${d.customer_id}`)
              if (res.ok) {
                const json = await res.json()
                if (json.data) setSavedAddresses(json.data)
              }
            } catch {}
            setLoadingAddresses(false)
          }
          setShowEditDialog(true)
        })()
      }
      if (action === "handover" && !showHandoverDialog) {
        setSelectedDelivery(d)
        setShowHandoverDialog(true)
      }
    }

    // Handle return actions
    const rid = searchParams?.get("return_id")
    if (rid && returns.length) {
      const r = returns.find((x) => x.id === rid)
      if (r && action === "process_return" && !showReturnProcessingDialog) {
        setSelectedReturn(r)
        setShowReturnProcessingDialog(true)
      }
    }
  }, [searchParams, deliveries, bookings, returns])

  // Load saved addresses when customer is selected in schedule form
  useEffect(() => {
    if (showScheduleDialog && scheduleForm.customer_id) {
      (async () => {
        setLoadingAddresses(true)
        try {
          const res = await fetch(`/api/customer-addresses?customer_id=${scheduleForm.customer_id}`)
          if (res.ok) {
            const json = await res.json()
            if (json.data) setSavedAddresses(json.data)
          }
        } catch {}
        setLoadingAddresses(false)
      })()
    }
  }, [showScheduleDialog, scheduleForm.customer_id])

  // Load saved addresses when Edit dialog opens
  useEffect(() => {
    if (showEditDialog && editForm.customer_id) {
      (async () => {
        setLoadingAddresses(true)
        try {
          const res = await fetch(`/api/customer-addresses?customer_id=${editForm.customer_id}`)
          if (res.ok) {
            const json = await res.json()
            if (json.data) setSavedAddresses(json.data)
          }
        } catch {}
        setLoadingAddresses(false)
      })()
    }
  }, [showEditDialog, editForm.customer_id])

  const handleCancelDelivery = async (deliveryId: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(deliveryId))
    try {
      const res = await fetch(`/api/deliveries/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delivery_id: deliveryId, status: "cancelled" }),
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json()
          throw new Error(error.error || error.message || "Failed to cancel delivery")
        } else {
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }

      toast({
        title: "Success",
        description: "Delivery cancelled",
      })

      await fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel delivery",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev)
        next.delete(deliveryId)
        return next
      })
    }
  }

  const deliveryOverview = {
    totalDeliveries: deliveries.length,
    inTransit: deliveries.filter((delivery) => delivery.status === "in_transit").length,
    delivered: deliveries.filter((delivery) => delivery.status === "delivered").length,
    pending: deliveries.filter((delivery) => delivery.status === "pending").length,
    cancelled: deliveries.filter((delivery) => delivery.status === "cancelled").length,
    orderCompleted: deliveries.filter((delivery) => (delivery as any).returned_at !== null && (delivery as any).returned_at !== undefined).length,
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "return_completed":
        return <PackageCheck className="h-4 w-4 text-purple-500" />
      case "in_transit":
        return <Truck className="h-4 w-4 text-blue-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  // Fetch items and package for the selected delivery
  const loadDeliveryItems = async (delivery: Delivery) => {
    if (!delivery.booking_id) {
      setDeliveryItems([])
      setDeliveryPackage(null)
      return
    }

    setLoadingDeliveryItems(true)
    try {
      // Determine which tables to query based on booking_source
      const isPackageBooking = delivery.booking_source === "package_booking"
      const orderTable = isPackageBooking ? "package_bookings" : "product_orders"
      const itemsTable = isPackageBooking ? "package_booking_product_items" : "product_order_items"
      const foreignKey = isPackageBooking ? "package_booking_id" : "order_id"

      // Fetch the order to get package/variant info
      const { data: orderData, error: orderError } = await supabase
        .from(orderTable)
        .select("variant_id, selection_mode, custom_package_price")
        .eq("id", delivery.booking_id)
        .single()

      if (!orderError && orderData?.variant_id) {
        // Fetch package details
        const { data: packageData, error: packageError } = await supabase
          .from("package_variants")
          .select("*")
          .eq("id", orderData.variant_id)
          .single()

        if (!packageError && packageData) {
          setDeliveryPackage(packageData)
        } else {
          setDeliveryPackage(null)
        }
      } else {
        setDeliveryPackage(null)
      }

      // Fetch items from the appropriate items table
      const { data, error } = await supabase
        .from(itemsTable)
        .select("*")
        .eq(foreignKey, delivery.booking_id)

      if (error) {
        setDeliveryItems([])
      } else {
        setDeliveryItems(data || [])
      }
    } catch (err) {
      setDeliveryItems([])
      setDeliveryPackage(null)
    } finally {
      setLoadingDeliveryItems(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "in_transit":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.delivery_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.driver_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter
    const matchesDeliveryType = deliveryTypeFilter === "all" || delivery.delivery_type === deliveryTypeFilter

    return matchesSearch && matchesStatus && matchesDeliveryType
  })

  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredDeliveries.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredDeliveries, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, deliveryTypeFilter])

  // Load delivery items when view dialog is opened
  useEffect(() => {
    if (showViewDialog && selectedDelivery) {
      loadDeliveryItems(selectedDelivery)
    }
  }, [showViewDialog, selectedDelivery?.id])

  // Map bookings by id for quick lookup
  const bookingsById = useMemo(() => {
    const map = new Map<string, any>()
    for (const b of bookings || []) map.set(b.id, b)
    return map
  }, [bookings])

  // Compute current return for a delivery: rescheduled_return_at or booking.pickup_date (original return)
  const getCurrentReturnISO = (delivery: Delivery): string | null => {
    if (delivery.rescheduled_return_at) return delivery.rescheduled_return_at
    if (delivery.booking_id) {
      const b = bookingsById.get(delivery.booking_id)
      // unified API exposes return as pickup_date
      return b?.pickup_date || null
    }
    return null
  }

  // Calculate completeness percentage based on filled optional fields
  const calculateCompleteness = (delivery: Delivery): { percentage: number; missing: string[] } => {
    const fields = [
      { key: 'driver_name', label: 'Driver Name', value: delivery.driver_name },
      { key: 'vehicle_number', label: 'Vehicle Number', value: delivery.vehicle_number },
      { key: 'pickup_address', label: 'Pickup Address', value: delivery.pickup_address },
      { key: 'delivery_address', label: 'Delivery Address', value: delivery.delivery_address },
      { key: 'delivery_date', label: 'Delivery Date', value: delivery.delivery_date },
      { key: 'delivery_time', label: 'Delivery Time', value: delivery.delivery_time },
      { key: 'customer_phone', label: 'Customer Phone', value: delivery.customer_phone },
      { key: 'special_instructions', label: 'Special Instructions', value: delivery.special_instructions },
    ]
    
    const filled = fields.filter(f => f.value && f.value.trim() !== '').length
    const total = fields.length
    const percentage = Math.round((filled / total) * 100)
    const missing = fields.filter(f => !f.value || f.value.trim() === '').map(f => f.label)
    
    return { percentage, missing }
  }

  // Get color based on completion percentage
  const getCompletenessColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600 bg-green-100'
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const handleBack = () => {
    router.push("/dashboard")
  }

  if (!authResolved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground animate-pulse">Loading Deliveries...</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication required</CardTitle>
            <CardDescription>{authError || "Please sign in to continue."}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
            <Button variant="outline" onClick={fetchCurrentUser}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentUser?.role === 'staff') {
    const riderDeliveries = deliveries.filter(d => d.assigned_staff === currentUser.id)
    const riderReturns = returns.filter(r => r.delivery?.assigned_staff_id === currentUser.id || r.processed_by === currentUser.id)

    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 max-w-md mx-auto">
        {/* Rider Header */}
        <div className="flex items-center justify-between pb-2 border-b">
          <div>
            <h2 className="text-xl font-bold tracking-tight">🏍️ Rider Focus Mode</h2>
            <p className="text-xs text-muted-foreground">Logged in as {currentUser.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : riderDeliveries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-semibold text-gray-900">No assigned deliveries</p>
                <p className="text-xs text-gray-500">You are all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {riderDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{delivery.delivery_number}</span>
                        <Badge className={getStatusColor(delivery.status)}>{delivery.status}</Badge>
                      </div>
                      <CardTitle className="text-base font-bold mt-1">{delivery.customer_name}</CardTitle>
                      {delivery.customer_phone && (
                        <div className="mt-1">
                          <a
                            href={`tel:${delivery.customer_phone}`}
                            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            {delivery.customer_phone}
                          </a>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Address:</strong> {delivery.delivery_address}</p>
                        <p><strong>Scheduled:</strong> {delivery.delivery_date} {delivery.delivery_time ? `at ${formatTime12Hour(delivery.delivery_time)}` : ""}</p>
                        {delivery.special_instructions && (
                          <p className="bg-yellow-50 text-yellow-800 p-2 rounded text-[11px] border border-yellow-100">
                            <strong>Note:</strong> {delivery.special_instructions}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2">
                        {delivery.status === "pending" && (
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            disabled={updatingStatus.has(delivery.id)}
                            onClick={() => handleStartTransit(delivery.id)}
                          >
                            {updatingStatus.has(delivery.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            Start Transit
                          </Button>
                        )}
                        {delivery.status === "in_transit" && (
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                            onClick={() => {
                              setSelectedDelivery(delivery)
                              setShowHandoverDialog(true)
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete Handover
                          </Button>
                        )}
                        {delivery.status === "delivered" && (
                          <div className="text-center py-1.5 bg-green-50 text-green-700 rounded text-xs font-semibold flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                            Handover Complete
                          </div>
                        )}
                        {delivery.status === "cancelled" && (
                          <div className="text-center py-1.5 bg-red-50 text-red-700 rounded text-xs font-semibold">
                            Cancelled
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>

        {/* Unified Handover Dialog */}
        <UnifiedHandoverDialog
          open={showHandoverDialog}
          onClose={() => { setShowHandoverDialog(false); clearActionParams() }}
          delivery={selectedDelivery}
          onSaved={() => fetchData()}
        />

        {/* Return Processing Dialog */}
        <ReturnProcessingDialog
          open={showReturnProcessingDialog}
          onClose={() => {
            setShowReturnProcessingDialog(false)
            setSelectedReturn(null)
          }}
          returnRecord={selectedReturn}
          onSuccess={async () => {
            setShowReturnProcessingDialog(false)
            setSelectedReturn(null)
            await fetchData()
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-[#F7F6F9] min-h-screen text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center space-x-2 text-[#4A1F5E] hover:text-[#352044] hover:bg-[#F1EAF5] border border-[#E1D8E8] rounded-lg px-4 py-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-sans font-medium text-xs">Back</span>
          </Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1F1B24] flex items-center gap-2"><Package className="h-7 w-7 text-[#5B2A86]" />Deliveries & Rental Returns</h2>
            <p className="text-sm text-slate-500 mt-1">Schedule deliveries, track fulfillment, and manage rental returns</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchData()} disabled={loading} className="border-[#E1D8E8] text-[#4A1F5E] hover:bg-[#F1EAF5] rounded-lg px-4 py-2.5">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A1F5E] hover:bg-[#5C2A72] text-white shadow-sm font-semibold px-5 py-2.5 rounded-lg flex items-center transition-colors">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Delivery</DialogTitle>
                <DialogDescription>Create a new delivery schedule for wedding turban orders</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select
                      value={scheduleForm.customer_id}
                      onValueChange={(value) => {
                        // Find selected customer
                        const selectedCustomer = customers.find(c => c.id === value)
                        
                        // Get customer's address if available
                        let customerAddress = selectedCustomer?.address || ""
                        
                        // Get first booking for this customer to auto-fill date/time if available
                        const customerBookings = bookings.filter((b: any) => b.customer_id === value)
                        const firstBooking = customerBookings[0]
                        
                        // Convert delivery_date to YYYY-MM-DD format if it exists
                        let deliveryDate = ""
                        if (firstBooking?.delivery_date) {
                          // If it's an ISO string or timestamp, extract just the date part
                          const dateObj = new Date(firstBooking.delivery_date)
                          deliveryDate = dateObj.toISOString().split('T')[0] // YYYY-MM-DD
                        }
                        
                        // Convert delivery_time to HH:MM format if it exists
                        let deliveryTime = ""
                        if (firstBooking?.delivery_time) {
                          // If it's already in HH:MM format, use as-is; otherwise try to parse
                          deliveryTime = String(firstBooking.delivery_time).substring(0, 5) // Take first 5 chars for HH:MM
                        }
                        
                        setScheduleForm({
                          ...scheduleForm,
                          customer_id: value,
                          booking_id: "",
                          booking_source: "",
                          // Auto-fill delivery address from customer profile
                          delivery_address: customerAddress,
                          // Auto-fill delivery date & time from first available booking (converted to proper format)
                          delivery_date: deliveryDate,
                          delivery_time: deliveryTime,
                        })
                      }}
                    >
                      <SelectTrigger className="border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="top" align="start" className="max-h-[240px] z-[100] bg-white border border-gray-200 shadow-lg rounded-md p-1">
                        {customers.map((customer) => (
                          <SelectItem 
                            key={customer.id} 
                            value={customer.id}
                            className="cursor-pointer pl-8 pr-3 py-2.5 mb-1 hover:bg-gray-100 focus:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900 transition-colors rounded-sm relative"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm">{customer.name}</span>
                              <span className="text-xs text-gray-500">{customer.phone}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {customers.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No customers available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking">Related Booking (Optional)</Label>
                    <Select
                      value={scheduleForm.booking_id && scheduleForm.booking_source ? `${scheduleForm.booking_id}::${scheduleForm.booking_source}` : ""}
                      onValueChange={(value) => {
                        if (!value) return
                        // value contains "<id>::<source>"
                        const [id, source] = value.split("::")
                        
                        // Find the selected booking
                        const selectedBooking = bookings.find((b: any) => b.id === id)
                        
                        if (selectedBooking) {
                          // Convert delivery_date to YYYY-MM-DD format
                          let deliveryDate = ""
                          if (selectedBooking.delivery_date) {
                            const dateObj = new Date(selectedBooking.delivery_date)
                            deliveryDate = dateObj.toISOString().split('T')[0] // YYYY-MM-DD
                          }
                          
                          // Convert delivery_time to HH:MM format
                          let deliveryTime = ""
                          if (selectedBooking.delivery_time) {
                            deliveryTime = String(selectedBooking.delivery_time).substring(0, 5) // HH:MM
                          }
                          
                          // Auto-fill data from booking
                          setScheduleForm((prev) => ({
                            ...prev,
                            booking_id: id,
                            booking_source: normalizeBookingSource(source),
                            // Auto-fill customer if not already selected
                            customer_id: prev.customer_id || selectedBooking.customer_id || "",
                            // Auto-fill delivery date and time from booking (with proper formatting)
                            delivery_date: deliveryDate || prev.delivery_date || "",
                            delivery_time: deliveryTime || prev.delivery_time || "",
                            // Auto-fill delivery address if available
                            delivery_address: selectedBooking.delivery_address || prev.delivery_address || "",
                          }))
                        } else {
                          setScheduleForm({ ...scheduleForm, booking_id: id, booking_source: normalizeBookingSource(source) })
                        }
                      }}
                    >
                      <SelectTrigger className="border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Select booking" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="top" align="start" className="max-h-[240px] z-[100] bg-white border border-gray-200 shadow-lg rounded-md p-1">
                        {(() => {
                          // Filter bookings by selected customer
                          const filteredBookings = scheduleForm.customer_id
                            ? bookings.filter((b: any) => b.customer_id === scheduleForm.customer_id)
                            : bookings
                          
                          if (filteredBookings.length === 0) {
                            return (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                {scheduleForm.customer_id ? "No bookings for this customer" : "No bookings available"}
                              </div>
                            )
                          }
                          
                          return filteredBookings.map((booking: any) => (
                            <SelectItem 
                              key={booking.id} 
                              value={`${booking.id}::${booking.source}`}
                              className="cursor-pointer pl-8 pr-3 py-2.5 mb-1 hover:bg-gray-100 focus:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900 transition-colors rounded-sm relative"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm">{booking.booking_number}</span>
                                <span className="text-xs text-gray-500">
                                  {booking.type} • ₹{booking.total_amount?.toLocaleString()}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_type">Delivery Type</Label>
                    <Select
                      value={scheduleForm.delivery_type}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, delivery_type: value })}
                    >
                      <SelectTrigger className="border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" side="top" align="start" className="z-[100] bg-white border border-gray-200 shadow-lg rounded-md p-1">
                        <SelectItem 
                          value="package_rental"
                          className="cursor-pointer pl-8 pr-3 py-2.5 mb-1 hover:bg-gray-100 focus:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900 transition-colors rounded-sm relative"
                        >
                          <span className="font-medium">Package Rental</span>
                        </SelectItem>
                        <SelectItem 
                          value="product_rental"
                          className="cursor-pointer pl-8 pr-3 py-2.5 mb-1 hover:bg-gray-100 focus:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900 transition-colors rounded-sm relative"
                        >
                          <span className="font-medium">Product Rental</span>
                        </SelectItem>
                        <SelectItem 
                          value="product_sale"
                          className="cursor-pointer pl-8 pr-3 py-2.5 mb-1 hover:bg-gray-100 focus:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900 transition-colors rounded-sm relative"
                        >
                          <span className="font-medium">Product Sale</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned_staff">Assigned Staff</Label>
                    <Select
                      value={scheduleForm.assigned_staff}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, assigned_staff: value })}
                    >
                      <SelectTrigger className="border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="top" align="start" className="max-h-[240px] z-[100] bg-white border border-gray-200 shadow-lg rounded-md p-1">
                        {staff.map((member) => (
                          <SelectItem 
                            key={member.id} 
                            value={member.id}
                            className="cursor-pointer pl-8 pr-3 py-2.5 mb-1 hover:bg-gray-100 focus:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-900 transition-colors rounded-sm relative"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm">{member.name}</span>
                              <span className="text-xs text-gray-500">{member.role}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {staff.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No staff members available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickup_address">Pickup Address</Label>
                  
                  {/* Smart Address Dropdown - Only for Pickup */}
                  {savedAddresses.length > 0 && (
                    <Select
                      onValueChange={(value) => {
                        if (value === 'new') {
                          setScheduleForm({ ...scheduleForm, pickup_address: '' })
                        } else if (value === 'current') {
                          // Keep current value
                        } else {
                          const selected = savedAddresses.find(a => a.id === value)
                          if (selected) {
                            setScheduleForm({ ...scheduleForm, pickup_address: selected.full_address })
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="mb-2">
                        <SelectValue placeholder="📍 Quick Select from Saved Addresses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Use Current Address</SelectItem>
                        <SelectItem value="new">✏️ Type New Address</SelectItem>
                        {savedAddresses.map(addr => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label ? `${addr.label}: ` : ''}{addr.full_address.substring(0, 50)}{addr.full_address.length > 50 ? '...' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Textarea
                    id="pickup_address"
                    placeholder="Enter pickup address or select from saved addresses above"
                    value={scheduleForm.pickup_address}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, pickup_address: e.target.value })}
                  />
                  {loadingAddresses && (
                    <p className="text-xs text-muted-foreground">Loading saved addresses...</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_address">Delivery Address</Label>
                  <Textarea
                    id="delivery_address"
                    placeholder="Enter delivery address"
                    value={scheduleForm.delivery_address}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, delivery_address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_date">Delivery Date</Label>
                    <Input
                      id="delivery_date"
                      type="date"
                      value={scheduleForm.delivery_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, delivery_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_time">Preferred Time</Label>
                    <Input
                      id="delivery_time"
                      type="time"
                      value={scheduleForm.delivery_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, delivery_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver_name">Driver Name</Label>
                    <Input
                      id="driver_name"
                      placeholder="Enter driver name"
                      value={scheduleForm.driver_name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, driver_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_number">Vehicle Number</Label>
                    <Input
                      id="vehicle_number"
                      placeholder="Enter vehicle number"
                      value={scheduleForm.vehicle_number}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, vehicle_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assign Staff</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50">
                    {staff.length > 0 ? (
                      staff.map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`staff_${member.id}`}
                            checked={assignedStaffIds.has(member.id)}
                            onChange={(e) => {
                              const newSet = new Set(assignedStaffIds)
                              if (e.target.checked) {
                                newSet.add(member.id)
                              } else {
                                newSet.delete(member.id)
                              }
                              setAssignedStaffIds(newSet)
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`staff_${member.id}`} className="text-sm cursor-pointer flex-1">
                            {member.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No staff members available</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {assignedStaffIds.size} staff member{assignedStaffIds.size !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_charge">Delivery Charge (₹)</Label>
                    <Input
                      id="delivery_charge"
                      type="number"
                      placeholder="0.00"
                      value={scheduleForm.delivery_charge}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, delivery_charge: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_cost">Fuel Cost (₹)</Label>
                    <Input
                      id="fuel_cost"
                      type="number"
                      placeholder="0.00"
                      value={scheduleForm.fuel_cost}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, fuel_cost: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea
                    id="special_instructions"
                    placeholder="Any special delivery instructions"
                    value={scheduleForm.special_instructions}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, special_instructions: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // Validation
                      if (!scheduleForm.customer_id) {
                        toast({
                          title: "Validation Error",
                          description: "Please select a customer",
                          variant: "destructive",
                        })
                        return
                      }

                      if (!scheduleForm.delivery_address || scheduleForm.delivery_address.trim() === "") {
                        toast({
                          title: "Validation Error",
                          description: "Please enter delivery address",
                          variant: "destructive",
                        })
                        return
                      }

                      if (!scheduleForm.delivery_date) {
                        toast({
                          title: "Validation Error",
                          description: "Please select delivery date",
                          variant: "destructive",
                        })
                        return
                      }

                      // Use the canonical deliveries endpoint. It applies the
                      // same auth, franchise isolation, UUID sanitisation and
                      // junction-table handling as all other delivery actions.
                      const response = await fetch("/api/deliveries", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          customer_id: scheduleForm.customer_id,
                          booking_id: scheduleForm.booking_id || null,
                          booking_source: scheduleForm.booking_source || null,
                          delivery_type: scheduleForm.delivery_type,
                          pickup_address: scheduleForm.pickup_address,
                          delivery_address: scheduleForm.delivery_address,
                          delivery_date: scheduleForm.delivery_date,
                          delivery_time: scheduleForm.delivery_time || null,
                          driver_name: scheduleForm.driver_name,
                          vehicle_number: scheduleForm.vehicle_number,
                          assigned_staff_ids: Array.from(assignedStaffIds),
                          delivery_charge: scheduleForm.delivery_charge,
                          fuel_cost: scheduleForm.fuel_cost,
                          special_instructions: scheduleForm.special_instructions,
                        }),
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || "Failed to schedule delivery")
                      }

                      const result = await response.json()

                      // Save pickup address to customer_addresses if it's new
                      if (scheduleForm.customer_id && scheduleForm.pickup_address.trim()) {
                        try {
                          const res = await fetch('/api/customer-addresses', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              customer_id: scheduleForm.customer_id,
                              full_address: scheduleForm.pickup_address.trim(),
                              address_line_1: scheduleForm.pickup_address.trim(),
                              address_type: 'pickup'
                            })
                          })
                          if (!res.ok) {
                            await res.json().catch(() => ({}))
                          }
                        } catch {
                        }
                      }

                      toast({
                        title: "Success!",
                        description: `Delivery ${result.data.delivery_number} scheduled successfully`,
                      })

                      // Reset form
                      setScheduleForm({
                        customer_id: "",
                        booking_id: "",
                        booking_source: "",
                        delivery_type: "package_rental",
                        pickup_address: "",
                        delivery_address: "",
                        delivery_date: "",
                        delivery_time: "",
                        assigned_staff: "",
                        driver_name: "",
                        vehicle_number: "",
                        delivery_charge: "",
                        fuel_cost: "",
                        special_instructions: "",
                      })
                      setAssignedStaffIds(new Set())
                      setShowScheduleDialog(false)
                      
                      // Refresh deliveries list
                      await fetchData()
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to schedule delivery. Please try again.",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  Schedule Delivery
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <BookingWorkflowStepper
        currentStep="delivery"
        accent="purple"
        customerId={selectedDelivery?.customer_id || filteredDeliveries[0]?.customer_id || deliveries[0]?.customer_id || undefined}
        bookingId={selectedDelivery?.booking_id || filteredDeliveries[0]?.booking_id || deliveries[0]?.booking_id || undefined}
        bookingNumber={selectedDelivery?.booking_number || selectedDelivery?.booking?.booking_number || filteredDeliveries[0]?.booking_number || deliveries[0]?.booking_number || undefined}
      />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_10px_rgba(31,27,36,0.04)] hover:shadow-md transition-all rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deliveries</CardTitle>
            <span className="h-9 w-9 rounded-lg bg-[#F1EAF5] flex items-center justify-center"><Package className="h-5 w-5 text-[#7B3FB0]" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1F1B24]">{deliveryOverview.totalDeliveries}</div>
            <p className="text-xs text-slate-400 mt-1">All scheduled deliveries</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_10px_rgba(31,27,36,0.04)] hover:shadow-md transition-all rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</CardTitle>
            <span className="h-9 w-9 rounded-lg bg-[#FFF4E5] flex items-center justify-center"><Clock className="h-5 w-5 text-amber-500" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1F1B24]">{deliveryOverview.pending}</div>
            <p className="text-xs text-slate-400 mt-1">Awaiting pickup</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_10px_rgba(31,27,36,0.04)] hover:shadow-md transition-all rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Transit</CardTitle>
            <span className="h-9 w-9 rounded-lg bg-[#EEF4FF] flex items-center justify-center"><Truck className="h-5 w-5 text-blue-500" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1F1B24]">{deliveryOverview.inTransit}</div>
            <p className="text-xs text-slate-400 mt-1">On the way</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_10px_rgba(31,27,36,0.04)] hover:shadow-md transition-all rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered</CardTitle>
            <span className="h-9 w-9 rounded-lg bg-[#EAF8F0] flex items-center justify-center"><CheckCircle className="h-5 w-5 text-emerald-500" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1F1B24]">{deliveryOverview.delivered}</div>
            <p className="text-xs text-slate-400 mt-1">Successfully delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_10px_rgba(31,27,36,0.04)] hover:shadow-md transition-all rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Completed</CardTitle>
            <span className="h-9 w-9 rounded-lg bg-[#F4EEFF] flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-[#9A5CE6]" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1F1B24]">{deliveryOverview.orderCompleted}</div>
            <p className="text-xs text-slate-400 mt-1">Rental Return processed</p>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_10px_rgba(31,27,36,0.04)] hover:shadow-md transition-all rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancelled</CardTitle>
            <span className="h-9 w-9 rounded-lg bg-[#FFF0F0] flex items-center justify-center"><XCircle className="h-5 w-5 text-rose-500" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1F1B24]">{deliveryOverview.cancelled}</div>
            <p className="text-xs text-slate-400 mt-1">Cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-[#E2DCE8] focus:border-[#4A1F5E] focus:ring-1 focus:ring-[#4A1F5E] rounded-lg h-11 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white border-[#E2DCE8] text-sm h-11 rounded-lg">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-stone-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deliveryTypeFilter} onValueChange={setDeliveryTypeFilter}>
              <SelectTrigger className="w-[180px] bg-white border-[#E2DCE8] text-sm h-11 rounded-lg">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-stone-200">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="package_rental">Package Rental</SelectItem>
                <SelectItem value="product_rental">Product Rental</SelectItem>
                <SelectItem value="product_sale">Product Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deliveries Card */}
          <Card className="bg-white border border-[#E7E2EA] shadow-[0_2px_12px_rgba(31,27,36,0.04)] rounded-2xl">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold text-[#1F1B24] flex items-center gap-2">
                <Package className="h-5 w-5 text-[#4A1F5E]" />
                Delivery Orders
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">Manage and track all delivery orders</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
          <div className="space-y-4">
            {tableNotFound ? (
              <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Package className="mx-auto h-16 w-16 text-yellow-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Setup Required</h3>
                <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                  The deliveries table hasn't been created yet. Please run the migration to enable delivery tracking.
                </p>
                <div className="bg-white p-4 rounded border max-w-xl mx-auto text-left">
                  <p className="text-xs font-mono text-gray-800 mb-2">Run in Supabase SQL Editor:</p>
                  <code className="text-xs bg-gray-100 p-2 block rounded">
                    -- Paste contents of MIGRATION_DELIVERIES_TABLE.sql
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  See <code className="bg-gray-100 px-1 py-0.5 rounded">DELIVERIES_BACKEND_COMPLETE.md</code> for full instructions
                </p>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[300px]" />
                    </div>
                    <Skeleton className="h-8 w-[80px]" />
                  </div>
                ))}
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-16">
                <Truck className="mx-auto h-14 w-14 text-slate-300 mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No deliveries found</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-xs mx-auto">
                  {searchTerm
                    ? `No deliveries match "${searchTerm}". Try a different search term.`
                    : "No deliveries match the current filters. Try adjusting or resetting the filters."}
                </p>
                <button
                  onClick={() => { setSearchTerm(""); setStatusFilter("all") }}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              paginatedDeliveries.map((delivery) => {
                const { percentage, missing } = calculateCompleteness(delivery)
                
                return (
                  <div key={delivery.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-[#E7E2EA] rounded-xl bg-white gap-4 hover:border-[#BCA7C8] hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="mt-1 bg-[#F5EFFA] p-2.5 rounded-xl border border-[#E5D9EE]">
                        {getStatusIcon(delivery.status)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-stone-900 font-serif text-base">{delivery.delivery_number}</p>
                          <Badge className={`${getStatusColor(delivery.status)} text-xs border border-transparent font-sans`}>{delivery.status}</Badge>
                          
                          {/* Completeness Indicator */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className={`${getCompletenessColor(percentage)} border-stone-300 font-mono text-[10px] font-bold`}>
                                    {percentage}% Complete
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-stone-900 text-white rounded-md p-2">
                                <div className="space-y-2">
                                  <p className="font-semibold text-xs">Delivery Completeness</p>
                                  <Progress value={percentage} className="h-1.5" />
                                  {missing.length > 0 ? (
                                    <div>
                                      <p className="text-[10px] font-medium mb-1">Missing fields:</p>
                                      <ul className="text-[10px] list-disc list-inside">
                                        {missing.map((field) => (
                                          <li key={field}>{field}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-green-400">✓ All fields complete!</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-sm text-stone-700 font-medium">
                          {delivery.customer_name} {delivery.driver_name && `• Rider: ${delivery.driver_name}`} • <span className="font-semibold text-[#113c2c]">₹{delivery.total_amount}</span>
                        </p>
                        <p className="text-xs text-stone-500 font-sans">
                          Delivery: <strong className="text-stone-700">{delivery.delivery_date}</strong>
                          {(() => {
                            const ret = getCurrentReturnISO(delivery)
                            if (!ret) return null
                            try {
                              const d = new Date(ret)
                              return ` • Rental Return: ${d.toLocaleDateString()} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                            } catch {
                              return ` • Rental Return: ${ret}`
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-stone-200">
                      {delivery.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingStatus.has(delivery.id)}
                            onClick={() => handleStartTransit(delivery.id)}
                            className="border-[#DCCFE4] text-[#4A1F5E] hover:bg-[#F1EAF5] h-9 text-xs font-medium rounded-lg"
                          >
                            {updatingStatus.has(delivery.id) ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            )}
                            Start Transit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingStatus.has(delivery.id)}
                            onClick={() => handleCancelDelivery(delivery.id)}
                            className="border-[#DCCFE4] text-[#4A1F5E] hover:bg-[#F1EAF5] h-9 text-xs font-medium rounded-lg"
                          >
                            {updatingStatus.has(delivery.id) ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5 mr-1 text-rose-500" />
                            )}
                            Cancel
                          </Button>
                        </>
                      )}
                      {delivery.status === "in_transit" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingStatus.has(delivery.id)}
                            onClick={() => {
                              setSelectedDelivery(delivery)
                              setShowMarkDeliveredDialog(true)
                            }}
                            className="border-[#DCCFE4] text-[#4A1F5E] hover:bg-[#F1EAF5] h-9 text-xs font-medium rounded-lg"
                          >
                            {updatingStatus.has(delivery.id) ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            )}
                            Mark Delivered
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingStatus.has(delivery.id)}
                            onClick={() => handleCancelDelivery(delivery.id)}
                            className="border-[#DCCFE4] text-[#4A1F5E] hover:bg-[#F1EAF5] h-9 text-xs font-medium rounded-lg"
                          >
                            {updatingStatus.has(delivery.id) ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5 mr-1 text-rose-500" />
                            )}
                            Cancel
                          </Button>
                        </>
                      )}
                      {delivery.status === "delivered" && (
                        <>
                          {(delivery as any).returned_at ? (
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-sans text-xs py-1 px-2.5 rounded-lg border">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600 inline" />
                              Order Completed
                            </Badge>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-[#4A1F5E] hover:bg-[#5C2A72] text-white h-9 text-xs font-medium rounded-lg"
                              onClick={() => {
                                setSelectedDelivery(delivery)
                                setShowProcessReturnDialog(true)
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Process Rental Return
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDelivery(delivery)
                          setShowViewDialog(true)
                          replaceQuery({ tab: "deliveries", action: "view", delivery_id: delivery.id })
                        }}
                        className="h-8 w-8 p-0 text-stone-500 hover:text-[#113c2c]"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setSelectedDelivery(delivery)
                          
                          // If delivery has no date/time but has a linked booking, fetch from booking
                          let deliveryDate = delivery.delivery_date
                          let deliveryTime = delivery.delivery_time || ""
                          let deliveryAddress = delivery.delivery_address
                          
                          if (delivery.booking_id && (!deliveryDate || !deliveryTime)) {
                            // Fetch booking details to get date/time
                            const linkedBooking = bookings.find((b: any) => 
                              b.id === delivery.booking_id && b.source === delivery.booking_source
                            )
                            
                            if (linkedBooking) {
                              // Use booking's delivery_date and delivery_time if not set in delivery
                              deliveryDate = deliveryDate || linkedBooking.delivery_date || ""
                              deliveryTime = deliveryTime || linkedBooking.delivery_time || ""
                              deliveryAddress = deliveryAddress || linkedBooking.delivery_address || ""
                            }
                          }
                          
                          setEditForm({
                            customer_name: delivery.customer_name,
                            customer_phone: delivery.customer_phone,
                            customer_id: delivery.customer_id || "",
                            pickup_address: delivery.pickup_address,
                            delivery_address: deliveryAddress,
                            delivery_date: deliveryDate,
                            delivery_time: deliveryTime,
                            driver_name: delivery.driver_name,
                            vehicle_number: delivery.vehicle_number,
                            delivery_charge: delivery.delivery_charge.toString(),
                            fuel_cost: delivery.fuel_cost.toString(),
                            special_instructions: delivery.special_instructions,
                          })
                          
                          // Fetch saved addresses for this customer
                          if (delivery.customer_id) {
                            setLoadingAddresses(true)
                            try {
                              const { data, error } = await supabase
                                .from('customer_addresses')
                                .select('*')
                                .eq('customer_id', delivery.customer_id)
                                .order('last_used_at', { ascending: false })
                                .limit(10)
                              
                              if (!error && data) {
                                setSavedAddresses(data)
                              }
                            } catch {
                            } finally {
                              setLoadingAddresses(false)
                            }
                          }
                          
                          setShowEditDialog(true)
                          replaceQuery({ tab: "deliveries", action: "edit", delivery_id: delivery.id })
                        }}
                        className="h-8 w-8 p-0 text-stone-500 hover:text-[#113c2c]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
        
        {/* Pagination Controls */}
        {filteredDeliveries.length > 0 && (
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredDeliveries.length)} of{" "}
                  {filteredDeliveries.length} deliveries
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      </div>

      {/* View Dialog */}
      <Dialog
        open={showViewDialog}
        onOpenChange={(open) => {
          setShowViewDialog(open)
          if (!open) clearActionParams()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>View complete delivery information</DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Delivery Number</Label>
                  <p className="text-sm">{selectedDelivery.delivery_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedDelivery.status)}
                    <Badge className={getStatusColor(selectedDelivery.status)}>{selectedDelivery.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-sm">{selectedDelivery.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDelivery.customer_phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Driver</Label>
                  <p className="text-sm">{selectedDelivery.driver_name || 'Not assigned'}</p>
                  <p className="text-xs text-muted-foreground">{selectedDelivery.vehicle_number}</p>
                </div>
              </div>
              {/* Assigned Staff */}
              {(selectedDelivery as any).delivery_staff && (selectedDelivery as any).delivery_staff.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Assigned Staff</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(selectedDelivery as any).delivery_staff.map((ds: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {ds.staff?.name || ds.name || 'Staff'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* Show staff from assigned_staff_id if no delivery_staff */}
              {(!(selectedDelivery as any).delivery_staff || (selectedDelivery as any).delivery_staff.length === 0) && selectedDelivery.assigned_staff_id && (
                <div>
                  <Label className="text-sm font-medium">Assigned Staff</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {staff.filter(s => s.id === selectedDelivery.assigned_staff_id).map((s, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Pickup Address</Label>
                <p className="text-sm">{selectedDelivery.pickup_address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Delivery Address</Label>
                <p className="text-sm">{selectedDelivery.delivery_address}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Delivery Charge</Label>
                  <p className="text-sm">₹{selectedDelivery.delivery_charge}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fuel Cost</Label>
                  <p className="text-sm">₹{selectedDelivery.fuel_cost}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-sm font-semibold">₹{selectedDelivery.total_amount}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Special Instructions</Label>
                <p className="text-sm">{selectedDelivery.special_instructions || "None"}</p>
              </div>

              {/* Package Details Section */}
              {deliveryPackage && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Label className="text-sm font-bold text-orange-900 mb-1 block">📦 PACKAGE</Label>
                      <h3 className="font-bold text-lg text-orange-900">{deliveryPackage.name}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-orange-700 font-medium">Category:</span>
                      <p className="font-semibold text-lg text-orange-900">{deliveryPackage.category_id || "N/A"}</p>
                    </div>
                  </div>
                  {deliveryPackage.inclusions && deliveryPackage.inclusions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <span className="text-orange-700 font-medium text-sm">Inclusions:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {deliveryPackage.inclusions.map((item: string, idx: number) => (
                          <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-orange-200 text-orange-900">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Products Section */}
              <div className="border-t pt-4 mt-2">
                <Label className="text-sm font-medium mb-3 block">📦 Products to Deliver</Label>
                {loadingDeliveryItems ? (
                  <div className="text-sm text-muted-foreground">Loading products...</div>
                ) : deliveryItems.length > 0 ? (
                  <div className="space-y-2">
                    {deliveryItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.product_name || `Product ${item.product_id}`}</div>
                          {item.barcode && <div className="text-xs text-muted-foreground">Barcode: {item.barcode}</div>}
                          {item.category && <div className="text-xs text-muted-foreground">Category: {item.category}</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">Qty: <span className="text-lg text-blue-600">{item.quantity}</span></div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 pt-2 border-t">
                      <div className="text-sm font-medium">
                        Total Items: <span className="text-lg text-green-600">{deliveryItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No products found for this delivery</div>
                )}
              </div>

              {/* Delivery Confirmation Details */}
              {(selectedDelivery.status === 'delivered' || selectedDelivery.status === 'return_completed') && (
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-bold text-green-700 mb-3 block">✅ Delivery Confirmation</Label>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    {/* Client Information Section */}
                    <div className="border-b pb-3 mb-3">
                      <h4 className="font-semibold text-green-800 mb-2">👤 Client Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-green-700 font-medium">Received By:</span>
                          <p className="font-semibold">{(selectedDelivery as any).delivery_confirmation_name || 'Not recorded'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-green-700 font-medium">Phone:</span>
                          <p className="font-semibold">{(selectedDelivery as any).delivery_confirmation_phone || 'Not recorded'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Photo Proof Section */}
                    {(selectedDelivery as any).delivery_photo_url && (
                      <div className="border-b pb-3 mb-3">
                        <h4 className="font-semibold text-green-800 mb-2">📸 Photo Proof</h4>
                        <img 
                          src={(selectedDelivery as any).delivery_photo_url} 
                          alt="Delivery proof" 
                          className="rounded-lg border border-green-200 max-h-64 w-full object-cover"
                        />
                      </div>
                    )}
                    {!(selectedDelivery as any).delivery_photo_url && (
                      <div className="border-b pb-3 mb-3">
                        <h4 className="font-semibold text-green-800 mb-2">📸 Photo Proof</h4>
                        <p className="text-sm text-gray-500 italic">No photo recorded</p>
                      </div>
                    )}

                    {/* Products Verification Section */}
                    <div className="border-b pb-3 mb-3">
                      <h4 className="font-semibold text-green-800 mb-2">📦 Products Verified</h4>
                      <div className="bg-white rounded p-3 border border-green-100">
                        <p className="text-sm">
                          <span className="text-green-700 font-medium">Items Count Verified:</span>
                          <span className="ml-2 font-semibold text-lg text-green-600">{(selectedDelivery as any).delivery_items_count || 0} items</span>
                        </p>
                        {(selectedDelivery as any).delivery_items_confirmed && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            ✓ All items confirmed as delivered
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Notes Section */}
                    {(selectedDelivery as any).delivery_notes ? (
                      <div className="border-b pb-3 mb-3">
                        <h4 className="font-semibold text-green-800 mb-2">📝 Notes</h4>
                        <p className="text-sm bg-white p-3 rounded border border-green-200">{(selectedDelivery as any).delivery_notes}</p>
                      </div>
                    ) : (
                      <div className="border-b pb-3 mb-3">
                        <h4 className="font-semibold text-green-800 mb-2">📝 Notes</h4>
                        <p className="text-sm text-gray-500 italic">No additional notes</p>
                      </div>
                    )}

                    {/* Delivery Timestamp */}
                    {(selectedDelivery as any).delivered_at && (
                      <div>
                        <span className="text-sm text-green-700 font-medium">⏰ Delivered At:</span>
                        <p className="font-semibold text-green-900">{new Date((selectedDelivery as any).delivered_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Return Confirmation Details */}
              {(selectedDelivery as any).returned_at && (
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-bold text-blue-700 mb-3 block">🔄 Rental Return Confirmation</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Rental Returned By:</span>
                        <p className="font-semibold">{(selectedDelivery as any).return_confirmation_name || 'Not recorded'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Phone:</span>
                        <p className="font-semibold">{(selectedDelivery as any).return_confirmation_phone || 'Not recorded'}</p>
                      </div>
                    </div>

                    {/* Return Items Breakdown */}
                    {deliveryItems.length > 0 && deliveryItems.some((item: any) => 
                      item.return_lost_damaged > 0 || item.return_used > 0 || item.return_fresh > 0
                    ) && (
                      <div className="border-t pt-3 mt-3">
                        <h4 className="font-semibold text-blue-800 mb-2">📦 Rental Return Items Breakdown</h4>
                        <div className="space-y-2">
                          {deliveryItems.map((item: any, index: number) => (
                            <div key={index} className="bg-white rounded p-3 border border-blue-100">
                              <div className="font-medium text-sm mb-2">{item.product_name}</div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="text-gray-500">Total</div>
                                  <div className="font-bold text-lg">{item.quantity}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-red-600">Lost/Damaged</div>
                                  <div className="font-bold text-lg text-red-600">{item.return_lost_damaged || 0}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-orange-600">Used→Laundry</div>
                                  <div className="font-bold text-lg text-orange-600">{item.return_used || 0}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-green-600">Fresh→Stock</div>
                                  <div className="font-bold text-lg text-green-600">{item.return_fresh || 0}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedDelivery as any).return_notes && (
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Rental Return Notes:</span>
                        <p className="text-sm bg-white p-2 rounded border border-blue-200 mt-1">{(selectedDelivery as any).return_notes}</p>
                      </div>
                    )}
                    {(selectedDelivery as any).return_photo_url && (
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Rental Return Proof Photo:</span>
                        <img 
                          src={(selectedDelivery as any).return_photo_url} 
                          alt="Rental return proof" 
                          className="mt-2 rounded-lg border border-blue-200 max-h-48 object-cover"
                        />
                      </div>
                    )}
                    {(selectedDelivery as any).returned_at && (
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Rental Completed At:</span>
                        <p className="font-semibold">{new Date((selectedDelivery as any).returned_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) clearActionParams()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>Update delivery information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_customer_name">Customer Name</Label>
                <Input
                  id="edit_customer_name"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_customer_phone">Customer Phone</Label>
                <Input
                  id="edit_customer_phone"
                  value={editForm.customer_phone}
                  onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_pickup_address">Pickup Address</Label>
              
              {/* Smart Address Dropdown - Only for Pickup */}
              {savedAddresses.length > 0 && (
                <Select
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setEditForm({ ...editForm, pickup_address: '' })
                    } else if (value === 'current') {
                      // Keep current value
                    } else {
                      const selected = savedAddresses.find(a => a.id === value)
                      if (selected) {
                        setEditForm({ ...editForm, pickup_address: selected.full_address })
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mb-2">
                    <SelectValue placeholder="📍 Quick Select from Saved Addresses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Use Current Address</SelectItem>
                    <SelectItem value="new">✏️ Type New Address</SelectItem>
                    {savedAddresses.map(addr => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label ? `${addr.label}: ` : ''}{addr.full_address.substring(0, 50)}{addr.full_address.length > 50 ? '...' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Textarea
                id="edit_pickup_address"
                placeholder="Enter pickup address or select from saved addresses above"
                value={editForm.pickup_address}
                onChange={(e) => setEditForm({ ...editForm, pickup_address: e.target.value })}
              />
              {loadingAddresses && (
                <p className="text-xs text-muted-foreground">Loading saved addresses...</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_delivery_address">Delivery Address</Label>
              <Textarea
                id="edit_delivery_address"
                value={editForm.delivery_address}
                onChange={(e) => setEditForm({ ...editForm, delivery_address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_delivery_date">Delivery Date</Label>
                <Input
                  id="edit_delivery_date"
                  type="date"
                  value={editForm.delivery_date}
                  onChange={(e) => setEditForm({ ...editForm, delivery_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_delivery_time">Delivery Time</Label>
                <Input
                  id="edit_delivery_time"
                  type="time"
                  value={editForm.delivery_time}
                  onChange={(e) => setEditForm({ ...editForm, delivery_time: e.target.value })}
                  placeholder="HH:MM"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_driver_name">Driver Name</Label>
                <Input
                  id="edit_driver_name"
                  value={editForm.driver_name}
                  onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_vehicle_number">Vehicle Number</Label>
                <Input
                  id="edit_vehicle_number"
                  value={editForm.vehicle_number}
                  onChange={(e) => setEditForm({ ...editForm, vehicle_number: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Staff</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50">
                {staff.length > 0 ? (
                  staff.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit_staff_${member.id}`}
                        checked={editAssignedStaffIds.has(member.id)}
                        onChange={(e) => {
                          const newSet = new Set(editAssignedStaffIds)
                          if (e.target.checked) {
                            newSet.add(member.id)
                          } else {
                            newSet.delete(member.id)
                          }
                          setEditAssignedStaffIds(newSet)
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`edit_staff_${member.id}`} className="text-sm cursor-pointer flex-1">
                        {member.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No staff members available</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {editAssignedStaffIds.size} staff member{editAssignedStaffIds.size !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_delivery_charge">Delivery Charge (₹)</Label>
                <Input
                  id="edit_delivery_charge"
                  type="number"
                  value={editForm.delivery_charge}
                  onChange={(e) => setEditForm({ ...editForm, delivery_charge: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_fuel_cost">Fuel Cost (₹)</Label>
                <Input
                  id="edit_fuel_cost"
                  type="number"
                  value={editForm.fuel_cost}
                  onChange={(e) => setEditForm({ ...editForm, fuel_cost: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_special_instructions">Special Instructions</Label>
              <Textarea
                id="edit_special_instructions"
                value={editForm.special_instructions}
                onChange={(e) => setEditForm({ ...editForm, special_instructions: e.target.value })}
              />
            </div>

            {/* Package Details Section in Edit Dialog */}
            {deliveryPackage && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4 mt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Label className="text-sm font-bold text-orange-900 mb-1 block">📦 PACKAGE</Label>
                    <h3 className="font-bold text-lg text-orange-900">{deliveryPackage.name}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-orange-700 font-medium">Category:</span>
                    <p className="font-semibold text-lg text-orange-900">{deliveryPackage.category_id || "N/A"}</p>
                  </div>
                </div>
                {deliveryPackage.inclusions && deliveryPackage.inclusions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <span className="text-orange-700 font-medium text-sm">Inclusions:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {deliveryPackage.inclusions.map((item: string, idx: number) => (
                        <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-orange-200 text-orange-900">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Products Section in Edit Dialog */}
            <div className="border-t pt-4 mt-2 space-y-2">
              <Label className="text-sm font-medium">📦 Products to Deliver</Label>
              {loadingDeliveryItems ? (
                <div className="text-sm text-muted-foreground">Loading products...</div>
              ) : deliveryItems.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {deliveryItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.product_name || `Product ${item.product_id}`}</div>
                        {item.barcode && <div className="text-xs text-muted-foreground">Barcode: {item.barcode}</div>}
                        {item.category && <div className="text-xs text-muted-foreground">Category: {item.category}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">Qty: <span className="text-lg text-blue-600">{item.quantity}</span></div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-2 border-t">
                    <div className="text-sm font-medium">
                      Total Items: <span className="text-lg text-green-600">{deliveryItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No products found for this delivery</div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={async () => {
                if (!selectedDelivery) return

                setLoading(true)
                try {
                  const response = await fetch(`/api/deliveries/update`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      id: selectedDelivery.id,
                      pickup_address: editForm.pickup_address,
                      delivery_address: editForm.delivery_address,
                      delivery_date: editForm.delivery_date,
                      delivery_time: editForm.delivery_time || null,
                      driver_name: editForm.driver_name,
                      vehicle_number: editForm.vehicle_number,
                      delivery_charge: editForm.delivery_charge,
                      fuel_cost: editForm.fuel_cost,
                      special_instructions: editForm.special_instructions,
                      assigned_staff_ids: Array.from(editAssignedStaffIds),
                    }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || "Failed to update delivery")
                  }

                  // Save pickup address to customer_addresses if it's new
                  if (editForm.customer_id && editForm.pickup_address.trim()) {
                    try {
                      const res = await fetch('/api/customer-addresses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customer_id: editForm.customer_id,
                          full_address: editForm.pickup_address.trim(),
                          address_line_1: editForm.pickup_address.trim(),
                          address_type: 'pickup'
                        })
                      })
                      if (!res.ok) {
                        await res.json().catch(() => ({}))
                      }
                    } catch {
                    }
                  }

                  // Close dialog and clear query params FIRST before refreshing data
                  setShowEditDialog(false)
                  clearActionParams()
                  
                  // Then refresh data
                  await fetchData()
                  
                  toast({
                    title: "Success",
                    description: "Delivery order updated successfully",
                  })
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update delivery",
                    variant: "destructive",
                  })
                } finally {
                  setLoading(false)
                }
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Handover Dialog - Now with photo, signature, and full categorization */}
      <UnifiedHandoverDialog
        open={showHandoverDialog}
        onClose={() => { setShowHandoverDialog(false); clearActionParams() }}
        delivery={selectedDelivery}
        onSaved={() => fetchData()}
      />

      {/* Reschedule Return Dialog */}
      <Dialog
        open={showRescheduleDialog}
        onOpenChange={(open) => {
          setShowRescheduleDialog(open)
          if (!open) clearActionParams()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Rental Return</DialogTitle>
            <DialogDescription>
              Set a new pickup/return date and time for the linked booking. If you leave it empty, we'll keep the original
              booking return.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule_date">Rental Return Date</Label>
                <Input
                  id="reschedule_date"
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule_time">Rental Return Time</Label>
                <Input
                  id="reschedule_time"
                  type="time"
                  value={rescheduleForm.time}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedDelivery?.booking_id || !selectedDelivery.booking_source) {
                  toast({ title: "No booking linked", description: "This delivery doesn't have a linked booking." })
                  return
                }
                if (!rescheduleForm.date) {
                  toast({ title: "Date required", description: "Please choose a return date.", variant: "destructive" })
                  return
                }
                try {
                  const iso = (() => {
                    const d = new Date(`${rescheduleForm.date}T${rescheduleForm.time || "00:00"}:00`)
                    return d.toISOString()
                  })()
                  const resp = await fetch(
                    `/api/bookings/${selectedDelivery.booking_id}?type=${selectedDelivery.booking_source}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ return_date: iso }),
                    }
                  )
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}))
                    throw new Error(err?.error || `Failed with ${resp.status}`)
                  }
                  // Update local deliveries list with rescheduled time
                  setDeliveries((prev) =>
                    prev.map((d) => (d.id === selectedDelivery.id ? { ...d, rescheduled_return_at: iso } : d))
                  )
                  // Also update local bookings list for immediate UI consistency
                  setBookings((prev) =>
                    (prev || []).map((b: any) =>
                      b.id === selectedDelivery.booking_id ? { ...b, pickup_date: iso, return_date: iso } : b
                    )
                  )
                  toast({ title: "Rental return rescheduled", description: "Rental return date/time updated successfully." })
                  // Close the dialog immediately for better UX, then refresh in background
                  setShowRescheduleDialog(false)
                  clearActionParams()
                  // Refresh server data to keep everything in sync (IDs, related fields, badges)
                  void fetchData()
                } catch (e: any) {
                  toast({ title: "Error", description: e?.message || "Failed to reschedule", variant: "destructive" })
                }
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Delivered Dialog */}
      <MarkDeliveredDialog
        open={showMarkDeliveredDialog}
        onClose={() => {
          setShowMarkDeliveredDialog(false)
          setSelectedDelivery(null)
        }}
        delivery={selectedDelivery}
        onSuccess={async () => {
          setShowMarkDeliveredDialog(false)
          setSelectedDelivery(null)
          await fetchData()
        }}
      />

      {/* Process Return Dialog (New Simplified Flow) */}
      <ProcessReturnDialog
        open={showProcessReturnDialog}
        onClose={() => {
          setShowProcessReturnDialog(false)
          setSelectedDelivery(null)
        }}
        delivery={selectedDelivery ? {
          id: selectedDelivery.id,
          delivery_number: selectedDelivery.delivery_number,
          customer_name: selectedDelivery.customer_name,
          customer_phone: selectedDelivery.customer_phone,
          booking_id: selectedDelivery.booking_id,
          booking_source: selectedDelivery.booking_source,
        } : null}
        onSuccess={async () => {
          setShowProcessReturnDialog(false)
          setSelectedDelivery(null)
          await fetchData()
        }}
      />

      {/* Return Processing Dialog (New System) */}
      <ReturnProcessingDialog
        open={showReturnProcessingDialog}
        onClose={() => {
          setShowReturnProcessingDialog(false)
          setSelectedReturn(null)
          clearActionParams()
        }}
        returnRecord={selectedReturn}
        onSuccess={async () => {
          setShowReturnProcessingDialog(false)
          setSelectedReturn(null)
          await fetchData()
        }}
      />
    </div>
  )
}
