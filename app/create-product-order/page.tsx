"use client"

/**
 * Create Product Order Page - Complete with all fields from legacy form
 * Includes: Event Participant, Groom/Bride WhatsApp, Groom/Bride Addresses, Return Date
 * Tables: product_orders, product_order_items
 * Number prefix: ORD*
 */

import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { fetchProductsWithBarcodes, findProductByAnyBarcode } from "@/lib/product-barcode-service"
import { sendInvoiceViaWhatsApp } from "@/lib/send-invoice-whatsapp"
import { triggerPDFGeneration } from "@/lib/generate-pdf-helper"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  CalendarIcon,
  ArrowLeft,
  Plus,
  Search,
  X,
  ShoppingCart,
  Loader2,
  Package,
  Camera,
  ImageIcon,
} from "lucide-react"
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog"
import { InventoryAvailabilityPopup } from "@/components/bookings/inventory-availability-popup"
import { ProductSelector } from "@/components/products/product-selector"
import { BarcodeInput } from "@/components/barcode/barcode-input"
import type { Product as ProductType, Category, Subcategory } from "@/components/products/product-selector"

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
}

interface Product {
  id: string
  name: string
  category: string
  category_id?: string
  subcategory_id?: string
  rental_price: number
  sale_price: number
  security_deposit: number
  stock_available: number
  image_url?: string
  // Optional barcode metadata for search/display
  barcode?: string | null
  product_code?: string | null
  all_barcode_numbers?: string[]
}

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  category: string
  quantity: number
  unit_price: number
  total_price: number
  security_deposit: number
  stock_available: number
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  franchise_id: string
}

