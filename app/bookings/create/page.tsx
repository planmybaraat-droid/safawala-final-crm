"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import {
  ArrowLeft,
  User,
  Calendar,
  Package,
  Plus,
  Minus,
  Loader2,
  Search,
  ShoppingCart,
  CreditCard,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { NotificationService } from "@/lib/notification-service"
import { getCurrentUser } from "@/lib/auth"

interface Customer {
  id: string
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  pincode?: string
  state?: string
  customer_code: string
  created_at: string
}

interface Product {
  id: string
  name: string
  product_code: string
  price: number
  rental_price: number
  stock_available: number
  category: string
  description?: string
  image_url?: string
}

interface BookingItem {
  id?: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product?: Product
}

interface BookingFormData {
  customer_id: string
  type: "rental" | "sale"
  event_type: string
  payment_type: string
  event_date: string
  delivery_date: string
  return_date: string
  event_for: string
  groom_name: string
  groom_home_address: string
  groom_additional_whatsapp: string
  bride_name: string
  bride_additional_whatsapp: string
  venue_name: string
  venue_address: string
  special_instructions: string
}

interface NewCustomerData {
  name: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  pincode: string
  state: string
}

export default function CreateBookingPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("customer")
  const [activeFranchiseId, setActiveFranchiseId] = useState("")

  // Customer search and selection
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerLoading, setNewCustomerLoading] = useState(false)

  // Product search and selection
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const [formData, setFormData] = useState<BookingFormData>({
    customer_id: "",
    type: "rental",
    event_type: "wedding",
    payment_type: "advance",
    event_date: "",
    delivery_date: "",
    return_date: "",
    event_for: "both",
    groom_name: "",
    groom_home_address: "",
    groom_additional_whatsapp: "",
    bride_name: "",
    bride_additional_whatsapp: "",
    venue_name: "",
    venue_address: "",
    special_instructions: "",
  })

  useEffect(() => {
    // Recalculate/update booking items prices when type changes
    setBookingItems((prev) =>
      prev.map((item) => {
        const unitPrice =
          formData.type === "rental"
            ? item.product?.rental_price || item.unit_price
            : item.product?.price || item.unit_price
        return {
          ...item,
          unit_price: unitPrice,
          total_price: unitPrice * item.quantity,
        }
      })
    )
  }, [formData.type])

  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    email: "",
    address: "",
    city: "",
    pincode: "",
    state: "",
  })

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      if (currentUser?.franchise_id) {
        setActiveFranchiseId(currentUser.franchise_id)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!activeFranchiseId) return
    console.log("[v0] CreateBookingPage component mounted")
    console.log("[v0] Loading customers and products...")
    fetchCustomers()
    fetchProductsAndCategories()
  }, [activeFranchiseId])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("franchise_id", activeFranchiseId)
        .order("name")

      if (error) {
        console.error("[v0] Error fetching customers:", error)
        setError("Failed to load customers")
        return
      }

      console.log("[v0] Customers loaded:", data?.length || 0)
      setCustomers(data || [])
    } catch (error) {
      console.error("[v0] Error in fetchCustomers:", error)
      setError("Failed to load customers")
    }
  }

  const fetchProductsAndCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("franchise_id", activeFranchiseId)
        .order("name")

      if (error) {
        console.error("[v0] Error fetching products:", error)
        setError("Failed to load products")
        return
      }

      console.log("[v0] Products loaded:", data?.length || 0)
      setProducts(data || [])
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error in fetchProductsAndCategories:", error)
      setError("Failed to load products")
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNewCustomerChange = (field: keyof NewCustomerData, value: string) => {
    setNewCustomerData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      })
      return
    }

    const phoneValidation = validatePhoneWithCountry(newCustomerData.phone)
    if (!phoneValidation.isValid) {
      toast({
        title: "Validation Error",
        description: phoneValidation.error || "Please enter a valid phone number",
        variant: "destructive",
      })
      return
    }

    try {
      setNewCustomerLoading(true)

      const customerCode = `CUST${Date.now().toString().slice(-6)}`

      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            ...newCustomerData,
            customer_code: customerCode,
            franchise_id: activeFranchiseId || null,
          },
        ])
        .select()
        .single()

      if (error) throw error

      setCustomers((prev) => [...prev, data])
      setFormData((prev) => ({ ...prev, customer_id: data.id }))
      setCustomerSearch(data.name)
      setShowNewCustomerDialog(false)
      setNewCustomerData({
        name: "",
        phone: "+91",
        whatsapp: "+91",
        email: "",
        address: "",
        city: "",
        pincode: "",
        state: "",
      })

      toast({
        title: "Success",
        description: "Customer created successfully",
      })
    } catch (error) {
      console.error("[v0] Error creating customer:", error)
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      })
    } finally {
      setNewCustomerLoading(false)
    }
  }

  const generateBookingNumber = () => {
    const prefix = formData.type === "rental" ? "RNT" : "SAL"
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}${timestamp}`
  }

  const addProductToBooking = (product: Product) => {
    const existingItem = bookingItems.find((item) => item.product_id === product.id)
    const unitPrice = formData.type === "rental" ? product.rental_price : product.price

    if (existingItem) {
      updateItemQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: BookingItem = {
        product_id: product.id,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
        product: product,
      }
      setBookingItems((prev) => [...prev, newItem])
    }
  }

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setBookingItems((prev) => prev.filter((item) => item.product_id !== productId))
      return
    }

    setBookingItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? {
            ...item,
            quantity: newQuantity,
            total_price: item.unit_price * newQuantity,
          }
          : item,
      ),
    )
  }

  const removeItem = (productId: string) => {
    setBookingItems((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) || customer.phone.includes(customerSearch),
  )

  const filteredProducts = products.filter((product) => {
    const search = productSearch.toLowerCase()
    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      ((product as any).barcode ? String((product as any).barcode).toLowerCase().includes(search) : false) ||
      (product.product_code ? String(product.product_code).toLowerCase().includes(search) : false)
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(products.map((p) => p.category)))

  // Calculations
  const GST_RATE = 0.18
  const basePrice = bookingItems.reduce((sum, item) => sum + item.total_price, 0)
  const gstAmount = basePrice * GST_RATE
  const totalAmount = basePrice + gstAmount
  const totalSecurityDeposit = formData.type === "rental" ? totalAmount * 0.2 : 0

  const paymentBreakdown = {
    basePrice,
    gstAmount,
    totalAmount,
    securityDeposit: totalSecurityDeposit,
    advanceAmount: formData.payment_type === "advance" ? totalAmount * 0.5 : 0,
  }

  const validateForm = () => {
    if (!formData.customer_id) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive",
      })
      return false
    }

    if (bookingItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product",
        variant: "destructive",
      })
      return false
    }

    if (!formData.event_date) {
      if (formData.type === "sale") {
        formData.event_date = new Date().toISOString().split("T")[0]
      } else {
        toast({
          title: "Validation Error",
          description: "Please select an event date",
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSubmitting(true)
      console.log("[v0] Submitting booking...")

      // Create booking
      const bookingData = {
        booking_number: generateBookingNumber(),
        customer_id: formData.customer_id,
        franchise_id: activeFranchiseId || null,
        type: formData.type,
        event_type: formData.event_type,
        payment_type: formData.payment_type,
        event_date: formData.event_date,
        delivery_date: formData.delivery_date || null,
        return_date: formData.return_date || null,
        event_for: formData.event_for,
        groom_name: formData.groom_name || null,
        groom_home_address: formData.groom_home_address || null,
        groom_additional_whatsapp: formData.groom_additional_whatsapp || null,
        bride_name: formData.bride_name || null,
        bride_additional_whatsapp: formData.bride_additional_whatsapp || null,
        venue_name: formData.venue_name || null,
        venue_address: formData.venue_address || null,
        special_instructions: formData.special_instructions || null,
        base_amount: paymentBreakdown.basePrice,
        gst_amount: paymentBreakdown.gstAmount,
        total_amount: paymentBreakdown.totalAmount,
        security_deposit: paymentBreakdown.securityDeposit,
        advance_amount: paymentBreakdown.advanceAmount,
        status: "pending_payment", // Updated status
        created_at: new Date().toISOString(),
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select()
        .single()

      if (bookingError) throw bookingError

      // Create booking items
      const itemsData = bookingItems.map((item) => ({
        booking_id: booking.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))

      const { error: itemsError } = await supabase.from("booking_items").insert(itemsData)

      if (itemsError) throw itemsError

      try {
        const selectedCustomer = customers.find((c) => c.id === formData.customer_id)
        if (selectedCustomer?.phone) {
          console.log("[v0] Sending WhatsApp notification to:", selectedCustomer.phone)

          const bookingWithCustomerInfo = {
            ...booking,
            customer_name: selectedCustomer.name,
            customer_phone: selectedCustomer.phone,
            venue: formData.venue_name,
          }

          await NotificationService.notifyBookingCreated(bookingWithCustomerInfo)
          console.log("[v0] WhatsApp notification sent successfully")
        } else {
          console.log("[v0] No customer phone found, skipping WhatsApp notification")
        }
      } catch (notificationError) {
        console.error("[v0] Failed to send WhatsApp notification:", notificationError)
        // Don't fail the booking creation if notification fails
      }

      toast({
        title: "Success",
        description: "Booking created successfully!",
      })

      // Redirect to bookings page with refresh trigger
      router.push(`/bookings?refresh=${Date.now()}`)
    } catch (error) {
      console.error("[v0] Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Booking</h1>
            <p className="text-muted-foreground">Create a new rental or direct sale booking</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border shadow-sm">
          <Label htmlFor="booking-type-header" className="font-semibold text-gray-700 text-sm whitespace-nowrap">Booking Type:</Label>
          <Select
            value={formData.type}
            onValueChange={(value: "rental" | "sale") => {
              handleInputChange("type", value)
              // If type changes to sale and current active tab is "booking" (Details), automatically transition to products
              if (value === "sale" && activeTab === "booking") {
                setActiveTab("products")
              }
            }}
          >
            <SelectTrigger className="w-[180px] h-9 bg-transparent border-gray-300 hover:border-gray-400 focus:ring-forest-500">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rental">Rental</SelectItem>
              <SelectItem value="sale">Direct Sale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${formData.type === "sale" ? "grid-cols-3" : "grid-cols-4"}`}>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            {formData.type !== "sale" && (
              <TabsTrigger value="booking">Booking Details</TabsTrigger>
            )}
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-search">Search Customer</Label>
                  <div className="relative">
                    <Input
                      id="customer-search"
                      placeholder="Search by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, customer_id: customer.id }))
                              setCustomerSearch(customer.name)
                              setShowCustomerDropdown(false)
                            }}
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full bg-transparent">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                      <DialogDescription>Create a new customer profile for this booking.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-name">Name *</Label>
                          <Input
                            id="new-customer-name"
                            value={newCustomerData.name}
                            onChange={(e) => handleNewCustomerChange("name", e.target.value)}
                            placeholder="Customer name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-phone">Phone *</Label>
                          <Input
                            id="new-customer-phone"
                            value={newCustomerData.phone}
                            onChange={(e) => handleNewCustomerChange("phone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-whatsapp">WhatsApp</Label>
                          <Input
                            id="new-customer-whatsapp"
                            value={newCustomerData.whatsapp}
                            onChange={(e) => handleNewCustomerChange("whatsapp", e.target.value)}
                            placeholder="WhatsApp number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-email">Email</Label>
                          <Input
                            id="new-customer-email"
                            type="email"
                            value={newCustomerData.email}
                            onChange={(e) => handleNewCustomerChange("email", e.target.value)}
                            placeholder="Email address"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-customer-address">Address</Label>
                        <Textarea
                          id="new-customer-address"
                          value={newCustomerData.address}
                          onChange={(e) => handleNewCustomerChange("address", e.target.value)}
                          placeholder="Full address"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-city">City</Label>
                          <Input
                            id="new-customer-city"
                            value={newCustomerData.city}
                            onChange={(e) => handleNewCustomerChange("city", e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-pincode">Pincode</Label>
                          <Input
                            id="new-customer-pincode"
                            value={newCustomerData.pincode}
                            onChange={(e) => handleNewCustomerChange("pincode", e.target.value)}
                            placeholder="Pincode"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-customer-state">State</Label>
                          <Input
                            id="new-customer-state"
                            value={newCustomerData.state}
                            onChange={(e) => handleNewCustomerChange("state", e.target.value)}
                            placeholder="State"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateCustomer} disabled={newCustomerLoading}>
                          {newCustomerLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Customer"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {formData.type !== "sale" && (
            <TabsContent value="booking">
              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="event-type">Event Type</Label>
                      <Select
                        value={formData.event_type}
                        onValueChange={(value) => handleInputChange("event_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wedding">Wedding</SelectItem>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="reception">Reception</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-date">Event Date *</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleInputChange("event_date", e.target.value)}
                    />
                  </div>

                  {formData.type === "rental" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="delivery-date">Delivery Date</Label>
                        <Input
                          id="delivery-date"
                          type="date"
                          value={formData.delivery_date}
                          onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="return-date">Return Date</Label>
                        <Input
                          id="return-date"
                          type="date"
                          value={formData.return_date}
                          onChange={(e) => handleInputChange("return_date", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="payment-type">Payment Type</Label>
                    <Select
                      value={formData.payment_type}
                      onValueChange={(value) => handleInputChange("payment_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="advance">Advance</SelectItem>
                        <SelectItem value="full">Full Payment</SelectItem>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue-name">Venue Name</Label>
                      <Input
                        id="venue-name"
                        value={formData.venue_name}
                        onChange={(e) => handleInputChange("venue_name", e.target.value)}
                        placeholder="Event venue name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-for">Event For</Label>
                      <Select value={formData.event_for} onValueChange={(value) => handleInputChange("event_for", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="groom">Groom</SelectItem>
                          <SelectItem value="bride">Bride</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue-address">Venue Address</Label>
                    <Textarea
                      id="venue-address"
                      value={formData.venue_address}
                      onChange={(e) => handleInputChange("venue_address", e.target.value)}
                      placeholder="Complete venue address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="groom-name">Groom Name</Label>
                      <Input
                        id="groom-name"
                        value={formData.groom_name}
                        onChange={(e) => handleInputChange("groom_name", e.target.value)}
                        placeholder="Groom's name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bride-name">Bride Name</Label>
                      <Input
                        id="bride-name"
                        value={formData.bride_name}
                        onChange={(e) => handleInputChange("bride_name", e.target.value)}
                        placeholder="Bride's name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="special-instructions">Special Instructions</Label>
                    <Textarea
                      id="special-instructions"
                      value={formData.special_instructions}
                      onChange={(e) => handleInputChange("special_instructions", e.target.value)}
                      placeholder="Any special instructions or notes"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="products">
            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  Select Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="product-search">Search Products</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="product-search"
                        placeholder="Search by name or code..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-48">
                    <Label htmlFor="category-filter">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{product.name}</h3>
                          <p className="text-xs text-gray-500">{(product as any).barcode || product.product_code}</p>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          ₹{formData.type === "rental" ? product.rental_price : product.price}
                          {formData.type === "rental" && " (rental)"}
                        </p>
                        <p className="text-xs text-gray-400">Stock: {product.stock_available}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => addProductToBooking(product)}
                        disabled={product.stock_available <= 0}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Selected Products */}
                {bookingItems.length > 0 && (
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="font-medium">Selected Products</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingItems.map((item) => (
                          <TableRow key={item.product_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product?.name}</p>
                                <p className="text-sm text-gray-500">{(item.product as any)?.barcode || item.product?.product_code}</p>
                              </div>
                            </TableCell>
                            <TableCell>₹{item.unit_price}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-transparent"
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-transparent"
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                                  disabled={item.quantity >= (item.product?.stock_available || 0)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>₹{item.total_price}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeItem(item.product_id)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>₹{paymentBreakdown.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{paymentBreakdown.gstAmount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Amount:</span>
                    <span>₹{paymentBreakdown.totalAmount.toLocaleString()}</span>
                  </div>
                  {formData.type === "rental" && (
                    <div className="flex justify-between">
                      <span>Security Deposit (20%):</span>
                      <span>₹{paymentBreakdown.securityDeposit.toLocaleString()}</span>
                    </div>
                  )}
                  {formData.payment_type === "advance" && (
                    <div className="flex justify-between">
                      <span>Advance Amount (50%):</span>
                      <span>₹{paymentBreakdown.advanceAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Booking...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create Booking
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
