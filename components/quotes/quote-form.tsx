"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, Plus, Minus, User, Package, FileText } from "lucide-react"
import { toast } from "sonner"
import { validatePhoneWithCountry } from "@/lib/form-validation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import type { Customer, Product, Category } from "@/lib/types"
import { quoteService, type CreateQuoteData } from "@/lib/services/quote-service"
import { customerService } from "@/lib/services/customer-service"
import { PincodeService } from "@/lib/pincode-service"
import { createClient } from "@/lib/supabase/client"

interface QuoteItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
  security_deposit: number
}

interface QuoteFormProps {
  customers: Customer[]
  products: Product[]
  categories: Category[]
}

export function QuoteForm({ customers, products, categories }: QuoteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerLoading, setNewCustomerLoading] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)

  const [customerSearch, setCustomerSearch] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [activeFranchiseId, setActiveFranchiseId] = useState<string>("")

  const [realTimeProducts, setRealTimeProducts] = useState<Product[]>(products)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    customer_id: "",
    type: "rental" as "rental" | "direct_sale",
    event_type: "wedding",
    event_date: "",
    delivery_date: "",
    return_date: "",
    event_for: "both" as "groom" | "bride" | "both",
    groom_name: "",
    bride_name: "",
    venue_name: "",
    venue_address: "",
    special_instructions: "",
  })

  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    email: "",
    address: "",
    city: "",
    pincode: "",
    state: "",
  })

  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const [packageMode, setPackageMode] = useState(false)

  useEffect(() => {
    const loadUserFranchise = async () => {
      try {
        const res = await fetch("/api/auth/user")
        if (!res.ok) return
        const user = await res.json()
        if (user?.franchise_id) {
          setActiveFranchiseId(user.franchise_id)
        }
      } catch {}
    }

    loadUserFranchise()

    const fetchProductsWithStock = async () => {
      try {
        let query = supabase.from("products").select("*").eq("is_active", true).order("name")
        if (activeFranchiseId) {
          query = query.eq("franchise_id", activeFranchiseId)
        }

        const { data, error } = await query

        if (error) {
          return
        }

        setRealTimeProducts(data || [])
      } catch (error) {
        toast.error("Failed to load current stock levels")
      }
    }

    fetchProductsWithStock()
  }, [supabase, activeFranchiseId])

  useEffect(() => {
    if (customerSearch.trim() === "") {
      setFilteredCustomers(customers.slice(0, 10))
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.phone.includes(customerSearch) ||
          customer.customer_code.toLowerCase().includes(customerSearch.toLowerCase()),
      )
      setFilteredCustomers(filtered.slice(0, 10))
    }
  }, [customerSearch, customers])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePincodeChange = async (pincode: string) => {
    setNewCustomerData((prev) => ({ ...prev, pincode }))

    if (pincode.length === 6) {
      setPincodeStatus("loading")
      try {
        const locationData = await PincodeService.lookup(pincode)
        if (locationData) {
          setNewCustomerData((prev) => ({
            ...prev,
            city: locationData.city,
            state: locationData.state,
          }))
          setPincodeStatus("success")
        } else {
          setPincodeStatus("error")
        }
      } catch (error) {
        setPincodeStatus("error")
      }
    } else {
      setPincodeStatus("idle")
    }
  }

  const addProductToQuote = (product: Product) => {
    const existingItem = quoteItems.find((item) => item.product.id === product.id)

    const availableStock = product.stock_available || 0

    if (existingItem) {
      if (existingItem.quantity >= availableStock) {
        toast.error(`Not enough stock available. Only ${availableStock} items in stock.`)
        return
      }
      updateItemQuantity(product.id, existingItem.quantity + 1)
    } else {
      if (availableStock <= 0) {
        toast.error("This product is out of stock")
        return
      }

      const unitPrice =
        formData.type === "rental" ? product.rental_price || product.price : product.sale_price || product.price
      const newItem: QuoteItem = {
        product,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
        security_deposit: formData.type === "rental" ? product.security_deposit || 0 : 0,
      }
      setQuoteItems((prev) => [...prev, newItem])
      toast.success(`Added ${product.name} to quote`)
    }
  }

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    const product = realTimeProducts.find((p) => p.id === productId)
    if (product && newQuantity > (product.stock_available || 0)) {
      toast.error(`Cannot add more than ${product.stock_available} items. Not enough stock.`)
      return
    }

    setQuoteItems((prev) =>
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
    setQuoteItems((prev) => prev.filter((item) => item.product.id !== productId))
    const product = realTimeProducts.find((p) => p.id === productId)
    if (product) {
      toast.success(`Removed ${product.name} from quote`)
    }
  }

  const filteredProducts = realTimeProducts.filter((product) => {
    const productCategoryId = (product as any).category_id || (product as any).category
    const matchesCategory = selectedCategory === "all" || productCategoryId === selectedCategory
    const matchesSearch =
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      (product.product_code && product.product_code.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
      product.description?.toLowerCase().includes(productSearchTerm.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const totalAmount = quoteItems.reduce((sum, item) => sum + item.total_price, 0)
  const totalSecurityDeposit = quoteItems.reduce((sum, item) => sum + item.security_deposit * item.quantity, 0)
  const gstAmount = totalAmount * 0.18 // 18% GST

  const handleCreateNewCustomer = async () => {
    if (!newCustomerData.name) {
      toast.error("Customer name is required")
      return
    }

    const phoneValidation = validatePhoneWithCountry(newCustomerData.phone)
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Please enter a valid phone number")
      return
    }

    setNewCustomerLoading(true)
    try {
      const customer = await customerService.create(newCustomerData)
      toast.success("Customer created successfully")
      setFormData((prev) => ({ ...prev, customer_id: customer.id }))
      setCustomerSearch(customer.name)
      setShowNewCustomerDialog(false)

      // Reset form
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
    } catch (error) {
      toast.error("Failed to create customer")
    } finally {
      setNewCustomerLoading(false)
    }
  }

  const handleGenerateQuote = async () => {
    if (quoteItems.length === 0) {
      toast.error("Please add at least one product")
      return
    }

    if (!formData.customer_id && !newCustomerData.name) {
      toast.error("Please select a customer or provide customer details")
      return
    }

    // Validate stock availability
    for (const item of quoteItems) {
      const currentProduct = realTimeProducts.find((p) => p.id === item.product.id)
      if (!currentProduct || item.quantity > (currentProduct.stock_available || 0)) {
        toast.error(
          `Insufficient stock for ${item.product.name}. Available: ${currentProduct?.stock_available || 0}, Required: ${item.quantity}`,
        )
        return
      }
    }

    setGeneratingQuote(true)
    try {
      const quoteData: CreateQuoteData = {
        customer_id: formData.customer_id || undefined,
        type: formData.type,
        event_type: formData.event_type,
        event_date: formData.event_date || undefined,
        delivery_date: formData.delivery_date || undefined,
        return_date: formData.return_date || undefined,

        // Customer details for new customers
        customer_name: formData.customer_id ? undefined : newCustomerData.name,
        customer_phone: formData.customer_id ? undefined : newCustomerData.phone,
        customer_whatsapp: formData.customer_id ? undefined : newCustomerData.whatsapp,
        customer_address: formData.customer_id ? undefined : newCustomerData.address,
        customer_city: formData.customer_id ? undefined : newCustomerData.city,
        customer_pincode: formData.customer_id ? undefined : newCustomerData.pincode,
        customer_state: formData.customer_id ? undefined : newCustomerData.state,

        event_for: formData.event_for,
        groom_name: formData.groom_name,
        bride_name: formData.bride_name,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,

        total_amount: totalAmount,
        security_deposit: totalSecurityDeposit,
        tax_amount: gstAmount,

        special_instructions: formData.special_instructions,

        items: quoteItems.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_code: item.product.product_code || "",
          category: item.product.category || "",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          security_deposit: item.security_deposit,
        })),
      }

      const quote = await quoteService.create(quoteData)

      toast.success("Quote generated successfully!")
      router.push(`/quotes/${quote.id}`)
    } catch (error) {
      toast.error(`Failed to generate quote: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGeneratingQuote(false)
    }
  }

  return (
    <div className="space-y-6">
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
                  <Label htmlFor="customer">Select Customer</Label>
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
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="new-name">Name *</Label>
                            <Input
                              id="new-name"
                              value={newCustomerData.name}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-phone">Phone *</Label>
                            <Input
                              id="new-phone"
                              value={newCustomerData.phone}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="new-whatsapp">WhatsApp</Label>
                            <Input
                              id="new-whatsapp"
                              value={newCustomerData.whatsapp}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="new-address">Address</Label>
                          <Textarea
                            id="new-address"
                            value={newCustomerData.address}
                            onChange={(e) => setNewCustomerData((prev) => ({ ...prev, address: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="new-pincode">Pincode</Label>
                            <Input
                              id="new-pincode"
                              value={newCustomerData.pincode}
                              onChange={(e) => handlePincodeChange(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-city">City</Label>
                            <Input
                              id="new-city"
                              value={newCustomerData.city}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, city: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-state">State</Label>
                            <Input
                              id="new-state"
                              value={newCustomerData.state}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, state: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleCreateNewCustomer} disabled={newCustomerLoading} className="flex-1">
                            {newCustomerLoading ? "Creating..." : "Create Customer"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* New Customer Form (when no customer selected) */}
              {!formData.customer_id && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Or provide customer details:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer-name">Name</Label>
                      <Input
                        id="customer-name"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-phone">Phone</Label>
                      <Input
                        id="customer-phone"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Service Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.event_date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.event_date ? format(new Date(formData.event_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.event_date ? new Date(formData.event_date) : undefined}
                        onSelect={(date) =>
                          handleInputChange("event_date", date ? date.toISOString().split("T")[0] : "")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Delivery Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.delivery_date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.delivery_date ? format(new Date(formData.delivery_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.delivery_date ? new Date(formData.delivery_date) : undefined}
                        onSelect={(date) =>
                          handleInputChange("delivery_date", date ? date.toISOString().split("T")[0] : "")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.type === "rental" && (
                  <div>
                    <Label>Return Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.return_date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.return_date ? format(new Date(formData.return_date), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.return_date ? new Date(formData.return_date) : undefined}
                          onSelect={(date) =>
                            handleInputChange("return_date", date ? date.toISOString().split("T")[0] : "")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="groom-name">Groom Name</Label>
                  <Input
                    id="groom-name"
                    value={formData.groom_name}
                    onChange={(e) => handleInputChange("groom_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bride-name">Bride Name</Label>
                  <Input
                    id="bride-name"
                    value={formData.bride_name}
                    onChange={(e) => handleInputChange("bride_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venue-name">Venue Name</Label>
                  <Input
                    id="venue-name"
                    value={formData.venue_name}
                    onChange={(e) => handleInputChange("venue_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="venue-address">Venue Address</Label>
                  <Input
                    id="venue-address"
                    value={formData.venue_address}
                    onChange={(e) => handleInputChange("venue_address", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special-instructions">Special Instructions</Label>
                <Textarea
                  id="special-instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleInputChange("special_instructions", e.target.value)}
                  placeholder="Any special requirements or notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Select Items</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant={!packageMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPackageMode(false)}
                  >
                    Individual Products
                  </Button>
                  <Button
                    type="button"
                    variant={packageMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPackageMode(true)}
                  >
                    Package Bundles
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {packageMode ? (
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="font-medium">Package Quotes</p>
                    <p className="text-sm">Use the dedicated package builder to create package-based quotes with variants, inclusions, and pricing.</p>
                    <Button
                      variant="outline"
                      className="mt-4 bg-transparent"
                      onClick={() => {
                        router.push("/book-package")
                      }}
                    >
                      Open Package Quote Builder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Product Filters */}
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search products..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enhanced Product List with better stock indicators */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProducts.map((product) => {
                      const availableStock = product.stock_available || 0
                      const currentQuantity = quoteItems.find((i) => i.product.id === product.id)?.quantity || 0
                      const isOutOfStock = availableStock <= 0
                      const isLowStock = availableStock <= 5 && availableStock > 0

                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url || "/placeholder.svg"}
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium">{product.name}</h3>
                                <p className="text-sm text-gray-500">{product.category}</p>
                                <div className="flex items-center gap-4">
                                  <p className="text-sm font-medium">
                                    ₹
                                    {formData.type === "rental"
                                      ? product.rental_price || product.price
                                      : product.sale_price || product.price}
                                    {formData.type === "rental" && " (rental)"}
                                  </p>
                                  {formData.type === "rental" && product.security_deposit && (
                                    <p className="text-xs text-gray-600">Security: ₹{product.security_deposit}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p
                                    className={`text-xs ${isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-gray-600"}`}
                                  >
                                    Stock: {availableStock}
                                  </p>
                                  {isOutOfStock && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                      Out of Stock
                                    </span>
                                  )}
                                  {isLowStock && (
                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                      Low Stock
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const item = quoteItems.find((i) => i.product.id === product.id)
                                if (item) updateItemQuantity(product.id, item.quantity - 1)
                              }}
                              disabled={currentQuantity === 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{currentQuantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addProductToQuote(product)}
                              disabled={isOutOfStock || currentQuantity >= availableStock}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quote Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quoteItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No items selected</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {quoteItems.map((item) => (
                        <div key={item.product.id} className="flex justify-between text-sm">
                          <div>
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-muted-foreground">
                              {item.quantity} × ₹{item.unit_price}
                            </div>
                          </div>
                          <div className="text-right">
                            <div>₹{item.total_price.toLocaleString()}</div>
                            {item.security_deposit > 0 && (
                              <div className="text-xs text-muted-foreground">
                                +₹{(item.security_deposit * item.quantity).toLocaleString()} deposit
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{totalAmount.toLocaleString()}</span>
                      </div>
                      {totalSecurityDeposit > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Security Deposit:</span>
                          <span>₹{totalSecurityDeposit.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>GST (18%):</span>
                        <span>₹{gstAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>₹{(totalAmount + gstAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerateQuote}
            disabled={generatingQuote || quoteItems.length === 0}
            className="w-full"
            size="lg"
          >
            <FileText className="h-4 w-4 mr-2" />
            {generatingQuote ? "Generating Quote..." : "Generate Quote"}
          </Button>
        </div>
      </div>
    </div>
  )
}
