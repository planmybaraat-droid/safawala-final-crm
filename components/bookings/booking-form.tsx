"use client"

import type React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Minus, FileText, Save, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Customer, Product, BookingType, PaymentType } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { debounce } from "lodash"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { quoteService } from "@/lib/services/quote-service"

interface BookingFormProps {
  customers: Customer[]
  products: Product[]
  onSubmit: (bookingData: any) => void
  initialBooking?: any
}

type PincodeStatus = "idle" | "loading" | "success" | "error"

export function BookingForm({ customers, products, onSubmit, initialBooking }: BookingFormProps) {
  const router = useRouter()
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [bookingType, setBookingType] = useState<BookingType>("rental")
  const [paymentType, setPaymentType] = useState<PaymentType>("advance")
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({})
  const [eventDate, setEventDate] = useState<Date>()
  const [deliveryDate, setDeliveryDate] = useState<Date>()
  const [returnDate, setReturnDate] = useState<Date>()
  const [notes, setNotes] = useState("")
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>("idle")
  const [isCityStateAutoFilled, setIsCityStateAutoFilled] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null)

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [groomName, setGroomName] = useState("")
  const [groomWhatsapp, setGroomWhatsapp] = useState("")
  const [groomHomeAddress, setGroomHomeAddress] = useState("")
  const [brideName, setBrideName] = useState("")
  const [brideWhatsapp, setBrideWhatsapp] = useState("")
  const [brideHomeAddress, setBrideHomeAddress] = useState("")
  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [eventType, setEventType] = useState("")
  const [eventFor, setEventFor] = useState("both")

  const initialCustomerSetRef = useRef(false)
  const isEditModeRef = useRef(false)

  const validatePhone = (phone: string): boolean => {
    if (!phone) return false
    const cleanPhone = phone.replace(/[\s\-()]/g, "")
    const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$|^(\+\d{1,3})?[1-9]\d{8,14}$/
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 15
  }

  const validatePincode = (pincode: string): boolean => {
    if (!pincode) return true // Pincode is optional for new customers
    return /^\d{6}$/.test(pincode)
  }

  const validateDateLogic = (): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate) {
      const eventDateOnly = new Date(eventDate)
      eventDateOnly.setHours(0, 0, 0, 0)

      if (eventDateOnly < today) {
        errors.eventDate = "Event date cannot be in the past"
      }
    }

    if (deliveryDate && eventDate) {
      const deliveryDateOnly = new Date(deliveryDate)
      const eventDateOnly = new Date(eventDate)
      deliveryDateOnly.setHours(0, 0, 0, 0)
      eventDateOnly.setHours(0, 0, 0, 0)

      if (deliveryDateOnly > eventDateOnly) {
        errors.deliveryDate = "Delivery date should be before or on event date"
      }
    }

    if (returnDate && eventDate) {
      const returnDateOnly = new Date(returnDate)
      const eventDateOnly = new Date(eventDate)
      returnDateOnly.setHours(0, 0, 0, 0)
      eventDateOnly.setHours(0, 0, 0, 0)

      if (returnDateOnly < eventDateOnly) {
        errors.returnDate = "Return date should be after event date"
      }
    }

    if (bookingType === "rental" && returnDate && deliveryDate) {
      const returnDateOnly = new Date(returnDate)
      const deliveryDateOnly = new Date(deliveryDate)
      returnDateOnly.setHours(0, 0, 0, 0)
      deliveryDateOnly.setHours(0, 0, 0, 0)

      if (returnDateOnly <= deliveryDateOnly) {
        errors.returnDate = "Return date should be after delivery date"
      }
    }

    return errors
  }

  const validateStockAvailability = (): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    Object.entries(selectedProducts).forEach(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)
      if (product && quantity > product.stock_available) {
        errors[`product_${productId}`] = `Only ${product.stock_available} units available for ${product.name}`
      }
    })

    return errors
  }

  const clearValidationError = (field: string) => {
    setValidationErrors((prev) => {
      const { [field]: removed, ...rest } = prev
      return rest
    })
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    // Customer validation
    if (isNewCustomer) {
      if (!newCustomer.name.trim()) {
        errors.customerName = "Customer name is required"
      } else if (newCustomer.name.trim().length < 2) {
        errors.customerName = "Customer name must be at least 2 characters"
      }

      if (!newCustomer.phone.trim()) {
        errors.customerPhone = "Customer phone is required"
      } else {
        const phoneValidation = validatePhoneWithCountry(newCustomer.phone)
        if (!phoneValidation.isValid) {
          errors.customerPhone = phoneValidation.error || "Please enter a valid phone number"
        }
      }

      if (newCustomer.pincode && !validatePincode(newCustomer.pincode)) {
        errors.customerPincode = "Please enter a valid 6-digit pincode"
      }
    } else {
      if (!selectedCustomer) {
        errors.selectedCustomer = "Please select a customer"
      }
    }

    // Product validation
    if (Object.keys(selectedProducts).length === 0) {
      errors.products = "Please select at least one product"
    }

    // Date validation
    if (!eventDate) {
      errors.eventDate = "Event date is required"
    }

    // Venue validation
    if (!venueName.trim() && !venueAddress.trim()) {
      errors.venue = "Please provide venue name or address"
    }

    // Add date logic and stock validation errors
    const dateErrors = validateDateLogic()
    const stockErrors = validateStockAvailability()

    const allErrors = { ...errors, ...dateErrors, ...stockErrors }
    setValidationErrors(allErrors)

    if (Object.keys(allErrors).length > 0) {
      const firstError = Object.values(allErrors)[0]
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => setValidationErrors({})}>
            Dismiss
          </Button>
        ),
      })

      // Focus on first error field for better accessibility
      const firstErrorField = Object.keys(allErrors)[0]
      setTimeout(() => {
        const element = document.querySelector(`[data-error="${firstErrorField}"]`) as HTMLElement
        if (element) {
          element.focus()
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)

      return false
    }

    return true
  }

  useEffect(() => {
    if (initialBooking && customers.length > 0) {
      if (initialBooking.customer_id) {
        const customerExists = customers.find((c) => c.id === initialBooking.customer_id)

        if (customerExists) {
          setSelectedCustomer(initialBooking.customer_id)
          setCurrentCustomer(customerExists) // Store the customer object for display
          setIsNewCustomer(false)
          initialCustomerSetRef.current = true
          isEditModeRef.current = true // Mark as edit mode
        }
      }

      setBookingType(initialBooking.type || "rental")
      setPaymentType(initialBooking.payment_type || "advance")
      setNotes(initialBooking.notes || "")

      setGroomName(initialBooking.groom_name || "")
      setGroomWhatsapp(initialBooking.groom_additional_whatsapp || "")
      setGroomHomeAddress(initialBooking.groom_home_address || "")
      setBrideName(initialBooking.bride_name || "")
      setBrideWhatsapp(initialBooking.bride_additional_whatsapp || "")
      setBrideHomeAddress(initialBooking.bride_home_address || "")
      setVenueName(initialBooking.venue_name || "")
      setVenueAddress(initialBooking.venue_address || "")
      setEventType(initialBooking.event_type || "")
      setEventFor(initialBooking.event_for || "both")

      // Set dates
      if (initialBooking.event_date) {
        setEventDate(new Date(initialBooking.event_date))
      }
      if (initialBooking.delivery_date) {
        setDeliveryDate(new Date(initialBooking.delivery_date))
      }
      if (initialBooking.pickup_date) {
        setReturnDate(new Date(initialBooking.pickup_date))
      }

      if (initialBooking.booking_items && initialBooking.booking_items.length > 0) {
        const productQuantities: { [key: string]: number } = {}
        initialBooking.booking_items.forEach((item: any) => {
          const productId = item.product_id || item.product?.id
          if (productId) {
            productQuantities[productId] = item.quantity
          }
        })
        setSelectedProducts(productQuantities)
      }
    }
  }, [initialBooking, customers])

  const handlePincodeChange = useCallback(
    debounce(async (value: string) => {
      if (!value || value.length !== 6) {
        setNewCustomer((prev) => ({
          ...prev,
          pincode: value,
          city: "",
          state: "",
        }))
        setPincodeStatus("idle")
        setIsCityStateAutoFilled(false)
        return
      }

      setPincodeStatus("loading")
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${value}`)
        const data = await response.json()

        if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0]
          setNewCustomer((prev) => ({
            ...prev,
            pincode: value,
            city: postOffice.District || "",
            state: postOffice.State || "",
          }))
          setIsCityStateAutoFilled(true)
          setPincodeStatus("success")
          toast({
            title: "Pincode Verified",
            description: `Location: ${postOffice.District}, ${postOffice.State}`,
          })
        } else {
          setNewCustomer((prev) => ({
            ...prev,
            pincode: value,
            city: "",
            state: "",
          }))
          setPincodeStatus("error")
          toast({
            title: "Invalid Pincode",
            description: "Please enter a valid 6-digit pincode",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Pincode lookup error:", error)
        setNewCustomer((prev) => ({
          ...prev,
          pincode: value,
        }))
        setPincodeStatus("error")
        toast({
          title: "Network Error",
          description: "Unable to verify pincode. Please check your connection and try again.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => handlePincodeChange(value)}>
              Retry
            </Button>
          ),
        })
      }
    }, 500),
    [toast],
  )

  const handleProductQuantityChange = (productId: string, change: number) => {
    setSelectedProducts((prev) => {
      const newQuantity = (prev[productId] || 0) + change
      if (newQuantity <= 0) {
        const { [productId]: removed, ...rest } = prev
        clearValidationError(`product_${productId}`)
        return rest
      }

      // Check stock availability
      const product = products.find((p) => p.id === productId)
      if (product && newQuantity > product.stock_available) {
        toast({
          title: "Stock Limit Exceeded",
          description: `Only ${product.stock_available} units available for ${product.name}`,
          variant: "destructive",
        })
        return prev
      }

      clearValidationError(`product_${productId}`)
      clearValidationError("products")
      return { ...prev, [productId]: newQuantity }
    })
  }

  const calculateTotal = () => {
    return Object.entries(selectedProducts).reduce((total, [productId, quantity]) => {
      const product = products.find((p) => p.id === productId)
      if (!product) return total
      const price = bookingType === "rental" ? product.rental_price : product.price
      return total + price * quantity
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setValidationErrors({})

    try {
      const bookingData = {
        customer: isNewCustomer ? newCustomer : selectedCustomer,
        isNewCustomer,
        bookingType,
        paymentType,
        selectedProducts,
        eventDate,
        deliveryDate,
        returnDate,
        notes,
        totalAmount: calculateTotal(),
        groomName,
        groomWhatsapp,
        groomHomeAddress,
        brideName,
        brideWhatsapp,
        brideHomeAddress,
        venueName,
        venueAddress,
        eventType,
        eventFor,
        status: initialBooking ? initialBooking.status : "pending_payment",
      }

      await onSubmit(bookingData)

      toast({
        title: "Success",
        description: initialBooking ? "Booking updated successfully" : "Booking created successfully",
      })
    } catch (error) {
      console.error("[v0] Form submission error:", error)
      toast({
        title: "Error",
        description: "Failed to save booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateQuote = async () => {
    if (!validateForm()) return

    setIsGeneratingQuote(true)

    try {
      const quoteData = {
        customer: isNewCustomer ? newCustomer : customers.find((c) => c.id === selectedCustomer),
        items: Object.entries(selectedProducts).map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId)
          const unitPrice = bookingType === "rental" ? product?.rental_price || 0 : product?.price || 0

          return {
            product,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
          }
        }),
        eventDate,
        deliveryDate,
        returnDate,
        notes,
        totalAmount: calculateTotal(),
      }

      const savedQuote = await quoteService.create({
        customer_id: isNewCustomer ? undefined : selectedCustomer || undefined,
        type: bookingType === "direct_sale" ? "direct_sale" : "rental",
        event_type: eventType || "wedding",
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : undefined,
        delivery_date: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : undefined,
        return_date: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
        customer_name: isNewCustomer ? newCustomer.name : undefined,
        customer_phone: isNewCustomer ? newCustomer.phone : undefined,
        customer_whatsapp: isNewCustomer ? newCustomer.whatsapp : undefined,
        customer_email: isNewCustomer ? newCustomer.email : undefined,
        customer_address: isNewCustomer ? newCustomer.address : undefined,
        customer_city: isNewCustomer ? newCustomer.city : undefined,
        customer_pincode: isNewCustomer ? newCustomer.pincode : undefined,
        customer_state: isNewCustomer ? newCustomer.state : undefined,
        event_for: eventFor as "groom" | "bride" | "both",
        groom_name: groomName || undefined,
        bride_name: brideName || undefined,
        venue_name: venueName || undefined,
        venue_address: venueAddress || undefined,
        special_instructions: notes || undefined,
        notes: notes || undefined,
        total_amount: quoteData.totalAmount,
        security_deposit: 0,
        tax_amount: 0,
        items: quoteData.items.map((item) => ({
          product_id: item.product?.id,
          product_name: item.product?.name || "Product",
          product_code: item.product?.product_code || "",
          category: item.product?.category || "",
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          security_deposit: 0,
        })),
      })

      toast({
        title: "Quote Generated",
        description: "Quote has been saved successfully",
      })
      router.push(`/quotes/${savedQuote.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quote",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingQuote(false)
    }
  }

  const resetForm = () => {
    initialCustomerSetRef.current = false
    setSelectedCustomer("")
    setNewCustomer({
      name: "",
      phone: "+91",
      whatsapp: "+91",
      email: "",
      address: "",
      city: "", // Reset city
      state: "", // Reset state
      pincode: "", // Reset pincode
    })
    setSelectedProducts({})
    setEventDate(undefined)
    setDeliveryDate(undefined)
    setReturnDate(undefined)
    setNotes("")
    setIsNewCustomer(false)
    setBookingType("rental")
    setPaymentType("advance")
    setPincodeStatus("idle") // Reset pincode status
    setIsCityStateAutoFilled(false) // Reset auto-fill status
    setGroomName("")
    setGroomWhatsapp("")
    setGroomHomeAddress("")
    setBrideName("")
    setBrideWhatsapp("")
    setBrideHomeAddress("")
    setVenueName("")
    setVenueAddress("")
    setEventType("")
    setEventFor("both")
    setCurrentCustomer(null) // Reset current customer
    isEditModeRef.current = false // Reset edit mode
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditModeRef.current && currentCustomer ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-blue-700">Customer Name</Label>
                  <p className="text-lg font-semibold text-gray-900">{currentCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-700">Phone Number</Label>
                  <p className="text-lg text-gray-900">{currentCustomer.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-700">City</Label>
                  <p className="text-lg text-gray-900">{currentCustomer.city || "N/A"}</p>
                </div>
              </div>
              {currentCustomer.address && (
                <div className="mt-3">
                  <Label className="text-sm font-medium text-blue-700">Address</Label>
                  <p className="text-sm text-gray-700">{currentCustomer.address}</p>
                </div>
              )}
              {currentCustomer.whatsapp && (
                <div className="mt-3">
                  <Label className="text-sm font-medium text-blue-700">WhatsApp</Label>
                  <p className="text-sm text-gray-700">{currentCustomer.whatsapp}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <RadioGroup
                value={isNewCustomer ? "new" : "existing"}
                onValueChange={(value) => {
                  setIsNewCustomer(value === "new")
                  clearValidationError("selectedCustomer")
                  clearValidationError("customerName")
                  clearValidationError("customerPhone")
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing">Select Existing Customer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">Add New Customer</Label>
                </div>
              </RadioGroup>

              {validationErrors.selectedCustomer && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{validationErrors.selectedCustomer}</span>
                </div>
              )}

              {isNewCustomer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      data-error="customerName"
                      value={newCustomer.name}
                      onChange={(e) => {
                        setNewCustomer((prev) => ({ ...prev, name: e.target.value }))
                        clearValidationError("customerName")
                      }}
                      className={validationErrors.customerName ? "border-red-500 focus:border-red-500" : ""}
                      required
                      aria-invalid={!!validationErrors.customerName}
                      aria-describedby={validationErrors.customerName ? "name-error" : undefined}
                    />
                    {validationErrors.customerName && (
                      <p id="name-error" className="text-red-600 text-sm mt-1" role="alert">
                        {validationErrors.customerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      data-error="customerPhone"
                      value={newCustomer.phone}
                      onChange={(e) => {
                        setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))
                        clearValidationError("customerPhone")
                      }}
                      className={validationErrors.customerPhone ? "border-red-500 focus:border-red-500" : ""}
                      required
                      aria-invalid={!!validationErrors.customerPhone}
                      aria-describedby={validationErrors.customerPhone ? "phone-error" : undefined}
                      placeholder="Enter 10-digit mobile number"
                    />
                    {validationErrors.customerPhone && (
                      <p id="phone-error" className="text-red-600 text-sm mt-1" role="alert">
                        {validationErrors.customerPhone}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={newCustomer.whatsapp}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <div className="relative">
                      <Input
                        id="pincode"
                        value={newCustomer.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        className={`pr-8 ${validationErrors.customerPincode ? "border-red-500" : ""}`}
                        maxLength={6}
                        placeholder="Enter 6-digit pincode"
                      />
                      {pincodeStatus === "loading" && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
                      )}
                      {pincodeStatus === "success" && (
                        <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                      {pincodeStatus === "error" && (
                        <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {validationErrors.customerPincode && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.customerPincode}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newCustomer.city}
                      onChange={(e) => {
                        setNewCustomer((prev) => ({ ...prev, city: e.target.value }))
                        setIsCityStateAutoFilled(false)
                      }}
                      className={`${isCityStateAutoFilled ? "bg-green-50/50 border-green-200" : ""}`}
                      placeholder="Auto-filled from pincode"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={newCustomer.state}
                      onChange={(e) => {
                        setNewCustomer((prev) => ({ ...prev, state: e.target.value }))
                        setIsCityStateAutoFilled(false)
                      }}
                      className={`${isCityStateAutoFilled ? "bg-green-50/50 border-green-200" : ""}`}
                      placeholder="Auto-filled from pincode"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="customer">Select Customer *</Label>
                  <Select
                    value={selectedCustomer}
                    onValueChange={(value) => {
                      console.log("[v0] Customer selection changed to:", value)
                      setSelectedCustomer(value)
                      clearValidationError("selectedCustomer")
                    }}
                    required
                  >
                    <SelectTrigger className={validationErrors.selectedCustomer ? "border-red-500" : ""}>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event & Wedding Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
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
              <Label htmlFor="eventFor">Event Participant *</Label>
              <Select value={eventFor} onValueChange={setEventFor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event participant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groom">Groom</SelectItem>
                  <SelectItem value="bride">Bride</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="venueAddress">Venue Address</Label>
            <Textarea
              id="venueAddress"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Event venue address"
              className="min-h-[80px]"
            />
          </div>

          {/* Groom Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Groom Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groomName">Groom Name</Label>
                <Input
                  id="groomName"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  placeholder="Groom's name"
                />
              </div>
              <div>
                <Label htmlFor="groomWhatsapp">Additional WhatsApp Number</Label>
                <Input
                  id="groomWhatsapp"
                  value={groomWhatsapp}
                  onChange={(e) => setGroomWhatsapp(e.target.value)}
                  placeholder="Additional WhatsApp number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="groomHomeAddress">Home Address</Label>
              <Textarea
                id="groomHomeAddress"
                value={groomHomeAddress}
                onChange={(e) => setGroomHomeAddress(e.target.value)}
                placeholder="Groom's home address"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Bride Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bride Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brideName">Bride Name</Label>
                <Input
                  id="brideName"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  placeholder="Bride's name"
                />
              </div>
              <div>
                <Label htmlFor="brideWhatsapp">Additional WhatsApp Number</Label>
                <Input
                  id="brideWhatsapp"
                  value={brideWhatsapp}
                  onChange={(e) => setBrideWhatsapp(e.target.value)}
                  placeholder="Additional WhatsApp number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="brideHomeAddress">Home Address</Label>
              <Textarea
                id="brideHomeAddress"
                value={brideHomeAddress}
                onChange={(e) => setBrideHomeAddress(e.target.value)}
                placeholder="Bride's home address"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or requirements"
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Booking Type</Label>
            <RadioGroup
              value={bookingType}
              onValueChange={(value) => setBookingType(value as BookingType)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rental" id="rental" />
                <Label htmlFor="rental">Rental</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct_sale" id="direct_sale" />
                <Label htmlFor="direct_sale">Direct Sale</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Payment Type</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full">Full Payment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="advance" id="advance" />
                <Label htmlFor="advance">Advance Payment</Label>
              </div>
              {bookingType === "rental" && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deposit_only" id="deposit_only" />
                  <Label htmlFor="deposit_only">Deposit Only</Label>
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground",
                      validationErrors.eventDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => {
                      setEventDate(date)
                      clearValidationError("eventDate")
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {validationErrors.eventDate && <p className="text-red-600 text-sm mt-1">{validationErrors.eventDate}</p>}
            </div>

            <div>
              <Label>Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deliveryDate && "text-muted-foreground",
                      validationErrors.deliveryDate && "border-red-500",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deliveryDate}
                    onSelect={(date) => {
                      setDeliveryDate(date)
                      clearValidationError("deliveryDate")
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {validationErrors.deliveryDate && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.deliveryDate}</p>
              )}
            </div>

            {bookingType === "rental" && (
              <div>
                <Label>Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !returnDate && "text-muted-foreground",
                        validationErrors.returnDate && "border-red-500",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnDate ? format(returnDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={(date) => {
                        setReturnDate(date)
                        clearValidationError("returnDate")
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {validationErrors.returnDate && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.returnDate}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Products</CardTitle>
        </CardHeader>
        <CardContent>
          {validationErrors.products && (
            <div className="flex items-center space-x-2 text-red-600 text-sm mb-4">
              <AlertTriangle className="h-4 w-4" />
              <span>{validationErrors.products}</span>
            </div>
          )}
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                  <p className="text-sm font-medium">
                    ₹{bookingType === "rental" ? product.rental_price : product.price}
                    {bookingType === "rental" && " (rental)"}
                  </p>
                  <p className="text-xs text-gray-400">Available: {product.stock_available}</p>
                  {validationErrors[`product_${product.id}`] && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors[`product_${product.id}`]}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleProductQuantityChange(product.id, -1)}
                    disabled={!selectedProducts[product.id]}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{selectedProducts[product.id] || 0}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleProductQuantityChange(product.id, 1)}
                    disabled={selectedProducts[product.id] >= product.stock_available}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Amount:</span>
            <span>₹{calculateTotal().toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-4">
        {/* Enhanced submit button with better loading states and accessibility */}
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
          aria-describedby={isSubmitting ? "submit-status" : undefined}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span id="submit-status">{initialBooking ? "Updating..." : "Creating..."}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {initialBooking ? "Update Booking" : "Create Booking"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={handleGenerateQuote}
          disabled={isGeneratingQuote || isSubmitting}
        >
          <FileText className="h-4 w-4 mr-2" />
          {isGeneratingQuote ? "Generating..." : "Generate Quote"}
        </Button>
        <Button type="button" variant="secondary" onClick={resetForm} disabled={isSubmitting}>
          Reset Form
        </Button>
      </div>
    </form>
  )
}