export default function CreateProductOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editQuoteId = searchParams.get('edit')
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingQuoteData, setLoadingQuoteData] = useState(false)

  // State
  const [currentUser, setCurrentUser] = useState<any>(null)  // ✅ Store logged-in user
  const [basePincode, setBasePincode] = useState<string>('390007') // Default fallback
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string, name: string }>>([])
  const [subcategories, setSubcategories] = useState<Array<{ id: string, name: string, parent_id: string }>>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>("none")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [customProductData, setCustomProductData] = useState({ name: '', category_id: '', image_url: '', rental_price: '' })
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [availabilityModalFor, setAvailabilityModalFor] = useState<{ id: string; name: string } | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityRows, setAvailabilityRows] = useState<{ date: string; kind: 'order' | 'package'; ref?: string; qty: number; returnStatus?: 'returned' | 'in_progress'; returnDate?: string }[]>([])
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null)
  const [paidAmount, setPaidAmount] = useState(0)
  const [damageAmount, setDamageAmount] = useState(0)
  const [lossAmount, setLossAmount] = useState(0)
  const [skipProductSelection, setSkipProductSelection] = useState(false)

  // Calendar popover states for auto-close
  const [eventDateOpen, setEventDateOpen] = useState(false)
  const [deliveryDateOpen, setDeliveryDateOpen] = useState(false)
  const [returnDateOpen, setReturnDateOpen] = useState(false)
  const [modificationDateOpen, setModificationDateOpen] = useState(false)

  const [formData, setFormData] = useState({
    booking_type: "rental" as "rental" | "sale",
    event_type: "Wedding",
    event_participant: "Both",
    payment_type: "full" as "full" | "advance" | "partial",
    payment_method: "Cash / Offline Payment",
    custom_amount: 0,
    custom_subtotal: 0, // Custom subtotal before GST
    deposit_amount: 0,
    discount_amount: 0,
    coupon_code: "",
    coupon_discount: 0,
    event_date: "",
    event_time: "10:00",
    delivery_date: "",
    delivery_time: "09:00",
    return_date: "",
    return_time: "18:00",
    venue_address: "",
    groom_name: "",
    groom_whatsapp: "",
    groom_address: "",
    bride_name: "",
    bride_whatsapp: "",
    bride_address: "",
    notes: "",
    delivery_address: "",
    has_modifications: false,
    modifications_details: "",
    modification_date: "",
    modification_time: "10:00",
  })

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Recalculate item prices when booking type changes
  useEffect(() => {
    if (items.length === 0) return

    setItems(prevItems => prevItems.map(item => {
      const product = products.find(p => p.id === item.product_id)
      if (!product) return item

      const newUnitPrice = formData.booking_type === "rental"
        ? (product.rental_price || 0)
        : (product.sale_price || product.rental_price || 0) // Fallback to rental if sale is 0

      return {
        ...item,
        unit_price: newUnitPrice,
        total_price: newUnitPrice * item.quantity,
        security_deposit: formData.booking_type === "rental" ? (product.security_deposit || 0) : 0
      }
    }))
  }, [formData.booking_type, products])

  // Load initial data
  useEffect(() => {
    ; (async () => {
      setCustomersLoading(true)
      try {
        // Fetch current user to apply franchise isolation
        const userRes = await fetch('/api/auth/user')
        if (!userRes.ok) throw new Error('Failed to fetch user')
        const user = await userRes.json()
        setCurrentUser(user)  // ✅ Store user in state for later use

        // Build queries with franchise filter
        let productsQuery = supabase.from("products").select("*").order("name")
        let staffQuery = supabase
          .from("users")
          .select("id,name,email,role,franchise_id")
          .in("role", ["staff", "franchise_admin"]).order("name")

        if (user.role !== 'super_admin' && user.franchise_id) {
          productsQuery = productsQuery.eq('franchise_id', user.franchise_id)
          staffQuery = staffQuery.eq('franchise_id', user.franchise_id)
        }

        // Fetch all data in parallel for faster loading ⚡
        // Use new service to fetch products with barcodes
        const productsWithBarcodes = await fetchProductsWithBarcodes(
          user.role !== 'super_admin' ? user.franchise_id : undefined
        )

        const [customersResponse, settingsResponse, staff, categoriesData] = await Promise.all([
          fetch('/api/customers?basic=1', { cache: 'no-store' }),
          user.franchise_id ? fetch(`/api/settings/company?franchise_id=${user.franchise_id}`) : Promise.resolve(null),
          staffQuery,
          supabase.from('product_categories').select('*').order('name')
        ])

        // Process company settings
        if (settingsResponse) {
          try {
            const settingsData = await settingsResponse.json()
            const pincode = settingsData.data?.pincode
            if (pincode) {
              setBasePincode(pincode)
              console.log('✅ Base pincode loaded from company settings:', pincode)
            }
          } catch (err) {
            console.warn('Could not load company settings')
          }
        }

        // Process customers
        let customersData: Customer[] = []
        if (customersResponse.ok) {
          const result = await customersResponse.json()
          customersData = result.data || []
        } else {
          console.error('Failed to fetch customers:', customersResponse.statusText)
        }

        console.log('✅ Loaded customers:', customersData.length, customersData)
        setCustomers(customersData)
        // ✅ Map ProductWithBarcodes to Product interface (include barcode metadata for search)
        const mappedProducts = productsWithBarcodes.map(p => ({
          id: p.id,
          name: p.name,
          category: '', // ProductWithBarcodes doesn't include full category data
          category_id: p.category_id,
          subcategory_id: undefined,
          rental_price: p.rental_price || 0,
          sale_price: p.sale_price || 0,
          security_deposit: p.security_deposit || 0,
          stock_available: p.stock_available || 0,
          image_url: (p as any).image_url || undefined,
          barcode: (p as any).barcode || (p as any).barcode_number || null,
          product_code: p.product_code || null,
          all_barcode_numbers: p.all_barcode_numbers || []
        })) as Product[]
        setProducts(mappedProducts)

        // Fetch categories and subcategories from database
        const mainCats = categoriesData.data?.filter((c: any) => !c.parent_id) || []
        const subCats = categoriesData.data?.filter((c: any) => c.parent_id) || []
        setCategories(mainCats)
        setSubcategories(subCats)

        setStaffMembers(staff.data || [])

        // Auto-select current user as sales staff if they are in the staff list
        if (user && staff.data) {
          const currentUserInStaff = staff.data.find((s: any) => s.id === user.id)
          if (currentUserInStaff) {
            setSelectedStaff(user.id)
            console.log('✅ Auto-selected current user as sales staff:', currentUserInStaff.name)
          }
        }
      } catch (e) {
        console.error(e)
        toast.error("Failed to load data")
      } finally {
        setCustomersLoading(false)
      }
    })()
  }, [])

  // Load quote data for editing
  useEffect(() => {
    if (editQuoteId) {
      loadQuoteForEdit(editQuoteId)
    }
  }, [editQuoteId])

  const loadQuoteForEdit = async (quoteId: string) => {
    try {
      setLoadingQuoteData(true)
      setIsEditMode(true)

      // Load quote header from product_orders
      const { data: quote, error: quoteError } = await supabase
        .from('product_orders')
        .select('*')
        .eq('id', quoteId)
        .single()

      if (quoteError) throw quoteError

      // Load quote items
      const { data: items, error: itemsError } = await supabase
        .from('product_order_items')
        .select('*')
        .eq('order_id', quoteId)

      if (itemsError) throw itemsError

      // Find customer
      const customer = customers.find(c => c.id === quote.customer_id)
      if (customer) {
        setSelectedCustomer(customer)
      }

      // Set sales staff
      if (quote.sales_staff_id) {
        setSelectedStaff(quote.sales_staff_id)
      }

      // Pre-fill form data
      const eventDateTime = quote.event_date ? new Date(quote.event_date) : null
      const deliveryDateTime = quote.delivery_date ? new Date(quote.delivery_date) : null
      const returnDateTime = quote.return_date ? new Date(quote.return_date) : null
      const modificationDateTime = quote.modification_date ? new Date(quote.modification_date) : null

      setFormData({
        booking_type: quote.booking_type || "rental",
        event_type: quote.event_type || "Wedding",
        event_participant: quote.event_participant || "Both",
        payment_type: quote.payment_type || "full",
        payment_method: quote.payment_method || "Cash / Offline Payment",
        custom_amount: quote.custom_amount || 0,
        custom_subtotal: quote.custom_subtotal || 0,
        deposit_amount: quote.deposit_amount || 0,
        discount_amount: quote.discount_amount || 0,
        coupon_code: quote.coupon_code || "",
        coupon_discount: quote.coupon_discount || 0,
        event_date: eventDateTime ? eventDateTime.toISOString().split('T')[0] : "",
        event_time: eventDateTime ? format(eventDateTime, "HH:mm") : "10:00",
        delivery_date: deliveryDateTime ? deliveryDateTime.toISOString().split('T')[0] : "",
        delivery_time: deliveryDateTime ? format(deliveryDateTime, "HH:mm") : "09:00",
        return_date: returnDateTime ? returnDateTime.toISOString().split('T')[0] : "",
        return_time: returnDateTime ? format(returnDateTime, "HH:mm") : "18:00",
        venue_address: quote.venue_address || "",
        groom_name: quote.groom_name || "",
        groom_whatsapp: quote.groom_whatsapp || "",
        groom_address: quote.groom_address || "",
        bride_name: quote.bride_name || "",
        bride_whatsapp: quote.bride_whatsapp || "",
        bride_address: quote.bride_address || "",
        notes: quote.notes || quote.special_instructions || "",
        delivery_address: quote.delivery_address || "",
        has_modifications: quote.has_modifications || false,
        modifications_details: quote.modifications_details || "",
        modification_date: modificationDateTime ? modificationDateTime.toISOString().split('T')[0] : "",
        modification_time: modificationDateTime ? format(modificationDateTime, "HH:mm") : "10:00",
      })

      // Pre-fill items - find products and create order items
      const orderItems: OrderItem[] = []
      for (const item of items) {
        // Find the product in the products list
        const product = products.find(p => p.id === item.product_id)
        if (product) {
          orderItems.push({
            id: Math.random().toString(36).substr(2, 9),
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            security_deposit: item.security_deposit || 0,
            stock_available: product.stock_available,
          })
        }
      }
      setItems(orderItems)

      toast.success("Quote loaded successfully")
    } catch (error) {
      console.error("Error loading quote:", error)
      toast.error("Failed to load quote data")
      router.push('/quotes')
    } finally {
      setLoadingQuoteData(false)
    }
  }

  // Auto-set payment type to "full" when booking type is "sale" (Direct Sale)
  useEffect(() => {
    if (formData.booking_type === "sale") {
      setFormData(prev => ({ ...prev, payment_type: "full" }))
    }
  }, [formData.booking_type])

  // Filtered lists
  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch.trim())
      ),
    [customers, customerSearch]
  )
  // Product management
  const addProduct = (p: Product) => {
    const existing = items.find((i) => i.product_id === p.id)
    const currentQty = existing?.quantity || 0
    const availableStock = p.stock_available - currentQty

    if (availableStock <= 0) {
      toast.error("Out of stock")
      return
    }

    const unit =
      formData.booking_type === "rental"
        ? (p.rental_price || 0)
        : (p.sale_price || p.rental_price || 0) // Use rental as fallback if sale is 0

    if (existing) {
      if (existing.quantity >= p.stock_available) {
        toast.error(`Only ${p.stock_available} available`)
        return
      }
      updateQuantity(existing.id, existing.quantity + 1)
      setLastAddedItemId(existing.id) // Track for focus
      return
    }

    const newItemId = `item-${p.id}-${Date.now()}`
    setItems((prev) => [
      ...prev,
      {
        id: newItemId,
        product_id: p.id,
        product_name: p.name,
        category: p.category,
        quantity: 1,
        unit_price: unit,
        total_price: unit,
        security_deposit:
          formData.booking_type === "rental" ? (p.security_deposit || 0) : 0,
        stock_available: p.stock_available,
      },
    ])
    setLastAddedItemId(newItemId) // Track for focus
  }

  const handleCreateCustomProduct = async () => {
    if (!customProductData.name.trim()) {
      toast.error("Product name is required")
      return
    }
    if (!customProductData.category_id) {
      toast.error("Please select a category")
      return
    }
    if (!customProductData.rental_price || parseFloat(customProductData.rental_price) <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    setCreatingProduct(true)
    try {
      let imageUrl: string | null = customProductData.image_url

      // Upload image to storage if it's a base64 string
      if (imageUrl && imageUrl.startsWith('data:image')) {
        try {
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(7)
          const fileExt = blob.type.split('/')[1] || 'jpg'
          const fileName = `product-${timestamp}-${randomStr}.${fileExt}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, blob, {
              contentType: blob.type,
              cacheControl: '3600',
              upsert: true
            })

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)

          imageUrl = publicUrl
          toast.success('Image uploaded successfully!')
        } catch (uploadError: any) {
          toast.error('Image upload failed, creating product without image')
          imageUrl = null
        }
      }

      const productCode = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`

      let createdByFranchiseId: string | null = null
      try {
        const ures = await fetch('/api/auth/user', { cache: 'no-store' })
        if (ures.ok) {
          const ujson = await ures.json()
          createdByFranchiseId = ujson?.franchise_id || null
        }
      } catch (e) {
        console.error('Failed to get user franchise:', e)
      }

      if (!createdByFranchiseId) {
        toast.error('Unable to determine franchise. Please try again.')
        throw new Error('franchise_id is required')
      }

      const priceValue = parseFloat(customProductData.rental_price) || 0

      const basePayload: any = {
        name: customProductData.name.trim(),
        category_id: customProductData.category_id,
        image_url: imageUrl || null,
        rental_price: priceValue,
        price: priceValue,
        security_deposit: 0,
        stock_available: 100,
        is_active: true,
        product_code: productCode,
        description: 'Custom product',
        franchise_id: createdByFranchiseId
      }

      const { data: product, error } = await supabase
        .from('products')
        .insert(basePayload)
        .select()
        .single()

      if (error) throw error

      // Add to products list and immediately add to order
      setProducts(prev => [...prev, product as any])
      addProduct(product)

      toast.success(`Product "${product.name}" created and added to order!`)

      setCustomProductData({ name: '', category_id: '', image_url: '', rental_price: '' })
      setShowCustomProductDialog(false)
    } catch (e: any) {
      console.error('Failed to create product:', e)
      toast.error(e.message || "Failed to create product")
    } finally {
      setCreatingProduct(false)
    }
  }

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing }
      })
      streamRef.current = stream
      setShowCameraDialog(true)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (error) {
      console.error('Camera access error:', error)
      toast.error('Could not access camera. Please check permissions.')
    }
  }

  const switchCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    const newFacing = cameraFacing === 'user' ? 'environment' : 'user'
    setCameraFacing(newFacing)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      toast.success(`Switched to ${newFacing === 'user' ? 'front' : 'back'} camera`)
    } catch (error) {
      console.error('Camera switch error:', error)
      toast.error('Could not switch camera')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCustomProductData(prev => ({ ...prev, image_url: imageUrl }))
        closeCamera()
        toast.success('Photo captured!')
      }
    }
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCameraDialog(false)
  }

  const updateQuantity = (id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id !== id) return it
          if (qty <= 0) return null as any
          if (qty > it.stock_available) {
            toast.error(`Max ${it.stock_available}`)
            return it
          }
          return {
            ...it,
            quantity: qty,
            total_price: it.unit_price * qty,
            security_deposit:
              formData.booking_type === "rental"
                ? (it.security_deposit / it.quantity) * qty
                : 0,
          }
        })
        .filter(Boolean) as OrderItem[]
    )
  }

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id))

  // Update prices when booking type changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        const prod = products.find((p) => p.id === it.product_id)
        if (!prod) return it

        const unit =
          formData.booking_type === "rental"
            ? prod.rental_price
            : prod.sale_price

        return {
          ...it,
          unit_price: unit,
          total_price: unit * it.quantity,
          security_deposit:
            formData.booking_type === "rental"
              ? prod.security_deposit * it.quantity
              : 0,
        }
      })
    )
  }, [formData.booking_type, products])

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = formData.custom_subtotal > 0 ? formData.custom_subtotal : items.reduce((s, i) => s + i.total_price, 0)
    const autoDeposit = 0 // Disabled: no auto security deposit from products
    const customDeposit = formData.deposit_amount || 0
    const totalDeposit = customDeposit // Only use custom deposit
    const discount = formData.discount_amount || 0
    const couponDiscount = formData.coupon_discount || 0
    const totalDiscount = discount + couponDiscount
    const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount)
    const gst = subtotalAfterDiscount * 0.05
    const grand = subtotalAfterDiscount + gst

    let payable = grand
    if (formData.payment_type === "advance") payable = grand * 0.5
    else if (formData.payment_type === "partial")
      payable = Math.min(grand, Math.max(0, formData.custom_amount))

    return {
      subtotal,
      discount,
      couponDiscount,
      totalDiscount,
      subtotalAfterDiscount,
      autoDeposit,
      customDeposit,
      deposit: totalDeposit,
      gst,
      grand,
      payable,
      remaining: grand - payable,
    }
  }, [items, formData])

  // Create customer
  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((c) => [...c, newCustomer])
    setSelectedCustomer(newCustomer)
  }

  // Validate and apply coupon
  const handleApplyCoupon = async () => {
    if (!formData.coupon_code.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }

    setCouponValidating(true)
    setCouponError("")

    try {
      const response = await fetch('/api/offers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.coupon_code,
          orderValue: totals.subtotalAfterDiscount, // Apply coupon after manual discount
          customerId: selectedCustomer?.id,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        setFormData({
          ...formData,
          coupon_discount: data.discount,
        })
        toast.success(data.message || 'Coupon applied successfully!')
        setCouponError("")
      } else {
        setCouponError(data.message || data.error || 'Invalid coupon')
        setFormData({ ...formData, coupon_discount: 0 })
      }
    } catch (error) {
      console.error('Error validating coupon:', error)
      setCouponError('Failed to validate coupon')
      setFormData({ ...formData, coupon_discount: 0 })
    } finally {
      setCouponValidating(false)
    }
  }

  const handleRemoveCoupon = () => {
    setFormData({
      ...formData,
      coupon_code: "",
      coupon_discount: 0,
    })
    setCouponError("")
    toast.success('Coupon removed')
  }

  // Combine date and time into ISO string
  const combineDateAndTime = (dateStr: string, timeStr: string): string | null => {
    if (!dateStr || dateStr.trim() === "") return null
    const date = new Date(dateStr)
    const [hours, minutes] = timeStr.split(":")
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    return date.toISOString()
  }

  // Deprecated: checkAvailability function removed - use InventoryAvailabilityPopup component instead
  // This provides better UX with product-specific availability checking
  const checkAvailability = async (productId: string, productName: string) => {
    console.warn('checkAvailability function is deprecated. Use InventoryAvailabilityPopup component instead.')
  }

  // Submit order or quote
  const handleSubmit = async (isQuote: boolean = false) => {
    if (!selectedCustomer) {
      toast.error("Select customer")
      return
    }
    if (!formData.event_date && formData.booking_type === "rental") {
      toast.error("Event date required for rental")
      return
    }
    // For direct sales, products are mandatory
    if (formData.booking_type === "sale" && items.length === 0) {
      toast.error("Add at least one product for direct sale")
      return
    }
    // ✅ For rentals, product selection is optional
    // ✅ For sales, event_date and delivery_date are both optional
    // ✅ BUG FIX #1: Validate user session loaded
    if (!currentUser?.franchise_id) {
      toast.error("Session error: Please refresh the page")
      return
    }

    setLoading(true)
    try {
      // ==================================================================
      // EDIT MODE: Update existing quote
      // ==================================================================
      if (isEditMode && editQuoteId) {
        // Combine dates with times
        // ✅ For rentals: event_date is required. For sales: use delivery_date or current date as fallback
        let eventDateTime = combineDateAndTime(formData.event_date, formData.event_time)
        if (!eventDateTime && formData.booking_type === "sale") {
          // For direct sales, use delivery_date if available
          if (formData.delivery_date) {
            eventDateTime = combineDateAndTime(formData.delivery_date, formData.delivery_time)
          } else {
            // If both are empty, use today's date to satisfy NOT NULL constraint
            const today = new Date().toISOString().split('T')[0]
            eventDateTime = combineDateAndTime(today, formData.event_time)
          }
        }

        const deliveryDateTime = formData.delivery_date
          ? combineDateAndTime(formData.delivery_date, formData.delivery_time)
          : null
        const returnDateTime = formData.return_date
          ? combineDateAndTime(formData.return_date, formData.return_time)
          : null

        // Calculate amount to save as paid now (includes deposit for rentals)
        const amountPaidNow = totals.payable + (formData.booking_type === "rental" ? totals.deposit : 0)

        // 1. Update quote header
        const { error: updateError } = await supabase
          .from("product_orders")
          .update({
            customer_id: selectedCustomer.id,
            booking_type: formData.booking_type,
            event_type: formData.event_type,
            event_participant: formData.event_participant,
            payment_type: formData.payment_type,
            event_date: eventDateTime,
            delivery_date: deliveryDateTime,
            return_date: returnDateTime,
            venue_address: formData.venue_address || formData.delivery_address,  // Use delivery_address as fallback
            groom_name: formData.groom_name,
            groom_whatsapp: formData.groom_whatsapp,
            groom_address: formData.groom_address,
            bride_name: formData.bride_name,
            bride_whatsapp: formData.bride_whatsapp,
            bride_address: formData.bride_address,
            notes: formData.notes,
            payment_method: formData.payment_method,
            discount_amount: formData.discount_amount,
            coupon_code: formData.coupon_code || null,
            coupon_discount: formData.coupon_discount || 0,
            tax_amount: totals.gst,
            subtotal_amount: totals.subtotal,
            total_amount: totals.grand,
            security_deposit: totals.deposit,
            amount_paid: amountPaidNow,
            pending_amount: totals.remaining,
            sales_closed_by_id: selectedStaff && selectedStaff !== "none" ? selectedStaff : null,
            has_modifications: formData.has_modifications,
            modifications_details: formData.modifications_details,
            modification_date: formData.has_modifications && formData.modification_date ? combineDateAndTime(formData.modification_date, formData.modification_time) : null,
            delivery_time: formData.delivery_time || null,
            modification_time: formData.modification_time || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editQuoteId)

        if (updateError) throw updateError

        // 2. Delete existing items
        const { error: deleteError } = await supabase
          .from("product_order_items")
          .delete()
          .eq('order_id', editQuoteId)

        if (deleteError) throw deleteError

        // 3. Insert updated items
        const rows = items.map((it) => ({
          order_id: editQuoteId,
          product_id: it.product_id,
          product_name_copy: it.product_name,
          category: it.category,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          security_deposit: it.security_deposit,
        }))

        const { error: itemsErr } = await supabase
          .from("product_order_items")
          .insert(rows)

        if (itemsErr) throw itemsErr

        toast.success("Quote updated successfully")
        router.push(`/quotes?refresh=${Date.now()}`)
        router.refresh()
        return
      }

      // ==================================================================
      // CREATE MODE: Create new order/quote
      // ==================================================================
      // Generate number with appropriate prefix
      const prefix = isQuote ? "QT" : "ORD"
      const orderNumber = `${prefix}${Date.now().toString().slice(-8)}`

      // Combine dates with times
      // ✅ For rentals: event_date is required. For sales: use delivery_date or current date as fallback
      let eventDateTime = combineDateAndTime(formData.event_date, formData.event_time)
      if (!eventDateTime && formData.booking_type === "sale") {
        // For direct sales, use delivery_date if available
        if (formData.delivery_date) {
          eventDateTime = combineDateAndTime(formData.delivery_date, formData.delivery_time)
        } else {
          // If both are empty, use today's date to satisfy NOT NULL constraint
          const today = new Date().toISOString().split('T')[0]
          eventDateTime = combineDateAndTime(today, formData.event_time)
        }
      }

      const deliveryDateTime = formData.delivery_date
        ? combineDateAndTime(formData.delivery_date, formData.delivery_time)
        : null
      const returnDateTime = formData.return_date
        ? combineDateAndTime(formData.return_date, formData.return_time)
        : null
      const modificationDateTime = formData.has_modifications && formData.modification_date
        ? combineDateAndTime(formData.modification_date, formData.modification_time)
        : null

      // Calculate amount to save as paid now (includes deposit for rentals)
      const amountPaidNow = totals.payable + (formData.booking_type === "rental" ? totals.deposit : 0)

      // ✅ NEW: Branch for direct sales (separate table) - using server-side API
      if (formData.booking_type === "sale" && !isQuote) {
        console.log('[Create Product Order] Saving direct sale via API...')

        // Generate DSL* prefix for direct sales
        const saleNumber = `DSL${Date.now().toString().slice(-8)}`

        // Determine status based on payment type:
        // - Full payment → "confirmed" (ready to proceed)
        // - Advance/Partial payment → "pending_payment" (needs payment confirmation)
        const saleStatus = formData.payment_type === "full" ? "confirmed" : "pending_payment"

        // Prepare sale data
        const saleData = {
          sale_number: saleNumber,
          customer_id: selectedCustomer.id,
          sale_date: eventDateTime || new Date().toISOString(),
          delivery_date: deliveryDateTime,
          venue_address: formData.venue_address || formData.delivery_address,
          groom_name: formData.groom_name,
          groom_whatsapp: formData.groom_whatsapp,
          groom_address: formData.groom_address,
          bride_name: formData.bride_name,
          bride_whatsapp: formData.bride_whatsapp,
          bride_address: formData.bride_address,
          payment_method: formData.payment_method,
          payment_type: formData.payment_type,
          subtotal_amount: totals.subtotal,
          discount_amount: formData.discount_amount,
          coupon_code: formData.coupon_code || null,
          coupon_discount: formData.coupon_discount || 0,
          tax_amount: totals.gst,
          total_amount: totals.grand,
          amount_paid: amountPaidNow,
          pending_amount: totals.remaining,
          status: saleStatus,
          notes: formData.notes,
          sales_closed_by_id: selectedStaff && selectedStaff !== "none" ? selectedStaff : null
        }

        // Prepare items data
        const itemsData = items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
        }))

        // Call server-side API (bypasses RLS issues)
        const response = await fetch('/api/direct-sales', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sale: saleData,
            items: itemsData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('[Create Product Order] API error:', errorData)
          throw new Error(errorData.error || 'Failed to create direct sale')
        }

        const result = await response.json()
        console.log('[Create Product Order] ✅ Direct sale created via API:', result)

        toast.success("Direct sale created successfully")

        // Trigger PDF generation in background
        if (result?.id) {
          triggerPDFGeneration(result.id, "direct_sale")
        }

        // Auto-send invoice via WhatsApp (fire & forget)
        if (result?.id) {
          sendInvoiceViaWhatsApp({ orderId: result.id, orderType: "direct_sale" })
            .then(r => r.success && toast.success("Invoice sent on WhatsApp!"))
        }

        router.push(`/bookings?refresh=${Date.now()}`)
        router.refresh()
        return
      }

      // ✅ EXISTING: Rentals and quotes use product_orders table
      // Determine status based on payment type:
      // - Full payment → "confirmed" (ready to proceed)
      // - Advance/Partial payment → "pending_payment" (needs payment confirmation)
      // - Quote → "quote" (not an order yet)
      let bookingStatus = "pending_payment" // default for new bookings
      if (isQuote) {
        bookingStatus = "quote"
      } else if (formData.payment_type === "full") {
        bookingStatus = "confirmed"
      }

      const { data: order, error } = await supabase
        .from("product_orders")
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer.id,
          franchise_id: currentUser.franchise_id,  // ✅ BUG FIX #1: Dynamic franchise_id
          booking_type: formData.booking_type,
          event_type: formData.event_type,
          event_participant: formData.event_participant,
          payment_type: formData.payment_type,
          event_date: eventDateTime,
          delivery_date: deliveryDateTime,
          return_date: returnDateTime,
          venue_address: formData.venue_address || formData.delivery_address,  // Use delivery_address as fallback
          groom_name: formData.groom_name,
          groom_whatsapp: formData.groom_whatsapp,
          groom_address: formData.groom_address,
          bride_name: formData.bride_name,
          bride_whatsapp: formData.bride_whatsapp,
          bride_address: formData.bride_address,
          notes: formData.notes,
          payment_method: formData.payment_method,
          discount_amount: formData.discount_amount,
          coupon_code: formData.coupon_code || null,
          coupon_discount: formData.coupon_discount || 0,
          tax_amount: totals.gst,
          subtotal_amount: totals.subtotal,
          total_amount: totals.grand,
          security_deposit: totals.deposit, // Track order-level deposit (rental)
          amount_paid: amountPaidNow,  // Payable portion plus refundable deposit (if rental)
          pending_amount: totals.remaining,  // Remaining on the grand total (excludes deposit)
          // Only include modification fields for sales, not rentals
          ...(formData.booking_type === 'sale' && {
            has_modifications: formData.has_modifications,
            modifications_details: formData.modifications_details,
            modification_date: modificationDateTime,
            modification_time: formData.modification_time || null,
          }),
          delivery_time: formData.delivery_time || null,
          status: bookingStatus,
          is_quote: isQuote,
          sales_closed_by_id: selectedStaff && selectedStaff !== "none" ? selectedStaff : null
        })
        .select()
        .single()

      if (error) {
        console.error('Order insert error:', error)
        throw new Error(error.message || 'Failed to create order/quote')
      }

      const rows = items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id,
        product_name_copy: it.product_name,
        category: it.category,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        security_deposit: it.security_deposit,
      }))

      const { error: itemsErr } = await supabase
        .from("product_order_items")
        .insert(rows)

      if (itemsErr) {
        console.error('Order items insert error:', itemsErr)
        throw new Error(itemsErr.message || 'Failed to create order items')
      }

      // NOTE: Simplified coupons - we no longer track coupon usage with coupon_usage or usage_count columns.
      // Keep this block for analytics only if the DB schema still has usage tracking; otherwise skip.

      // ✅ NEW: Deduct inventory for each item (unless it's a quote)
      if (!isQuote) {
        console.log('[Product Order] Deducting inventory for', items.length, 'items')
        try {
          for (const item of items) {
            console.log(`[Product Order] Deducting ${item.quantity} units from product ${item.product_id}`)

            // Get current stock from products table
            const { data: product, error: fetchError } = await supabase
              .from('products')
              .select('stock_available, name')
              .eq('id', item.product_id)
              .single()

            if (fetchError) {
              console.warn(`[Product Order] Failed to fetch product stock for ${item.product_id}:`, fetchError)
              continue
            }

            const currentStock = product?.stock_available || 0
            const newStock = Math.max(0, currentStock - item.quantity)

            // Warn if stock would go negative
            if (newStock < currentStock - item.quantity) {
              console.warn(`[Product Order] Product ${item.product_id} (${product?.name}) reserved more than available. Current: ${currentStock}, Requested: ${item.quantity}, Will reserve: ${newStock}`)
            }

            // Update stock in products table
            const { error: updateError } = await supabase
              .from('products')
              .update({ stock_available: newStock })
              .eq('id', item.product_id)

            if (updateError) {
              console.warn(`[Product Order] Failed to deduct stock for product ${item.product_id}:`, updateError)
              continue
            }

            console.log(`[Product Order] ✅ Deducted ${item.quantity} units from ${item.product_id}. New stock: ${newStock}`)
          }
        } catch (inventoryError) {
          console.warn('[Product Order] Warning: Inventory deduction failed', inventoryError)
          // Don't fail the order if inventory deduction has issues
          toast.warning('Order created but inventory update may be incomplete. Please verify stock levels.')
        }
      }

      const successMsg = isQuote
        ? `Quote ${orderNumber} created successfully`
        : `Order ${orderNumber} created successfully`
      toast.success(successMsg)

      // Trigger PDF generation in background
      if (order?.id) {
        triggerPDFGeneration(order.id, "product_order")
      }

      // Auto-send invoice via WhatsApp (fire & forget, only for orders not quotes)
      if (!isQuote && order?.id) {
        sendInvoiceViaWhatsApp({ orderId: order.id, orderType: "product_order", sendConfirmation: true })
          .then(r => r.success && toast.success("Invoice sent on WhatsApp!"))
      }

      // Redirect to quotes page if quote, bookings page if order
      // Add timestamp to force page reload and refetch
      const redirectPath = isQuote ? "/quotes" : "/bookings"
      router.push(`${redirectPath}?refresh=${Date.now()}`)
      router.refresh() // Force refresh to ensure data is reloaded
    } catch (e: any) {
      console.error('Order submission error:', e)
      const errorMsg = isQuote ? "Failed to create quote" : "Failed to create order"
      toast.error(e.message || errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Loading State */}
        {loadingQuoteData ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span className="text-lg">Loading quote data...</span>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href={isEditMode ? "/quotes" : "/bookings"}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">
                  {isEditMode ? 'Edit Quote' : 'Create Product Order'}
                </h1>
                <p className="text-sm text-gray-600">
                  {isEditMode ? 'Update quote details and products' : 'Products only (rental & sale)'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Forms Section */}
              <div className="space-y-6">
                {/* Customer Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Customer
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNewCustomer(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {selectedCustomer ? (
                      <div className="p-3 rounded-md bg-blue-50 border border-blue-200 flex items-start justify-between">
                        <div>
                          <div className="font-medium text-blue-900">
                            {selectedCustomer.name}
                          </div>
                          <div className="text-xs text-blue-700">
                            {selectedCustomer.phone}
                          </div>
                          {selectedCustomer.email && (
                            <div className="text-xs text-blue-600">
                              {selectedCustomer.email}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedCustomer(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-md max-h-56 overflow-y-auto text-sm">
                        {customersLoading ? (
                          // Skeleton loading state
                          <div className="space-y-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="p-3 border-b last:border-b-0">
                                <Skeleton className="h-5 w-32 mb-2" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            {(customerSearch ? filteredCustomers : customers.slice(0, 5)).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setSelectedCustomer(c)}
                                className="w-full text-left p-3 border-b last:border-b-0 hover:bg-muted"
                              >
                                <div className="font-medium">{c.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {c.phone}
                                </div>
                              </button>
                            ))}
                            {customerSearch && filteredCustomers.length === 0 && (
                              <div className="p-3 text-xs text-muted-foreground">
                                No matches
                              </div>
                            )}
                            {!customerSearch && customers.length > 5 && (
                              <div className="p-3 text-xs text-muted-foreground text-center bg-muted/30">
                                Showing first 5 of {customers.length} customers. Type to search more...
                              </div>
                            )}
                            {!customerSearch && customers.length === 0 && (
                              <div className="p-3 text-xs text-muted-foreground">
                                No customers found
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Booking Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>{formData.booking_type === "sale" ? "Direct Sale Details" : "Event & Wedding Details"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {/* Row 1: Booking Type */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Booking Type</Label>
                        <Select
                          value={formData.booking_type}
                          onValueChange={(v) =>
                            setFormData({ ...formData, booking_type: v as any })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rental">Rental</SelectItem>
                            <SelectItem value="sale">Direct Sale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Only show Event Type and Event Participant for rentals */}
                      {formData.booking_type === "rental" && (
                        <>
                          <div>
                            <Label className="text-xs">Event Type</Label>
                            <Select
                              value={formData.event_type}
                              onValueChange={(v) =>
                                setFormData({ ...formData, event_type: v })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Wedding">Wedding</SelectItem>
                                <SelectItem value="Engagement">Engagement</SelectItem>
                                <SelectItem value="Reception">Reception</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Event Participant</Label>
                            <Select
                              value={formData.event_participant}
                              onValueChange={(v) =>
                                setFormData({ ...formData, event_participant: v })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Groom">Groom Only</SelectItem>
                                <SelectItem value="Bride">Bride Only</SelectItem>
                                <SelectItem value="Both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Payment Type - only for rentals */}
                    {formData.booking_type === "rental" && (
                      <div>
                        <Label className="text-xs">Payment Type</Label>
                        <Select
                          value={formData.payment_type}
                          onValueChange={(v) =>
                            setFormData({ ...formData, payment_type: v as any })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Payment</SelectItem>
                            <SelectItem value="advance">Advance Payment</SelectItem>
                            <SelectItem value="partial">Deposit Only</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.payment_type === "partial" && (
                          <Input
                            type="number"
                            min={0}
                            value={formData.custom_amount || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                custom_amount: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                            className="mt-2"
                            placeholder="Custom amount"
                          />
                        )}
                      </div>
                    )}

                    {/* Dates & Times - only for rentals */}
                    {formData.booking_type === "rental" && (
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Event Date & Time *</Label>
                          <Popover open={eventDateOpen} onOpenChange={setEventDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.event_date
                                  ? format(new Date(formData.event_date), "dd/MM/yyyy")
                                  : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={
                                  formData.event_date
                                    ? new Date(formData.event_date)
                                    : undefined
                                }
                                onSelect={(d) => {
                                  setFormData({
                                    ...formData,
                                    event_date: d?.toISOString() || "",
                                  })
                                  setEventDateOpen(false)
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={formData.event_time}
                            onChange={(e) =>
                              setFormData({ ...formData, event_time: e.target.value })
                            }
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Delivery Date & Time</Label>
                          <Popover open={deliveryDateOpen} onOpenChange={setDeliveryDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.delivery_date
                                  ? format(
                                    new Date(formData.delivery_date),
                                    "dd/MM/yyyy"
                                  )
                                  : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={
                                  formData.delivery_date
                                    ? new Date(formData.delivery_date)
                                    : undefined
                                }
                                onSelect={(d) => {
                                  setFormData({
                                    ...formData,
                                    delivery_date: d?.toISOString() || "",
                                  })
                                  setDeliveryDateOpen(false)
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={formData.delivery_time}
                            onChange={(e) =>
                              setFormData({ ...formData, delivery_time: e.target.value })
                            }
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Return Date & Time</Label>
                          <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.return_date
                                  ? format(new Date(formData.return_date), "dd/MM/yyyy")
                                  : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={
                                  formData.return_date
                                    ? new Date(formData.return_date)
                                    : undefined
                                }
                                onSelect={(d) => {
                                  setFormData({
                                    ...formData,
                                    return_date: d?.toISOString() || "",
                                  })
                                  setReturnDateOpen(false)
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={formData.return_time}
                            onChange={(e) =>
                              setFormData({ ...formData, return_time: e.target.value })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* Venue Address - only for rentals */}
                    {formData.booking_type === "rental" && (
                      <div>
                        <Label className="text-xs">Venue Address</Label>
                        <Textarea
                          rows={2}
                          value={formData.venue_address}
                          onChange={(e) =>
                            setFormData({ ...formData, venue_address: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Enter venue address (e.g., Grand Palace Banquet, Connaught Place, Delhi - 110001)"
                        />
                      </div>
                    )}

                    {/* Delivery Date/Time & Address - for Direct Sales */}
                    {formData.booking_type === "sale" && (
                      <>
                        {/* 🚚 Delivery Details Section */}
                        <div className="border-t pt-4 mt-4">
                          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            🚚 Delivery Details
                          </h3>

                          <div className="grid sm:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Delivery Date *</Label>
                              <Popover open={deliveryDateOpen} onOpenChange={setDeliveryDateOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.delivery_date
                                      ? format(
                                        new Date(formData.delivery_date),
                                        "dd/MM/yyyy"
                                      )
                                      : "Pick a date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={
                                      formData.delivery_date
                                        ? new Date(formData.delivery_date)
                                        : undefined
                                    }
                                    onSelect={(d) => {
                                      setFormData({
                                        ...formData,
                                        delivery_date: d?.toISOString() || "",
                                      })
                                      setDeliveryDateOpen(false)
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Delivery Time</Label>
                              <Input
                                type="time"
                                value={formData.delivery_time}
                                onChange={(e) =>
                                  setFormData({ ...formData, delivery_time: e.target.value })
                                }
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-medium">Delivery Address</Label>
                            <Textarea
                              rows={3}
                              value={formData.delivery_address}
                              onChange={(e) =>
                                setFormData({ ...formData, delivery_address: e.target.value })
                              }
                              className="mt-1"
                              placeholder="Enter delivery address with complete details (e.g., 123 Main Street, Apartment 4B, Delhi - 110001)"
                            />
                          </div>
                        </div>

                        {/* 🔧 Modifications Section */}
                        <div className="border-t pt-4 mt-4">
                          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            🔧 Modifications & Requirements
                          </h3>

                          <div className="flex items-center space-x-2 mb-4">
                            <Checkbox
                              id="hasModifications"
                              checked={formData.has_modifications}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  has_modifications: checked === true,
                                })
                              }
                            />
                            <Label htmlFor="hasModifications" className="text-sm font-medium cursor-pointer">
                              Modifications Required
                            </Label>
                          </div>

                          {formData.has_modifications && (
                            <div className="space-y-4">
                              <div>
                                <Label className="text-xs font-medium">Modification Details *</Label>
                                <Textarea
                                  rows={3}
                                  value={formData.modifications_details}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      modifications_details: e.target.value,
                                    })
                                  }
                                  className="mt-1"
                                  placeholder="Describe any modifications needed (e.g., color change, size adjustment, special embroidery, etc.)"
                                />
                              </div>

                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Modification Date *</Label>
                                  <Popover open={modificationDateOpen} onOpenChange={setModificationDateOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.modification_date
                                          ? format(
                                            new Date(formData.modification_date),
                                            "dd/MM/yyyy"
                                          )
                                          : "Pick a date"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={
                                          formData.modification_date
                                            ? new Date(formData.modification_date)
                                            : undefined
                                        }
                                        onSelect={(d) => {
                                          setFormData({
                                            ...formData,
                                            modification_date: d?.toISOString() || "",
                                          })
                                          setModificationDateOpen(false)
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">Modification Time *</Label>
                                  <Input
                                    type="time"
                                    value={formData.modification_time}
                                    onChange={(e) =>
                                      setFormData({ ...formData, modification_time: e.target.value })
                                    }
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Groom Information - Show only for rentals */}
                {formData.booking_type === "rental" && (formData.event_participant === "Groom" || formData.event_participant === "Both") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Groom Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Groom Name</Label>
                          <Input
                            value={formData.groom_name}
                            onChange={(e) =>
                              setFormData({ ...formData, groom_name: e.target.value })
                            }
                            className="mt-1"
                            placeholder="Enter groom's full name (e.g., Rajesh Kumar)"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Additional WhatsApp Number</Label>
                          <Input
                            value={formData.groom_whatsapp}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                groom_whatsapp: e.target.value,
                              })
                            }
                            className="mt-1"
                            placeholder="WhatsApp number (e.g., +91 9876543210)"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Home Address</Label>
                        <Textarea
                          rows={2}
                          value={formData.groom_address}
                          onChange={(e) =>
                            setFormData({ ...formData, groom_address: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Full address with locality and pin code"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bride Information - Show only for rentals */}
                {formData.booking_type === "rental" && (formData.event_participant === "Bride" || formData.event_participant === "Both") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Bride Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Bride Name</Label>
                          <Input
                            value={formData.bride_name}
                            onChange={(e) =>
                              setFormData({ ...formData, bride_name: e.target.value })
                            }
                            className="mt-1"
                            placeholder="Enter bride's full name (e.g., Priya Sharma)"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Additional WhatsApp Number</Label>
                          <Input
                            value={formData.bride_whatsapp}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bride_whatsapp: e.target.value,
                              })
                            }
                            className="mt-1"
                            placeholder="WhatsApp number (e.g., +91 9876543210)"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Home Address</Label>
                        <Textarea
                          rows={2}
                          value={formData.bride_address}
                          onChange={(e) =>
                            setFormData({ ...formData, bride_address: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Full address with locality and pin code"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      📝 Notes & Special Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Any special instructions or requirements (e.g., Delivery before 9 AM, color preference - golden, special care needed)"
                    />
                  </CardContent>
                </Card>

                {/* Quick Barcode Scanner - Only show for Sale type */}
                {formData.booking_type === "sale" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Quick Add by Barcode
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarcodeInput
                        onScan={async (code) => {
                          try {
                            console.log('[Barcode Scan] Starting scan:', {
                              fullBarcode: code,
                              length: code.length,
                              timestamp: new Date().toISOString(),
                              currentUser: currentUser?.email,
                              franchiseId: currentUser?.franchise_id
                            })

                            // ===== STEP 1: QUERY DEDICATED API (BEST) =====
                            // Use the dedicated barcode lookup API for reliable scanning
                            console.log('[Barcode Scan] Step 1: Querying barcode lookup API...')

                            const response = await fetch('/api/barcode/lookup', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                barcode: code,
                                franchiseId: currentUser?.franchise_id  // ✅ FIXED: Use currentUser instead of formData
                              })
                            })

                            if (response.ok) {
                              const result = await response.json()
                              console.log('[Barcode Scan] ✅ FOUND via API:', {
                                barcode: code,
                                product: result.product.name,
                                source: result.source,
                                productId: result.product.id
                              })

                              // ✅ Check for duplicates - increment quantity instead
                              const existingItem = items.find(item => item.product_id === result.product.id)
                              if (existingItem) {
                                console.log('[Barcode Scan] ⚠️ Product already in cart, incrementing quantity')
                                const updatedItems = items.map(item =>
                                  item.product_id === result.product.id
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item
                                )
                                setItems(updatedItems)
                                toast.success("Quantity increased!", {
                                  description: `${result.product.name} - Quantity: ${existingItem.quantity + 1}`,
                                  duration: 2000
                                })
                                return
                              }

                              // ✅ Defensive mapping with fallback values
                              addProduct({
                                id: result.product.id || '',
                                name: result.product.name || 'Unknown Product',
                                category: result.product.category || '',
                                category_id: result.product.category_id || undefined,
                                subcategory_id: result.product.subcategory_id || undefined,
                                rental_price: result.product.rental_price || 0,
                                sale_price: result.product.sale_price || 0,
                                security_deposit: result.product.security_deposit || 0,
                                stock_available: result.product.stock_available || 0,
                                image_url: result.product.image_url || ''
                              })

                              toast.success("Product added!", {
                                description: `${result.product.name} added to cart`,
                                duration: 2000
                              })
                              return
                            }

                            if (response.status === 404) {
                              const errorData = await response.json()
                              console.log('[Barcode Scan] ❌ Product not found via API:', {
                                barcode: code,
                                error: errorData.error
                              })
                              toast.error("Product not found", {
                                description: `No product found with barcode: ${code}`,
                                duration: 3000
                              })
                              return
                            }

                            // ===== STEP 2: FALLBACK LOCAL SEARCH =====
                            // If API fails, try local search in products array
                            console.log('[Barcode Scan] Step 2: Falling back to local product search...')

                            const foundProduct = findProductByAnyBarcode(products as any, code)

                            if (foundProduct) {
                              console.log('[Barcode Scan] ✅ Found in local products:', {
                                barcode: code,
                                product: foundProduct.name
                              })
                              addProduct(foundProduct as any)
                              toast.success("Product added!", {
                                description: `${foundProduct.name} added to cart (local)`,
                                duration: 2000
                              })
                              return
                            }

                            // ===== NOT FOUND =====
                            console.log('[Barcode Scan] ❌ Product not found in any source:', code)
                            toast.error("Product not found", {
                              description: `Barcode not found: ${code}. Try scanning again or select manually.`,
                              duration: 3000
                            })

                          } catch (error) {
                            console.error('[Barcode Scan] Error:', error)
                            toast.error("Scan error", {
                              description: `Failed to process barcode: ${error instanceof Error ? error.message : 'Unknown error'}`
                            })
                          }
                        }}
                        placeholder="Scan product barcode..."
                        debounceMs={1000}
                        digitsOnly
                        minDigits={11}
                        autoFocus={true}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Use a handheld scanner or type the 11-digit product barcode manually
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Product Selection Options - Only for rentals */}
                {formData.booking_type === "rental" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Selection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="skipProducts"
                          checked={skipProductSelection}
                          onCheckedChange={(checked) => setSkipProductSelection(checked === true)}
                        />
                        <Label htmlFor="skipProducts" className="text-sm">
                          Skip product selection for now (can be done later)
                        </Label>
                      </div>

                      {skipProductSelection ? (
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⏳ Product selection will be done later. Booking status will be "Selection Pending" until products are chosen.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            ✓ Product selection will be completed now. You can add items using barcode or product selector below.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Product Selection */}
                {(formData.booking_type === "rental" ? !skipProductSelection : true) && (
                  <ProductSelector
                    products={products}
                    categories={categories}
                    subcategories={subcategories}
                    selectedItems={items.map(item => ({
                      product_id: item.product_id,
                      quantity: item.quantity
                    }))}
                    bookingType={formData.booking_type}
                    eventDate={formData.event_date}
                    onProductSelect={addProduct}
                    onCheckAvailability={checkAvailability}
                    onOpenCustomProductDialog={() => setShowCustomProductDialog(true)}
                  />
                )}

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {items.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                        No items added yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between border-b pb-2 gap-3"
                          >
                            <div className="min-w-0">
                              <div
                                className="text-sm font-medium leading-none truncate"
                                title={it.product_name}
                              >
                                {it.product_name}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {it.category}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateQuantity(it.id, it.quantity - 1)
                                  }
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  max={it.stock_available}
                                  value={it.quantity || ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 1 : parseInt(e.target.value) || 1
                                    updateQuantity(it.id, val)
                                  }}
                                  className="w-16 h-8 text-center text-sm"
                                  autoFocus={lastAddedItemId === it.id}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateQuantity(it.id, it.quantity + 1)
                                  }
                                >
                                  +
                                </Button>
                              </div>
                              <span className="text-xs font-medium whitespace-nowrap">
                                ₹{it.total_price}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(it.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment & Discounts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method & Discounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Payment Method */}
                    <div>
                      <Label className="text-sm">Payment Method</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(v) =>
                          setFormData({ ...formData, payment_method: v })
                        }
                      >
                        <SelectTrigger className="mt-1">
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

                    {/* Deposit Amount - Only for Rental Type */}
                    {formData.booking_type === "rental" && (
                      <div>
                        <Label className="text-sm">Deposit Amount (₹) - Additional/Custom Deposit</Label>
                        <Input
                          type="number"
                          min={0}
                          value={formData.deposit_amount || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deposit_amount: e.target.value === '' ? 0 : Number(e.target.value),
                            })
                          }
                          className="mt-1"
                          placeholder="Enter deposit amount"
                        />
                        {(formData.deposit_amount || 0) > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            ✓ Deposit Amount: ₹{(formData.deposit_amount || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Custom Subtotal (before GST) */}
                    <div>
                      <Label className="text-sm">Custom Subtotal (₹) - Before GST (Optional)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.custom_subtotal || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            custom_subtotal: e.target.value === '' ? 0 : Number(e.target.value),
                          })
                        }
                        className="mt-1"
                        placeholder="Leave empty to use items total"
                      />
                      {formData.custom_subtotal > 0 && (
                        <p className="text-xs text-purple-600 mt-1">
                          ✓ Custom Subtotal: ₹{(formData.custom_subtotal || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Discount */}
                    <div>
                      <Label className="text-sm">Discount Amount (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.discount_amount || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_amount: e.target.value === '' ? 0 : Number(e.target.value),
                          })
                        }
                        className="mt-1"
                        placeholder="Enter discount amount"
                      />
                      {formData.discount_amount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Discount: ₹{formData.discount_amount.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Coupon Code */}
                    <div>
                      <Label className="text-sm">Coupon Code (Optional)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="text"
                          value={formData.coupon_code}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              coupon_code: e.target.value.toUpperCase(),
                            })
                            setCouponError("")
                          }}
                          placeholder="Enter coupon code"
                          maxLength={50}
                          disabled={formData.coupon_discount > 0}
                        />
                        {formData.coupon_discount > 0 ? (
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
                            disabled={couponValidating || !formData.coupon_code.trim()}
                            className="whitespace-nowrap"
                          >
                            {couponValidating ? "Validating..." : "Apply"}
                          </Button>
                        )}
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-600 mt-1">{couponError}</p>
                      )}
                      {formData.coupon_discount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Coupon Applied: -₹{formData.coupon_discount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Totals */}
                <Card>
                  <CardHeader>
                    <CardTitle>💰 Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {/* Items Subtotal */}
                    <div className="flex justify-between">
                      <span>{formData.custom_subtotal > 0 ? 'Custom Subtotal' : 'Items Subtotal'}</span>
                      <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {formData.custom_subtotal > 0 && items.length > 0 && (
                      <div className="text-[11px] text-purple-600 -mt-1">
                        (Actual items total: ₹{items.reduce((s, i) => s + i.total_price, 0).toFixed(2)})
                      </div>
                    )}

                    {/* Manual Discount */}
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount (40%)</span>
                        <span className="font-medium">-₹{totals.discount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Coupon Discount */}
                    {totals.couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon ({formData.coupon_code})</span>
                        <span className="font-medium">-₹{totals.couponDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* After Discounts */}
                    {totals.totalDiscount > 0 && (
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>After Discounts</span>
                        <span>₹{totals.subtotalAfterDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* GST */}
                    <div className="flex justify-between">
                      <span>GST (5%)</span>
                      <span className="font-medium">₹{totals.gst.toFixed(2)}</span>
                    </div>

                    {/* Grand Total */}
                    <div className="flex justify-between font-bold text-base border-t pt-2 bg-green-50 p-2 rounded">
                      <span>Grand Total</span>
                      <span className="text-green-700 text-lg">₹{totals.grand.toFixed(2)}</span>
                    </div>

                    {/* Security Deposit for Rentals */}
                    {formData.booking_type === "rental" && totals.deposit > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm bg-blue-50 p-2 rounded border border-blue-200">
                          <span className="flex items-center gap-1">
                            <span>� Security Deposit Amount</span>
                          </span>
                          <span className="font-medium text-blue-700">₹{totals.deposit.toFixed(2)}</span>
                        </div>
                        {/* From products breakdown removed - using only custom deposit */}
                      </div>
                    )}

                    {/* Payment Breakdown */}
                    {formData.payment_type !== "full" && (
                      <div className="pt-2 mt-2 border-t space-y-2">
                        <h4 className="font-semibold text-xs text-gray-600">Payment Breakdown</h4>
                        <div className="flex justify-between text-sm bg-orange-50 p-2 rounded">
                          <span>💳 Payable Now{formData.booking_type === "rental" ? " (incl. deposit)" : ""}:</span>
                          <span className="font-bold text-orange-700">₹{(totals.payable + (formData.booking_type === "rental" ? totals.deposit : 0)).toFixed(2)}</span>
                        </div>
                        {formData.booking_type === "rental" && totals.deposit > 0 && (
                          <div className="text-[11px] text-gray-600 -mt-1">
                            Includes refundable deposit of ₹{totals.deposit.toFixed(2)} collected now
                          </div>
                        )}
                        <div className="flex justify-between text-sm bg-yellow-50 p-2 rounded">
                          <span>⏳ Remaining:</span>
                          <span className="font-medium text-yellow-700">₹{totals.remaining.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>💳 Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {formData.booking_type === "sale" ? (
                      /* For Sale - Only show Total Payment */
                      <div className="flex justify-between text-base bg-green-50 p-3 rounded border border-green-200">
                        <span className="font-medium">💰 Total Payment:</span>
                        <span className="font-bold text-green-700 text-lg">₹{totals.grand.toFixed(2)}</span>
                      </div>
                    ) : (
                      /* For Rental - Show Payable Now, Remaining, and Refundable */
                      <>
                        {/* Payable Now */}
                        <div className="flex justify-between text-base bg-green-50 p-3 rounded border border-green-200">
                          <span className="font-medium">💰 Payable Now:</span>
                          <span className="font-bold text-green-700 text-lg">
                            ₹{(totals.payable + totals.deposit).toFixed(2)}
                          </span>
                        </div>

                        {/* Remaining Amount */}
                        <div className="flex justify-between text-base bg-orange-50 p-3 rounded border border-orange-200">
                          <span className="font-medium">⏳ Remaining Amount:</span>
                          <span className="font-bold text-orange-700 text-lg">₹{totals.remaining.toFixed(2)}</span>
                        </div>

                        {/* Security Deposit Amount */}
                        {totals.deposit > 0 && (
                          <div className="flex justify-between text-base bg-blue-50 p-3 rounded border border-blue-200">
                            <span className="font-medium">� Security Deposit:</span>
                            <span className="font-bold text-blue-700 text-lg">₹{totals.deposit.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Sales Closed By */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Sales Closed By</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {staffMembers.map(staff => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role === 'franchise_admin' ? 'Admin' : 'Staff'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-500">Track which team member closed this sale for incentives</p>
                  </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className={`grid gap-4 ${formData.booking_type === "sale" ? "grid-cols-1" : "grid-cols-2"}`}>
                  {/* Create Quote button - only show for rentals */}
                  {formData.booking_type === "rental" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={loading}
                      onClick={() => handleSubmit(true)}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        isEditMode ? "Update Quote" : "Create Quote for Now"
                      )}
                    </Button>
                  )}
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleSubmit(false)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      isEditMode ? "Update Order" : "Create Order"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Customer Dialog */}
      <CustomerFormDialog
        open={showNewCustomer}
        onOpenChange={setShowNewCustomer}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* Custom Product Dialog */}
      <Dialog open={showCustomProductDialog} onOpenChange={setShowCustomProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                placeholder="Enter product name"
                value={customProductData.name}
                onChange={(e) => setCustomProductData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                value={customProductData.category_id}
                onChange={(e) => setCustomProductData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Rental/Sale Price * (₹)</label>
              <Input
                type="number"
                placeholder="Enter price"
                value={customProductData.rental_price}
                onChange={(e) => setCustomProductData(prev => ({ ...prev, rental_price: e.target.value }))}
                className="mt-1"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Product Image (optional)</label>

              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={openCamera}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>

                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setCustomProductData(prev => ({ ...prev, image_url: reader.result as string }))
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Choose Image</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-xs text-gray-500">or paste URL</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <Input
                placeholder="https://example.com/image.jpg"
                value={customProductData.image_url}
                onChange={(e) => setCustomProductData(prev => ({ ...prev, image_url: e.target.value }))}
              />

              {customProductData.image_url && (
                <div className="mt-2 border rounded-md overflow-hidden relative">
                  <img
                    src={customProductData.image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-product.png'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomProductData(prev => ({ ...prev, image_url: '' }))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomProductDialog(false)
                  setCustomProductData({ name: '', category_id: '', image_url: '', rental_price: '' })
                }}
                disabled={creatingProduct}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomProduct}
                disabled={creatingProduct || !customProductData.name.trim() || !customProductData.category_id || !customProductData.rental_price || parseFloat(customProductData.rental_price) <= 0}
              >
                {creatingProduct ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Take Photo</span>
              <Badge variant="outline" className="text-xs">
                {cameraFacing === 'user' ? '📷 Front Camera' : '📷 Back Camera'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '60vh' }}
            />
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={switchCamera}
                title="Switch Camera"
              >
                🔄 Switch Camera
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeCamera}>
                  Cancel
                </Button>
                <Button onClick={capturePhoto}>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Availability Modal */}
      {availabilityModalFor && (
        <Dialog open={true} onOpenChange={() => setAvailabilityModalFor(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Availability for {availabilityModalFor.name}</DialogTitle>
            </DialogHeader>
            <div className="text-sm space-y-2">
              <div className="text-xs text-gray-600">
                Checking 5-day window around event date.
                {formData.event_date && (
                  <span className="block mt-1">
                    {new Date(new Date(formData.event_date).setDate(new Date(formData.event_date).getDate() - 2)).toLocaleDateString()} → {new Date(new Date(formData.event_date).setDate(new Date(formData.event_date).getDate() + 2)).toLocaleDateString()}
                  </span>
                )}
              </div>
              {availabilityLoading ? (
                <div className="text-sm">Loading...</div>
              ) : availabilityRows.length === 0 ? (
                <div className="text-sm text-green-700">Great choice! No bookings in the last/next 2 days. You can select this product.</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {availabilityRows.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-[12px] flex-wrap bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{new Date(r.date).toLocaleDateString()} • {r.kind === 'order' ? 'Order' : 'Package'} {r.ref || ''}</span>
                        <span className="font-medium">×{r.qty}</span>

                        {/* Return Status Badges */}
                        {r.returnStatus === 'returned' && (
                          <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1.5 py-0 h-4">
                            Returned
                          </Badge>
                        )}
                        {r.returnStatus === 'in_progress' && (
                          <>
                            <Badge variant="secondary" className="bg-orange-500 text-white text-[10px] px-1.5 py-0 h-4">
                              In Progress
                            </Badge>
                            {r.returnDate && (
                              <span className="text-[10px] text-orange-600 font-medium">
                                Return: {new Date(r.returnDate).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            )}
                          </>
                        )}

                        {/* Debug: Show if no barcode data */}
                        {!r.returnStatus && (
                          <span className="text-[9px] text-gray-400 italic">No tracking</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setAvailabilityModalFor(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
