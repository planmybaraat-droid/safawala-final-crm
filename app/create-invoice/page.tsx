"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { sendInvoiceViaWhatsApp } from "@/lib/send-invoice-whatsapp"
import { triggerPDFGeneration } from "@/lib/generate-pdf-helper"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Download,
  Save,
  Printer,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Package,
  AlertTriangle,
  Check,
  Loader2,
  Send,
  X,
  Minus,
  Tag,
  FileCheck,
  Camera,
  ImageIcon,
  Lock,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import Link from "next/link"
import { ProductSelector } from "@/components/products/product-selector"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { supabase as supabaseClient } from "@/lib/supabase"
import { fetchProductsWithBarcodes } from "@/lib/product-barcode-service"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BookingWorkflowStepper } from "@/components/shared"
import { cn } from "@/lib/utils"
import { DashboardLayout } from "@/components/layout/dashboard-layout"


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
  barcode?: string
  product_code?: string
  category?: string
  category_id?: string
  subcategory_id?: string
  image_url?: string
  rental_price: number
  sale_price?: number
  security_deposit: number
  stock_available: number
  all_barcode_numbers?: string[]
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
}

interface InvoiceItem {
  id: string
  product_id: string
  product_name: string
  barcode?: string
  category?: string
  image_url?: string
  quantity: number
  unit_price: number
  total_price: number
  is_damaged?: boolean
  damage_charge?: number
  is_lost?: boolean
  lost_charge?: number
}

interface LostDamagedItem {
  id: string
  product_id: string
  product_name: string
  barcode?: string
  type: "lost" | "damaged"
  quantity: number
  charge_per_item: number
  total_charge: number
  notes?: string
}

// Helper function to safely parse dates from database to yyyy-MM-dd format for HTML date inputs
const formatDateForInput = (dateValue: string | null | undefined): string => {
  if (!dateValue) return ""
  try {
    // Handle various date formats from database
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return ""
    // Return yyyy-MM-dd format for HTML date input
    return date.toISOString().split('T')[0]
  } catch {
    return ""
  }
}

