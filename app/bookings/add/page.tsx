"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowLeft, Save, Plus, Minus, User, Calendar, Download, ShoppingCart, CreditCard } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { customerService, productService, bookingService, bookingItemService } from "@/lib/supabase-service"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { toast } from "sonner"
import { generateQuotePDF } from "@/lib/pdf-generator"

interface Customer {
  id: string
  customer_code: string
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address: string
  city: string
  pincode: string
}

interface Product {
  id: string
  product_code: string
  name: string
  category: string
  price: number
  rental_price: number
  security_deposit: number
  stock_available: number
  stock_booked: number
  usage_count: number
  description?: string
  brand?: string
  color?: string
  material?: string
}

interface BookingItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
  security_deposit: number
}

interface BookingFormData {
  customer_id: string
  type: "rental" | "direct_sale"
  event_type: string
  payment_type: "full" | "advance" | "advance_with_deposit" | "partial"
  payment_amount?: number
  event_date: string
  delivery_date: string
  pickup_date: string
  groom_name: string
  groom_whatsapp: string
  groom_address: string
  bride_name: string
  bride_whatsapp: string
  bride_address: string
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
}

export default function NewBookingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([])
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerLoading, setNewCustomerLoading] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)

  const [customerSearch, setCustomerSearch] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [formData, setFormData] = useState<BookingFormData>({
    customer_id: "",
    type: "rental",
    event_type: "wedding",
    payment_type: "advance",
    payment_amount: 0,
    event_date: "",
    delivery_date: "",
    pickup_date: "",
    groom_name: "",
    groom_whatsapp: "",
    groom_address: "",
    bride_name: "",
    bride_whatsapp: "",
    bride_address: "",
    venue_name: "",
    venue_address: "",
    special_instructions: "",
  })

  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    email: "",
    address: "",
    city: "",
    pincode: "",
  })
  const [activeFranchiseId, setActiveFranchiseId] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/user", { cache: "no-store" })
        if (!res.ok) return
        const user = await res.json()
        if (user?.franchise_id) {
          setActiveFranchiseId(user.franchise_id)
        }
      } catch {}
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!activeFranchiseId) return
    fetchCustomers()
  }, [activeFranchiseId])

  useEffect(() => {
    if (!activeFranchiseId) return
    fetchProducts()
  }, [activeFranchiseId])

  useEffect(() => {
    if (customerSearch.trim() === "") {
      setFilteredCustomers(customers.slice(0, 10)) // Show first 10 customers
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.phone.includes(customerSearch) ||
          customer.customer_code.toLowerCase().includes(customerSearch.toLowerCase()),
      )
      setFilteredCustomers(filtered.slice(0, 10)) // Limit to 10 results
    }
  }, [customers, customerSearch])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest(".relative")) {
        setShowCustomerDropdown(false)
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showCustomerDropdown])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const customerId = urlParams.get("customerId")

    if (customerId && customers.length > 0) {
      const customer = customers.find((c) => c.id === customerId)
      if (customer) {
        setFormData((prev) => ({ ...prev, customer_id: customerId }))
        setCustomerSearch(customer.name)
      }
    }
  }, [customers])

  const fetchCustomers = async () => {
    try {
      if (!activeFranchiseId) return
      const data = await customerService.getAll(activeFranchiseId)
      setCustomers(data || [])
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast.error("Failed to load customers")
    }
  }

  const fetchProducts = async () => {
    try {
      if (!activeFranchiseId) return
      const data = await productService.getAvailable(activeFranchiseId)
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products")
    }
  }

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNewCustomerChange = (field: keyof NewCustomerData, value: string) => {
    setNewCustomerData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.address) {
      toast.error("Please fill in all required fields")
      return
    }

    const phoneValidation = validatePhoneWithCountry(newCustomerData.phone)
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Please enter a valid phone number")
      return
    }

    setNewCustomerLoading(true)
    try {
      const customerData = {
        name: newCustomerData.name,
        phone: newCustomerData.phone,
        whatsapp: newCustomerData.whatsapp || null,
        email: newCustomerData.email || undefined,
        address: newCustomerData.address,
        city: newCustomerData.city || "Delhi",
        pincode: newCustomerData.pincode || "110001",
        customer_code: `CUST${Date.now().toString().slice(-6)}`,
        gst_number: null,
        credit_limit: 100000,
        outstanding_balance: 0,
        total_bookings: 0,
        total_spent: 0,
        franchise_id: activeFranchiseId,
      }

      const newCustomer = await customerService.create(customerData as any)
      setCustomers((prev) => [...prev, newCustomer])
      setFormData((prev) => ({ ...prev, customer_id: newCustomer.id }))
      setShowNewCustomerDialog(false)
      setNewCustomerData({
        name: "",
        phone: "+91",
        whatsapp: "+91",
        email: "",
        address: "",
        city: "",
        pincode: "",
      })
      toast.success("Customer created successfully!")
    } catch (error) {
      console.error("Error creating customer:", error)
      toast.error("Failed to create customer")
    } finally {
      setNewCustomerLoading(false)
    }
  }

  const addProductToBooking = (product: Product) => {
    const existingItem = bookingItems.find((item) => item.product.id === product.id)

    if (existingItem) {
      if (existingItem.quantity >= product.stock_available) {
        toast.error("Not enough stock available")
        return
      }
      updateItemQuantity(product.id, existingItem.quantity + 1)
    } else {
      const unitPrice = formData.type === "rental" ? product.rental_price : product.price
      const newItem: BookingItem = {
        product,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
        security_deposit: formData.type === "rental" ? product.security_deposit : 0,
      }
      setBookingItems((prev) => [...prev, newItem])
    }
  }

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    setBookingItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const totalPrice = item.unit_price * newQuantity
          return {
            ...item,
            quantity: newQuantity,
            total_price: totalPrice,
          }
        }
        return item
      }),
    )
  }

  const removeItem = (productId: string) => {
    setBookingItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  // Calculate totals
  const subtotal = bookingItems.reduce((sum, item) => sum + item.total_price, 0)
  const totalSecurityDeposit = bookingItems.reduce((sum, item) => sum + item.security_deposit * item.quantity, 0)
  const taxAmount = subtotal * 0.18 // 18% GST
  const totalAmount = subtotal + taxAmount

  // Calculate payment amounts based on payment type
  const getPaymentBreakdown = () => {
    const totalPayable = totalAmount + (formData.type === "rental" ? totalSecurityDeposit : 0)

    switch (formData.payment_type) {
      case "full":
        return {
          payNow: totalPayable,
          payLater: 0,
          securityDeposit: formData.type === "rental" ? totalSecurityDeposit : 0,
          description: formData.type === "rental" ? "Full payment + Security deposit" : "Full payment",
        }
      case "advance":
        const advanceAmount = totalAmount * 0.5
        return {
          payNow: advanceAmount,
          payLater: totalAmount - advanceAmount,
          securityDeposit: formData.type === "rental" ? totalSecurityDeposit : 0,
          description: "50% advance payment",
        }
      case "advance_with_deposit":
        const advanceWithDeposit = totalAmount * 0.5
        return {
          payNow: advanceWithDeposit + totalSecurityDeposit,
          payLater: totalAmount - advanceWithDeposit,
          securityDeposit: totalSecurityDeposit,
          description: "50% advance + Security deposit",
        }
      case "partial":
        const customAmount = formData.payment_amount || 0
        return {
          payNow: Math.min(customAmount, totalPayable),
          payLater: Math.max(0, totalPayable - customAmount),
          securityDeposit: formData.type === "rental" ? totalSecurityDeposit : 0,
          description: "Partial payment (Custom amount)",
        }
      default:
        return { payNow: 0, payLater: 0, securityDeposit: 0, description: "" }
    }
  }

  const paymentBreakdown = getPaymentBreakdown()

  const generateQuote = async () => {
    const selectedCustomer = customers.find((c) => c.id === formData.customer_id)
    if (!selectedCustomer || bookingItems.length === 0) {
      toast.error("Please select customer and add products")
      return
    }

    setGeneratingQuote(true)
    try {
      // Prepare quote data
      const quoteData = {
        customer: selectedCustomer,
        items: bookingItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          security_deposit: item.security_deposit,
        })),
        bookingDetails: {
          type: formData.type,
          event_type: formData.event_type,
          payment_type: formData.payment_type,
          event_date: formData.event_date,
          delivery_date: formData.delivery_date,
          pickup_date: formData.pickup_date,
          groom_name: formData.groom_name,
          groom_whatsapp: formData.groom_whatsapp,
          groom_address: formData.groom_address,
          bride_name: formData.bride_name,
          bride_whatsapp: formData.bride_whatsapp,
          bride_address: formData.bride_address,
          venue_name: formData.venue_name,
          venue_address: formData.venue_address,
          special_instructions: formData.special_instructions,
        },
        pricing: {
          subtotal,
          taxAmount,
          totalAmount,
          totalSecurityDeposit,
          paymentBreakdown,
        },
        franchise: {
          name: "Safawala Wedding Accessories",
          address: "123 Wedding Street, Bridal Market, Delhi - 110001",
          phone: "+91-9876543210",
          email: "info@safawala.com",
          gst_number: "07AAACH7409R1ZZ",
        },
      }

      // Generate PDF
      const pdfBlob = await generateQuotePDF(quoteData)

      // Download PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Quote_${selectedCustomer.name}_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Quote PDF generated successfully!")
    } catch (error) {
      console.error("Error generating quote:", error)
      toast.error("Failed to generate quote PDF")
    } finally {
      setGeneratingQuote(false)
    }
  }

  const generateBookingNumber = () => {
    const prefix = formData.type === "rental" ? "REN" : "SAL"
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}${timestamp}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id || bookingItems.length === 0) {
      toast.error("Please select customer and add products")
      return
    }

    setLoading(true)
    try {
      console.log("Starting booking creation...")

      const bookingNumber = generateBookingNumber()
      console.log("Generated booking number:", bookingNumber)

      // Create booking with all required fields
      const bookingData = {
        booking_number: bookingNumber,
        customer_id: formData.customer_id,
        franchise_id: "", // Will be set by service
        type: formData.type,
        event_type: formData.event_type,
        payment_type: formData.payment_type,
        total_amount: totalAmount,
        discount_amount: 0,
        tax_amount: taxAmount,
        security_deposit: totalSecurityDeposit,
        amount_paid: paymentBreakdown.payNow,
        pending_amount: paymentBreakdown.payLater,
        refund_amount: 0,
        status: "pending" as const,
        priority: 1,
        event_date: formData.event_date || null,
        delivery_date: formData.delivery_date || null,
        pickup_date: formData.pickup_date || null,
        groom_name: formData.groom_name || null,
        bride_name: formData.bride_name || null,
        venue_name: formData.venue_name || null,
        venue_address: formData.venue_address || null,
        special_instructions: formData.special_instructions || null,
        booking_date: new Date().toISOString().split("T")[0],
        paid_amount: 0,
        payment_status: "unpaid",
        invoice_generated: false,
        whatsapp_sent: false,
        created_by: "", // Will be set by service
      }

      console.log("Booking data to create:", bookingData)

      const booking = await bookingService.create(bookingData as any)
      console.log("Booking created successfully:", booking)

      // Create booking items
      const bookingItemsData = bookingItems.map((item) => ({
        booking_id: booking.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: 0,
        total_price: item.total_price,
        security_deposit: item.security_deposit,
        damage_cost: 0,
        cleaning_required: false,
      }))

      console.log("Booking items data to create:", bookingItemsData)

      await bookingItemService.create(bookingItemsData)
      console.log("Booking items created successfully")

      // Update product stock
      for (const item of bookingItems) {
        const newStockAvailable = Math.max(0, item.product.stock_available - item.quantity)
        const newStockBooked = (item.product.stock_booked || 0) + item.quantity

        console.log(
          `Updating stock for product ${item.product.id}: available ${item.product.stock_available} -> ${newStockAvailable}, booked ${item.product.stock_booked} -> ${newStockBooked}`,
        )

        await productService.updateStock(item.product.id, {
          stock_available: newStockAvailable,
          stock_booked: newStockBooked,
          usage_count: (item.product.usage_count || 0) + item.quantity,
        })
      }

      console.log("Stock updated successfully")
      toast.success("Booking created successfully!")
      router.push("/bookings")
    } catch (error: any) {
      console.error("Error creating booking:", error)
      toast.error(`Failed to create booking: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentTypeOptions = () => {
    if (formData.type === "direct_sale") {
      return [
        { value: "full", label: "Full Payment" },
        { value: "advance", label: "Advance Payment (50%)" },
        { value: "partial", label: "Partial Payment (Custom Amount)" },
      ]
    } else {
      return [
        { value: "full", label: "Full Payment + Security Deposit" },
        { value: "advance", label: "Advance Payment (50%)" },
        { value: "advance_with_deposit", label: "Advance + Security Deposit" },
        { value: "partial", label: "Partial Payment (Custom Amount)" },
      ]
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
            <p className="text-muted-foreground">Create a new rental or direct sale booking</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Customer Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Label htmlFor="customer">Select Customer *</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search customers by name, phone, or code..."
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value)
                            setShowCustomerDropdown(true)
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="pr-10"
                        />
                        {formData.customer_id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, customer_id: "" }))
                              setCustomerSearch("")
                            }}
                          >
                            ×
                          </Button>
                        )}

                        {/* Selected Customer Display */}
                        {formData.customer_id && !showCustomerDropdown && (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <div className="text-sm font-medium">
                              {customers.find((c) => c.id === formData.customer_id)?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {customers.find((c) => c.id === formData.customer_id)?.phone}
                            </div>
                          </div>
                        )}

                        {/* Customer Dropdown */}
                        {showCustomerDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredCustomers.length > 0 ? (
                              filteredCustomers.map((customer) => (
                                <div
                                  key={customer.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, customer_id: customer.id }))
                                    setCustomerSearch(customer.name)
                                    setShowCustomerDropdown(false)
                                  }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium text-sm">{customer.name}</div>
                                      <div className="text-xs text-gray-500">{customer.phone}</div>
                                      <div className="text-xs text-gray-400">{customer.customer_code}</div>
                                    </div>
                                    <div className="text-xs text-gray-400">{customer.city}</div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Customer</DialogTitle>
                            <DialogDescription>Create a new customer profile</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="new_name">Name *</Label>
                                <Input
                                  id="new_name"
                                  value={newCustomerData.name}
                                  onChange={(e) => handleNewCustomerChange("name", e.target.value)}
                                  placeholder="Customer name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="new_phone">Phone *</Label>
                                <Input
                                  id="new_phone"
                                  value={newCustomerData.phone}
                                  onChange={(e) => handleNewCustomerChange("phone", e.target.value)}
                                  placeholder="+91-9876543210"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="new_whatsapp">WhatsApp</Label>
                                <Input
                                  id="new_whatsapp"
                                  value={newCustomerData.whatsapp}
                                  onChange={(e) => handleNewCustomerChange("whatsapp", e.target.value)}
                                  placeholder="+91-9876543210"
                                />
                              </div>
                              <div>
                                <Label htmlFor="new_email">Email</Label>
                                <Input
                                  id="new_email"
                                  type="email"
                                  value={newCustomerData.email}
                                  onChange={(e) => handleNewCustomerChange("email", e.target.value)}
                                  placeholder="customer@email.com"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="new_address">Address *</Label>
                              <Textarea
                                id="new_address"
                                value={newCustomerData.address}
                                onChange={(e) => handleNewCustomerChange("address", e.target.value)}
                                placeholder="Full address"
                                rows={2}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="new_city">City</Label>
                                <Input
                                  id="new_city"
                                  value={newCustomerData.city}
                                  onChange={(e) => handleNewCustomerChange("city", e.target.value)}
                                  placeholder="City"
                                />
                              </div>
                              <div>
                                <Label htmlFor="new_pincode">Pincode</Label>
                                <Input
                                  id="new_pincode"
                                  value={newCustomerData.pincode}
                                  onChange={(e) => handleNewCustomerChange("pincode", e.target.value)}
                                  placeholder="110001"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
                                Cancel
                              </Button>
                              <Button type="button" onClick={handleCreateCustomer} disabled={newCustomerLoading}>
                                {newCustomerLoading ? "Creating..." : "Create Customer"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Type & Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Booking & Payment Type</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="type">Booking Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: "rental" | "direct_sale") => {
                          handleInputChange("type", value)
                          // Reset payment type when booking type changes
                          setFormData((prev) => ({ ...prev, payment_type: "advance" }))
                          // Update booking items prices
                          setBookingItems((prev) =>
                            prev.map((item) => ({
                              ...item,
                              unit_price: value === "rental" ? item.product.rental_price : item.product.price,
                              total_price:
                                (value === "rental" ? item.product.rental_price : item.product.price) * item.quantity,
                              security_deposit: value === "rental" ? item.product.security_deposit : 0,
                            })),
                          )
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rental">Rental</SelectItem>
                          <SelectItem value="direct_sale">Direct Sale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="event_type">Event Type</Label>
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
                          <SelectItem value="sangeet">Sangeet</SelectItem>
                          <SelectItem value="mehendi">Mehendi</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payment_type">Payment Type *</Label>
                      <Select
                        value={formData.payment_type}
                        onValueChange={(value: "full" | "advance" | "advance_with_deposit" | "partial") =>
                          handleInputChange("payment_type", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getPaymentTypeOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Custom Payment Amount - Only show for partial payment */}
                  {formData.payment_type === "partial" && (
                    <div className="mt-4">
                      <Label htmlFor="payment_amount">Payment Amount *</Label>
                      <Input
                        id="payment_amount"
                        type="number"
                        min={0}
                        max={totalAmount + (formData.type === "rental" ? totalSecurityDeposit : 0)}
                        value={formData.payment_amount || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            payment_amount: value === "" ? 0 : Math.max(0, Number(value))
                          }));
                        }}
                        placeholder="Enter payment amount"
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Total payable: ₹{(totalAmount + (formData.type === "rental" ? totalSecurityDeposit : 0)).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Event Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="event_date">Event Date</Label>
                      <Input
                        id="event_date"
                        type="date"
                        value={formData.event_date}
                        onChange={(e) => handleInputChange("event_date", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery_date">Delivery Date</Label>
                      <Input
                        id="delivery_date"
                        type="date"
                        value={formData.delivery_date}
                        onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pickup_date">Pickup Date</Label>
                      <Input
                        id="pickup_date"
                        type="date"
                        value={formData.pickup_date}
                        onChange={(e) => handleInputChange("pickup_date", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="groom_name">Groom Name</Label>
                      <Input
                        id="groom_name"
                        value={formData.groom_name}
                        onChange={(e) => handleInputChange("groom_name", e.target.value)}
                        placeholder="Groom's name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bride_name">Bride Name</Label>
                      <Input
                        id="bride_name"
                        value={formData.bride_name}
                        onChange={(e) => handleInputChange("bride_name", e.target.value)}
                        placeholder="Bride's name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="groom_whatsapp">Groom WhatsApp</Label>
                      <Input
                        id="groom_whatsapp"
                        value={formData.groom_whatsapp}
                        onChange={(e) => handleInputChange("groom_whatsapp", e.target.value)}
                        placeholder="Groom's WhatsApp number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bride_whatsapp">Bride WhatsApp</Label>
                      <Input
                        id="bride_whatsapp"
                        value={formData.bride_whatsapp}
                        onChange={(e) => handleInputChange("bride_whatsapp", e.target.value)}
                        placeholder="Bride's WhatsApp number"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="groom_address">Groom Home Address</Label>
                      <Textarea
                        id="groom_address"
                        value={formData.groom_address}
                        onChange={(e) => handleInputChange("groom_address", e.target.value)}
                        placeholder="Groom's home address"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bride_address">Bride Home Address</Label>
                      <Textarea
                        id="bride_address"
                        value={formData.bride_address}
                        onChange={(e) => handleInputChange("bride_address", e.target.value)}
                        placeholder="Bride's home address"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="venue_name">Venue Name</Label>
                    <Input
                      id="venue_name"
                      value={formData.venue_name}
                      onChange={(e) => handleInputChange("venue_name", e.target.value)}
                      placeholder="Wedding venue name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="venue_address">Venue Address</Label>
                    <Textarea
                      id="venue_address"
                      value={formData.venue_address}
                      onChange={(e) => handleInputChange("venue_address", e.target.value)}
                      placeholder="Complete venue address"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="special_instructions">Special Instructions</Label>
                    <Textarea
                      id="special_instructions"
                      value={formData.special_instructions}
                      onChange={(e) => handleInputChange("special_instructions", e.target.value)}
                      placeholder="Any special requirements or instructions"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Select Products</span>
                  </CardTitle>
                  <CardDescription>Click on products to add them to the booking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => addProductToBooking(product)}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{product.name}</h4>
                            <Badge variant="outline">{product.category}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              <div className="font-medium">
                                ₹{formData.type === "rental" ? product.rental_price : product.price}
                                {formData.type === "rental" && <span className="text-muted-foreground"> /rental</span>}
                              </div>
                              {formData.type === "rental" && product.security_deposit > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  +₹{product.security_deposit} deposit
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">Stock: {product.stock_available}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              {/* Selected Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Selected Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No items selected</p>
                  ) : (
                    <div className="space-y-4">
                      {bookingItems.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ₹{item.unit_price} × {item.quantity}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 bg-transparent"
                              onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm w-8 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 bg-transparent"
                              onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock_available}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-sm font-medium ml-4">₹{item.total_price.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Summary */}
              {bookingItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (18%)</span>
                      <span>₹{taxAmount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Amount</span>
                      <span>₹{totalAmount.toLocaleString()}</span>
                    </div>
                    {formData.type === "rental" && totalSecurityDeposit > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Security Deposit</span>
                        <span>₹{totalSecurityDeposit.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">{paymentBreakdown.description}</div>
                      {formData.payment_type === "partial" ? (
                        <>
                          <div className="flex justify-between">
                            <span>Amount Paid</span>
                            <span className="font-medium">₹{paymentBreakdown.payNow.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending Amount</span>
                            <span className="font-medium text-orange-600">₹{paymentBreakdown.payLater.toLocaleString()}</span>
                          </div>
                          {formData.type === "rental" && totalSecurityDeposit > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 p-2 bg-orange-50 rounded">
                              Includes ₹{totalSecurityDeposit.toLocaleString()} security deposit in pending amount
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 p-2 bg-blue-50 rounded">
                            Total payable: ₹{(totalAmount + (formData.type === "rental" ? totalSecurityDeposit : 0)).toLocaleString()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>Pay Now</span>
                            <span className="font-medium">₹{paymentBreakdown.payNow.toLocaleString()}</span>
                          </div>
                          {paymentBreakdown.payLater > 0 && (
                            <div className="flex justify-between">
                              <span>Pay Later</span>
                              <span>₹{paymentBreakdown.payLater.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={generateQuote}
                      disabled={!formData.customer_id || bookingItems.length === 0 || generatingQuote}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {generatingQuote ? "Generating PDF..." : "Generate Quote PDF"}
                    </Button>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || !formData.customer_id || bookingItems.length === 0}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? "Creating..." : "Create Booking"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
