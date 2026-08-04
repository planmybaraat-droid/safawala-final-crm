"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Save, Package, User, Clock, Layers } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { toast } from "@/hooks/use-toast"
import { InventoryAvailabilityPopup } from "./inventory-availability-popup"

interface Category {
  id: string
  name: string
  description: string
  display_order: number
  is_active: boolean
}

interface PackageVariant {
  id: string
  name: string
  description: string
  base_price: number
  inclusions: string[]
  package_id: string
  package_levels?: PackageLevel[]
}

interface PackageLevel {
  id: string
  name: string
  base_price: number
  variant_id: string
  is_active: boolean
  display_order: number
  distance_pricing?: DistancePricing[]
}

interface PackageSet {
  id: string
  name: string
  description: string
  base_price: number
  category_id: string
  variants: PackageVariant[]
}

interface Customer {
  id: string
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  pincode?: string
}

interface Staff {
  id: string
  name: string
  role: string
  franchise_id: string
}

interface DistancePricing {
  id: string
  package_level_id: string
  min_distance_km: number
  max_distance_km: number
  distance_range: string
  additional_price: number
  is_active: boolean
}

interface PackageBookingFormProps {
  onSubmit: (bookingData: any) => void
  currentUser?: any
}

export function PackageBookingForm({ onSubmit, currentUser }: PackageBookingFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [packages, setPackages] = useState<PackageSet[]>([])
  const [distancePricing, setDistancePricing] = useState<DistancePricing[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    email: "",
    address: "",
    pincode: "",
  })
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [selectedVariant, setSelectedVariant] = useState<string>("")
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: boolean }>({})
  const [skipProductSelection, setSkipProductSelection] = useState(false)
  const [eventDate, setEventDate] = useState<Date>()
  const [deliveryDate, setDeliveryDate] = useState<Date>()
  const [pickupDate, setPickupDate] = useState<Date>()
  const [notes, setNotes] = useState("")
  const [assignedStaff, setAssignedStaff] = useState<string>(currentUser?.id || "")
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "partial" | "paid">("pending")
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)
  const [distancePricingAmount, setDistancePricingAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash / Offline Payment")
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [couponCode, setCouponCode] = useState<string>("")
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [activeFranchiseId, setActiveFranchiseId] = useState<string>(currentUser?.franchise_id || "")

  const supabase = createClient()

  useEffect(() => {
    if (currentUser?.franchise_id && currentUser.franchise_id !== activeFranchiseId) {
      setActiveFranchiseId(currentUser.franchise_id)
    }
  }, [activeFranchiseId, currentUser?.franchise_id])

  useEffect(() => {
    if (currentUser?.id && !assignedStaff) {
      setAssignedStaff(currentUser.id)
    }
  }, [currentUser?.id, assignedStaff])

  useEffect(() => {
    if (!activeFranchiseId) return
    loadData(activeFranchiseId)
  }, [activeFranchiseId])

  useEffect(() => {
    if (selectedCategory) {
      setSelectedPackage("")
      setSelectedVariant("")
    }
  }, [selectedCategory])

  useEffect(() => {
    if (selectedPackage) {
      setSelectedVariant("")
      setSelectedLevel("")
    }
  }, [selectedPackage])

  useEffect(() => {
    if (selectedVariant) {
      setSelectedLevel("")
    }
  }, [selectedVariant])

  useEffect(() => {
    calculateDistancePricing()
  }, [selectedCustomer, newCustomer.pincode, selectedLevel, isNewCustomer])

  const loadData = async (franchiseId: string) => {
    try {
      setLoading(true)

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("packages_categories")
        .select("*")
        .eq("is_active", true)
        .eq("franchise_id", franchiseId)
        .order("display_order")

      if (categoriesError) throw categoriesError

      const { data: packagesData, error: packagesError } = await supabase
        .from("package_sets")
        .select("*")
        .eq("is_active", true)
        .eq("franchise_id", franchiseId)
        .order("display_order")

      if (packagesError) throw packagesError

      const { data: variantsData, error: variantsError } = await supabase
        .from("package_variants")
        .select("*")
        .eq("is_active", true)
        .eq("franchise_id", franchiseId)
        .order("display_order")

      if (variantsError) throw variantsError

      // Fetch levels for all variants
      const variantIds = (variantsData || []).map((v: any) => v.id)
      let levelsData: any[] = []
      if (variantIds.length > 0) {
        const { data: lvlData, error: levelsError } = await supabase
          .from("package_levels")
          .select("*")
          .in("variant_id", variantIds)
          .eq("is_active", true)
          .order("display_order")
        if (levelsError) throw levelsError
        levelsData = lvlData || []
      }

      // Fetch distance pricing for all levels
      const levelIds = levelsData.map((l: any) => l.id)
      let distancePricingData: any[] = []
      if (levelIds.length > 0) {
        const { data: dpData, error: distancePricingError } = await supabase
          .from("distance_pricing")
          .select("*")
          .in("package_level_id", levelIds)
          .eq("is_active", true)
          .order("min_distance_km")
        if (distancePricingError) throw distancePricingError
        distancePricingData = (dpData || []).map((dp: any) => ({
          ...dp,
          // Backward compatibility mapping
          min_distance_km: dp.min_distance_km ?? dp.min_km ?? 0,
          max_distance_km: dp.max_distance_km ?? dp.max_km ?? 0,
          additional_price: dp.additional_price ?? dp.base_price_addition ?? 0,
          distance_range: dp.distance_range ?? dp.range ?? '',
        }))
      }

      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("franchise_id", franchiseId)
        .order("name")

      if (customersError) throw customersError

      const { data: staffData, error: staffError } = await supabase
        .from("users")
        .select("*")
        .eq("is_active", true)
        .eq("franchise_id", franchiseId)
        .order("name")

      if (staffError) throw staffError

      // Build hierarchical structure: packages -> variants -> levels -> distance_pricing
      const packagesWithVariants =
        packagesData?.map((pkg) => ({
          ...pkg,
          variants: (variantsData?.filter((variant) => variant.package_id === pkg.id) || []).map((variant: any) => ({
            ...variant,
            package_levels: (levelsData.filter((lvl: any) => lvl.variant_id === variant.id) || []).map((level: any) => ({
              ...level,
              distance_pricing: distancePricingData.filter((dp: any) => dp.package_level_id === level.id),
            })),
          })),
        })) || []

      setCategories(categoriesData || [])
      setPackages(packagesWithVariants)
      setDistancePricing(distancePricingData || [])
      setCustomers(customersData || [])
      setStaff(staffData || [])

      console.log(
        `[v0] Loaded ${categoriesData?.length || 0} categories, ${packagesData?.length || 0} packages, ${variantsData?.length || 0} variants, ${levelsData?.length || 0} levels, ${distancePricingData?.length || 0} distance pricing, ${customersData?.length || 0} customers, ${staffData?.length || 0} staff`,
      )
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load booking data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateDistancePricing = async () => {
    if (!selectedLevel) {
      setDistancePricingAmount(0)
      return
    }

    const customerPincode = isNewCustomer
      ? newCustomer.pincode
      : customers.find((c) => c.id === selectedCustomer)?.pincode

    if (!customerPincode) {
      setDistancePricingAmount(0)
      return
    }

    const basePincode = 390007 // Base location pincode (center point for radius calculation)
    const distance = Math.abs(Number.parseInt(customerPincode) - basePincode) / 1000 // Mock distance calculation

    const applicablePricing = distancePricing.find(
      (dp) => dp.package_level_id === selectedLevel && distance >= dp.min_distance_km && distance <= dp.max_distance_km,
    )

    setDistancePricingAmount(applicablePricing?.additional_price || 0)
  }

  const filteredPackages = packages.filter((pkg) => (selectedCategory ? pkg.category_id === selectedCategory : true))

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory)
  const selectedPackageData = packages.find((p) => p.id === selectedPackage)
  const selectedVariantData = selectedPackageData?.variants.find((v) => v.id === selectedVariant)
  const selectedLevelData = selectedVariantData?.package_levels?.find((l) => l.id === selectedLevel)

  const calculateTotal = () => {
    let total = 0

    // Variant base price
    if (selectedVariantData) {
      total += selectedVariantData.base_price
    }

    // Level additional price
    if (selectedLevelData) {
      total += selectedLevelData.base_price
    }

    // Distance pricing additional
    total += distancePricingAmount

    // Apply discount and coupon
    const totalDiscount = discountAmount + couponDiscount
    total = Math.max(0, total - totalDiscount)

    return total
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }

    setCouponValidating(true)
    setCouponError("")

    try {
      const baseTotal = (selectedPackageData?.base_price || 0) + 
                        (selectedVariantData?.base_price || 0) + 
                        distancePricingAmount

      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: couponCode.trim().toUpperCase(),
          orderTotal: baseTotal,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setCouponError(data.error || "Invalid coupon code")
        return
      }

      setCouponDiscount(data.discount)
      toast({
        title: "Coupon Applied!",
        description: `You saved ₹${data.discount.toFixed(2)}`,
      })
    } catch (error) {
      console.error("Error validating coupon:", error)
      setCouponError("Failed to validate coupon. Please try again.")
    } finally {
      setCouponValidating(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode("")
    setCouponDiscount(0)
    setCouponError("")
    toast({
      title: "Coupon Removed",
      description: "Coupon discount has been removed",
    })
  }

  const validateForm = () => {
    if (isNewCustomer) {
      if (!newCustomer.name) {
        toast({
          title: "Validation Error",
          description: "Customer name is required",
          variant: "destructive",
        })
        return false
      }
      const phoneValidation = validatePhoneWithCountry(newCustomer.phone)
      if (!phoneValidation.isValid) {
        toast({
          title: "Validation Error",
          description: phoneValidation.error || "Please enter a valid phone number",
          variant: "destructive",
        })
        return false
      }
    } else {
      if (!selectedCustomer) {
        toast({
          title: "Validation Error",
          description: "Please select a customer",
          variant: "destructive",
        })
        return false
      }
    }

    if (!selectedCategory) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      })
      return false
    }

    if (!selectedPackage) {
      toast({
        title: "Validation Error",
        description: "Please select a package",
        variant: "destructive",
      })
      return false
    }

    // If variant has levels, level selection is required
    if (selectedVariant && selectedVariantData?.package_levels && selectedVariantData.package_levels.length > 0 && !selectedLevel) {
      toast({
        title: "Validation Error",
        description: "Please select a level for this variant",
        variant: "destructive",
      })
      return false
    }

    if (!eventDate) {
      toast({
        title: "Validation Error",
        description: "Event date is required",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const bookingData = {
      customer: isNewCustomer ? newCustomer : selectedCustomer,
      isNewCustomer,
      selectedCategory: selectedCategoryData,
      selectedPackage: selectedPackageData,
      selectedVariant: selectedVariantData,
      selectedLevel: selectedLevelData,
      selectedProducts,
      skipProductSelection,
      eventDate,
      deliveryDate,
      pickupDate,
      notes,
      assignedStaff,
      paymentStatus,
      advanceAmount,
      totalAmount: calculateTotal(),
      distancePricingAmount,
      bookingStatus: skipProductSelection ? "selection_pending" : "payment_pending",
      paymentMethod,
      discountAmount,
      couponCode: couponCode.trim(),
      couponDiscount,
    }

    onSubmit(bookingData)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={isNewCustomer ? "new" : "existing"}
            onValueChange={(value) => setIsNewCustomer(value === "new")}
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

          {isNewCustomer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                  required
                />
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={newCustomer.pincode}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, pincode: e.target.value }))}
                  placeholder="For distance pricing calculation"
                  required
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
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone} {customer.pincode && `(${customer.pincode})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Step 1: Select Category
          </CardTitle>
          <p className="text-sm text-gray-600">Choose from our available safa categories</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  selectedCategory === category.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300",
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2",
                      selectedCategory === category.id ? "bg-blue-500 border-blue-500" : "border-gray-300",
                    )}
                  />
                </div>
                <p className="text-sm text-gray-600">{category.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  {filteredPackages.filter((pkg) => pkg.category_id === category.id).length} packages available
                </div>
              </div>
            ))}
          </div>

          {/* Fallback select for mobile or preference */}
          <div className="md:hidden">
            <Label htmlFor="category-select">Or select from dropdown:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} - {category.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Package Selection */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Step 2: Select Package
            </CardTitle>
            <p className="text-sm text-gray-600">Choose from packages in {selectedCategoryData?.name}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                    selectedPackage === pkg.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <p className="text-sm text-gray-600">{pkg.description}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 mb-2",
                          selectedPackage === pkg.id ? "bg-green-500 border-green-500" : "border-gray-300",
                        )}
                      />
                      <p className="text-lg font-semibold text-green-600">₹{pkg.base_price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{pkg.variants.length} variants available</div>
                </div>
              ))}
            </div>

            {filteredPackages.length === 0 && (
              <div className="text-center py-8 text-gray-500">No packages available in this category</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variant Selection */}
      {selectedPackageData?.variants && selectedPackageData.variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Step 3: Select Variant (Optional)
            </CardTitle>
            <p className="text-sm text-gray-600">Choose a variant for {selectedPackageData.name} or skip this step</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {selectedPackageData.variants.map((variant) => (
                <div
                  key={variant.id}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                    selectedVariant === variant.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                  onClick={() => setSelectedVariant(variant.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{variant.name}</h3>
                      <p className="text-sm text-gray-600">{variant.description}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 mb-2",
                          selectedVariant === variant.id ? "bg-blue-500 border-blue-500" : "border-gray-300",
                        )}
                      />
                      <p className="text-lg font-semibold text-blue-600">+₹{variant.base_price.toLocaleString()}</p>
                    </div>
                  </div>
                  {variant.inclusions && variant.inclusions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Inclusions:</p>
                      <div className="flex flex-wrap gap-1">
                        {variant.inclusions.map((inclusion, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {inclusion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Option to skip variant selection */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <button
                type="button"
                className={cn(
                  "w-full p-3 border-2 rounded-lg transition-all",
                  !selectedVariant ? "border-gray-400 bg-gray-100" : "border-gray-200 hover:border-gray-300",
                )}
                onClick={() => setSelectedVariant("")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">No Variant (Base Package Only)</span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2",
                      !selectedVariant ? "bg-gray-500 border-gray-500" : "border-gray-300",
                    )}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">Use the base package without any additional variants</p>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Select Level */}
      {selectedVariant && selectedVariantData?.package_levels && selectedVariantData.package_levels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Step 4: Select Level
            </CardTitle>
            <p className="text-sm text-gray-600">Choose a pricing level for {selectedVariantData.name}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {selectedVariantData.package_levels.map((level) => {
                const levelTotal = (selectedVariantData.base_price || 0) + (level.base_price || 0)
                return (
                  <div
                    key={level.id}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                      selectedLevel === level.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    onClick={() => setSelectedLevel(level.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{level.name}</h3>
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                          <span className="text-gray-600">₹{selectedVariantData.base_price.toLocaleString()} (base)</span>
                          <span className="text-gray-400">+</span>
                          <span className="text-gray-600">₹{level.base_price.toLocaleString()} (additional)</span>
                          <span className="text-gray-400">=</span>
                          <Badge className="bg-purple-600 text-white font-semibold">₹{levelTotal.toLocaleString()}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2",
                            selectedLevel === level.id ? "bg-purple-500 border-purple-500" : "border-gray-300",
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Breakdown Card */}
      {selectedVariantData && selectedLevelData && (
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              💰 Pricing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Variant Base Price:</span>
                <span className="font-semibold text-lg">₹{selectedVariantData.base_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Level Additional:</span>
                <span className="font-semibold text-lg">₹{selectedLevelData.base_price.toLocaleString()}</span>
              </div>
              <div className="border-t-2 border-purple-300 pt-2 flex justify-between items-center">
                <span className="text-gray-800 font-medium">Level Total:</span>
                <span className="font-bold text-xl">₹{((selectedVariantData.base_price || 0) + (selectedLevelData.base_price || 0)).toLocaleString()}</span>
              </div>
              {distancePricingAmount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">+ Distance Charge:</span>
                    <span className="font-semibold text-lg text-blue-600">₹{distancePricingAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t-2 border-purple-400 pt-3 flex justify-between items-center bg-white/50 p-3 rounded-lg">
                    <span className="text-purple-800 font-bold text-lg">Final Price:</span>
                    <span className="font-bold text-2xl text-purple-700">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                </>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Coupon Discount:</span>
                  <span className="font-semibold">- ₹{couponDiscount.toLocaleString()}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Additional Discount:</span>
                  <span className="font-semibold">- ₹{discountAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Selection Options */}
      <Card>
        <CardHeader>
          <CardTitle>Product Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="skipProducts" checked={skipProductSelection} onCheckedChange={setSkipProductSelection} />
            <Label htmlFor="skipProducts" className="text-sm">
              Skip product selection for now (can be done later)
            </Label>
          </div>

          {!skipProductSelection ? (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ Product selection will be completed during booking confirmation. You can proceed with the booking.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⏳ Product selection will be done later. Booking status will be "Selection Pending" until products are
                chosen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus />
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
                      !deliveryDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Pickup Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !pickupDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {eventDate && (
            <div className="flex justify-center">
              <InventoryAvailabilityPopup
                packageId={selectedPackage}
                variantId={selectedVariant}
                eventDate={eventDate}
                deliveryDate={deliveryDate}
                returnDate={pickupDate}
              >
                <Button variant="outline" type="button" className="flex items-center gap-2 bg-transparent">
                  <Package className="h-4 w-4" />
                  Check Inventory Availability
                </Button>
              </InventoryAvailabilityPopup>
            </div>
          )}

          <div>
            <Label htmlFor="staff">Assigned Staff</Label>
            <Select value={assignedStaff} onValueChange={setAssignedStaff}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentUser && (
              <p className="text-xs text-gray-500 mt-1">Current user ({currentUser.name}) is pre-selected</p>
            )}
          </div>

          <div>
            <Label>Payment Status</Label>
            <RadioGroup
              value={paymentStatus}
              onValueChange={(value) => setPaymentStatus(value as "pending" | "partial" | "paid")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending">Payment Pending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial">Advance Paid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid">Fully Paid</Label>
              </div>
            </RadioGroup>
          </div>

          {paymentStatus === "partial" && (
            <div>
              <Label htmlFor="advance">Advance Amount</Label>
              <Input
                id="advance"
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                placeholder="Enter advance amount"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Method & Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method & Discounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Method */}
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPI / QR Payment">UPI / QR Payment</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Debit / Credit Card">Debit / Credit Card</SelectItem>
                <SelectItem value="Cash / Offline Payment">Cash / Offline Payment</SelectItem>
                <SelectItem value="International Payment Method">International Payment Method</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Discount */}
          <div>
            <Label htmlFor="discount">Discount Amount (₹)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value || 0))}
              placeholder="Enter discount amount"
            />
            {discountAmount > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Discount: ₹{discountAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Coupon Code */}
          <div>
            <Label htmlFor="coupon">Coupon Code (Optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="coupon"
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setCouponError("")
                }}
                placeholder="Enter coupon code"
                maxLength={50}
                disabled={couponDiscount > 0}
              />
              {couponDiscount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveCoupon}
                  className="whitespace-nowrap"
                >
                  Remove
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponValidating || !couponCode.trim()}
                  className="whitespace-nowrap"
                >
                  {couponValidating ? "Validating..." : "Apply"}
                </Button>
              )}
            </div>
            {couponError && (
              <p className="text-xs text-red-600 mt-1">{couponError}</p>
            )}
            {couponDiscount > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Coupon Applied: -₹{couponDiscount.toFixed(2)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1 w-full">
                {selectedPackageData && (
                  <div className="flex justify-between text-sm">
                    <span>Package ({selectedPackageData.name}):</span>
                    <span>₹{selectedPackageData.base_price.toLocaleString()}</span>
                  </div>
                )}
                {selectedVariantData && (
                  <div className="flex justify-between text-sm">
                    <span>Variant ({selectedVariantData.name}):</span>
                    <span>+₹{selectedVariantData.base_price.toLocaleString()}</span>
                  </div>
                )}
                {distancePricingAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Distance Charges:</span>
                    <span>+₹{distancePricingAmount.toLocaleString()}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon ({couponCode}):</span>
                    <span>-₹{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center text-lg font-bold p-4 bg-green-50 rounded-lg">
              <span>Total Booking Amount:</span>
              <span className="text-green-600">₹{calculateTotal().toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-4">
        <Button type="submit" className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Create Booking
        </Button>
      </div>
    </form>
  )
}