// Helper to convert HH:mm to 12-hour AM/PM format
const formatTime12h = (time: string): string => {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`
}

// Helper function to safely parse time from database timestamp
const formatTimeForInput = (dateValue: string | null | undefined, existingTime?: string): string => {
  if (existingTime) return existingTime
  if (!dateValue) return ""
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return ""
    // Extract HH:mm from the timestamp
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return ""
  }
}

const DEFAULT_LOGO_URL = 'https://xplnyaxkusvuajtmorss.supabase.co/storage/v1/object/public/settings-uploads/1a518dde-85b7-44ef-8bc4-092f53ddfd99/logo-1761570887109.png'

import { useI18n } from "@/lib/i18n-context"

export default function CreateInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const autoPrintTriggeredRef = useRef(false)
  const supabase = createClient()
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  // Mode: 'new' | 'edit' | 'quote' | 'final-bill'
  const mode = searchParams.get("mode") || "new"
  const orderId = searchParams.get("id")
  // pdfToken: when present and valid, skip auth check (used by WhatsApp PDF generation)
  const pdfToken = searchParams.get("pdfToken")

  // Gate: must select Rental or Sale before form unlocks (skip for edits/pdf views)
  const [typeSelected, setTypeSelected] = useState(mode !== "new" || !!pdfToken)
  const [bookingStep, setBookingStep] = useState(1)
  const bookingSteps = [
    { number: 1, label: "Customer & Event", caption: "Booking information" },
    { number: 2, label: "Products & Services", caption: "Add items" },
    { number: 3, label: "Review & Payment", caption: "Confirm booking" },
  ]

  const goToBookingStep = (step: number) => {
    setBookingStep(Math.max(1, Math.min(3, step)))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const canContinueFromStep = () => {
    if (bookingStep === 1 && !selectedCustomer) return false
    if (bookingStep === 2 && invoiceItems.length === 0) return false
    return true
  }

  const handleTypeSelect = (type: "rental" | "sale") => {
    setInvoiceData(prev => ({ ...prev, invoice_type: type }))
    setTypeSelected(true)
  }
  const qCustomerName = searchParams.get("customerName")
  const qCustomerPhone = searchParams.get("customerPhone")
  const qCustomerEmail = searchParams.get("customerEmail")
  const qCustomerId = searchParams.get("customerId")

  // Company Settings for PDF
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [primaryBank, setPrimaryBank] = useState<any>(null)
  const [bankQrDataUrl, setBankQrDataUrl] = useState<string>("")

  // Franchise ID for data isolation
  const [franchiseId, setFranchiseId] = useState<string | null>(null)

  // Current user permissions
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userPermissions, setUserPermissions] = useState<any>(null)

  // State
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [lostDamagedProductSearch, setLostDamagedProductSearch] = useState<string | null>(null) // ID of item being searched
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [subcategories, setSubcategories] = useState<Array<{id: string, name: string, parent_id: string}>>([])
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false)
  const [customProductData, setCustomProductData] = useState({ name: '', category_id: '', image_url: '', price: '' })
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [skipProductSelection, setSkipProductSelection] = useState(false)
  const [useCustomPackagePrice, setUseCustomPackagePrice] = useState(false)
  const [customPackagePrice, setCustomPackagePrice] = useState(0)
  const [isDepositRefunded, setIsDepositRefunded] = useState(false)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [modificationDateOpen, setModificationDateOpen] = useState(false)
  const [deliveryDateOpen, setDeliveryDateOpen] = useState(false)
  
  // Selection Mode: "products" = individual products, "package" = package with products inside
  const [selectionMode, setSelectionMode] = useState<"products" | "package">("products")
  
  // Package Selection State
  const [packages, setPackages] = useState<any[]>([])
  const [packagesCategories, setPackagesCategories] = useState<any[]>([])
  const [selectedPackageCategory, setSelectedPackageCategory] = useState<string>("")
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null)
  const [selectedPackageVariant, setSelectedPackageVariant] = useState<any | null>(null)
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [bypassSafaLimit, setBypassSafaLimit] = useState(false)
  const [safaLimit, setSafaLimit] = useState<number | null>(null)
  const [sendWhatsAppInvoice, setSendWhatsAppInvoice] = useState(true)
  const [applyGst, setApplyGst] = useState(false)

  // Send-as-quote dialog: lets the user confirm/edit which numbers get the WhatsApp quote
  const [showSendQuoteDialog, setShowSendQuoteDialog] = useState(false)
  const [quotePhoneNumbers, setQuotePhoneNumbers] = useState<string[]>([""])

  // Leads selection and conversion states
  const [customerMode, setCustomerMode] = useState<"customer" | "lead">("customer")
  const [leads, setLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadSearch, setLeadSearch] = useState("")
  const [selectedLeadToConvert, setSelectedLeadToConvert] = useState<any | null>(null)
  const [convertingLead, setConvertingLead] = useState(false)

  // Modification Form States
  const [modService, setModService] = useState<string>("")
  const [modCost, setModCost] = useState<number>(0)
  const [customModService, setCustomModService] = useState<string>("")
  const [headSize, setHeadSize] = useState<string>("")

  // Invoice Data
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingOrderCustomerId, setEditingOrderCustomerId] = useState<string | null>(null)
  const [editingQuote, setEditingQuote] = useState(false) // Track if editing a quote (for "Convert to Booking" button)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [extraItems, setExtraItems] = useState<InvoiceItem[]>([])
  const [lostDamagedItems, setLostDamagedItems] = useState<LostDamagedItem[]>([])
  const [showLostDamaged, setShowLostDamaged] = useState(false)
  
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    invoice_type: "rental" as "rental" | "sale",
    event_type: "wedding" as "wedding" | "engagement" | "reception" | "other",
    event_participant: "both" as "both" | "groom" | "bride",
    event_date: "",
    event_time: "",
    delivery_date: "",
    delivery_time: "",
    return_date: "",
    return_time: "",
    venue_address: "",
    groom_name: "",
    groom_whatsapp: "",
    groom_address: "",
    bride_name: "",
    bride_whatsapp: "",
    bride_address: "",
    payment_method: "Cash / Offline Payment" as "UPI / QR Payment" | "Bank Transfer" | "Debit / Credit Card" | "Cash / Offline Payment" | "International Payment",
    amount_paid: 0,
    security_deposit: 0,
    gst_percentage: 5,
    discount_amount: 0,
    discount_type: "fixed" as "fixed" | "percentage",
    coupon_code: "",
    coupon_discount: 0,
    sales_closed_by_id: "",
    notes: "",
    // Modification fields (for direct sales)
    has_modifications: false,
    modifications_details: "",
    modification_date: "",
    modification_time: "10:00",
  })

  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "+91",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })

  // Load the logged-in user so the invoice/quote can show a "Billed by" byline.
  // Runs regardless of mode (new or edit) — loadNextInvoiceNumber only fires for new invoices.
  useEffect(() => {
    if (pdfToken) return // Skip when rendering via PDF token (Puppeteer)
    fetch('/api/auth/user', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(user => {
        if (user) setCurrentUser((prev: any) => prev || user)
      })
      .catch(err => console.error('[CreateInvoice] Failed to load current user:', err))
  }, [pdfToken])

  // Pre-select an existing customer when arriving via ?customerId= (e.g. "same customer, new booking")
  useEffect(() => {
    if (mode !== "new" || !qCustomerId || pdfToken) return
    fetch(`/api/customers/${qCustomerId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json?.data) setSelectedCustomer(json.data)
      })
      .catch(err => console.error('[CreateInvoice] Failed to load customer from customerId:', err))
  }, [mode, qCustomerId, pdfToken])

  // Generate invoice number based on stored sequences
  useEffect(() => {
    if (mode === "new" && !invoiceData.invoice_number) {
      loadNextInvoiceNumber()
    }
  }, [mode])

  // Reload invoice number when invoice type changes (rental vs sales)
  useEffect(() => {
    if (mode === "new") {
      loadNextInvoiceNumber()
    }
  }, [invoiceData.invoice_type])

  // Load next invoice number from sequence
  const loadNextInvoiceNumber = async () => {
    try {
      // Skip auth API when rendering via PDF token (Puppeteer)
      if (pdfToken) return
      // Get current user to get franchise_id and permissions
      const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
      const user = userRes.ok ? await userRes.json() : null
      if (user) {
        setCurrentUser(user)
        setUserPermissions(user.permissions || {})
        
        // Auto-select current user as Sales Staff when creating new invoice
        if (mode === "new") {
          setInvoiceData(prev => ({
            ...prev,
            sales_closed_by_id: user.id
          }))
        }
      }
      const userFranchiseId = user?.franchise_id
      setFranchiseId(userFranchiseId) // Store in state for later use
      if (!userFranchiseId) {
        const defaultNum = invoiceData.invoice_type === 'sale' ? 'ORD-2026001' : 'INV-2026001'
        setInvoiceData(prev => ({
          ...prev,
          invoice_number: defaultNum
        }))
        return
      }

      const response = await fetch(`/api/invoice-sequences?franchise_id=${userFranchiseId}&type=${invoiceData.invoice_type}`, {
        cache: "no-store"
      })

      if (!response.ok) {
        const defaultNum = invoiceData.invoice_type === 'sale' ? 'ORD-2026001' : 'INV-2026001'
        setInvoiceData(prev => ({
          ...prev,
          invoice_number: defaultNum
        }))
        return
      }

      const data = await response.json()
      const nextNum = data.next_invoice_number || (invoiceData.invoice_type === 'sale' ? 'ORD-2026001' : 'INV-2026001')
      setInvoiceData(prev => ({
        ...prev,
        invoice_number: nextNum
      }))
    } catch (error) {
      console.error("[LoadNextInvoice] Error loading next invoice number:", error)
      setInvoiceData(prev => ({
        ...prev,
        invoice_number: "ORD-2026001"
      }))
    }
  }

  // Load customers and products (skip non-essential loads when rendering PDF via token)
  useEffect(() => {
    if (!pdfToken) {
      loadCustomers()
      loadProductsAndCategories()
      loadStaffMembers()
      loadLeads()
    }
    loadCompanySettings()
  }, [])

  // Load company settings for PDF header
  const loadCompanySettings = async (forcedFranchiseId?: string | null) => {
    try {
      let userFranchiseId: string | null = forcedFranchiseId || null
      if (!userFranchiseId && !pdfToken) {
        const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
        const user = userRes.ok ? await userRes.json() : null
        userFranchiseId = user?.franchise_id
      }

      let apiUrl = '/api/settings/all'
      if (userFranchiseId) {
        apiUrl += `?franchise_id=${encodeURIComponent(userFranchiseId)}`
      }
      
      const response = await fetch(apiUrl, { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        setCompanySettings(data.merged || data.company)
      }

      // Load primary bank account for invoice from banking_details table
      try {
        if (userFranchiseId) {
          const bankRes = await fetch(`/api/settings/banking?franchise_id=${userFranchiseId}`, { cache: "no-store" })
          if (bankRes.ok) {
            const bankData = await bankRes.json()
            const banks = bankData.data || []
            // Prefer primary + show_on_invoice, fallback to just primary, then first
            const bank = banks.find((b: any) => b.is_primary && b.show_on_invoice)
              || banks.find((b: any) => b.is_primary)
              || banks[0]
            if (bank) {
              setPrimaryBank(bank)
              // Fetch QR image and convert to base64 so it renders in print
              if (bank.qr_file_path) {
                try {
                  const imgRes = await fetch(bank.qr_file_path)
                  const blob = await imgRes.blob()
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    if (reader.result) setBankQrDataUrl(reader.result as string)
                  }
                  reader.readAsDataURL(blob)
                } catch (e) {
                  // fallback: use URL directly
                  setBankQrDataUrl(bank.qr_file_path)
                  console.warn("[CreateInvoice] QR preload failed, using URL:", e)
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("[CreateInvoice] Failed to load bank details:", e)
      }
    } catch (error) {
      console.error("[CreateInvoice] Failed to load company settings:", error)
    }
  }

  // Load existing order if editing
  useEffect(() => {
    if (orderId && mode !== "new") {
      loadExistingOrder(orderId)
    }
  }, [orderId, mode])

  // Auto-select customer from customers list when editing
  useEffect(() => {
    if (editingOrderCustomerId && customers.length > 0 && !selectedCustomer) {
      const matchingCustomer = customers.find(c => c.id === editingOrderCustomerId)
      if (matchingCustomer) {
        setSelectedCustomer(matchingCustomer)
      } else {
        console.warn("[EditOrder] Customer not found in list:", editingOrderCustomerId)
      }
    }
  }, [editingOrderCustomerId, customers])

  const loadCustomers = async () => {
    setCustomersLoading(true)
    try {
      // Try without basic=1 first (respects permissions)
      let response = await fetch("/api/customers", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      })

      // If 403 (permission denied), try with basic=1
      if (response.status === 403) {
        response = await fetch("/api/customers?basic=1", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        })
      }

      if (!response.ok) {
        console.error("[CreateInvoice] Failed to fetch customers:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("[CreateInvoice] Error response:", errorText)
        setCustomers([])
        return
      }

      const result = await response.json()
      // Handle multiple response formats
      let data = []
      if (result?.data && Array.isArray(result.data)) {
        data = result.data
      } else if (Array.isArray(result)) {
        data = result
      }
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[CreateInvoice] Error loading customers:", error)
      setCustomers([])
    } finally {
      setCustomersLoading(false)
    }
  }

  const loadLeads = async () => {
    setLeadsLoading(true)
    try {
      const response = await fetch("/api/leads", {
        cache: "no-store",
        credentials: "include",
      })
      if (response.ok) {
        const json = await response.json()
        const activeLeads = (json.data || []).filter((l: any) => l.status !== "converted")
        setLeads(activeLeads)
      }
    } catch (e) {
      console.error("Failed to load leads:", e)
    } finally {
      setLeadsLoading(false)
    }
  }

  const handleConvertLead = async (lead: any) => {
    setConvertingLead(true)
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: "converted" }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to convert lead")
      }
      
      const resData = await response.json()
      if (!resData.success) {
        throw new Error(resData.error || "Failed to convert lead")
      }

      toast({
        title: "Lead Converted",
        description: `Successfully converted "${lead.name}" to Customer.`,
        variant: "default",
      })

      // Reload lists
      await Promise.all([loadCustomers(), loadLeads()])

      // Find the new customer (preferring the one returned from the API response)
      let newCust = resData.customer
      
      if (!newCust) {
        const cleanPhone = lead.phone?.trim()
        // Fallback: Query database directly to bypass API caches and guarantee retrieve
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: directCustData } = await supabaseClient
          .from("customers")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle()

        newCust = directCustData
        if (!newCust) {
          const { data: directCustByLead } = await supabaseClient
            .from("customers")
            .select("*")
            .eq("lead_id", lead.id)
            .maybeSingle()
          newCust = directCustByLead
        }
      }

      if (newCust) {
        // Add to local state so it appears in the dropdown list
        setCustomers((prev) => {
          if (prev.some(c => c.id === newCust.id)) return prev
          return [newCust as any, ...prev]
        })
        setSelectedCustomer(newCust as any)
        setCustomerMode("customer") // Switch tab to customer to show the active profile
        
        // Pre-fill invoice data
        setInvoiceData((prev: any) => {
          const next = { ...prev }
          if (lead.event_date) {
            next.event_date = formatDateForInput(lead.event_date)
            next.delivery_date = formatDateForInput(lead.event_date)
          }
          if (lead.location) {
            next.venue_address = lead.location
          }
          if (lead.name) {
            next.groom_name = lead.name
          }
          return next
        })

        toast({
          title: "Customer Selected",
          description: `Successfully converted "${newCust.name}" and auto-selected them.`,
          variant: "default",
        })
      } else {
        toast({
          title: "Customer Created",
          description: "Profile created, please search and select manually in the Customers tab.",
          variant: "default",
        })
      }
      setSelectedLeadToConvert(null)
    } catch (error: any) {
      console.error("Conversion error:", error)
      toast({
        title: "Conversion Failed",
        description: error.message || "Something went wrong during lead conversion.",
        variant: "default",
      })
    } finally {
      setConvertingLead(false)
    }
  }

  const loadProductsAndCategories = async () => {
    try {
      // Get current user to get franchise_id
      const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
      const user = userRes.ok ? await userRes.json() : null
      const franchiseId = user?.franchise_id

      // Fetch products with barcodes (same as create-product-order)
      const productsWithBarcodes = await fetchProductsWithBarcodes(franchiseId)
      
      // Fetch all categories to map category_id to name
      const { data: categoriesData } = await supabaseClient
        .from('product_categories')
        .select('*')

      const categoryMap: { [key: string]: string } = {}
      if (categoriesData) {
        categoriesData.forEach((c: any) => {
          categoryMap[c.id] = c.name
        })
      }
      
      // Map to Product interface, including category name
      const mappedProducts = productsWithBarcodes.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category_id ? (categoryMap[p.category_id] || '') : '', // Lookup category name from category_id
        category_id: p.category_id,
        subcategory_id: undefined,
        rental_price: p.rental_price || 0,
        sale_price: (p as any).price || (p as any).sale_price || 0,
        security_deposit: p.security_deposit || 0,
        stock_available: p.stock_available || 0,
        image_url: (p as any).image_url || undefined,
        barcode: (p as any).barcode || (p as any).barcode_number || null || undefined,
        product_code: p.product_code || undefined,
        all_barcode_numbers: p.all_barcode_numbers || []
      }))

      setProducts(mappedProducts)
      // Set categories
      if (categoriesData) {
        const mainCats = categoriesData.filter((c: any) => !c.parent_id) || []
        const subCats = categoriesData.filter((c: any) => c.parent_id) || []
        setCategories(mainCats.map((c: any) => ({ id: c.id, name: c.name })))
        setSubcategories(subCats.map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_id })))
      }
    } catch (error) {
      console.error("[CreateInvoice] Error loading products and categories:", error)
    }
  }

  // Load packages for package selection mode (using same APIs as book-package)
  const loadPackages = async () => {
    setPackagesLoading(true)
    try {
      // Get current user to get franchise_id
      const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
      const user = userRes.ok ? await userRes.json() : null
      const franchiseId = user?.franchise_id
      
      // Fetch categories and variants using the same APIs as book-package
      const [catResponse, variantResponse] = await Promise.all([
        fetch('/api/packages/categories', { cache: 'no-store' }),
        fetch('/api/packages/variants', { cache: 'no-store' }),
      ])

      // Process variants first to know which categories have packages for this franchise
      let filteredVariants: any[] = []
      const categoryIdsWithPackages = new Set<string>()
      
      if (variantResponse.ok) {
        const variantJson = await variantResponse.json()
        filteredVariants = variantJson?.data || []
        
        // Collect category IDs that have variants for this franchise
        filteredVariants.forEach((variant: any) => {
          if (variant.category_id) {
            categoryIdsWithPackages.add(variant.category_id)
          }
        })
        
        if (filteredVariants.length === 0) {
        }
      } else {
        console.error("[CreateInvoice] Error loading package variants:", variantResponse.status)
        const errText = await variantResponse.text().catch(() => "")
        console.error("[CreateInvoice] Response:", errText)
      }

      // Process categories - filter to only show categories that have packages for this franchise
      if (catResponse.ok) {
        const catJson = await catResponse.json()
        const allCategories = catJson?.data || []
        
        // Only keep categories that have packages/variants for this franchise
        const filteredCategories = allCategories.filter((cat: any) => 
          categoryIdsWithPackages.has(cat.id)
        )
        
        setPackagesCategories(filteredCategories)
      } else {
        console.error("[CreateInvoice] Error loading package categories:", catResponse.status)
      }
      
      // Set the packages/variants
      setPackages(filteredVariants)
    } catch (error) {
      console.error("[CreateInvoice] Error loading packages:", error)
    } finally {
      setPackagesLoading(false)
    }
  }

  // Load packages when selection mode changes to "package" and for rentals
  useEffect(() => {
    if (selectionMode === "package" && invoiceData.invoice_type === "rental") {
      loadPackages()
    }
  }, [selectionMode, invoiceData.invoice_type])

  // Create custom product
  const handleCreateCustomProduct = async () => {
    if (!customProductData.name.trim()) {
      toast({ title: "Error", description: "Product name is required", variant: "destructive" })
      return
    }
    if (!customProductData.category_id) {
      toast({ title: "Error", description: "Please select a category", variant: "destructive" })
      return
    }
    if (!customProductData.price || parseFloat(customProductData.price) <= 0) {
      toast({ title: "Error", description: "Please enter a valid price", variant: "destructive" })
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
          
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('product-images')
            .upload(fileName, blob, {
              contentType: blob.type,
              cacheControl: '3600',
              upsert: true
            })
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName)
          
          imageUrl = publicUrl
        } catch (uploadError: any) {
          console.error('Image upload failed:', uploadError)
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

      const priceValue = parseFloat(customProductData.price) || 0

      const basePayload: any = {
        name: customProductData.name.trim(),
        category_id: customProductData.category_id,
        image_url: imageUrl || null,
        rental_price: priceValue,
        sale_price: priceValue,
        price: priceValue,
        security_deposit: 0,
        stock_available: 100,
        is_active: true,
        product_code: productCode,
        description: 'Custom product',
        franchise_id: createdByFranchiseId
      }

      const { data: product, error } = await supabaseClient
        .from('products')
        .insert(basePayload)
        .select()
        .single()
      
      if (error) throw error
      
      // Add to products list and immediately add to invoice
      setProducts(prev => [...prev, product as any])
      addProduct(product as Product)
      
      toast({ title: "Success", description: `Product "${product.name}" created and added!` })
      
      setCustomProductData({ name: '', category_id: '', image_url: '', price: '' })
      setShowCustomProductDialog(false)
    } catch (e: any) {
      console.error('Failed to create product:', e)
      toast({ title: "Error", description: e.message || "Failed to create product", variant: "destructive" })
    } finally {
      setCreatingProduct(false)
    }
  }

  const loadStaffMembers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, name, email, role")
      .in("role", ["admin", "staff", "manager"])
      .order("name")
    if (data) setStaffMembers(data)
  }

  const loadExistingOrder = async (id: string) => {
    setLoading(true)
    try {
      // Fetch order first (without joins that might fail)
      const { data: order, error: orderError } = await supabase
        .from("product_orders")
        .select("*")
        .eq("id", id)
        .single()

      if (orderError) {
        console.error("[EditOrder] Error fetching order:", orderError)
        toast({ title: "Error", description: `Failed to load order: ${orderError.message}`, variant: "destructive" })
        setLoading(false)
        return
      }

      if (!order) {
        console.error("[EditOrder] Order not found:", id)
        toast({ title: "Error", description: "Order not found", variant: "destructive" })
        setLoading(false)
        return
      }

      // Fetch customer ID for later matching
      let customerId = order.customer_id

      // Fetch order items separately (now with denormalized product details)
      const { data: orderItems, error: itemsError } = await supabase
        .from("product_order_items")
        .select("*")  // Get all columns including denormalized: product_name, barcode, category, image_url
        .eq("order_id", order.id)

      if (itemsError) {
        console.warn("[EditOrder] Could not load items:", itemsError)
      }

      // Auto-set customer from customers list (wait for it to load)
      // We'll set a flag and match it in the effect below
      if (customerId) {
        // Store the customer ID to match later
        setEditingOrderCustomerId(customerId)
        // Proactively fetch customer details directly (essential when pdfToken bypasses loadCustomers)
        try {
          const { data: directCust, error: custError } = await supabase
            .from("customers")
            .select("*")
          .eq("id", customerId)
          .single()
          if (directCust) {
            setSelectedCustomer(directCust)
          } else if (custError) {
            console.warn("[EditOrder] Error loading customer directly:", custError)
          }
        } catch (e) {
          console.error("[EditOrder] Failed loading customer directly:", e)
        }
      }

      // Load company settings and banking using order's franchise_id
      if (order.franchise_id) {
        loadCompanySettings(order.franchise_id)
      }
      
      // Clean notes - remove legacy [PACKAGE: ...] prefix if present
      let cleanedNotes = order.notes || ""
      if (cleanedNotes.includes('[PACKAGE:')) {
        cleanedNotes = cleanedNotes.replace(/\[PACKAGE:[^\]]+\]\n?/, '').trim()
      }
        
      // Auto-fill all invoice data from existing order
      setInvoiceData({
        invoice_number: order.order_number || "",
        invoice_date: order.invoice_date ? formatDateForInput(order.invoice_date) : (order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : format(new Date(), "yyyy-MM-dd")),
        invoice_type: order.booking_type || "rental",
        event_type: order.event_type || "wedding",
        event_participant: order.event_participant || "both",
        event_date: formatDateForInput(order.event_date),
        event_time: order.event_time || formatTimeForInput(order.event_date),
        delivery_date: formatDateForInput(order.delivery_date),
        delivery_time: order.delivery_time || formatTimeForInput(order.delivery_date),
        return_date: formatDateForInput(order.return_date),
        return_time: order.return_time || formatTimeForInput(order.return_date),
        venue_address: order.venue_address || "",
        groom_name: order.groom_name || "",
        groom_whatsapp: order.groom_whatsapp || "",
        groom_address: order.groom_address || "",
        bride_name: order.bride_name || "",
        bride_whatsapp: order.bride_whatsapp || "",
        bride_address: order.bride_address || "",
        payment_method: order.payment_method || "Cash / Offline Payment",
        amount_paid: order.amount_paid || 0,
        security_deposit: order.security_deposit || 0,
        gst_percentage: order.gst_percentage || 5,
        discount_amount: order.discount_amount || 0,
        discount_type: order.discount_type || "fixed", // NEW: Load discount type
        coupon_code: order.coupon_code || "",
        coupon_discount: order.coupon_discount || 0,
        sales_closed_by_id: order.sales_closed_by_id || "",
        notes: cleanedNotes,
        // Modification fields
        has_modifications: order.has_modifications || false,
        modifications_details: order.modifications_details || "",
        modification_date: order.modification_date ? new Date(order.modification_date).toISOString() : "",
        modification_time: order.modification_date ? format(new Date(order.modification_date), "HH:mm") : "10:00",
      })

      // Check if this is a quote (for "Convert to Booking" button)
      if (order.is_quote || order.status === 'quote' || order.order_number?.startsWith('QTE')) {
        setEditingQuote(true)
      }

      // Restore GST toggle state from saved data
      if (order.gst_amount > 0) {
        setApplyGst(true)
      }

      // Load package selection state (NEW)
      if (order.selection_mode) {
        setSelectionMode(order.selection_mode as "products" | "package")
      }
      if (order.use_custom_pricing) {
        setUseCustomPackagePrice(order.use_custom_pricing)
      }
      if (order.custom_package_price) {
        setCustomPackagePrice(order.custom_package_price)
      }
      
      // Load package variant if exists
      let packageLoaded = false
      if (order.variant_id) {
        try {
          const { data: variant, error: variantError } = await supabase
            .from("package_variants")
            .select("*")
            .eq("id", order.variant_id)
            .single()
          
          if (variantError) {
            console.warn("[EditOrder] Could not load package variant:", variantError)
          } else if (variant) {
            // Map security_deposit from deposit_amount if needed
            const mappedVariant = {
              ...variant,
              security_deposit: variant.deposit_amount || variant.security_deposit || 0,
            }
            setSelectedPackage(mappedVariant)
            setSelectionMode("package")
            // Set category from variant's category_id
            if (variant.category_id) {
              setSelectedPackageCategory(variant.category_id)
            }
            packageLoaded = true
          }
        } catch (pkgError) {
          console.warn("[EditOrder] Could not load package variant:", pkgError)
        }
      }
      
      // Fallback: Try to find package from notes if not loaded from variant_id
      // Notes format: [PACKAGE: Package Name @ ₹Price]
      if (!packageLoaded && order.notes?.includes('[PACKAGE:')) {
        const packageMatch = order.notes.match(/\[PACKAGE:\s*([^@]+)\s*@\s*₹?(\d+)\]/)
        if (packageMatch) {
          const packageName = packageMatch[1].trim()
          const packagePrice = parseFloat(packageMatch[2])
          // Try to find matching variant by name
          try {
            const { data: matchingVariants } = await supabase
              .from("package_variants")
              .select("*")
              .ilike("name", `%${packageName}%`)
              .limit(1)
            
            if (matchingVariants && matchingVariants.length > 0) {
              const variant = matchingVariants[0]
              const mappedVariant = {
                ...variant,
                security_deposit: variant.deposit_amount || variant.security_deposit || 0,
              }
              setSelectedPackage(mappedVariant)
              setSelectionMode("package")
              if (variant.category_id) {
                setSelectedPackageCategory(variant.category_id)
              }
              // Set custom price if it differs from variant base price
              if (packagePrice && packagePrice !== variant.base_price) {
                setUseCustomPackagePrice(true)
                setCustomPackagePrice(packagePrice)
              }
            } else {
              // No matching variant found - create a placeholder package
              setSelectionMode("package")
              setSelectedPackage({
                name: packageName,
                base_price: packagePrice,
                security_deposit: 0,
                inclusions: [],
              })
              setUseCustomPackagePrice(true)
              setCustomPackagePrice(packagePrice)
            }
          } catch (e) {
            console.warn("[EditOrder] Error finding package by name:", e)
          }
        }
      }
      
      // Map order items to invoice items (using denormalized columns directly)
      const items = (orderItems || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id === '00000000-0000-0000-0000-000000000000' ? 'modification-service' : (item.product_id || (item.category === 'Modification' ? 'modification-service' : null)),
        product_name: item.product_name || "Unknown Product",
        barcode: item.barcode || "",
        category: item.category || "",
        image_url: item.image_url || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
      setInvoiceItems(items)
      
      // Load lost/damaged items (NEW)
      try {
        const { data: lostDamagedData } = await supabase
          .from("order_lost_damaged_items")
          .select("*")
          .eq("order_id", order.id)
        
        if (lostDamagedData && lostDamagedData.length > 0) {
          const loadedLostDamaged = lostDamagedData.map((ld: any) => ({
            id: ld.id,
            product_id: ld.product_id,
            product_name: ld.product_name,
            barcode: ld.barcode,
            type: ld.type as "lost" | "damaged",
            quantity: ld.quantity,
            charge_per_item: ld.charge_per_item,
            total_charge: ld.total_charge,
            notes: ld.notes,
          }))
          setLostDamagedItems(loadedLostDamaged)
          setShowLostDamaged(true)
        }
      } catch (ldError) {
        console.warn("[EditOrder] Could not load lost/damaged items:", ldError)
      }
      
      // Store franchise_id from order
      if (order.franchise_id) {
        setFranchiseId(order.franchise_id)
      }
      
      toast({ title: "Order Loaded", description: `Editing ${order.order_number}` })
      
    } catch (error: any) {
      console.error("[EditOrder] Error loading order:", error)
      toast({ title: "Error", description: error.message || "Failed to load order", variant: "destructive" })
    }
    setLoading(false)
  }

  // Add a modification service to the items list
  const handleAddModService = () => {
    let finalServiceName = modService === "Other" ? customModService : modService
    if (modService === "Stitching") {
      if (!headSize || headSize.length !== 2) {
        toast({ title: "Error", description: "Please enter a valid 2-digit head size for Stitching", variant: "destructive" })
        return
      }
      finalServiceName = `Stitching (Head Size: ${headSize})`
    }
    if (!finalServiceName.trim()) {
      toast({ title: "Error", description: "Please enter or select a service name", variant: "destructive" })
      return
    }
    if (modCost <= 0) {
      toast({ title: "Error", description: "Cost must be greater than zero", variant: "destructive" })
      return
    }

    const newItem: InvoiceItem = {
      id: `mod-${Date.now()}`,
      product_id: 'modification-service',
      product_name: `Modification: ${finalServiceName}`,
      quantity: 1,
      unit_price: modCost,
      total_price: modCost,
      category: 'Modification'
    }

    setInvoiceItems(prev => [...prev, newItem])
    
    // Update modifications details
    setInvoiceData(prev => ({
      ...prev,
      has_modifications: true,
      modifications_details: prev.modifications_details 
        ? `${prev.modifications_details}, ${finalServiceName} (₹${modCost})` 
        : `${finalServiceName} (₹${modCost})`
    }))

    // Reset inputs
    setModService("")
    setModCost(0)
    setCustomModService("")
    setHeadSize("")
    
    toast({ title: "Service Added", description: `Added "${finalServiceName}" modification service` })
  }

  // Calculations
  // When package mode: items are included in package price (for tracking only), don't add their prices
  // Only extraItems are additional products beyond the package
  const additionalItemsSubtotal = extraItems.reduce((sum, item) => sum + item.total_price, 0)
  
  // In package mode, only modification service items from invoiceItems add to the price (along with any extra items)
  const modificationsSubtotal = invoiceItems
    .filter(item => item.product_id === 'modification-service' || item.category === 'Modification')
    .reduce((sum, item) => sum + item.total_price, 0)

  const itemsSubtotal = selectionMode === "package" 
    ? modificationsSubtotal + additionalItemsSubtotal
    : invoiceItems.reduce((sum, item) => sum + item.total_price, 0) + additionalItemsSubtotal
  // Include package price if a package is selected (package is now a variant directly)
  const packagePrice = selectionMode === "package" && selectedPackage 
    ? (useCustomPackagePrice && customPackagePrice > 0 ? customPackagePrice : (selectedPackage.base_price || 0))
    : 0
  const baseSubtotal = itemsSubtotal + packagePrice
  // Use override price if enabled, otherwise use calculated subtotal
  const subtotal = (useCustomPackagePrice && customPackagePrice > 0) ? customPackagePrice : baseSubtotal
  const manualDiscountAmount = invoiceData.discount_type === "percentage"
    ? (subtotal * invoiceData.discount_amount / 100)
    : invoiceData.discount_amount
  const couponDiscountAmount = Math.max(0, invoiceData.coupon_discount || 0)
  const discountAmount = Math.min(subtotal, manualDiscountAmount + couponDiscountAmount)
  const afterDiscount = subtotal - discountAmount
  // GST: When applyGst is ON, GST is inclusive (price already contains GST). When OFF, no GST.
  const gstAmount = applyGst ? afterDiscount - (afterDiscount / (1 + invoiceData.gst_percentage / 100)) : 0
  const baseAmountBeforeGst = applyGst ? afterDiscount - gstAmount : afterDiscount
  const lostDamagedTotal = lostDamagedItems.reduce((sum, item) => sum + item.total_charge, 0)
  // Security Deposit: The field value IS the total deposit (auto-filled with package deposit, but can be increased by user)
  const securityDeposit = invoiceData.invoice_type === "rental" 
    ? (invoiceData.security_deposit || 0)
    : 0
  const depositRefundAmount = isDepositRefunded && invoiceData.invoice_type === "rental" ? securityDeposit : 0
  // GST inclusive: total stays same as afterDiscount (GST doesn't add to price)
  const grandTotal = (afterDiscount + securityDeposit + lostDamagedTotal) - depositRefundAmount
  const pendingAmount = grandTotal - invoiceData.amount_paid

  // Filter customers - show all if no search term, otherwise filter
  const filteredCustomers = customerSearch.trim() === "" 
    ? customers 
    : customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      )

  // Filter leads
  const filteredLeads = leadSearch.trim() === ""
    ? leads
    : leads.filter(l =>
        l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.phone.includes(leadSearch)
      )

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Rental bookings intentionally expose only Barati Safa products. Sales
  // continue to use the complete catalogue unchanged.
  const rentalProducts = products.filter((product) => {
    const category = (product.category || "").trim().toUpperCase()
    const name = (product.name || "").toUpperCase()
    return category === "BARATI SAFA" || name.includes("BARATI SAFA")
  })
  const productSelectorProducts = invoiceData.invoice_type === "rental" ? rentalProducts : products
  const productSelectorCategories = invoiceData.invoice_type === "rental"
    ? categories.filter((category) => category.name.trim().toUpperCase() === "BARATI SAFA")
    : categories

  // Helper: Get safa limit from manual input

  // Helper: Check if a product is from a safa category (BARATI SAFA, GROOM SAFA, etc.)
  const isSafaProduct = (product: Product): boolean => {
    const productCategory = (product.category || "").toUpperCase().trim()
    const productName = (product.name || "").toUpperCase()
    
    // Check by category name
    const safaCategories = ["BARATI SAFA", "GROOM SAFA", "BRIDE SAFA"]
    const isSafaByCategory = safaCategories.includes(productCategory)
    
    // Also check by product name as fallback (e.g., "Barati Safa (Wedding Turban)")
    const isSafaByName = productName.includes("BARATI SAFA") || productName.includes("GROOM SAFA") || productName.includes("BRIDE SAFA")
    
    const result = isSafaByCategory || isSafaByName
    return result
  }

  // Helper: Count total safas currently in invoice (from BARATI SAFA and GROOM SAFA categories)
  const countSafasInInvoice = (): number => {
    const result = invoiceItems
      .filter(item => {
        const itemCategory = (item.category || "").toUpperCase().trim()
        const itemName = (item.product_name || "").toUpperCase()
        const safaCategories = ["BARATI SAFA", "GROOM SAFA", "BRIDE SAFA"]
        
        const isSafaByCategory = safaCategories.includes(itemCategory)
        const isSafaByName = itemName.includes("BARATI SAFA") || itemName.includes("GROOM SAFA") || itemName.includes("BRIDE SAFA")
        const matches = isSafaByCategory || isSafaByName
        
        return matches
      })
      .reduce((sum, item) => sum + item.quantity, 0)
    return result
  }

  // Add product to invoice
  const addProduct = (product: Product, quantity: number = 1) => {
    // If bypass is enabled, skip all restrictions
    if (!bypassSafaLimit) {
      // Check safa limit only if NOT bypassed
      const isSafa = isSafaProduct(product)
      
      if (isSafa) {
        const currentSafas = countSafasInInvoice()
        if (safaLimit !== null && currentSafas >= safaLimit) {
          toast({ 
            title: "Safa Limit Reached", 
            description: `Maximum ${safaLimit} safas allowed. Currently: ${currentSafas}`,
            variant: "destructive" 
          })
          return
        }
      }
    }

    const existingIndex = invoiceItems.findIndex(item => item.product_id === product.id)
    
    if (existingIndex >= 0) {
      // Increase quantity - also check safa limit
      if (safaLimit !== null && isSafaProduct(product)) {
        const currentSafas = countSafasInInvoice()
        if (currentSafas >= safaLimit) {
          toast({ 
            title: "Safa Limit Reached", 
            description: `You can only add ${safaLimit} safas for this package. Currently added: ${currentSafas}`,
            variant: "destructive" 
          })
          return
        }
      }
      
      const updated = [...invoiceItems]
      updated[existingIndex].quantity += quantity
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price
      setInvoiceItems(updated)
    } else {
      // Add new item
      const unitPrice = invoiceData.invoice_type === "rental" ? product.rental_price : (product.sale_price || product.rental_price)
      const newItem: InvoiceItem = {
        id: `temp-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        category: product.category,
        image_url: product.image_url,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: unitPrice * quantity,
      }
      setInvoiceItems([...invoiceItems, newItem])
    }
    
    setProductSearch("")
    setShowProductDropdown(false)
    toast({ title: "Item Added", description: `${product.name} added to invoice` })
  }

  // Update item quantity
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId)
      return
    }

    // Find the item being updated
    const item = invoiceItems.find(i => i.id === itemId)
    if (!item) return

    // If bypass is enabled, allow any quantity
    if (bypassSafaLimit) {
      setInvoiceItems(items =>
        items.map(i =>
          i.id === itemId
            ? { ...i, quantity: newQuantity, total_price: newQuantity * i.unit_price }
            : i
        )
      )
      return
    }

    // Check safa limit for this item
    const isSafa = isSafaProduct({ name: item.product_name, category: item.category } as Product)
    if (isSafa && safaLimit !== null) {
      const currentSafas = countSafasInInvoice()
      const quantityDifference = newQuantity - item.quantity
      
      if (currentSafas + quantityDifference > safaLimit) {
        const maxAllowed = Math.max(0, safaLimit - (currentSafas - item.quantity))
        toast({ 
          title: "Safa Limit Exceeded", 
          description: `Can only add ${maxAllowed} more safas. Max limit: ${safaLimit}`,
          variant: "destructive" 
        })
        return
      }
    }

    setInvoiceItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
          : item
      )
    )
  }

  // Remove item
  const removeItem = (itemId: string) => {
    setInvoiceItems(items => items.filter(item => item.id !== itemId))
  }

  // Add extra item (no safa limit restriction)
  const addExtraItem = (product: Product) => {
    const existingIndex = extraItems.findIndex(item => item.product_id === product.id)
    
    if (existingIndex >= 0) {
      // Increase quantity
      const updated = [...extraItems]
      updated[existingIndex].quantity += 1
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price
      setExtraItems(updated)
    } else {
      // Add new item
      const unitPrice = invoiceData.invoice_type === "rental" ? product.rental_price : (product.sale_price || product.rental_price)
      const newItem: InvoiceItem = {
        id: `extra-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        category: product.category,
        image_url: product.image_url,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
      }
      setExtraItems([...extraItems, newItem])
    }
    
    setProductSearch("")
    setShowProductDropdown(false)
    toast({ title: "Extra Item Added", description: `${product.name} added as extra item` })
  }

  // Update extra item quantity
  const updateExtraItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeExtraItem(itemId)
      return
    }
    setExtraItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
          : item
      )
    )
  }

  // Remove extra item
  const removeExtraItem = (itemId: string) => {
    setExtraItems(items => items.filter(item => item.id !== itemId))
  }

  // Add lost/damaged item
  const addLostDamagedItem = (product?: Product) => {
    const newItem: LostDamagedItem = {
      id: `ld-${Date.now()}`,
      product_id: product?.id || "",
      product_name: product?.name || "",
      barcode: product?.barcode || "",
      type: "damaged",
      quantity: 1,
      charge_per_item: product?.rental_price || 0,
      total_charge: product?.rental_price || 0,
    }
    setLostDamagedItems([...lostDamagedItems, newItem])
  }

  // Update lost/damaged item product selection
  const updateLostDamagedItemProduct = (id: string, product: Product) => {
    setLostDamagedItems(items =>
      items.map(item => {
        if (item.id !== id) return item
        return {
          ...item,
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          charge_per_item: product.rental_price || 0,
          total_charge: (product.rental_price || 0) * item.quantity,
        }
      })
    )
  }

  // Update lost/damaged item
  const updateLostDamagedItem = (id: string, field: string, value: any) => {
    setLostDamagedItems(items =>
      items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "quantity" || field === "charge_per_item") {
          updated.total_charge = updated.quantity * updated.charge_per_item
        }
        return updated
      })
    )
  }

  // Remove lost/damaged item
  const removeLostDamagedItem = (id: string) => {
    setLostDamagedItems(items => items.filter(item => item.id !== id))
  }

  // Create new customer via API (respects franchise + validation)
  // Pincode auto-fill for city and state
  const handlePincodeChange = async (value: string) => {
    // Update pincode value
    setNewCustomer(prev => ({ ...prev, pincode: value }))
    
    // Only lookup if 6 digits
    if (value.length !== 6 || !/^\d{6}$/.test(value)) {
      setPincodeStatus("idle")
      return
    }

    setPincodeStatus("loading")
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${value}`)
      const data = await response.json()

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        setNewCustomer(prev => ({
          ...prev,
          pincode: value,
          city: postOffice.District || "",
          state: postOffice.State || "",
        }))
        setPincodeStatus("success")
        toast({
          title: "Pincode Verified",
          description: `${postOffice.District}, ${postOffice.State}`,
        })
      } else {
        setPincodeStatus("error")
        toast({
          title: "Invalid Pincode",
          description: "Please enter a valid 6-digit pincode",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Pincode lookup error:", error)
      setPincodeStatus("error")
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) {
      toast({ title: "Error", description: "Customer name is required", variant: "destructive" })
      return
    }

    const phoneValidation = validatePhoneWithCountry(newCustomer.phone)
    if (!phoneValidation.isValid) {
      toast({ title: "Error", description: phoneValidation.error || "Please enter a valid phone number", variant: "destructive" })
      return
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address || undefined,
          city: newCustomer.city || undefined,
          state: newCustomer.state || undefined,
          pincode: newCustomer.pincode || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const friendly =
          result?.error?.message || result?.error || result?.message || "Failed to create customer"
        throw new Error(friendly)
      }

      const created = result.data
      if (created) {
        setSelectedCustomer(created)
        setCustomers((prev) => [created, ...prev])
      }

      setShowNewCustomerDialog(false)
      setNewCustomer({ name: "", phone: "+91", address: "", city: "", state: "", pincode: "" })
      setPincodeStatus("idle")
      toast({ title: "Success", description: result.message || "Customer created" })
    } catch (error) {
      console.error("[CreateInvoice] Error creating customer:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer",
        variant: "destructive",
      })
    }
  }

  // Save as Quote
  const handleSaveAsQuote = async (sendToPhones?: string[]) => {
    if (!selectedCustomer) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" })
      return
    }
    // Items are optional - save skeleton quote first, add items later

    setSaving(true)
    try {
      // Get franchise_id fresh from user session
      let currentFranchiseId = franchiseId
      if (!currentFranchiseId) {
        const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
        const user = userRes.ok ? await userRes.json() : null
        currentFranchiseId = user?.franchise_id
        if (currentFranchiseId) setFranchiseId(currentFranchiseId)
      }
      
      if (!currentFranchiseId) {
        toast({ title: "Error", description: "Session expired. Please refresh the page.", variant: "destructive" })
        setSaving(false)
        return
      }

      const orderData = {
        order_number: invoiceData.invoice_number ? invoiceData.invoice_number.replace("ORD", "QTE").replace("INV", "QTE").replace("SAL", "QTE") : "QTE001", // Generate quote number from invoice number
        invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0], // Save invoice date
        customer_id: selectedCustomer.id,
        franchise_id: currentFranchiseId,
        booking_type: invoiceData.invoice_type || 'rental',
        event_type: invoiceData.event_type || 'wedding',
        event_participant: invoiceData.event_participant || 'both',
        event_date: invoiceData.event_date || new Date().toISOString().split('T')[0], // Default to today if empty
        event_time: invoiceData.event_time || null,
        delivery_date: invoiceData.delivery_date || null,
        delivery_time: invoiceData.delivery_time || null,
        return_date: invoiceData.return_date || null,
        return_time: invoiceData.return_time || null,
        venue_address: invoiceData.venue_address || '',
        groom_name: invoiceData.groom_name || '',
        groom_whatsapp: invoiceData.groom_whatsapp || null,
        groom_address: invoiceData.groom_address || null,
        bride_name: invoiceData.bride_name || '',
        bride_whatsapp: invoiceData.bride_whatsapp || null,
        bride_address: invoiceData.bride_address || null,
        payment_method: invoiceData.payment_method || 'Cash / Offline Payment',
        amount_paid: 0,
        total_amount: grandTotal || 0,
        subtotal: subtotal || 0,
        subtotal_amount: subtotal || 0,
        tax_amount: gstAmount || 0,
        gst_amount: gstAmount || 0,
        gst_percentage: invoiceData.gst_percentage || 5,
        discount_amount: discountAmount || 0,
        discount_type: invoiceData.discount_type || 'fixed',
        security_deposit: securityDeposit || 0,
        coupon_code: invoiceData.coupon_code || null,
        coupon_discount: invoiceData.coupon_discount || 0,
        sales_closed_by_id: invoiceData.sales_closed_by_id || null,
        status: 'quote',
        pending_amount: grandTotal || 0,
        notes: invoiceData.notes || '',
        is_quote: true,
        // Package selection fields
        selection_mode: selectionMode || 'products',
        variant_id: selectedPackage?.id || null,
        use_custom_pricing: useCustomPackagePrice || false,
        custom_package_price: customPackagePrice || 0,
        // Modification fields (for direct sales)
        has_modifications: invoiceData.has_modifications || false,
        modifications_details: invoiceData.has_modifications ? invoiceData.modifications_details : null,
        modification_date: invoiceData.has_modifications && invoiceData.modification_date 
          ? new Date(`${invoiceData.modification_date.split('T')[0]}T${invoiceData.modification_time || '10:00'}:00`).toISOString()
          : null,
        pdf_url: null, // Reset PDF url on update to force regeneration on next send
      }

      const allItems = [
        ...invoiceItems.map(item => ({
          product_id: item.product_id === 'modification-service' ? '00000000-0000-0000-0000-000000000000' : item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || "",
          barcode: item.barcode || "",
          category: item.category || "",
          image_url: item.image_url || "",
        })),
        ...extraItems.map(item => ({
          product_id: item.product_id === 'modification-service' ? '00000000-0000-0000-0000-000000000000' : item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || "",
          barcode: item.barcode || "",
          category: item.category || "",
          image_url: item.image_url || "",
        }))
      ]

      let order: any
      let isUpdate = false

      if (orderId && mode === "edit") {
        const res = await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, orderData, items: allItems, lostDamagedItems: [] }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Failed to update quote")
        order = { id: orderId, order_number: invoiceData.invoice_number }
        isUpdate = true
      } else {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderData, items: allItems, lostDamagedItems: [] }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Failed to create quote")
        order = result.order
      }

      const message = isUpdate ? `Quote ${order.order_number} updated` : `Quote ${order.order_number} created`
      toast({ title: isUpdate ? "Quote Updated" : "Quote Saved", description: message })

      // Send Quote via WhatsApp — to the customer's own number plus any extra numbers picked in the dialog
      const cleanedExtraPhones = (sendToPhones || []).map(p => p.trim()).filter(Boolean)
      if (order?.id && (sendWhatsAppInvoice || cleanedExtraPhones.length > 0)) {
        sendInvoiceViaWhatsApp({
          orderId: order.id,
          orderType: "product_order",
          extraPhones: cleanedExtraPhones,
          sendConfirmation: false
        })
          .then(r => {
            if (r.success) {
              toast({ title: "WhatsApp", description: "Quote sent on WhatsApp!" })
            } else {
              toast({ title: "WhatsApp Failed", description: "Quote not sent — please resend manually.", variant: "destructive" })
            }
          })
      }

      router.push("/quotes?refresh=" + Date.now())
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
    setSaving(false)
  }

  // Save as Draft — saves whatever's filled in so far (not sent to the customer) so
  // anyone with access can reopen it in edit mode and finish filling in the rest.
  const handleSaveAsDraft = async () => {
    if (!selectedCustomer) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      let currentFranchiseId = franchiseId
      if (!currentFranchiseId) {
        const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
        const user = userRes.ok ? await userRes.json() : null
        currentFranchiseId = user?.franchise_id
        if (currentFranchiseId) setFranchiseId(currentFranchiseId)
      }

      if (!currentFranchiseId) {
        toast({ title: "Error", description: "Session expired. Please refresh the page.", variant: "destructive" })
        setSaving(false)
        return
      }

      const orderData = {
        order_number: invoiceData.invoice_number ? invoiceData.invoice_number.replace("ORD", "DFT").replace("INV", "DFT").replace("SAL", "DFT") : "DFT001",
        invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
        customer_id: selectedCustomer.id,
        franchise_id: currentFranchiseId,
        booking_type: invoiceData.invoice_type || 'rental',
        event_type: invoiceData.event_type || 'wedding',
        event_participant: invoiceData.event_participant || 'both',
        event_date: invoiceData.event_date || new Date().toISOString().split('T')[0],
        event_time: invoiceData.event_time || null,
        delivery_date: invoiceData.delivery_date || null,
        delivery_time: invoiceData.delivery_time || null,
        return_date: invoiceData.return_date || null,
        return_time: invoiceData.return_time || null,
        venue_address: invoiceData.venue_address || '',
        groom_name: invoiceData.groom_name || '',
        groom_whatsapp: invoiceData.groom_whatsapp || null,
        groom_address: invoiceData.groom_address || null,
        bride_name: invoiceData.bride_name || '',
        bride_whatsapp: invoiceData.bride_whatsapp || null,
        bride_address: invoiceData.bride_address || null,
        payment_method: invoiceData.payment_method || 'Cash / Offline Payment',
        amount_paid: 0,
        total_amount: grandTotal || 0,
        subtotal: subtotal || 0,
        subtotal_amount: subtotal || 0,
        tax_amount: gstAmount || 0,
        gst_amount: gstAmount || 0,
        gst_percentage: invoiceData.gst_percentage || 5,
        discount_amount: discountAmount || 0,
        discount_type: invoiceData.discount_type || 'fixed',
        security_deposit: securityDeposit || 0,
        coupon_code: invoiceData.coupon_code || null,
        coupon_discount: invoiceData.coupon_discount || 0,
        sales_closed_by_id: invoiceData.sales_closed_by_id || null,
        status: 'draft',
        pending_amount: grandTotal || 0,
        notes: invoiceData.notes || '',
        is_quote: false,
        selection_mode: selectionMode || 'products',
        variant_id: selectedPackage?.id || null,
        use_custom_pricing: useCustomPackagePrice || false,
        custom_package_price: customPackagePrice || 0,
        has_modifications: invoiceData.has_modifications || false,
        modifications_details: invoiceData.has_modifications ? invoiceData.modifications_details : null,
        modification_date: invoiceData.has_modifications && invoiceData.modification_date
          ? new Date(`${invoiceData.modification_date.split('T')[0]}T${invoiceData.modification_time || '10:00'}:00`).toISOString()
          : null,
        pdf_url: null,
      }

      const allItems = [
        ...invoiceItems.map(item => ({
          product_id: item.product_id === 'modification-service' ? '00000000-0000-0000-0000-000000000000' : item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || "",
          barcode: item.barcode || "",
          category: item.category || "",
          image_url: item.image_url || "",
        })),
        ...extraItems.map(item => ({
          product_id: item.product_id === 'modification-service' ? '00000000-0000-0000-0000-000000000000' : item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || "",
          barcode: item.barcode || "",
          category: item.category || "",
          image_url: item.image_url || "",
        }))
      ]

      let order: any
      let isUpdate = false

      if (orderId && mode === "edit") {
        const res = await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, orderData, items: allItems, lostDamagedItems: [] }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Failed to update draft")
        order = { id: orderId, order_number: invoiceData.invoice_number }
        isUpdate = true
      } else {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderData, items: allItems, lostDamagedItems: [] }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Failed to save draft")
        order = result.order
      }

      toast({
        title: isUpdate ? "Draft Updated" : "Draft Saved",
        description: `${order.order_number} saved as draft — anyone with access can reopen and finish it from Bookings.`,
      })

      router.push("/bookings?refresh=" + Date.now())
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
    setSaving(false)
  }

  // Create or Update Order
  const handleCreateOrder = async () => {
    // Allow editing confirmed orders too

    if (!selectedCustomer) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" })
      return
    }

    // Products/packages are now optional - allow saving skeleton/header first
    // Users can add items later during editing

    setSaving(true)
    try {
      // Get franchise_id fresh from user session
      let currentFranchiseId = franchiseId
      if (!currentFranchiseId) {
        const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
        const user = userRes.ok ? await userRes.json() : null
        currentFranchiseId = user?.franchise_id
        if (currentFranchiseId) setFranchiseId(currentFranchiseId)
      }
      
      if (!currentFranchiseId) {
        toast({ title: "Error", description: "Session expired. Please refresh the page.", variant: "destructive" })
        setSaving(false)
        return
      }

      // For new orders OR converting quote to booking, generate/verify invoice number
      let orderNumber = invoiceData.invoice_number
      // If converting from quote, generate a new INV/ORD/SAL number
      if (editingQuote && mode === "edit") {
        const seqRes = await fetch(`/api/invoice-sequences?franchise_id=${currentFranchiseId}&type=${invoiceData.invoice_type}`, { cache: "no-store" })
        if (seqRes.ok) {
          const { next_invoice_number } = await seqRes.json()
          orderNumber = next_invoice_number || orderNumber
          setInvoiceData(prev => ({ ...prev, invoice_number: orderNumber }))
        }
      } else if (!orderId || mode !== "edit") {
        // Check if this order number already exists (for new orders)
        const { data: existingOrder } = await supabase
          .from("product_orders")
          .select("id")
          .eq("order_number", orderNumber)
          .single()
        
        if (existingOrder) {
          // Order number exists, get a fresh one from the sequence
          const seqRes = await fetch(`/api/invoice-sequences?franchise_id=${currentFranchiseId}&type=${invoiceData.invoice_type}`, { cache: "no-store" })
          if (seqRes.ok) {
            const { next_invoice_number } = await seqRes.json()
            orderNumber = next_invoice_number || orderNumber
            setInvoiceData(prev => ({ ...prev, invoice_number: orderNumber }))
          }
        }
      }

      const orderData = {
        order_number: orderNumber,
        invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0], // Save invoice date
        customer_id: selectedCustomer.id,
        franchise_id: currentFranchiseId,
        booking_type: invoiceData.invoice_type || 'rental',
        event_type: invoiceData.event_type || 'wedding',
        event_participant: invoiceData.event_participant || 'both',
        event_date: invoiceData.event_date || new Date().toISOString().split('T')[0], // Default to today if empty
        event_time: invoiceData.event_time || null,
        delivery_date: invoiceData.delivery_date || null,
        delivery_time: invoiceData.delivery_time || null,
        return_date: invoiceData.return_date || null,
        return_time: invoiceData.return_time || null,
        venue_address: invoiceData.venue_address || '',
        groom_name: invoiceData.groom_name || '',
        groom_whatsapp: invoiceData.groom_whatsapp || null,
        groom_address: invoiceData.groom_address || null,
        bride_name: invoiceData.bride_name || '',
        bride_whatsapp: invoiceData.bride_whatsapp || null,
        bride_address: invoiceData.bride_address || null,
        payment_method: invoiceData.payment_method || 'Cash / Offline Payment',
        amount_paid: invoiceData.amount_paid || 0,
        total_amount: grandTotal || 0,
        subtotal: subtotal || 0,
        subtotal_amount: subtotal || 0,
        tax_amount: gstAmount || 0,
        gst_amount: gstAmount || 0,
        gst_percentage: invoiceData.gst_percentage || 5,
        discount_amount: discountAmount || 0,
        discount_type: invoiceData.discount_type || 'fixed', // NEW: Save discount type
        security_deposit: securityDeposit || 0,
        coupon_code: invoiceData.coupon_code || null,
        coupon_discount: invoiceData.coupon_discount || 0,
        sales_closed_by_id: invoiceData.sales_closed_by_id || null,
        status: 'confirmed',
        pending_amount: Math.max(0, (grandTotal || 0) - (invoiceData.amount_paid || 0)),
        notes: invoiceData.notes || '',
        is_quote: false,
        // Package selection fields (NEW)
        selection_mode: selectionMode || 'products',
        variant_id: selectedPackage?.id || null,
        use_custom_pricing: useCustomPackagePrice || false,
        custom_package_price: customPackagePrice || 0,
        // Modification fields (for direct sales)
        has_modifications: invoiceData.has_modifications || false,
        modifications_details: invoiceData.has_modifications ? invoiceData.modifications_details : null,
        modification_date: invoiceData.has_modifications && invoiceData.modification_date 
          ? new Date(`${invoiceData.modification_date.split('T')[0]}T${invoiceData.modification_time || '10:00'}:00`).toISOString()
          : null,
        pdf_url: null, // Reset PDF url on update to force regeneration on next send
      }

      const allItems = [
        ...invoiceItems.map(item => ({
          product_id: item.product_id === 'modification-service' ? '00000000-0000-0000-0000-000000000000' : item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || "",
          barcode: item.barcode || "",
          category: item.category || "",
          image_url: item.image_url || "",
        })),
        ...extraItems.map(item => ({
          product_id: item.product_id === 'modification-service' ? '00000000-0000-0000-0000-000000000000' : item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || "",
          barcode: item.barcode || "",
          category: item.category || "",
          image_url: item.image_url || "",
        }))
      ]

      const ldPayload = lostDamagedItems.map(ldItem => ({
        product_id: ldItem.product_id || null,
        product_name: ldItem.product_name,
        barcode: ldItem.barcode || null,
        type: ldItem.type,
        quantity: ldItem.quantity,
        charge_per_item: ldItem.charge_per_item,
        total_charge: ldItem.total_charge,
        notes: ldItem.notes || null,
      }))

      let order: any
      let isUpdate = false

      if (orderId && mode === "edit") {
        const res = await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, orderData, items: allItems, lostDamagedItems: ldPayload }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Failed to update order")
        order = { id: orderId, order_number: invoiceData.invoice_number }
        isUpdate = true
      } else {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderData, items: allItems, lostDamagedItems: ldPayload }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || "Failed to create order")
        order = result.order
      }

      // Trigger PDF generation in the background
      if (order?.id) {
        triggerPDFGeneration(order.id, "product_order")
      }

      // Determine the message based on update vs create vs convert from quote
      const isConvertFromQuote = editingQuote && mode === "edit"
      const message = isConvertFromQuote
        ? `Quote converted to Booking ${order.order_number} successfully`
        : isUpdate 
          ? `Booking ${order.order_number} updated successfully`
          : `Booking ${order.order_number} created successfully`
      
      // Save invoice number sequence (for new orders or quote conversions)
      if (!isUpdate || isConvertFromQuote) {
        try {
          const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
          const user = userRes.ok ? await userRes.json() : null
          const franchiseId = user?.franchise_id

          if (franchiseId) {
            await fetch('/api/invoice-sequences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                franchise_id: franchiseId,
                type: invoiceData.invoice_type,
                invoice_number: orderNumber
              })
            }).catch(err => console.warn("[CreateInvoice] Failed to save sequence:", err))
          }
        } catch (err) {
          console.warn("[CreateInvoice] Error saving invoice sequence:", err)
        }
      }
      
      toast({ title: isUpdate ? "Booking Updated" : "Booking Created", description: message })

      // Auto-send invoice via WhatsApp (fire & forget, only when checkbox is ON)
      if (order?.id && sendWhatsAppInvoice) {
        const sendConfirmation = !isUpdate || isConvertFromQuote
        sendInvoiceViaWhatsApp({ 
          orderId: order.id, 
          orderType: "product_order", 
          sendConfirmation 
        })
          .then(r => {
            if (r.success) {
              toast({ title: "WhatsApp", description: isUpdate && !isConvertFromQuote ? "Updated invoice sent on WhatsApp!" : "Invoice sent on WhatsApp!" })
            } else {
              toast({ title: "WhatsApp Failed", description: "Invoice not sent — please resend manually.", variant: "destructive" })
            }
          })
      }

      router.push("/bookings?refresh=" + Date.now())
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
    setSaving(false)
  }

  // Apply Coupon
  const handleApplyCoupon = async () => {
    const code = invoiceData.coupon_code.trim().toUpperCase()
    if (!code) {
      setCouponError("Please enter a coupon code")
      return
    }

    setValidatingCoupon(true)
    setCouponError(null)

    try {
      const response = await fetch('/api/offers/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal,
          orderValue: subtotal,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setCouponError(error.message || error.error || "Invalid or expired coupon")
        setInvoiceData(prev => ({ ...prev, coupon_discount: 0 }))
        setAppliedCoupon(null)
        return
      }

      const data = await response.json()
      const discount = Number(data.discount || 0)
      if (data.valid !== true || !Number.isFinite(discount) || discount < 0) {
        setCouponError(data.message || data.error || "Invalid or expired coupon")
        setInvoiceData(prev => ({ ...prev, coupon_discount: 0 }))
        setAppliedCoupon(null)
        return
      }

      setInvoiceData(prev => ({
        ...prev,
        coupon_code: code,
        coupon_discount: discount
      }))
      setAppliedCoupon(code)
      toast({ title: "Coupon Applied", description: `Discount: ₹${discount.toLocaleString('en-IN')}` })
    } catch (error: any) {
      setCouponError("Failed to validate coupon")
      console.error("Coupon validation error:", error)
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Native browser printing — same flow as Ctrl/Cmd + P.
  const handlePrint = () => {
    const hasCustomer = Boolean(selectedCustomer || qCustomerName)
    const hasItems = invoiceItems.length > 0 || Boolean(selectedPackage)
    if (!hasCustomer || !hasItems) {
      toast({
        title: "Complete the booking first",
        description: !hasCustomer
          ? "Select a customer before creating the PDF."
          : "Add at least one product or package before creating the PDF.",
        variant: "destructive",
      })
      return
    }

    const originalTitle = document.title
    const eventDateStr = invoiceData.event_date
      ? format(new Date(invoiceData.event_date), "dd/MM/yy")
      : ""
    const customerName = selectedCustomer?.name || invoiceData.groom_name || qCustomerName || ""
    const printTitle = [invoiceData.invoice_number, customerName, eventDateStr].filter(Boolean).join(" | ")
    if (printTitle) document.title = printTitle

    const restoreTitle = () => {
      document.title = originalTitle
      window.removeEventListener("afterprint", restoreTitle)
    }
    window.addEventListener("afterprint", restoreTitle)
    window.print()
  }

  // Auto-trigger print if requested via query parameter
  // Wait for: order data, company settings, QR code, and product images
  useEffect(() => {
    const printRequested = searchParams.get("print") === "true"
    const hasCustomer = Boolean(selectedCustomer || qCustomerName)
    const hasItems = invoiceItems.length > 0 || Boolean(selectedPackage)
    if (
      !autoPrintTriggeredRef.current &&
      !loading &&
      orderId &&
      printRequested &&
      invoiceData.invoice_number &&
      companySettings !== null &&
      hasCustomer &&
      hasItems
    ) {
      autoPrintTriggeredRef.current = true
      // Allow the loaded invoice images and print-only markup to paint first.
      const timer = window.setTimeout(() => handlePrint(), 800)
      return () => window.clearTimeout(timer)
    }
  }, [
    loading,
    orderId,
    searchParams,
    invoiceData.invoice_number,
    selectedCustomer,
    qCustomerName,
    invoiceItems.length,
    selectedPackage,
    companySettings,
  ])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }


  // Render sub-sections to prevent duplicate code and handle direct sales POS layout
  const renderCustomerCard = () => (
                        <Card className="p-5 rounded-2xl shadow-sm border border-slate-100 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-[#F1EAF5] rounded-lg">
                                <User className="h-4 w-4 text-[#4A1F5E]" />
                              </div>
                              <span className="font-semibold text-gray-900">Customer Information</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="print:hidden h-9 text-xs border-[#4A1F5E] text-[#4A1F5E] hover:bg-[#4A1F5E] hover:text-white transition-all"
                              onClick={() => setShowNewCustomerDialog(true)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              New Customer
                            </Button>
                          </div>
    
                          {/* Customer / Lead Toggle */}
                          {!selectedCustomer && (
                            <div className="flex items-center gap-2 mb-3 print:hidden">
                              <span className="text-xs font-semibold text-slate-700">Convert Lead</span>
                              <Switch
                                id="customer-lead-mode"
                                checked={customerMode === "lead"}
                                onCheckedChange={(checked) => {
                                  setCustomerMode(checked ? "lead" : "customer")
                                  setCustomerSearch("")
                                  setLeadSearch("")
                                }}
                                aria-label="Toggle between customers and leads"
                                className="data-[state=checked]:bg-[#4A1F5E]"
                              />
                              <span className="text-[11px] text-slate-400">Select an existing customer or lead</span>
                            </div>
                          )}
    
                          {/* Customer Search or Lead Search */}
                          {!selectedCustomer && (
                            <div className="print:hidden mb-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                {customerMode === "customer" ? (
                                  <Input
                                    placeholder="Search customer by name, phone number or email..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    className="pl-10 h-9 text-xs bg-white border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  />
                                ) : (
                                  <Input
                                    placeholder="Search leads by name, WhatsApp, location..."
                                    value={leadSearch}
                                    onChange={(e) => setLeadSearch(e.target.value)}
                                    className="pl-10 h-9 text-xs bg-white border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  />
                                )}
                              </div>
                            </div>
                          )}
    
                          {/* Customer List or Selected Customer */}
                          {selectedCustomer ? (
                            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-800/10 flex items-start justify-between">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-900 text-sm">
                                  {selectedCustomer.name}
                                </div>
                                <div className="text-xs text-emerald-800 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {selectedCustomer.phone}
                                </div>
                                {selectedCustomer.email && (
                                  <div className="text-xs text-emerald-700">
                                    {selectedCustomer.email}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="print:hidden h-7 w-7 p-0 hover:bg-emerald-100 text-indigo-700"
                                onClick={() => setSelectedCustomer(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : customerMode === "customer" ? (
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-sm print:hidden bg-white">
                              {customersLoading ? (
                                <div className="space-y-0">
                                  {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-2.5 border-b last:border-b-0">
                                      <div className="h-4 w-24 mb-1 bg-gray-200 rounded animate-pulse" />
                                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  {(customerSearch ? filteredCustomers : customers.slice(0, 4)).map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => setSelectedCustomer(c)}
                                      className="min-h-[126px] text-center p-3 rounded-xl border border-slate-200 hover:border-[#4A1F5E] hover:bg-[#F8F4FA] transition-colors group flex flex-col items-center justify-center"
                                    >
                                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1EAF5] text-sm font-semibold text-[#4A1F5E]">
                                        {c.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="font-medium text-gray-800 group-hover:text-[#4A1F5E] text-xs line-clamp-1">{c.name}</div>
                                      <div className="text-[10px] text-gray-500">{c.phone}</div>
                                      <Check className="mt-1 h-3.5 w-3.5 text-[#4A1F5E] opacity-0 group-hover:opacity-100" />
                                    </button>
                                  ))}
                                  {customerSearch && filteredCustomers.length === 0 && (
                                    <div className="p-3 text-xs text-gray-500 text-center">
                                      No matches found
                                    </div>
                                  )}
                                  {!customerSearch && customers.length > 3 && (
                                    <div className="p-2 text-[10px] text-gray-500 text-center bg-gray-50/50 border-t">
                                      Type to search {customers.length} customers...
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="border border-gray-100 rounded-lg max-h-36 overflow-y-auto text-sm print:hidden bg-white">
                              {leadsLoading ? (
                                <div className="space-y-0">
                                  {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-2.5 border-b last:border-b-0">
                                      <div className="h-4 w-24 mb-1 bg-gray-200 rounded animate-pulse" />
                                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  {(leadSearch ? filteredLeads : leads.slice(0, 3)).map((lead) => (
                                    <button
                                      key={lead.id}
                                      type="button"
                                      onClick={() => setSelectedLeadToConvert(lead)}
                                      className="w-full text-left p-2 border-b last:border-b-0 hover:bg-emerald-50/45 transition-colors group flex items-center justify-between"
                                    >
                                      <div className="text-left">
                                        <div className="font-medium text-gray-800 group-hover:text-emerald-900 text-xs flex items-center gap-1.5">
                                          {lead.name}
                                          {lead.status && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 scale-90 capitalize border-amber-200 bg-amber-50 text-amber-700">
                                              {lead.status}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                          <span>📱 {lead.phone}</span>
                                          {lead.event_date && (
                                            <span>📅 Event: {new Date(lead.event_date).toLocaleDateString()}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-[10px] font-bold text-indigo-700 opacity-0 group-hover:opacity-100 pr-1">
                                        Convert & Select ✓
                                      </div>
                                    </button>
                                  ))}
                                  {leadSearch && filteredLeads.length === 0 && (
                                    <div className="p-3 text-xs text-gray-500 text-center">
                                      No leads matching search
                                    </div>
                                  )}
                                  {!leadSearch && leads.length === 0 && (
                                    <div className="p-3 text-xs text-gray-500 text-center">
                                      No active leads found
                                    </div>
                                  )}
                                  {!leadSearch && leads.length > 3 && (
                                    <div className="p-2 text-[10px] text-gray-500 text-center bg-gray-50/50 border-t">
                                      Type to search {leads.length} active leads...
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </Card>
  );

  const renderEventAndGroomBrideCards = () => (
    <>
                        <Card className="p-5 rounded-2xl shadow-sm border border-slate-100 bg-white">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <CalendarIcon className="h-4 w-4 text-indigo-700" />
                              </div>
                              <span className="font-semibold text-gray-900">Event Information</span>
                            </div>
    
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <Label className="text-[10px] text-gray-500 mb-0.5 block">Event Type</Label>
                                <Select
                                  value={invoiceData.event_type}
                                  onValueChange={(v) => setInvoiceData({ ...invoiceData, event_type: v as any })}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
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
                              <div>
                                <Label className="text-[10px] text-gray-500 mb-0.5 block">For</Label>
                                <Select
                                  value={invoiceData.event_participant}
                                  onValueChange={(v) => setInvoiceData({ ...invoiceData, event_participant: v as any })}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="both">Both</SelectItem>
                                    <SelectItem value="groom">Groom Only</SelectItem>
                                    <SelectItem value="bride">Bride Only</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-500 mb-0.5 block">Event Date *</Label>
                                <Input
                                  type="date"
                                  value={invoiceData.event_date}
                                  onChange={(e) => setInvoiceData({ ...invoiceData, event_date: e.target.value })}
                                  className="h-8 text-xs bg-white border-gray-200"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-500 mb-0.5 block">Event Time</Label>
                                <Input
                                  type="time"
                                  value={invoiceData.event_time}
                                  onChange={(e) => setInvoiceData({ ...invoiceData, event_time: e.target.value })}
                                  className="h-8 text-xs bg-white border-gray-200"
                                />
                              </div>
    
                              <div className="col-span-2 pt-2 border-t border-gray-200/50 mt-1">
                                <Label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Venue Address
                                </Label>
                                <Textarea
                                  value={invoiceData.venue_address}
                                  onChange={(e) => setInvoiceData({ ...invoiceData, venue_address: e.target.value })}
                                  placeholder="Enter venue address..."
                                  rows={1.5}
                                  className="bg-white border-gray-200 resize-none text-xs"
                                />
                              </div>
                            </div>
                          </Card>
    
                        {/* Groom & Bride details */}
                        {invoiceData.invoice_type === "rental" && (
                          <div className={`grid gap-3 ${invoiceData.event_participant === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
                            {(invoiceData.event_participant === "groom" || invoiceData.event_participant === "both") && (
                              <Card className="p-3 shadow-sm border-l-4 border-l-sky-500 bg-white">
                                <div className="flex items-center gap-1.5 mb-2 border-b border-gray-200/50 pb-1">
                                  <User className="h-3.5 w-3.5 text-sky-600" />
                                  <span className="font-semibold text-gray-800 text-xs">Groom Details</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div>
                                    <Label className="text-[10px] text-gray-500 mb-0.5 block">Name</Label>
                                    <Input
                                      value={invoiceData.groom_name}
                                      onChange={(e) => setInvoiceData({ ...invoiceData, groom_name: e.target.value })}
                                      placeholder="Groom name"
                                      className="h-8 bg-white border-gray-200 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 mb-0.5 block">WhatsApp</Label>
                                    <Input
                                      value={invoiceData.groom_whatsapp}
                                      onChange={(e) => setInvoiceData({ ...invoiceData, groom_whatsapp: e.target.value })}
                                      placeholder="WhatsApp number"
                                      className="h-8 bg-white border-gray-200 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 mb-0.5 block">Address</Label>
                                    <Textarea
                                      value={invoiceData.groom_address}
                                      onChange={(e) => setInvoiceData({ ...invoiceData, groom_address: e.target.value })}
                                      placeholder="Address"
                                      rows={1.5}
                                      className="bg-white border-gray-200 resize-none text-xs"
                                    />
                                  </div>
                                </div>
                              </Card>
                            )}
                            {(invoiceData.event_participant === "bride" || invoiceData.event_participant === "both") && (
                              <Card className="p-3 shadow-sm border-l-4 border-l-pink-500 bg-white">
                                <div className="flex items-center gap-1.5 mb-2 border-b border-gray-200/50 pb-1">
                                  <User className="h-3.5 w-3.5 text-pink-600" />
                                  <span className="font-semibold text-gray-800 text-xs">Bride Details</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div>
                                    <Label className="text-[10px] text-gray-500 mb-0.5 block">Name</Label>
                                    <Input
                                      value={invoiceData.bride_name}
                                      onChange={(e) => setInvoiceData({ ...invoiceData, bride_name: e.target.value })}
                                      placeholder="Bride name"
                                      className="h-8 bg-white border-gray-200 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 mb-0.5 block">WhatsApp</Label>
                                    <Input
                                      value={invoiceData.bride_whatsapp}
                                      onChange={(e) => setInvoiceData({ ...invoiceData, bride_whatsapp: e.target.value })}
                                      placeholder="WhatsApp number"
                                      className="h-8 bg-white border-gray-200 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-gray-500 mb-0.5 block">Address</Label>
                                    <Textarea
                                      value={invoiceData.bride_address}
                                      onChange={(e) => setInvoiceData({ ...invoiceData, bride_address: e.target.value })}
                                      placeholder="Address"
                                      rows={1.5}
                                      className="bg-white border-gray-200 resize-none text-xs"
                                    />
                                  </div>
                                </div>
                              </Card>
                            )}
                          </div>
                        )}
    </>
  );

  const renderProductSelectorCards = () => (
    <>
                        {invoiceData.invoice_type === "rental" && (
                          <Card className="p-3 bg-white border border-slate-200 shadow-sm">
                            <Label className="text-xs font-semibold mb-2 block">Selection Mode</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={selectionMode === "products" ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setSelectionMode("products")
                                  setSelectedPackage(null)
                                  setSelectedPackageVariant(null)
                                  setSelectedPackageCategory("")
                                  setUseCustomPackagePrice(false)
                                  setCustomPackagePrice(0)
                                }}
                                className={`flex-1 text-xs h-8 ${selectionMode === "products" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                              >
                                <Package className="h-3.5 w-3.5 mr-1" />
                                Individual Products
                              </Button>
                              <Button
                                type="button"
                                variant={selectionMode === "package" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectionMode("package")}
                                className={`flex-1 text-xs h-8 ${selectionMode === "package" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                              >
                                <Tag className="h-3.5 w-3.5 mr-1" />
                                Package
                              </Button>
                            </div>
                          </Card>
                        )}
    
                        {/* Package Selector */}
                        {!skipProductSelection && selectionMode === "package" && invoiceData.invoice_type === "rental" && (
                          <Card className="p-4 bg-white border border-slate-200 shadow-sm">
                            {packagesLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-700" />
                                <span className="ml-2 text-xs text-gray-500">Loading packages...</span>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Package Category Selection */}
                                <div>
                                  <Label className="text-xs font-semibold mb-2 block">1. Select Category</Label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {packagesCategories.map((cat) => (
                                      <Button
                                        key={cat.id}
                                        type="button"
                                        variant={selectedPackageCategory === cat.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                          const match = cat.name.match(/(\d+)\s*Safa/i)
                                          const limit = match ? parseInt(match[1]) : null
                                          setSafaLimit(limit)
                                          setSelectedPackageCategory(cat.id)
                                          setSelectedPackage(null)
                                          setSelectedPackageVariant(null)
                                          setUseCustomPackagePrice(false)
                                          setCustomPackagePrice(0)
                                        }}
                                        className={`justify-start text-xs h-8 ${selectedPackageCategory === cat.id ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                                      >
                                        {cat.name}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
    
                                {/* Package Selection */}
                                {selectedPackageCategory && (
                                  <div className="border-t border-gray-200/50 pt-3">
                                    <Label className="text-xs font-semibold mb-2 block">2. Select Variant</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      {packages
                                        .filter(pkg => pkg.category_id === selectedPackageCategory || (pkg as any).package_id === selectedPackageCategory)
                                        .map((pkg) => (
                                          <div
                                            key={pkg.id}
                                            className={`p-3 border-2 rounded-xl cursor-pointer transition-all hover:shadow-sm flex items-center justify-between ${
                                              selectedPackage?.id === pkg.id
                                                ? "border-indigo-600 bg-emerald-50/20"
                                                : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            onClick={() => {
                                              setSelectedPackage(pkg)
                                              setSelectedPackageVariant(null)
                                              setUseCustomPackagePrice(false)
                                              setCustomPackagePrice(0)
                                              if (pkg.security_deposit && pkg.security_deposit > 0) {
                                                setInvoiceData(prev => ({
                                                  ...prev,
                                                  security_deposit: pkg.security_deposit
                                                }))
                                              }
                                            }}
                                          >
                                            <div className="min-w-0 flex-1">
                                              <h4 className="font-semibold text-xs text-gray-800">{pkg.name || pkg.variant_name}</h4>
                                              {pkg.inclusions && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {(Array.isArray(pkg.inclusions)
                                                    ? pkg.inclusions
                                                    : typeof pkg.inclusions === 'string'
                                                      ? pkg.inclusions.split(',').map((s: string) => s.trim())
                                                      : []
                                                  ).slice(0, 2).map((inc: string, i: number) => (
                                                    <Badge key={i} variant="outline" className="text-[9px] scale-95 origin-left">{inc}</Badge>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right pl-2 flex-shrink-0">
                                              <p className="text-sm font-bold text-emerald-800">₹{pkg.base_price?.toLocaleString('en-IN') || 0}</p>
                                              {pkg.security_deposit > 0 && (
                                                <p className="text-[9px] text-gray-400">+₹{pkg.security_deposit} dep</p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        )}
    
                        {/* Package Summary & Add products to package */}
                        {selectionMode === "package" && selectedPackage && invoiceData.invoice_type === "rental" && (
                          <Card className="p-3 bg-emerald-50/20 border border-emerald-800/10 rounded-xl space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-slate-900">Package: {selectedPackage.name || selectedPackage.variant_name}</span>
                                {selectedPackage.inclusions && (
                                  <p className="text-[10px] text-emerald-800 mt-0.5">Includes: {Array.isArray(selectedPackage.inclusions) ? selectedPackage.inclusions.join(', ') : selectedPackage.inclusions}</p>
                                )}
                              </div>
                              <span className="font-bold text-sm text-emerald-800">₹{packagePrice.toLocaleString('en-IN')}</span>
                            </div>
    
                            {/* Additional package items */}
                            <div className="border-t border-gray-200/50 pt-3">
                              <Label className="text-[10px] text-gray-500 font-semibold mb-2 block uppercase">Add Products to Package</Label>
                              <ProductSelector
                                products={productSelectorProducts.map(p => ({
                                  ...p,
                                  category: p.category || '',
                                  security_deposit: p.security_deposit || 0,
                                  sale_price: p.sale_price || p.rental_price,
                                }))}
                                categories={productSelectorCategories}
                                subcategories={subcategories}
                                selectedItems={invoiceItems.map(item => ({
                                  product_id: item.product_id,
                                  quantity: item.quantity,
                                  unit_price: item.unit_price,
                                }))}
                                bookingType={invoiceData.invoice_type}
                                limitBaratiSafaPackages={invoiceData.invoice_type === "rental"}
                                hideAllCategoryOptions={invoiceData.invoice_type === "rental"}
                                hideAllSubcategoryOptions={invoiceData.invoice_type === "rental"}
                                defaultCategoryName={invoiceData.invoice_type === "rental" ? "BARATI SAFA" : undefined}
                                eventDate={invoiceData.event_date}
                                onProductSelect={(product, quantity) => addProduct(product as Product, quantity)}
                                onItemUpdate={(product_id, quantity, unit_price) => {
                                  setInvoiceItems(prev => prev.map(it =>
                                    it.product_id === product_id
                                      ? { ...it, quantity, unit_price, total_price: quantity * unit_price }
                                      : it
                                  ))
                                }}
                                onItemRemove={(product_id) => {
                                  setInvoiceItems(prev => prev.filter(it => it.product_id !== product_id))
                                }}
                                onOpenCustomProductDialog={() => setShowCustomProductDialog(true)}
                              />
                            </div>
                          </Card>
                        )}
    
                        {/* Safa Limit Control */}
                        {selectedPackage && (
                          <div className="border-l-4 border-l-purple-600 bg-purple-50/50 p-3 rounded-lg flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-violet-900">
                                Safa Limit Control {safaLimit !== null && `(Max: ${safaLimit} safas)`}
                              </p>
                              <p className="text-[10px] text-purple-800">
                                Current Safas: {countSafasInInvoice()} {safaLimit !== null && !bypassSafaLimit && `(Remaining: ${Math.max(0, safaLimit - countSafasInInvoice())})`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id="bypassSafaLimit"
                                checked={bypassSafaLimit}
                                onCheckedChange={(checked) => setBypassSafaLimit(checked as boolean)}
                                disabled={safaLimit === null}
                              />
                              <label htmlFor="bypassSafaLimit" className="cursor-pointer font-medium text-violet-900">
                                Bypass
                              </label>
                            </div>
                          </div>
                        )}
    
                        {/* Product Selector for Individual Selection */}
                        {!skipProductSelection && (selectionMode === "products" || invoiceData.invoice_type === "sale") && (
                          <div className="mb-2">
                            <ProductSelector
                              products={productSelectorProducts.map(p => ({
                                ...p,
                                category: p.category || '',
                                security_deposit: p.security_deposit || 0,
                                sale_price: p.sale_price || p.rental_price,
                              }))}
                              categories={productSelectorCategories}
                              subcategories={subcategories}
                              selectedItems={invoiceItems.map(item => ({
                                product_id: item.product_id,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                              }))}
                              bookingType={invoiceData.invoice_type}
                              limitBaratiSafaPackages={invoiceData.invoice_type === "rental"}
                              hideAllCategoryOptions={invoiceData.invoice_type === "rental"}
                              hideAllSubcategoryOptions={invoiceData.invoice_type === "rental"}
                              defaultCategoryName={invoiceData.invoice_type === "rental" ? "BARATI SAFA" : undefined}
                              eventDate={invoiceData.event_date}
                              onProductSelect={(product, quantity) => addProduct(product as Product, quantity)}
                              onItemUpdate={(product_id, quantity, unit_price) => {
                                setInvoiceItems(prev => prev.map(it =>
                                  it.product_id === product_id
                                    ? { ...it, quantity, unit_price, total_price: quantity * unit_price }
                                    : it
                                ))
                              }}
                              onItemRemove={(product_id) => {
                                setInvoiceItems(prev => prev.filter(it => it.product_id !== product_id))
                              }}
                              onOpenCustomProductDialog={() => setShowCustomProductDialog(true)}
                            />
                          </div>
                        )}
    
                        {/* Modifications Section — available for sales only */}
                        {invoiceData.invoice_type === "sale" && (
                        <Card className="p-4 shadow-sm border-l-4 border-l-amber-600 bg-white overflow-visible mt-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Checkbox
                              id="hasModifications"
                              checked={invoiceData.has_modifications}
                              onCheckedChange={(checked) =>
                                setInvoiceData({
                                  ...invoiceData,
                                  has_modifications: checked === true,
                                })
                              }
                            />
                            <Label htmlFor="hasModifications" className="text-xs font-semibold text-gray-800 cursor-pointer flex items-center gap-1.5">
                              🔧 Modifications & Stitching
                            </Label>
                          </div>
    
                          {invoiceData.has_modifications && (
                            <div className="space-y-3 bg-orange-50 p-3 rounded-lg border border-slate-200 text-xs">
                              {/* List of modifications added to the cart */}
                              <div>
                                <Label className="text-[10px] font-semibold text-indigo-700 mb-1.5 block">Added Modification Services:</Label>
                                {invoiceItems.filter(item => item.product_id === 'modification-service').length === 0 ? (
                                  <p className="text-[10px] text-gray-500 italic">No modification services added yet. Use the form below to add service and cost.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {invoiceItems
                                      .filter(item => item.product_id === 'modification-service')
                                      .map((item) => (
                                        <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                          <span className="font-medium text-gray-800">{item.product_name}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700 font-mono">₹{item.unit_price}</span>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                              onClick={() => removeItem(item.id)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
    
                              {/* Form to add a modification service */}
                              <div className="border-t border-slate-200 pt-3 space-y-2">
                                <Label className="text-[10px] font-semibold text-indigo-700">Add Custom Service & Cost</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Select
                                      value={modService}
                                      onValueChange={setModService}
                                    >
                                      <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
                                        <SelectValue placeholder="Select Service" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Stitching">Stitching</SelectItem>
                                        <SelectItem value="Live Stitching">Live Stitching</SelectItem>
                                        <SelectItem value="Alteration">Alteration</SelectItem>
                                        <SelectItem value="Dry Cleaning">Dry Cleaning</SelectItem>
                                        <SelectItem value="Pressing">Pressing</SelectItem>
                                        <SelectItem value="Custom fitting">Custom fitting</SelectItem>
                                        <SelectItem value="Other">Other Service</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <Input
                                      type="number"
                                      placeholder="Cost (₹)"
                                      value={modCost || ''}
                                      onChange={(e) => setModCost(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                      className="h-8 text-xs bg-white"
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleAddModService}
                                      className="h-8 text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-2.5 whitespace-nowrap"
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                                {modService === "Stitching" && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Label className="text-[10px] text-slate-600 font-medium whitespace-nowrap">Head Size (2 digits):</Label>
                                    <Input
                                      type="text"
                                      placeholder="e.g. 22"
                                      value={headSize}
                                      onChange={(e) => {
                                        const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                                        if (cleanVal.length <= 2) {
                                          setHeadSize(cleanVal);
                                        }
                                      }}
                                      className="h-8 text-xs bg-white w-24 border-gray-200"
                                    />
                                  </div>
                                )}
                                {modService === "Other" && (
                                  <Input
                                    placeholder="Enter custom service name..."
                                    value={customModService}
                                    onChange={(e) => setCustomModService(e.target.value)}
                                    className="h-8 text-xs bg-white mt-1"
                                  />
                                )}
                              </div>
    
                              {/* Completion Date/Time (Appointment Date/Time for Live Stitching) */}
                              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                                <div>
                                  <Label className="text-[10px] font-medium text-indigo-700 mb-0.5 block">
                                    {modService === "Live Stitching" ? "Appointment Date" : "Completion Date"}
                                  </Label>
                                  <Input
                                    type="date"
                                    value={invoiceData.modification_date ? formatDateForInput(invoiceData.modification_date) : ""}
                                    onChange={(e) =>
                                      setInvoiceData({
                                        ...invoiceData,
                                        modification_date: e.target.value ? new Date(e.target.value).toISOString() : "",
                                      })
                                    }
                                    className="h-8 text-xs bg-white border-gray-200"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] font-medium text-indigo-700 mb-0.5 block">
                                    {modService === "Live Stitching" ? "Appointment Time" : "Completion Time"}
                                  </Label>
                                  <Input
                                    type="time"
                                    value={invoiceData.modification_time}
                                    onChange={(e) =>
                                      setInvoiceData({ ...invoiceData, modification_time: e.target.value })
                                    }
                                    className="h-8 text-xs bg-white border-gray-200"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                        )}
    </>
  );

  const renderSettlementCards = () => (
    <>
                          <Card className="p-4 shadow-sm border-l-4 border-l-indigo-500 bg-white">
                            <div className="font-semibold mb-3 text-sm text-gray-800 flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-indigo-700" />
                              Payment & Staff
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div>
                                <Label className="text-[10px] text-gray-500 mb-0.5 block">Payment Method</Label>
                                <Select
                                  value={invoiceData.payment_method}
                                  onValueChange={(v) => setInvoiceData({ ...invoiceData, payment_method: v as any })}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UPI / QR Payment">UPI / QR Payment</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Debit / Credit Card">Debit / Credit Card</SelectItem>
                                    <SelectItem value="Cash / Offline Payment">Cash / Offline Payment</SelectItem>
                                    <SelectItem value="International Payment">International Payment</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
    
                              <div>
                                <Label className="text-[10px] text-gray-500 mb-0.5 block">Sales Staff</Label>
                                <Select
                                  value={invoiceData.sales_closed_by_id}
                                  onValueChange={(v) => setInvoiceData({ ...invoiceData, sales_closed_by_id: v })}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white border-gray-200">
                                    <SelectValue placeholder="Select staff member" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {staffMembers.map((staff) => (
                                      <SelectItem key={staff.id} value={staff.id}>
                                        {staff.name} ({staff.role})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
    
                            {/* WhatsApp Invoice Toggle */}
                            <div className="border-t border-gray-200/50 pt-3 mt-3">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="sendWhatsAppInvoice"
                                  checked={sendWhatsAppInvoice}
                                  onCheckedChange={(checked) => setSendWhatsAppInvoice(checked === true)}
                                />
                                <Label htmlFor="sendWhatsAppInvoice" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                                  <Send className="h-3.5 w-3.5 text-green-600" /> Send bill on WhatsApp (WATI)
                                </Label>
                              </div>
                              {sendWhatsAppInvoice && (
                                <p className="text-[10px] text-green-600 mt-1 ml-6">Invoice will be auto-sent to customer + owner on WhatsApp</p>
                              )}
                            </div>
                          </Card>
    
                          {/* Lost/Damaged Items Section */}
                          {invoiceData.invoice_type === "rental" && (
                            <Card className={`p-4 shadow-sm bg-white overflow-visible ${showLostDamaged ? "border-l-4 border-l-red-500" : "border"}`}>
                              {/* Checkbox toggle */}
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  id="toggleLostDamaged"
                                  checked={showLostDamaged}
                                  onCheckedChange={(v) => {
                                    setShowLostDamaged(!!v)
                                    if (!v) setLostDamagedItems([])
                                  }}
                                />
                                <label htmlFor="toggleLostDamaged" className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  <span className="font-semibold text-gray-800 text-sm">Lost / Damaged Items</span>
                                  <span className="text-[10px] text-gray-400">(tick if any item was lost or damaged)</span>
                                </label>
                              </div>

                              {showLostDamaged && (<>
                              <div className="flex items-center justify-between mb-3 mt-1">
                                <Badge variant="destructive" className="text-[9px]">Stock will be reduced permanently</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => addLostDamagedItem()}
                                  className="h-7 text-[10px] border-red-200 text-red-700 hover:bg-red-50"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                                </Button>
                              </div>
    
                              {lostDamagedItems.length === 0 ? (
                                <div className="text-center py-4 text-gray-400 text-xs border border-dashed rounded-lg bg-white">
                                  No lost or damaged items added.
                                </div>
                              ) : (
                                <div className="border border-gray-100 rounded-lg bg-white overflow-visible">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-red-50/50 text-red-950">
                                        <tr>
                                          <th className="text-left p-2 font-medium">Product</th>
                                          <th className="text-center p-2 font-medium w-24">Type</th>
                                          <th className="text-center p-2 font-medium w-16">Qty</th>
                                          <th className="text-right p-2 font-medium w-24">Charge</th>
                                          <th className="text-right p-2 font-medium w-24">Total</th>
                                          <th className="w-10"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {lostDamagedItems.map((item) => (
                                          <tr key={item.id} className="hover:bg-red-50/10">
                                            <td className="p-2 relative" style={{ overflow: 'visible' }}>
                                              {item.product_name ? (
                                                <div className="flex items-center gap-1.5 max-w-[150px]">
                                                  <span className="font-medium truncate">{item.product_name}</span>
                                                  {item.barcode && <span className="text-[9px] text-gray-400">({item.barcode})</span>}
                                                  <button
                                                    type="button"
                                                    className="text-gray-400 hover:text-gray-600"
                                                    onClick={() => {
                                                      updateLostDamagedItem(item.id, "product_id", "")
                                                      updateLostDamagedItem(item.id, "product_name", "")
                                                    }}
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="relative">
                                                  <Input
                                                    placeholder="Search product..."
                                                    onFocus={() => setLostDamagedProductSearch(item.id)}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="h-7 text-xs"
                                                  />
                                                  {lostDamagedProductSearch === item.id && productSearch && (
                                                    <div className="absolute z-[9999] left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto" style={{ top: '100%' }}>
                                                      {products
                                                        .filter(p => 
                                                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                                          p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
                                                        )
                                                        .slice(0, 8)
                                                        .map((product) => (
                                                          <div
                                                            key={product.id}
                                                            className="p-1.5 hover:bg-gray-50 cursor-pointer border-b last:border-0 text-left"
                                                            onClick={() => {
                                                              updateLostDamagedItemProduct(item.id, product)
                                                              setLostDamagedProductSearch(null)
                                                              setProductSearch("")
                                                            }}
                                                          >
                                                            <div className="font-medium text-xs">{product.name}</div>
                                                            <div className="text-[9px] text-gray-500 flex gap-1.5">
                                                              {product.barcode && <span>{product.barcode}</span>}
                                                              <span>Stock: {product.stock_available}</span>
                                                              <span className="text-emerald-700">₹{product.rental_price}</span>
                                                            </div>
                                                          </div>
                                                        ))}
                                                      {products.filter(p => 
                                                        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                                        p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
                                                      ).length === 0 && (
                                                        <div className="p-2 text-xs text-gray-400">No products found</div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </td>
                                            <td className="p-2 text-center">
                                              <select
                                                value={item.type}
                                                onChange={(e) => updateLostDamagedItem(item.id, "type", e.target.value)}
                                                className="h-7 text-xs bg-white border border-gray-200 rounded px-1"
                                              >
                                                <option value="damaged">Damaged</option>
                                                <option value="lost">Lost</option>
                                              </select>
                                            </td>
                                            <td className="p-2 text-center">
                                              <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateLostDamagedItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                                                className="h-7 w-12 text-center"
                                                min={1}
                                              />
                                            </td>
                                            <td className="p-2">
                                              <Input
                                                type="number"
                                                value={item.charge_per_item}
                                                onChange={(e) => updateLostDamagedItem(item.id, "charge_per_item", parseFloat(e.target.value) || 0)}
                                                className="h-7 w-20 text-right font-mono"
                                                placeholder="₹0"
                                              />
                                            </td>
                                            <td className="p-2 text-right font-semibold text-red-600 font-mono">
                                              ₹{item.total_charge.toLocaleString('en-IN')}
                                            </td>
                                            <td className="p-2 text-center">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                onClick={() => removeLostDamagedItem(item.id)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                              </>)}
                            </Card>
                          )}

                          {/* Notes Card */}
                          <Card className="p-4 shadow-sm border-l-4 border-l-indigo-500 bg-white">
                            <Label className="text-xs font-semibold text-gray-800 mb-2 block">Order Notes</Label>
                            <Textarea
                              value={invoiceData.notes}
                              onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                              placeholder="Any additional notes..."
                              rows={2}
                              className="bg-white border-gray-200 resize-none text-xs"
                            />
                          </Card>
    
                          {/* Terms & Conditions Card */}
                          <Card className="p-4 shadow-sm border-l-4 border-l-indigo-500 bg-white text-xs">
                            <div className="flex items-center gap-2 mb-2">
                              <FileCheck className="h-4 w-4 text-indigo-500" />
                              <span className="font-semibold text-gray-800">Terms & Conditions</span>
                            </div>
                            <div className="text-[10px] text-gray-600 max-h-40 overflow-y-auto leading-relaxed">
                              {invoiceData.invoice_type === "sale" ? (
                                <ol className="list-decimal list-inside space-y-1">
                                  <li>Sale items cannot be returned.</li>
                                  <li>Exchange is available within <strong>2 days</strong> of the invoice date.</li>
                                  <li>Please keep the original invoice for any exchange.</li>
                                  <li>Final invoice &amp; product will be delivered after total amount is paid.</li>
                                  <li>All disputes, if any, are subject to <strong>Vadodara, Gujarat</strong> jurisdiction only.</li>
                                </ol>
                              ) : (
                                <ol className="list-decimal list-inside space-y-0.5">
                                  <li>All product selections and order details are considered approved by the customer at the time of booking. Any changes requested after confirmation may not be possible, especially close to the event date.</li>
                                  <li>For the best service experience, Safa Wale bookings should preferably be confirmed at least 30 days before the event.</li>
                                  <li>The remaining payment, including the Security Deposit, must be completed before the event date.</li>
                                  <li>Safas and rental items remain the responsibility of the customer until they are collected by our team. Any lost, damaged, torn, burnt, or unreturned items will be charged as per the applicable lost/damage rates.</li>
                                  <li>Our team will arrange the collection of safas after the event. If items are not available for collection on the agreed date, additional rental charges may apply and can be adjusted from the Security Deposit.</li>
                                  <li>Safa Wale service includes up to 5 hours of assistance. Additional hours, if required, will be charged at ₹1,500 per hour.</li>
                                  <li>Service timings are subject to the booking location. Local city services include up to 1 hour of assistance, while outstation services are available for up to 4 hours and until 9:30 PM. Any additional time may be adjusted against the Security Deposit.</li>
                                  <li>Sold products are non-returnable and non-exchangeable. All bookings and services are subject to Vadodara jurisdiction.</li>
                                </ol>
                              )}
                            </div>
                          </Card>
    </>
  );

  return (
    <DashboardLayout userRole={currentUser?.role} compactHeader hideSidebar>
    <>
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
          @bottom-left { content: none; }
          @bottom-center { content: none; }
          @bottom-right { content: none; }
          @top-left { content: none; }
          @top-center { content: none; }
          @top-right { content: none; }
        }
        @media print {
          html, body {
            margin: 0;
            padding: 0;
            height: auto;
            font-size: 11px;
          }
        }
        @media screen {
          .invoice-scaled {
            zoom: 0.8;
            -moz-transform: scale(0.8);
            -moz-transform-origin: top center;
          }
        }
      `}</style>
      {/* ── Transaction Type Gate ── */}
      {!typeSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 pt-16 text-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              aria-label="Close and return to dashboard"
              title="Return to dashboard"
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create New Invoice</h2>
            <p className="text-gray-500 text-sm mb-8">Select the transaction type to unlock the form</p>

            <div className="grid grid-cols-2 gap-4">
              {/* SALE */}
              <button
                onClick={() => handleTypeSelect("sale")}
                className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-150"
              >
                <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                  <Tag className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-black text-gray-900 tracking-wide">SALE</div>
                  <div className="text-xs text-gray-500 mt-0.5">One-time purchase</div>
                </div>
              </button>

              {/* RENTAL */}
              <button
                onClick={() => handleTypeSelect("rental")}
                className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-150"
              >
                <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center transition-colors">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-black text-gray-900 tracking-wide">RENTAL</div>
                  <div className="text-xs text-gray-500 mt-0.5">With return date</div>
                </div>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Send as Quote: pick which numbers get the WhatsApp quote ── */}
      <Dialog open={showSendQuoteDialog} onOpenChange={setShowSendQuoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-green-600" />
              Send quote on WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedCustomer && (
              <p className="text-xs text-gray-500">
                Sending to <span className="font-semibold text-gray-800">{selectedCustomer.name}</span>
                {!selectedCustomer.phone && <span className="text-red-500"> — no number on file, add one below</span>}
              </p>
            )}
            <Label className="text-xs text-gray-500">Numbers to send to</Label>
            {quotePhoneNumbers.map((num, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={num}
                  placeholder={idx === 0 ? "Customer's number" : "Additional number"}
                  onChange={(e) => {
                    const next = [...quotePhoneNumbers]
                    next[idx] = e.target.value
                    setQuotePhoneNumbers(next)
                  }}
                  className="h-9 text-sm"
                />
                {quotePhoneNumbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setQuotePhoneNumbers(quotePhoneNumbers.filter((_, i) => i !== idx))}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => setQuotePhoneNumbers([...quotePhoneNumbers, ""])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add another number
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowSendQuoteDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving || quotePhoneNumbers.every(n => !n.trim())}
              onClick={() => {
                setShowSendQuoteDialog(false)
                handleSaveAsQuote(quotePhoneNumbers)
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send quote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-slate-50 p-4 print:p-0 print:bg-white invoice-scaled">
      {/* Header - Hidden on print */}
      <div className="mx-auto mb-4 flex w-full max-w-[96rem] items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/bookings">
            <Button variant="outline" size="sm" aria-label="Back to bookings" className="h-9 w-9 px-0 rounded-full border-slate-200">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {mode === "final-bill" ? "Final Bill" : mode === "edit" ? "Edit Booking" : "New Booking"}
              </h1>
              {mode === "edit" && (
                <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                  EDITING
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {mode === "edit"
                ? `Order: ${invoiceData.invoice_number || "Loading..."}`
                : "Create a new booking in 3 simple steps"}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/bookings" className={mode === "new" ? "hidden" : undefined}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              All Bookings
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={saving || (!selectedCustomer && !qCustomerName) || (invoiceItems.length === 0 && !selectedPackage)}
            title="Print this invoice"
            className={mode === "new" ? "hidden" : "disabled:cursor-not-allowed disabled:opacity-50"}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
          {/* Save as Draft - not sent to customer, lets anyone with access pick it up later */}
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={handleSaveAsDraft}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save as Draft
          </Button>
          {mode === "new" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Close booking"
              title="Close booking"
              onClick={() => router.push("/dashboard")}
              className="h-9 w-9 px-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {/* Save as Quote - only show in new mode, not in edit mode */}
          {mode !== "edit" && mode !== "new" && (
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => {
                setQuotePhoneNumbers([selectedCustomer?.phone || ""])
                setShowSendQuoteDialog(true)
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Send as Quote
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={handleCreateOrder} 
            disabled={saving}
            className={mode === "new" ? "hidden" : undefined}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {mode === "edit" && editingQuote ? "Convert to Booking" : mode === "edit" ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </div>


      {/* Invoice Document */}
      <div className="mx-auto w-full max-w-[96rem] rounded-lg bg-white shadow-lg print:shadow-none print:rounded-none print:max-w-full">
        
        {/* ========== PRINT-ONLY HEADER ========== */}
        <div className="hidden print:block bg-slate-50 border-b border-slate-300 px-3 py-2">
          <div className="flex justify-between items-center">
            {/* Company Logo & Details */}
            <div className="flex items-center gap-2">
              <img 
                src={companySettings?.logo_url || DEFAULT_LOGO_URL} 
                alt="Logo" 
                className="h-10 w-10 object-contain" 
              />
              <div>
                <h1 className="text-base font-bold text-slate-700">{companySettings?.company_name || "SAFAWALA"}</h1>
                <p className="text-[9px] text-gray-600">Premium Wedding Turbans & Accessories</p>
                <div className="text-[8px] text-gray-500">
                  🏢 Delhi · Vadodara · Ahmedabad · Mumbai · Bangalore
                </div>
                <div className="text-[8px] text-gray-500 flex flex-wrap gap-x-2 mt-0.5">
                  <span>📞 +91 97252 95691</span>
                  <span>📞 +91 97252 95692</span>
                  <span>🏢 +91 95103 66393 (Office)</span>
                  <span>🌐 www.safawala.com</span>
                </div>
              </div>
            </div>
            {/* Invoice Info */}
            <div className="text-right">
              <div className="text-sm font-bold text-slate-600 uppercase">
                {editingQuote ? "Quote Estimate" : mode === "final-bill" ? "Final Bill" : invoiceData.invoice_type === "rental" ? "Rental Invoice" : "Sale Invoice"}
              </div>
              <div className="text-[10px] mt-0.5">
                <div><span className="text-gray-500">Invoice #:</span> <strong>{invoiceData.invoice_number}</strong></div>
                <div><span className="text-gray-500">Date:</span> <strong>{invoiceData.invoice_date ? format(new Date(invoiceData.invoice_date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")}</strong></div>
                {currentUser?.name && (
                  <div className="text-[8px] text-gray-400 mt-0.5">Billed by {currentUser.name}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WEB-ONLY HEADER — removed duplicate, merged into Company Logo section below */}

        {/* ================= PRINT-ONLY COMPREHENSIVE SECTION ================= */}
        <div className="hidden print:block px-3 py-2 space-y-2 border-b border-slate-200">
          {/* Customer Info */}
          {(selectedCustomer || qCustomerName) && (
            <div className="bg-slate-50 px-2 py-1.5 rounded">
              <div className="text-[9px] text-slate-600 font-medium">Customer</div>
              <div className="font-semibold text-xs text-gray-900">{selectedCustomer?.name || qCustomerName}</div>
              <div className="text-[10px] text-gray-600">
                {selectedCustomer?.phone || qCustomerPhone}
                {(selectedCustomer?.email || qCustomerEmail) ? ` | ${selectedCustomer?.email || qCustomerEmail}` : ''}
              </div>
            </div>
          )}

          {/* Event Details - Rental Only */}
          {invoiceData.invoice_type === "rental" && (
            <div className="bg-gray-50 px-2 py-1.5 rounded">
              <div className="text-[9px] text-slate-600 font-medium mb-1 border-b border-slate-200 pb-0.5">Event Details</div>
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div className="space-y-0.5">
                  <div><span className="text-gray-500">Event:</span> <span className="font-medium capitalize">{invoiceData.event_type}</span></div>
                  <div><span className="text-gray-500">For:</span> <span className="font-medium capitalize">{invoiceData.event_participant}</span></div>
                </div>
                <div className="space-y-0.5">
                  {invoiceData.event_date && <div><span className="text-gray-500">Event Date:</span> <span className="font-medium">{format(new Date(invoiceData.event_date), "dd MMM yyyy")}</span></div>}
                  {invoiceData.event_time && <div><span className="text-gray-500">Event Time:</span> <span className="font-medium">{formatTime12h(invoiceData.event_time)}</span></div>}
                </div>
              </div>
              {invoiceData.venue_address && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-200/50 text-[10px]">
                  <span className="text-gray-500">Venue:</span> <span className="font-medium text-gray-800">{invoiceData.venue_address}</span>
                </div>
              )}
            </div>
          )}

          {/* Groom & Bride Details - Rental Only */}
          {invoiceData.invoice_type === "rental" && (
            <div className="grid grid-cols-2 gap-2">
              {(invoiceData.event_participant === "groom" || invoiceData.event_participant === "both") && invoiceData.groom_name && (
                <div className="bg-blue-50 px-2 py-1.5 rounded">
                  <div className="text-[9px] text-blue-700 font-medium mb-0.5 border-b border-blue-200 pb-0.5">Groom Details</div>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="font-semibold text-gray-900">{invoiceData.groom_name}</div>
                    {invoiceData.groom_whatsapp && <div className="text-gray-600">📱 {invoiceData.groom_whatsapp}</div>}
                    {invoiceData.groom_address && <div className="text-gray-600">📍 {invoiceData.groom_address}</div>}
                  </div>
                </div>
              )}
              {(invoiceData.event_participant === "bride" || invoiceData.event_participant === "both") && invoiceData.bride_name && (
                <div className="bg-pink-50 px-2 py-1.5 rounded">
                  <div className="text-[9px] text-pink-700 font-medium mb-0.5 border-b border-pink-200 pb-0.5">Bride Details</div>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="font-semibold text-gray-900">{invoiceData.bride_name}</div>
                    {invoiceData.bride_whatsapp && <div className="text-gray-600">📱 {invoiceData.bride_whatsapp}</div>}
                    {invoiceData.bride_address && <div className="text-gray-600">📍 {invoiceData.bride_address}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* ================= END PRINT-ONLY SECTION ================= */}

        {/* ================= WEB-ONLY CONTENT START ================= */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 print:hidden">
          {/* Company Logo & Invoice Header — single combined row */}
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            {/* Logo + Name */}
            <div className="flex items-center gap-2">
              <img
                src={companySettings?.logo_url || DEFAULT_LOGO_URL}
                alt="Logo"
                className="h-9 w-9 object-contain rounded"
              />
              <div className="font-bold text-sm text-slate-900">
                {companySettings?.company_name || "SAFAWALA"}
              </div>
            </div>
            {/* Invoice # + Date + Type (locked) */}
            <div className="flex items-center gap-2">
              {/* Type — locked after gate selection */}
              <div
                title="Invoice type cannot be changed after selection"
                className={`flex items-center gap-1.5 px-3 h-8 rounded-md border text-xs font-bold select-none ${
                  invoiceData.invoice_type === 'sale'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                <Lock className="h-3 w-3 opacity-60" />
                {invoiceData.invoice_type === 'sale' ? 'Sale' : 'Rental'}
              </div>
              <Input
                value={invoiceData.invoice_number}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                className="font-mono font-bold text-sm h-8 w-28"
                placeholder="INV-2026001"
                disabled={!companySettings?.allow_invoice_number_edit}
              />
              <Input
                type="date"
                value={invoiceData.invoice_date}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                className="text-xs h-8 w-36"
              />
            </div>
          </div>

          {/* Guided booking steps */}
          <div className="rounded-none border-0 bg-transparent px-2 py-2 shadow-none">
            <div className="flex items-start justify-between gap-2 overflow-x-auto">
              {bookingSteps.map((step, index) => {
                const active = bookingStep === step.number
                const complete = bookingStep > step.number
                return (
                  <div key={step.number} className="flex min-w-[110px] flex-1 items-start">
                    <button
                      type="button"
                      onClick={() => complete || step.number <= bookingStep ? goToBookingStep(step.number) : undefined}
                      className="group flex min-w-0 flex-1 flex-col items-center text-center"
                      aria-current={active ? "step" : undefined}
                    >
                      <span className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                        active || complete
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 bg-white text-slate-600"
                      )}>
                        {complete ? <Check className="h-4 w-4" /> : step.number}
                      </span>
                      <span className={cn("mt-2 text-xs font-semibold", active ? "text-indigo-700" : "text-slate-700")}>{step.label}</span>
                      <span className="mt-0.5 text-[10px] text-slate-500">{active ? "In progress" : step.caption}</span>
                    </button>
                    {index < bookingSteps.length - 1 && (
                      <div className={cn("mt-4 h-px flex-1", bookingStep > step.number ? "bg-indigo-500" : "bg-slate-200")} />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-center text-sm font-medium text-slate-700">
              Step {bookingStep} of {bookingSteps.length} · {bookingSteps[bookingStep - 1].label}
            </p>
          </div>


          {/* ================= WEB-ONLY CONTENT START ================= */}
          <div className="p-4 md:p-6 print:hidden bg-white space-y-6">



            <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                {bookingStep === 1 && (
                  <div className="space-y-4">
                    {renderCustomerCard()}
                    {invoiceData.invoice_type === "rental" && renderEventAndGroomBrideCards()}
                  </div>
                )}
                {bookingStep === 2 && renderProductSelectorCards()}
                {bookingStep === 3 && (
                  <div className="space-y-4">
                    {renderSettlementCards()}
                    <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-5 w-5" /></div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Review booking</h2>
                        <p className="text-sm text-slate-500">Check the Booking Summary and confirm the order.</p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs text-slate-500">Customer</p><p className="mt-1 font-semibold text-slate-900">{selectedCustomer?.name || "Not selected"}</p></div>
                      <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs text-slate-500">Booking type</p><p className="mt-1 font-semibold capitalize text-slate-900">{invoiceData.invoice_type}</p></div>
                      <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs text-slate-500">Items</p><p className="mt-1 font-semibold text-slate-900">{invoiceItems.reduce((sum, item) => sum + item.quantity, 0)}</p></div>
                      <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs text-slate-500">Estimated total</p><p className="mt-1 font-semibold text-slate-900">₹{grandTotal.toLocaleString("en-IN")}</p></div>
                    </div>
                    </Card>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <Button type="button" variant="outline" onClick={() => goToBookingStep(bookingStep - 1)} disabled={bookingStep === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  {bookingStep < 3 ? (
                    <Button type="button" onClick={() => canContinueFromStep() && goToBookingStep(bookingStep + 1)} disabled={!canContinueFromStep()} className="bg-indigo-600 text-white hover:bg-indigo-700">
                      Continue to {bookingSteps[bookingStep].label}
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Right Column / POS checkout container OR bottom checkout container */}
              <div className={cn(
                "lg:col-span-4 lg:sticky lg:top-20"
              )}>
                <Card className="shadow-sm border border-[#E7E2EA] bg-white overflow-hidden rounded-2xl">
                      {/* Sidebar Header */}
                      <div className="p-4 bg-[#F6F2FA] text-slate-900 flex justify-between items-center border-b border-[#E7E2EA]">
                        <div>
                          <h3 className="font-semibold text-base">
                            {invoiceData.invoice_type === "rental" ? "Rental Summary" : "Checkout Summary"}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {selectedCustomer ? selectedCustomer.name : "No Customer Selected"}
                          </p>
                        </div>
                        <Badge className="bg-[#4A1F5E] text-white border-none text-[10px] capitalize">
                          {invoiceData.invoice_type}
                        </Badge>
                      </div>

                      <div className={cn(
                        "p-4 grid grid-cols-1 gap-6 items-start"
                      )}>
                        {/* Left Column: Added Items & package/lost/damaged details */}
                        <div className="space-y-4">
                          {/* Added Items / Cart List */}
                          <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-semibold text-gray-800">Added Items</Label>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {invoiceItems.reduce((sum, item) => sum + item.quantity, 0)} Items
                          </Badge>
                        </div>

                        {invoiceItems.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-xs border border-dashed rounded-lg bg-white/50">
                            <Package className="h-6 w-6 mx-auto mb-1.5 opacity-40 text-gray-400" />
                            <p>Cart is empty</p>
                          </div>
                        ) : (
                          <div className="border border-gray-100 rounded-lg max-h-52 overflow-y-auto bg-white divide-y divide-gray-100">
                            {invoiceItems.map((item) => (
                              <div key={item.id} className="p-2 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors">
                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt="" className="h-8 w-8 object-cover rounded flex-shrink-0" />
                                  ) : (
                                    <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{item.product_name}</p>
                                    <p className="text-[10px] text-gray-500">₹{item.unit_price} / unit</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pl-2">
                                  <div className="flex items-center border border-gray-200 rounded">
                                    <button
                                      type="button"
                                      onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                      className="h-5 w-5 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="w-6 text-center text-[11px] font-medium">{item.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                      className="h-5 w-5 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                  <span className="font-semibold text-gray-900 w-16 text-right">
                                    ₹{item.total_price.toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Package details preview */}
                      {selectionMode === "package" && selectedPackage && invoiceData.invoice_type === "rental" && (
                        <div className="bg-blue-50/60 border border-blue-200/50 p-2.5 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-900">Package Base Price</span>
                            <span className="font-bold text-blue-800">₹{packagePrice.toLocaleString()}</span>
                          </div>
                          {selectedPackage.inclusions && (
                            <p className="text-[10px] text-blue-700">Includes: {Array.isArray(selectedPackage.inclusions) ? selectedPackage.inclusions.join(', ') : selectedPackage.inclusions}</p>
                          )}
                        </div>
                      )}

                      {/* Lost & Damaged Items Sidebar summary */}
                      {lostDamagedItems.length > 0 && (
                        <div className="bg-red-50/50 border border-red-200/50 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-red-900 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                              Lost / Damaged Items
                            </span>
                            <span className="font-bold text-red-700">₹{lostDamagedTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-[10px] text-red-800 space-y-0.5 divide-y divide-red-200/30">
                            {lostDamagedItems.map((item) => (
                              <div key={item.id} className="pt-1 first:pt-0 flex justify-between">
                                <span className="truncate max-w-[160px]">{item.product_name || "Unknown Product"} ({item.type})</span>
                                <span>{item.quantity}x ₹{item.charge_per_item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Financial Calculator / Settlement Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-2.5 text-xs">
                        
                        {/* Subtotal Display */}
                        <div className="flex justify-between text-gray-600 font-medium">
                          <span>Subtotal</span>
                          <span>₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>

                        {/* Override Price Input - rental only */}
                        {invoiceData.invoice_type === "rental" && (
                          <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="useCustomPackagePrice"
                                checked={useCustomPackagePrice}
                                onCheckedChange={(checked) => setUseCustomPackagePrice(checked === true)}
                              />
                              <Label htmlFor="useCustomPackagePrice" className="text-[10px] text-slate-700 cursor-pointer font-medium">
                                Override Subtotal Price (₹)
                              </Label>
                            </div>
                            {useCustomPackagePrice && (
                              <Input
                                type="number"
                                value={customPackagePrice || ''}
                                onChange={(e) => setCustomPackagePrice(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Enter custom price"
                              />
                            )}
                          </div>
                        )}

                        {/* Security Deposit & Refund Toggle - rental only */}
                        {invoiceData.invoice_type === "rental" && (
                          <div className="bg-blue-50/40 border border-blue-200/40 p-2 rounded-lg space-y-2">
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <Label className="text-[10px] text-blue-900 font-medium">Security Deposit (₹)</Label>
                              <Input
                                type="number"
                                value={invoiceData.security_deposit || ''}
                                onChange={(e) => setInvoiceData({ ...invoiceData, security_deposit: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                className="h-7 text-xs bg-white border-blue-200"
                                placeholder="Deposit"
                              />
                            </div>
                            {securityDeposit > 0 && (
                              <div className="flex items-center space-x-2 border-t border-blue-200/30 pt-1.5">
                                <Checkbox
                                  id="depositRefunded"
                                  checked={isDepositRefunded}
                                  onCheckedChange={(checked) => setIsDepositRefunded(checked as boolean)}
                                />
                                <Label htmlFor="depositRefunded" className="text-[10px] text-blue-900 cursor-pointer font-medium">
                                  Refunded to Customer
                                </Label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Coupon / Discount Code */}
                        <div className="bg-gray-50 border border-gray-200/50 p-2 rounded-lg space-y-2">
                          <div className="grid grid-cols-2 gap-2 items-center">
                            <Label className="text-[10px] text-gray-700 font-medium">Discount Amount (₹)</Label>
                            <Input
                              type="number"
                              value={invoiceData.discount_amount || ''}
                              onChange={(e) => setInvoiceData({ ...invoiceData, discount_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs bg-white border-gray-200"
                              placeholder="Discount"
                            />
                          </div>

                          <div className="space-y-1.5 border-t border-gray-200/60 pt-2">
                            <Label htmlFor="bookingCouponCode" className="text-[10px] text-gray-700 font-medium">Coupon Code</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="bookingCouponCode"
                                value={invoiceData.coupon_code || ''}
                                onChange={(e) => {
                                  setInvoiceData({ ...invoiceData, coupon_code: e.target.value.toUpperCase(), coupon_discount: 0 })
                                  setAppliedCoupon(null)
                                  setCouponError(null)
                                }}
                                className="h-8 flex-1 text-xs bg-white border-gray-200"
                                placeholder="Enter coupon code"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleApplyCoupon}
                                disabled={validatingCoupon || !invoiceData.coupon_code.trim()}
                                className="h-8 px-3 text-xs"
                              >
                                {validatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                              </Button>
                            </div>
                            {appliedCoupon && couponDiscountAmount > 0 && (
                              <p className="text-[10px] text-emerald-600">{appliedCoupon} applied · ₹{couponDiscountAmount.toLocaleString('en-IN')} off</p>
                            )}
                            {couponError && <p className="text-[10px] text-red-600">{couponError}</p>}
                          </div>

                        </div>

                        {/* GST Tax Toggle */}
                        <div className="border-t border-gray-200/50 pt-2.5">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="applyGst"
                              checked={applyGst}
                              onCheckedChange={(checked) => setApplyGst(checked === true)}
                            />
                            <Label htmlFor="applyGst" className="text-[10px] font-medium cursor-pointer text-gray-700">
                              Apply GST ({invoiceData.gst_percentage}%) — Inclusive
                            </Label>
                          </div>
                          {applyGst && (
                            <div className="text-[9px] text-gray-500 mt-1 pl-5">
                              Breakdown: Base ₹{Math.round(baseAmountBeforeGst).toLocaleString('en-IN')} + GST ₹{Math.round(gstAmount).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {/* Advance / Amount Paid */}
                        <div className="border-t border-gray-200/50 pt-2.5 grid grid-cols-2 gap-2 items-center">
                          <Label className="font-semibold text-gray-800">Amount Paid (₹)</Label>
                          <Input
                            type="number"
                            value={invoiceData.amount_paid || ''}
                            onChange={(e) => setInvoiceData({ ...invoiceData, amount_paid: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs bg-white border-gray-200 font-bold"
                            placeholder="Paid"
                          />
                        </div>

                        {/* Summary Totals */}
                        <div className="border-t border-gray-200/80 pt-3 space-y-2">
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-green-700 font-medium">
                              <span>Discount Applied</span>
                              <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {isDepositRefunded && invoiceData.invoice_type === "rental" && securityDeposit > 0 && (
                            <div className="flex justify-between text-green-700 font-medium">
                              <span>Refunded Deposit</span>
                              <span>-₹{securityDeposit.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base text-gray-900 border-b border-gray-200/40 pb-1.5">
                            <span>Total Amount</span>
                            <span className="text-orange-700">₹{grandTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-indigo-700 font-semibold">
                            <span>Amount Paid</span>
                            <span>₹{invoiceData.amount_paid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between font-bold text-red-600 text-sm pt-0.5">
                            <span>Balance Due</span>
                            <span>₹{pendingAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Checkout Sticky Actions */}
                      <div className="pt-2 flex flex-col gap-2">
                        <Button 
                          size="default" 
                          onClick={handleCreateOrder} 
                          disabled={saving || !selectedCustomer || bookingStep !== 3}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 font-semibold text-sm disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                          REVIEW BOOKING TO CREATE
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handlePrint}
                            disabled={saving || (!selectedCustomer && !qCustomerName) || (invoiceItems.length === 0 && !selectedPackage)}
                            title="Print this invoice"
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print Invoice
                          </Button>
                          {mode !== "edit" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSaveAsQuote()}
                              disabled={saving}
                              className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1.5" />
                              Save Quote
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
        {/* ================= END WEB-ONLY CONTENT ================= */}

        {/* ================= PRINT-ONLY ITEMS & SUMMARY SECTION ================= */}
        <div className="hidden print:block px-3 py-2 space-y-2">
          {/* Package Details - Print Only */}
          {selectionMode === "package" && selectedPackage && invoiceData.invoice_type === "rental" && (
            <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 mb-2">
              <div className="text-[9px] text-slate-600 font-semibold uppercase tracking-wide">Package Selected</div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs text-gray-900">{selectedPackage.name || selectedPackage.variant_name}</div>
                  {selectedPackage.inclusions && (
                    <div className="text-[9px] text-gray-600">
                      Includes: {(Array.isArray(selectedPackage.inclusions) 
                        ? selectedPackage.inclusions.join(', ') 
                        : typeof selectedPackage.inclusions === 'string' 
                          ? selectedPackage.inclusions 
                          : ''
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-600">₹{packagePrice.toLocaleString()}</div>
                  {selectedPackage.security_deposit > 0 && (
                    <div className="text-[9px] text-gray-500">Deposit: ₹{selectedPackage.security_deposit.toLocaleString()}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Items Table - Print Optimized */}
          {invoiceItems.length > 0 && (
            <div>
              <div className="text-[9px] text-slate-600 font-semibold mb-1 uppercase tracking-wide">
                {selectionMode === "package" && selectedPackage ? "Additional Products" : "Products"}
              </div>
              <table className="w-full text-[10px] border border-gray-200 rounded">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-1.5 py-1 text-[9px] font-semibold text-slate-700 border-b border-slate-200 w-8"></th>
                    <th className="text-left px-1.5 py-1 text-[9px] font-semibold text-slate-700 border-b border-slate-200">Item</th>
                    <th className="text-center px-1.5 py-1 text-[9px] font-semibold text-slate-700 border-b border-slate-200 w-12">Qty</th>
                    <th className="text-right px-1.5 py-1 text-[9px] font-semibold text-slate-700 border-b border-slate-200 w-20">Rate</th>
                    <th className="text-right px-1.5 py-1 text-[9px] font-semibold text-slate-700 border-b border-slate-200 w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item) => {
                    const isPackageInclusion = selectionMode === "package" &&
                      item.product_id !== 'modification-service' &&
                      item.category !== 'Modification';
                    const lostDamageRate = item.unit_price || 0;

                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="px-1 py-0.5">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-7 w-7 object-cover rounded" />
                          ) : (
                            <div className="h-7 w-7 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-1.5 py-0.5">
                          <span className="font-bold text-[9px] text-gray-900 leading-tight block">{item.product_name}</span>
                          {item.category && <span className="text-[7px] text-gray-500 leading-tight block">{item.category}</span>}
                          {item.barcode && <span className="text-[7px] text-gray-400 font-mono leading-tight">#{item.barcode}</span>}
                          {invoiceData.invoice_type === "rental" && !isPackageInclusion && (() => {
                            const ldEntry = lostDamagedItems.find(ld => ld.product_id === item.product_id)
                            return ldEntry ? (
                              <span className="text-[7px] font-bold text-red-600 leading-tight block">
                                Lost/Damage ({ldEntry.type}): ₹{ldEntry.charge_per_item.toLocaleString()} × {ldEntry.quantity}
                              </span>
                            ) : null
                          })()}
                        </td>
                        <td className="px-1.5 py-0.5 text-center font-medium">{item.quantity}</td>
                        <td className="px-1.5 py-0.5 text-right font-medium text-gray-900">
                          {invoiceData.invoice_type === "rental" ? "Included" : isPackageInclusion ? "Included" : formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-1.5 py-0.5 text-right font-medium text-gray-900">
                          {invoiceData.invoice_type === "rental" ? "Included" : isPackageInclusion ? "Included" : formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Lost/Damage Charged Items - only show if there are actual charges */}
          {lostDamagedItems.length > 0 && (
            <div className="mt-2 border border-red-200 rounded overflow-hidden">
              <div className="bg-red-600 px-2 py-1">
                <span className="text-[9px] font-bold text-white uppercase">Lost / Damage Charges</span>
              </div>
              <table className="w-full text-[9px]">
                <tbody>
                  {lostDamagedItems.map((item) => (
                    <tr key={item.id} className="border-b border-red-100">
                      <td className="px-1.5 py-0.5 font-bold text-gray-900">{item.product_name}</td>
                      <td className="px-1.5 py-0.5 text-center capitalize text-red-700">{item.type}</td>
                      <td className="px-1.5 py-0.5 text-center">{item.quantity} × {formatCurrency(item.charge_per_item)}</td>
                      <td className="px-1.5 py-0.5 text-right text-red-700 font-bold">{formatCurrency(item.total_charge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes - Print */}
          {invoiceData.notes && (
            <div className="mt-1 px-2 py-1 bg-gray-50 rounded">
              <div className="text-[9px] text-slate-600 font-semibold uppercase tracking-wide">Notes</div>
              <div className="text-[10px] text-gray-700">{invoiceData.notes}</div>
            </div>
          )}

          {/* Payment Info & Summary - Print Only */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Payment Info (Only show if user has permission) */}
            {userPermissions?.invoice_payment_access !== false && (
            <div className="bg-gray-50 px-2 py-1.5 rounded">
              <div className="text-[9px] text-slate-600 font-semibold mb-1 uppercase tracking-wide">Payment Information</div>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{invoiceData.payment_method}</span>
                </div>
                {staffMembers.find(s => s.id === invoiceData.sales_closed_by_id) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sales Staff:</span>
                    <span className="font-medium">{staffMembers.find(s => s.id === invoiceData.sales_closed_by_id)?.name}</span>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Financial Summary */}
            <div className="bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
              <div className="text-[9px] text-slate-600 font-semibold mb-1 uppercase tracking-wide">Summary</div>
              <div className="space-y-0.5 text-[10px]">
                {selectionMode === "package" && selectedPackage && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Package</span>
                    <span className="font-medium">{formatCurrency(packagePrice)}</span>
                  </div>
                )}
                {selectionMode === "package" && selectedPackage && itemsSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Additional Items</span>
                    <span className="font-medium">{formatCurrency(itemsSubtotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {applyGst && (
                  <>
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>Base Amount</span>
                      <span>₹{Math.round(baseAmountBeforeGst).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>GST ({invoiceData.gst_percentage}%, incl.)</span>
                      <span>₹{Math.round(gstAmount).toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                {invoiceData.invoice_type === "rental" && securityDeposit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Security Deposit</span>
                    <span className="font-medium">{formatCurrency(securityDeposit)}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-1 mt-1">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span className="text-slate-600">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>{formatCurrency(invoiceData.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-600">
                    <span>Balance Due</span>
                    <span>{formatCurrency(pendingAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details + QR - Print Only */}
            {primaryBank && (
              <div className="bg-blue-50 px-2 py-1.5 rounded border border-blue-200">
                <div className="text-[9px] text-blue-700 font-semibold mb-1 uppercase tracking-wide">Payment Details</div>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-0 text-[9px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank:</span>
                      <span className="font-semibold">{primaryBank.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">A/C Holder:</span>
                      <span className="font-medium">{primaryBank.account_holder_name || primaryBank.account_holder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">A/C No:</span>
                      <span className="font-medium">{primaryBank.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IFSC:</span>
                      <span className="font-medium">{primaryBank.ifsc_code}</span>
                    </div>
                    {primaryBank.branch_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Branch:</span>
                        <span className="font-medium">{primaryBank.branch_name}</span>
                      </div>
                    )}
                    {primaryBank.upi_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">UPI:</span>
                        <span className="font-semibold text-blue-700">{primaryBank.upi_id}</span>
                      </div>
                    )}
                  </div>
                  {bankQrDataUrl && (
                    <div className="shrink-0 text-center">
                      <img src={bankQrDataUrl} alt="UPI QR" className="w-20 h-20 object-contain bg-white rounded border border-blue-200" />
                      <div className="text-[8px] text-gray-500 mt-0.5 font-medium">Scan to Pay</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terms & Conditions - Print */}
          <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
            <div className="text-[9px] text-gray-700 font-bold mb-1 uppercase tracking-wide border-b border-gray-300 pb-0.5">Terms &amp; Conditions</div>
            <div className="text-[8px] text-gray-600 leading-tight">
              {invoiceData.invoice_type === "sale" ? (
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Sale items cannot be returned.</li>
                  <li>Exchange is available within 2 days of the invoice date.</li>
                  <li>Please keep the original invoice for any exchange.</li>
                  <li>Final invoice &amp; product will be delivered after total amount is paid.</li>
                  <li>All disputes, if any, are subject to Vadodara, Gujarat jurisdiction only.</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>All product selections and order details are considered approved by the customer at the time of booking. Any changes after confirmation may not be possible, especially close to the event date.</li>
                  <li>For the best service experience, Safa Wale bookings should preferably be confirmed at least 30 days before the event.</li>
                  <li>The remaining payment, including the Security Deposit, must be completed before the event date.</li>
                  <li>Safas and rental items remain the customer&apos;s responsibility until collected by our team. Any lost, damaged, torn, burnt, or unreturned items will be charged as per the applicable lost/damage rates.</li>
                  <li>Our team will arrange collection of safas after the event. If items are unavailable on the agreed date, additional rental charges may be adjusted from the Security Deposit.</li>
                  <li>Safa Wale service includes up to 5 hours of assistance. Additional hours will be charged at ₹1,500 per hour.</li>
                  <li>Local city services include up to 1 hour; outstation services up to 4 hours and until 9:30 PM. Any additional time may be adjusted against the Security Deposit.</li>
                  <li>Sold products are non-returnable and non-exchangeable. All bookings and services are subject to Vadodara jurisdiction.</li>
                </ol>
              )}
            </div>
          </div>

          {/* Signatures - Print */}
          <div className="mt-4 px-2 flex justify-between items-end">
            <div className="text-center w-[40%]">
              <div className="border-t border-gray-400 pt-1 mt-10">
                <p className="text-[10px] font-semibold text-gray-700">Customer Signature</p>
              </div>
            </div>
            <div className="text-center w-[40%] flex flex-col items-center justify-end">
              {companySettings?.signature_url ? (
                <div className="h-10 w-auto mb-1 flex items-center justify-center">
                  <img 
                    src={companySettings.signature_url} 
                    alt="Authorized Signature" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-10" />
              )}
              <div className="border-t border-gray-400 pt-1 w-full">
                <p className="text-[10px] font-semibold text-gray-700">Authorized Signature</p>
                <p className="text-[8px] text-gray-500">{companySettings?.company_name || 'Safawala'}</p>
              </div>
            </div>
          </div>

          {/* Footer - Print */}
          <div className="mt-2 pt-1 border-t border-slate-200 text-center">
            <p className="text-[10px] font-semibold text-slate-600">Thank you for choosing Safawala!</p>
            <p className="text-[8px] text-gray-500">For queries: {companySettings?.phone || ''} | {companySettings?.email || ''}</p>
          </div>
        </div>
        {/* ================= END PRINT-ONLY ITEMS & SUMMARY ================= */}
      </div>

      {/* Bottom Action Bar is now integrated into Checkout Overview card */}

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Address"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCustomer}>
                Create Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Product Dialog */}
      <Dialog open={showCustomProductDialog} onOpenChange={setShowCustomProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Product Name *</Label>
              <Input
                placeholder="Enter product name"
                value={customProductData.name}
                onChange={(e) => setCustomProductData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Category *</Label>
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
              <Label className="text-sm font-medium">Price * (₹)</Label>
              <Input
                type="number"
                placeholder="Enter price"
                value={customProductData.price}
                onChange={(e) => setCustomProductData(prev => ({ ...prev, price: e.target.value }))}
                className="mt-1"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Product Image (optional)</Label>
              
              <div className="mt-2 flex gap-2">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    onClick={() => setCustomProductData(prev => ({ ...prev, image_url: '' }))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCustomProductDialog(false)
                  setCustomProductData({ name: '', category_id: '', image_url: '', price: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateCustomProduct}
                disabled={creatingProduct}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {creatingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create & Add
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Conversion Confirmation Dialog */}
      <Dialog open={!!selectedLeadToConvert} onOpenChange={(open) => !open && setSelectedLeadToConvert(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">Convert Lead to Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to convert the lead <strong>{selectedLeadToConvert?.name}</strong> to a customer profile and select it for this booking?
            </p>
            {selectedLeadToConvert && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-700 border border-slate-100">
                <div><strong>Name:</strong> {selectedLeadToConvert.name}</div>
                <div><strong>WhatsApp:</strong> {selectedLeadToConvert.phone}</div>
                {selectedLeadToConvert.event_date && (
                  <div><strong>Event Date:</strong> {new Date(selectedLeadToConvert.event_date).toLocaleDateString()}</div>
                )}
                {selectedLeadToConvert.location && (
                  <div><strong>Location/Venue:</strong> {selectedLeadToConvert.location}</div>
                )}
                {selectedLeadToConvert.package_interest && (
                  <div><strong>Package Interest:</strong> {selectedLeadToConvert.package_interest}</div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedLeadToConvert(null)} disabled={convertingLead} className="text-xs">
                Cancel
              </Button>
              <Button 
                onClick={() => handleConvertLead(selectedLeadToConvert)} 
                disabled={convertingLead}
                className="bg-[#113c2c] hover:bg-[#0c2e22] text-white text-xs font-semibold"
              >
                {convertingLead ? "Converting..." : "Convert & Select"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </>
    </DashboardLayout>
  )
}
