"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, MinusIcon, UserIcon, CalendarIcon, MapPinIcon, IndianRupeeIcon, ChevronDownIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
}

interface Product {
  id: string
  name: string
  price: number
  rental_price?: number
  stock_quantity: number
}

interface BookingItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookingCreated?: () => void
}

export function BookingDialog({ open, onOpenChange, onBookingCreated }: BookingDialogProps) {
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedItems, setSelectedItems] = useState<BookingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [activeFranchiseId, setActiveFranchiseId] = useState("")
  const [formData, setFormData] = useState({
    customer_id: "",
    new_customer_name: "",
    new_customer_phone: "+91",
    new_customer_email: "",
    event_date: "",
    event_time: "",
    event_location: "",
    booking_type: "rental",
    total_amount: 0,
    advance_amount: 0,
    payment_method: "cash",
    notes: "",
  })

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      if (mounted && currentUser?.franchise_id) {
        setActiveFranchiseId(currentUser.franchise_id)
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!open || !activeFranchiseId) return
    loadData(activeFranchiseId)
  }, [open, activeFranchiseId])

  const loadData = async (franchiseId: string) => {
    try {
      console.log("[v0] Loading booking dialog data...")

      const [customersResult, productsResult] = await Promise.all([
        supabase.from("customers").select("id, name, phone, email").eq("franchise_id", franchiseId).order("name"),
        supabase.from("products").select("id, name, price, rental_price").eq("franchise_id", franchiseId).order("name"),
      ])

      if (customersResult.error) throw customersResult.error
      if (productsResult.error) throw productsResult.error

      setCustomers(customersResult.data || [])
      setProducts(productsResult.data || [])

      console.log(
        "[v0] Data loaded - Customers:",
        customersResult.data?.length,
        "Products:",
        productsResult.data?.length,
      )
    } catch (error) {
      console.error("[v0] Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    }
  }

  const addProduct = (product: Product) => {
    const unitPrice = formData.booking_type === "rental" ? product.rental_price || product.price : product.price
    const existingItem = selectedItems.find((item) => item.product_id === product.id)

    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: BookingItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
      }
      setSelectedItems((prev) => [...prev, newItem])
    }
    calculateTotal()
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems((prev) => prev.filter((item) => item.product_id !== productId))
    } else {
      setSelectedItems((prev) =>
        prev.map((item) =>
          item.product_id === productId ? { ...item, quantity, total_price: quantity * item.unit_price } : item,
        ),
      )
    }
    calculateTotal()
  }

  const calculateTotal = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total_price, 0)
    const gst = subtotal * 0.18
    const total = subtotal + gst

    setFormData((prev) => ({ ...prev, total_amount: Math.round(total) }))
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      console.log("[v0] Creating booking...")

      if (
        (!formData.customer_id && !showNewCustomer) ||
        (showNewCustomer && (!formData.new_customer_name || !formData.new_customer_phone)) ||
        !formData.event_date
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill in customer details and event date",
          variant: "destructive",
        })
        return
      }

      let customerId = formData.customer_id

      if (showNewCustomer) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: formData.new_customer_name,
            phone: formData.new_customer_phone,
            email: formData.new_customer_email || null,
            franchise_id: activeFranchiseId || null,
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      }

      const bookingData = {
        customer_id: customerId,
        franchise_id: activeFranchiseId || null,
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        event_location: formData.event_location || null,
        booking_type: formData.booking_type,
        status: "pending",
        total_amount: formData.total_amount,
        advance_amount: formData.advance_amount,
        payment_method: formData.payment_method,
        notes: formData.notes || null,
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select()
        .single()

      if (bookingError) throw bookingError

      if (selectedItems.length > 0) {
        const itemsData = selectedItems.map((item) => ({
          booking_id: booking.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))

        const { error: itemsError } = await supabase.from("booking_items").insert(itemsData)

        if (itemsError) throw itemsError
      }

      toast({
        title: "Success!",
        description: `Booking created for ${showNewCustomer ? formData.new_customer_name : customers.find((c) => c.id === customerId)?.name}`,
      })

      resetForm()
      onOpenChange(false)
      onBookingCreated?.()
    } catch (error) {
      console.error("[v0] Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_id: "",
      new_customer_name: "",
      new_customer_phone: "+91",
      new_customer_email: "",
      event_date: "",
      event_time: "",
      event_location: "",
      booking_type: "rental",
      total_amount: 0,
      advance_amount: 0,
      payment_method: "cash",
      notes: "",
    })
    setSelectedItems([])
    setShowNewCustomer(false)
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) || customer.phone.includes(customerSearch),
  )

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()),
  )

  const subtotal = selectedItems.reduce((sum, item) => sum + item.total_price, 0)
  const gstAmount = subtotal * 0.18

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Create New Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <UserIcon className="h-4 w-4" />
                <Label className="font-medium">Customer</Label>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!showNewCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowNewCustomer(false)}
                  >
                    Existing Customer
                  </Button>
                  <Button
                    type="button"
                    variant={showNewCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowNewCustomer(true)}
                  >
                    New Customer
                  </Button>
                </div>

                {!showNewCustomer ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between bg-transparent">
                          {formData.customer_id
                            ? customers.find((c) => c.id === formData.customer_id)?.name || "Select customer"
                            : "Select customer"}
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuLabel>Customers</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {filteredCustomers.slice(0, 10).map((customer) => (
                          <DropdownMenuItem
                            key={customer.id}
                            onClick={() => setFormData((prev) => ({ ...prev, customer_id: customer.id }))}
                          >
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">{customer.phone}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <DropdownMenuItem disabled>No customers found</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Customer name *"
                      value={formData.new_customer_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, new_customer_name: e.target.value }))}
                    />
                    <Input
                      placeholder="Phone number *"
                      value={formData.new_customer_phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, new_customer_phone: e.target.value }))}
                    />
                    <Input
                      placeholder="Email (optional)"
                      type="email"
                      value={formData.new_customer_email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, new_customer_email: e.target.value }))}
                      className="col-span-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPinIcon className="h-4 w-4" />
                <Label className="font-medium">Event Details</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, event_date: e.target.value }))}
                />
                <Input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, event_time: e.target.value }))}
                />
                <Input
                  placeholder="Event location"
                  value={formData.event_location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, event_location: e.target.value }))}
                  className="col-span-2"
                />
                <Select
                  value={formData.booking_type}
                  onValueChange={(value: "rental" | "sale") =>
                    setFormData((prev) => ({ ...prev, booking_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {products.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <Label className="font-medium mb-3 block">Add Products (Optional)</Label>

                <div className="space-y-3">
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full"
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-transparent">
                        <span className="flex items-center gap-2">
                          <PlusIcon className="h-4 w-4" />
                          Add Product
                        </span>
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuLabel>Products</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {filteredProducts.slice(0, 10).map((product) => (
                        <DropdownMenuItem key={product.id} onClick={() => addProduct(product)}>
                          <div className="flex justify-between items-center w-full">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ₹
                                {formData.booking_type === "rental"
                                  ? product.rental_price || product.price
                                  : product.price}
                              </div>
                            </div>
                            <PlusIcon className="h-4 w-4" />
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {filteredProducts.length === 0 && <DropdownMenuItem disabled>No products found</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {selectedItems.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {selectedItems.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{item.product_name}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          >
                            <MinusIcon className="h-3 w-3" />
                          </Button>
                          <Badge variant="secondary">{item.quantity}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          >
                            <PlusIcon className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium">₹{item.total_price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <IndianRupeeIcon className="h-4 w-4" />
                <Label className="font-medium">Payment Details</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Amount</Label>
                  <Input
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, total_amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Advance</Label>
                  <Input
                    type="number"
                    value={formData.advance_amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, advance_amount: Number(e.target.value) }))}
                  />
                </div>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedItems.length > 0 && (
                <div className="mt-3 p-2 bg-muted rounded text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1 mt-1">
                    <span>Total:</span>
                    <span>₹{(subtotal + gstAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="notes" className="text-sm">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
