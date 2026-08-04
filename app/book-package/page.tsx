"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { sendInvoiceViaWhatsApp } from "@/lib/send-invoice-whatsapp"
import { triggerPDFGeneration } from "@/lib/generate-pdf-helper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft, ArrowRight, User, Package, FileText, Search, X, Plus, Minus,
  CalendarIcon, Gift, ShoppingCart, Loader2, CheckCircle, Camera, ImageIcon
} from "lucide-react"
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog"
import { computeDistanceAddonForVariant } from "@/lib/distance-pricing"

interface Customer { id: string; name: string; phone: string; email?: string; pincode?: string }
interface PackageCategory { id: string; name: string; description?: string; security_deposit?: number; display_order?: number }
interface PackageVariant { id: string; category_id: string; name: string; variant_name?: string; base_price: number; extra_safa_price: number; missing_safa_penalty?: number; security_deposit?: number; inclusions?: string[] | string; is_active?: boolean }
interface DistancePricing { id: string; package_variant_id: string; distance_range: string; min_distance_km: number; max_distance_km: number; additional_price: number }
interface BookingItem {
  id: string
  category: PackageCategory
  variant: PackageVariant
  quantity: number
  unit_price: number
  total_price: number
  extra_safas: number
  distance_addon?: number
  security_deposit?: number
  products_pending?: boolean
  // Reserved products selected for this booking item (UI/summary only)
  selected_products?: Array<{ id: string; name: string; qty: number; image_url?: string }>
  custom_inclusions?: string[]
}
interface StaffMember { id: string; name: string; email: string; role: string; franchise_id: string }

// Currency formatter for Indian Rupees
const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount)

// Time conversion helpers
const convert24to12 = (time24: string): { time12: string; period: 'AM' | 'PM' } => {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return { time12: `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, period }
}

const convert12to24 = (time12: string, period: 'AM' | 'PM'): string => {
  const [hours, minutes] = time12.split(':').map(Number)
  let hours24 = hours
  if (period === 'PM' && hours !== 12) hours24 = hours + 12
  if (period === 'AM' && hours === 12) hours24 = 0
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// Custom Scrollable Select Component
const ScrollableSelect = ({ value, onChange, options, className }: { 
  value: string; 
  onChange: (value: string) => void; 
  options: string[]; 
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`} style={{ zIndex: isOpen ? 9999 : 'auto' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center font-semibold"
      >
        {value}
      </button>
      {isOpen && (
        <div 
          className="absolute mt-1 w-full bg-white border-2 border-green-500 rounded-md shadow-2xl overflow-y-auto"
          style={{ 
            maxHeight: '180px',
            zIndex: 10000
          }}
        >
          {options.map(opt => (
            <div
              key={opt}
              ref={opt === value ? selectedRef : null}
              onClick={() => {
                onChange(opt)
                setIsOpen(false)
              }}
              className={`px-3 py-2.5 cursor-pointer text-center font-medium transition-colors ${
                opt === value 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Time Picker Component with AM/PM - Custom Dropdown Version
const TimePicker = ({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) => {
  const { time12, period } = convert24to12(value)
  const [hours, minutes] = time12.split(':')
  const [localHours, setLocalHours] = useState(hours)
  const [localMinutes, setLocalMinutes] = useState(minutes)
  const [localPeriod, setLocalPeriod] = useState<'AM' | 'PM'>(period)

  useEffect(() => {
    const { time12: newTime, period: newPeriod } = convert24to12(value)
    const [h, m] = newTime.split(':')
    setLocalHours(h)
    setLocalMinutes(m)
    setLocalPeriod(newPeriod)
  }, [value])

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    const time12 = `${newHours.padStart(2, '0')}:${newMinutes.padStart(2, '0')}`
    onChange(convert12to24(time12, localPeriod))
  }

  const handleHoursChange = (newHours: string) => {
    setLocalHours(newHours)
    handleTimeChange(newHours, localMinutes)
  }

  const handleMinutesChange = (newMinutes: string) => {
    setLocalMinutes(newMinutes)
    handleTimeChange(localHours, newMinutes)
  }

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    setLocalPeriod(newPeriod)
    const time12 = `${localHours.padStart(2, '0')}:${localMinutes.padStart(2, '0')}`
    onChange(convert12to24(time12, newPeriod))
  }

  // Generate hours (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1
    return hour.toString().padStart(2, '0')
  })

  // Generate minutes (0-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    return i.toString().padStart(2, '0')
  })

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <div className="flex items-center gap-1 flex-1">
        <ScrollableSelect
          value={localHours}
          onChange={handleHoursChange}
          options={hourOptions}
          className="flex-1"
        />
        <span className="text-sm font-medium">:</span>
        <ScrollableSelect
          value={localMinutes}
          onChange={handleMinutesChange}
          options={minuteOptions}
          className="flex-1"
        />
      </div>
      <div className="flex border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => handlePeriodChange('AM')}
          className={`px-3 py-1 text-sm font-medium transition-colors ${
            localPeriod === 'AM' 
              ? 'bg-green-700 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange('PM')}
          className={`px-3 py-1 text-sm font-medium transition-colors ${
            localPeriod === 'PM' 
              ? 'bg-green-700 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  )
}

const STEPS = [
  { id: 1, name: "Customer & Event", icon: User },
  { id: 2, name: "Package Selection", icon: Package },
  { id: 3, name: "Review", icon: FileText },
]

export default function BookPackageWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editQuoteId = searchParams.get('edit')
  const [isEditMode, setIsEditMode] = useState(false)
  const [loadingQuoteData, setLoadingQuoteData] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)  // ✅ Store logged-in user
  const [basePincode, setBasePincode] = useState<string>('390007') // Default fallback
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<PackageCategory[]>([])
  const [variantsForCategory, setVariantsForCategory] = useState<PackageVariant[]>([])
  const [allVariants, setAllVariants] = useState<PackageVariant[]>([])
  const [variantCounts, setVariantCounts] = useState<Record<string, number>>({})
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | null>(null)
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [distanceKm, setDistanceKm] = useState<number>(0)
  const [customerSearch, setCustomerSearch] = useState("")
  const [packageSearch, setPackageSearch] = useState("")
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [eventDateOpen, setEventDateOpen] = useState(false)
  const [deliveryDateOpen, setDeliveryDateOpen] = useState(false)
  const [returnDateOpen, setReturnDateOpen] = useState(false)
  const [useCustomPricing, setUseCustomPricing] = useState(false)
  const [customPricing, setCustomPricing] = useState({
    package_price: 0,
  })
  const [formData, setFormData] = useState({
    event_type: "Wedding",
    event_participant: "Both" as "Groom" | "Bride" | "Both",
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
    notes: "",
    payment_type: "full" as "full" | "advance" | "partial",
    custom_amount: 0,
    discount_type: "flat" as "flat" | "percentage",
    discount_amount: 0,
    coupon_code: "",
    coupon_discount: 0
  })
  const [variantSelectionOpen, setVariantSelectionOpen] = useState(false)
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [gstPercentage, setGstPercentage] = useState<number>(5.0) // GST from company settings
  // Feature flag: render variant grid under categories (we'll open dialog instead)
  const SHOW_VARIANT_GRID = false

  // Deposit policy: where to collect refundable security deposit
  // booking: collect now; delivery: collect later; none: do not collect
  const DEPOSIT_POLICY = {
    collectAt: 'booking' as 'booking' | 'delivery' | 'none',
    label: 'Security Deposit (Refundable)'
  }
  
  // Product selection dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [productDialogContext, setProductDialogContext] = useState<{ category: PackageCategory; variant: PackageVariant; eventDate?: string; itemId?: string; distanceKm?: number; pincode?: string; customInclusions?: string[] } | null>(null)

  useEffect(() => { loadData() }, [])

  // Load quote data for editing
  useEffect(() => {
    if (editQuoteId && !loadingQuoteData && customers.length > 0 && allVariants.length > 0) {
      loadQuoteForEdit(editQuoteId)
    }
  }, [editQuoteId, customers, allVariants])

  const loadData = async () => {
    setCustomersLoading(true)
    try {
      // Fetch current user first for franchise filtering
      const userRes = await fetch("/api/auth/user")
      const userData = await userRes.json()
      setCurrentUser(userData)  // ✅ Store user in state for later use
      
      // Fetch company settings to get base pincode
      if (userData.franchise_id) {
        try {
          const settingsRes = await fetch(`/api/settings/company?franchise_id=${userData.franchise_id}`)
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json()
            const pincode = settingsData.data?.pincode
            const gst = settingsData.data?.gst_percentage
            
            if (pincode) {
              setBasePincode(pincode)
            } else {
            }
            
            if (gst !== undefined && gst !== null) {
              setGstPercentage(Number(gst))
            } else {
            }
          } else {
            console.warn('Failed to fetch company settings, using defaults')
          }
        } catch (err) {
          console.warn('Error loading company settings, using default pincode:', err)
        }
      }
      
      // Fetch all data in parallel for faster loading ⚡
      const [staffResp, customersResponse, catHttp, variantHttp] = await Promise.all([
        fetch('/api/staff', { cache: 'no-store' }),
        fetch('/api/customers?basic=1', { cache: 'no-store' }),
        fetch('/api/packages/categories', { cache: 'no-store' }),
        fetch('/api/packages/variants', { cache: 'no-store' }),
      ])
      
      // Process staff
      const staffJson = staffResp.ok ? await staffResp.json() : { staff: [] }
      const staffRes = { data: (staffJson?.staff || []).filter((s: any) => ['staff','franchise_admin'].includes(s.role)), error: staffResp.ok ? null : new Error('Failed to load staff') }
      
      // Process customers
      let customersData: Customer[] = []
      if (customersResponse.ok) {
        const result = await customersResponse.json()
        customersData = result.data || []
      } else {
        console.error("Error loading customers from API:", customersResponse.status)
      }
      
      // Process categories and variants
      const catJson = catHttp.ok ? await catHttp.json() : { data: [] }
      const variantJson = variantHttp.ok ? await variantHttp.json() : { data: [] }
      const catRes = { data: catJson?.data || [], error: catHttp.ok ? null : new Error('Failed to load categories') }
      const variantRes = { data: variantJson?.data || [], error: variantHttp.ok ? null : new Error('Failed to load variants') }
      
      const custRes = { data: customersData, error: null }
      
      if (custRes.error) {
        console.error("Error loading customers:", custRes.error)
      }
      if (catRes.error) {
        console.error("Error loading categories:", catRes.error)
      }
      if (variantRes.error) {
        console.error("Error loading variants:", variantRes.error)
      }
      
      if (variantRes.data && variantRes.data.length > 0) {
        const firstVariant = variantRes.data[0]
      }
      if (staffRes.error) {
        console.error("Error loading staff - Full error object:", JSON.stringify(staffRes.error, null, 2))
        toast.error(`Failed to load staff members`)
      } else {
        console.table(staffRes.data)
      }
      
      if (custRes.error || catRes.error || variantRes.error) throw new Error("Error loading data")
      
      setCustomers(custRes.data || [])
  setCategories(catRes.data || [])
  setAllVariants(variantRes.data || [])
  setStaffMembers(staffRes.data || [])
      
      // Auto-select current user as sales staff if they are in the staff list
      if (userData && staffRes.data) {
        const currentUserInStaff = staffRes.data.find((s: any) => s.id === userData.id)
        if (currentUserInStaff) {
          setSelectedStaff(userData.id)
        }
      }
    } catch (e) {
      console.error("Error in loadData:", e)
      toast.error("Error loading data")
    } finally {
      setCustomersLoading(false)
    }
  }

  const loadQuoteForEdit = async (quoteId: string) => {
    try {
      setLoadingQuoteData(true)
      setIsEditMode(true)

      // Load quote header from package_bookings
      const { data: quote, error: quoteError } = await supabase
        .from('package_bookings')
        .select('*')
        .eq('id', quoteId)
        .single()

      if (quoteError) throw quoteError

      // Load quote items
      const { data: items, error: itemsError } = await supabase
        .from('package_booking_items')
        .select('*')
        .eq('booking_id', quoteId)

      if (itemsError) throw itemsError

      // Find and set customer
      const customer = customers.find(c => c.id === quote.customer_id)
      if (customer) {
        setSelectedCustomer(customer)
      }

      // Set sales staff
      if (quote.sales_staff_id) {
        setSelectedStaff(quote.sales_staff_id)
      }

      // Set distance
      if (quote.distance_km) {
        setDistanceKm(quote.distance_km)
      }

      // Pre-fill form data
      const eventDateTime = quote.event_date ? new Date(quote.event_date) : null
      const deliveryDateTime = quote.delivery_date ? new Date(quote.delivery_date) : null
      const returnDateTime = quote.return_date ? new Date(quote.return_date) : null

      setFormData({
        event_type: quote.event_type || "Wedding",
        event_participant: quote.event_participant || "Both",
        payment_type: quote.payment_type || "full",
        custom_amount: quote.custom_amount || 0,
        discount_type: "flat" as "flat" | "percentage",
        discount_amount: quote.discount_amount || 0,
        coupon_code: quote.coupon_code || "",
        coupon_discount: quote.coupon_discount || 0,
        event_date: eventDateTime ? format(eventDateTime, "yyyy-MM-dd") : "",
        event_time: eventDateTime ? format(eventDateTime, "HH:mm") : "10:00",
        delivery_date: deliveryDateTime ? format(deliveryDateTime, "yyyy-MM-dd") : "",
        delivery_time: deliveryDateTime ? format(deliveryDateTime, "HH:mm") : "09:00",
        return_date: returnDateTime ? format(returnDateTime, "yyyy-MM-dd") : "",
        return_time: returnDateTime ? format(returnDateTime, "HH:mm") : "18:00",
        venue_address: quote.venue_address || "",
        groom_name: quote.groom_name || "",
        groom_whatsapp: quote.groom_whatsapp || "",
        groom_address: quote.groom_address || "",
        bride_name: quote.bride_name || "",
        bride_whatsapp: quote.bride_whatsapp || "",
        notes: quote.notes || "",
      })

      // Prefill custom pricing if present
      if (typeof quote.use_custom_pricing === 'boolean') {
        setUseCustomPricing(!!quote.use_custom_pricing)
      }
      if (quote.custom_package_price != null) {
        setCustomPricing({
          package_price: Number(quote.custom_package_price || 0),
        })
      }

      // Pre-fill booking items - reconstruct BookingItem[]
      const loadedItems: BookingItem[] = []
      for (const item of items) {
        // Find category
        const category = categories.find(c => c.id === item.category_id)
        if (category) {
          // Find variant
          const variant = allVariants.find(v => v.id === item.variant_id)
          if (variant) {
            loadedItems.push({
              id: Math.random().toString(36).substr(2, 9),
              category,
              variant,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              extra_safas: item.extra_safas || 0,
              distance_addon: item.distance_addon || 0,
              security_deposit: item.security_deposit || (variant.security_deposit) || (category.security_deposit) || 0,
              products_pending: false,
              custom_inclusions: item.variant_inclusions || variant.inclusions,
            })
          }
        }
      }
      setBookingItems(loadedItems)

      // Move to review step if items loaded
      if (loadedItems.length > 0) {
        setCurrentStep(3)
      }

      toast.success("Quote loaded successfully")
    } catch (error) {
      console.error("Error loading quote:", error)
      toast.error("Failed to load quote data")
      router.push('/quotes')
    } finally {
      setLoadingQuoteData(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers
    const search = customerSearch.toLowerCase()
    return customers.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search))
  }, [customers, customerSearch])

  // Only show categories that actually have variants (>0) for this user/franchise
  const displayCategories = useMemo(() => {
    if (!categories || categories.length === 0) return []
    if (!allVariants || allVariants.length === 0) return categories
    const allowed = new Set([21,31,41,51,61,71,81,91,101])
    const withVariants = categories.filter(c => (variantCounts[c.id] ?? 0) > 0)
    const filtered = withVariants.filter(c => {
      const m = (c.name || '').match(/(\d{2,3})/)
      const n = m ? Number(m[1]) : NaN
      return Number.isFinite(n) && allowed.has(n as any)
    })
    // Sort by the number (21→101)
    return filtered.sort((a,b) => {
      const na = Number(((a.name||'').match(/(\d{2,3})/)||[])[1]||0)
      const nb = Number(((b.name||'').match(/(\d{2,3})/)||[])[1]||0)
      return na - nb
    })
  }, [categories, allVariants, variantCounts])

  // Filter variants by selected category and search
  const filteredVariants = useMemo(() => {
    if (!selectedCategory) return []
    // Try both column names: category_id (new) and package_id (legacy)
    let filtered = allVariants.filter(v => 
      v.category_id === selectedCategory.id || 
      (v as any).package_id === selectedCategory.id
    )
    
    if (packageSearch) filtered = filtered.filter(v => (v.name || v.variant_name || '').toLowerCase().includes(packageSearch.toLowerCase()))
    return filtered
  }, [allVariants, selectedCategory, packageSearch])

  // No auto-selection on load; open dialog when a category is clicked

  // If current category becomes invisible (0 variants), move selection to first visible
  useEffect(() => {
    if (!selectedCategory) return
    const count = variantCounts[selectedCategory.id] ?? 0
    if (allVariants.length > 0 && count === 0) {
      const visible = displayCategories
      if (visible.length > 0) {
        const prefer21 = visible.find(c => /(^|\s)21\s*Safa/i.test(c.name))
        setSelectedCategory(prefer21 || visible[0])
      } else {
        setSelectedCategory(null)
      }
    }
  }, [variantCounts, allVariants, displayCategories, selectedCategory])

  // Update variantsForCategory when selectedCategory changes
  useEffect(() => {
    if (selectedCategory) {
      const variants = allVariants.filter(v => 
        v.category_id === selectedCategory.id || (v as any).package_id === selectedCategory.id
      )
      setVariantsForCategory(variants)
    } else {
      setVariantsForCategory([])
    }
  }, [selectedCategory, allVariants])

  // Compute counts per category for UI badges
  useEffect(() => {
    if (!allVariants || allVariants.length === 0) { setVariantCounts({}); return }
    const counts: Record<string, number> = {}
    for (const v of allVariants) {
      const key = (v as any).category_id || (v as any).package_id
      if (!key) continue
      counts[key] = (counts[key] || 0) + 1
    }
    setVariantCounts(counts)
  }, [allVariants])

  const totals = useMemo(() => {
    // If custom pricing is enabled, use custom values
    if (useCustomPricing) {
      const packagePrice = customPricing.package_price || 0
      const gst = packagePrice * (gstPercentage / 100)
      const grand = packagePrice + gst
      
      // Security deposit (no GST, separate from package)
      const securityDeposit = bookingItems.reduce((s, i) => s + (i.security_deposit || 0) * i.quantity, 0)
      
      let payable = grand
      let advanceDue = 0
      
      // ADVANCE LOGIC: 50% of grand total + deposit now, 50% later
      if (formData.payment_type === "advance") {
        advanceDue = grand / 2
        payable = advanceDue
      } else if (formData.payment_type === "partial") {
        payable = Math.min(grand, Math.max(0, formData.custom_amount))
      }
      
      const remaining = grand - payable
      // Determine deposit placement. For partial payments we ALWAYS defer the
      // security deposit to the remaining payment (do not collect now) so the
      // customer only pays their partial package amount today.
      let depositDueNow = DEPOSIT_POLICY.collectAt === 'booking' ? securityDeposit : 0
      let depositDueLater = DEPOSIT_POLICY.collectAt === 'delivery' ? securityDeposit : 0
      if (formData.payment_type === 'partial') {
        // For partial payments, move the deposit to the later/pending amount
        depositDueLater = securityDeposit
        depositDueNow = 0
      }
      const payableNowTotal = payable + depositDueNow
      const remainingPackage = remaining
      const remainingTotal = remainingPackage + depositDueLater
      
      return {
        subtotal: packagePrice,
        baseSubtotal: packagePrice,
        distanceSurcharge: 0,
        manualDiscount: 0,
        couponDiscount: 0,
        gst,
        grand,
        payable, // package portion due now
        remaining: remainingPackage, // package portion remaining
        advanceDue,
        securityDeposit,
        depositDueNow,
        depositDueLater,
        payableNowTotal,
        remainingTotal,
        isCustom: true
      }
    }
    
    // Standard calculated pricing
    const subtotal = bookingItems.reduce((s, i) => s + i.total_price, 0)
    const distanceSurcharge = bookingItems.reduce((s, i) => s + (i.distance_addon || 0) * i.quantity, 0)
    const baseSubtotal = Math.max(0, subtotal - distanceSurcharge)
    
    // Apply manual discount
    let manualDiscount = 0
    if (formData.discount_type === "flat") {
      manualDiscount = Math.min(subtotal, formData.discount_amount || 0)
    } else if (formData.discount_type === "percentage") {
      const percentage = Math.min(100, Math.max(0, formData.discount_amount || 0))
      manualDiscount = subtotal * (percentage / 100)
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotal - manualDiscount)
    
    // Apply coupon discount (on subtotal after manual discount)
    const couponDiscount = Math.min(subtotalAfterDiscount, formData.coupon_discount || 0)
    const subtotalAfterCoupon = Math.max(0, subtotalAfterDiscount - couponDiscount)
    
    const gst = subtotalAfterCoupon * (gstPercentage / 100)
    const grand = subtotalAfterCoupon + gst
    
    // Security deposit (no GST, separate from package)
    const securityDeposit = bookingItems.reduce((s, i) => s + (i.security_deposit || 0) * i.quantity, 0)
    
    let payable = grand // package portion due now
    let advanceDue = 0
    
    // ADVANCE LOGIC: 50% of grand total + deposit now, 50% later
    if (formData.payment_type === "advance") {
      advanceDue = grand / 2
      payable = advanceDue
    } else if (formData.payment_type === "partial") {
      payable = Math.min(grand, Math.max(0, formData.custom_amount))
    }
    
    // Determine deposit placement. For partial payments we ALWAYS defer the
    // security deposit to the remaining payment (do not collect now) so the
    // customer only pays their partial package amount today.
    let depositDueNow = DEPOSIT_POLICY.collectAt === 'booking' ? securityDeposit : 0
    let depositDueLater = DEPOSIT_POLICY.collectAt === 'delivery' ? securityDeposit : 0
    if (formData.payment_type === 'partial') {
      depositDueLater = securityDeposit
      depositDueNow = 0
    }
    const payableNowTotal = payable + depositDueNow
    const remainingPackage = grand - payable
    const remainingTotal = remainingPackage + depositDueLater
    
    return {
      subtotal,
      baseSubtotal,
      distanceSurcharge,
      manualDiscount,
      subtotalAfterDiscount,
      couponDiscount,
      subtotalAfterCoupon,
      gst,
      grand,
      payable, // package portion due now
      remaining: remainingPackage, // package portion remaining
      advanceDue,
      securityDeposit,
      depositDueNow,
      depositDueLater,
      payableNowTotal,
      remainingTotal,
      isCustom: false
    }
  }, [bookingItems, formData, useCustomPricing, customPricing, gstPercentage])

  const computeDistanceAddon = async (variantId: string, km: number, baseAmount: number): Promise<number> => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams({ variant_id: variantId, km: String(km || 0), base: String(baseAmount || 0) })
        const res = await fetch(`/api/distance-pricing/compute?${params.toString()}`)
        if (res.ok) {
          const body = await res.json()
          if (body && body.ok === true && typeof body.addon === 'number') return body.addon
          // Some older handlers might return { success: true }
          if (body && body.success === true && typeof body.addon === 'number') return body.addon
        }
      }
    } catch {}
    // Fallback to client-side computation (may return 0 if client env is missing)
    return computeDistanceAddonForVariant(variantId, km, baseAmount)
  }

  const addPackageItem = async (category: PackageCategory, variant: PackageVariant, extraSafas: number, customInclusions: string[]): Promise<BookingItem> => {
    const baseUnit = variant.base_price + extraSafas * (variant.extra_safa_price || 0)
    const distanceAddon = await computeDistanceAddon(variant.id, Number(distanceKm) || 0, baseUnit)
    const unit = baseUnit + distanceAddon
    // Determine security deposit precedence: variant > category
    const secDepositUnit = (typeof variant.security_deposit === 'number' ? variant.security_deposit : undefined)
      ?? (typeof category.security_deposit === 'number' ? category.security_deposit : 0)
    const item: BookingItem = {
      id: `pkg-${category.id}-${variant.id}-${Date.now()}`,
      category,
      variant,
      quantity: 1,
      unit_price: unit,
      total_price: unit,
      extra_safas: extraSafas,
      distance_addon: distanceAddon,
      security_deposit: secDepositUnit || 0,
      products_pending: false,
      custom_inclusions: customInclusions,
    }
    setBookingItems(prev => [...prev, item])
    const vName = (variant?.name || variant?.variant_name || '').trim()
    toast.success(vName ? `Added ${category.name} – ${vName}` : `Added ${category.name}`)
    return item
  }

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) { setBookingItems(prev => prev.filter(i => i.id !== id)); return }
  setBookingItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty, total_price: i.unit_price * qty } : i))
  }

  const removeItem = (id: string) => { setBookingItems(prev => prev.filter(i => i.id !== id)); toast.success("Item removed") }

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers(c => [...c, newCustomer])
    setSelectedCustomer(newCustomer)
    setShowNewCustomer(false)
    toast.success("Customer created!")
  }

  const canGoNext = () => {
    if (currentStep === 1) return selectedCustomer !== null && formData.event_date !== ""
    if (currentStep === 2) return bookingItems.length > 0
    return true
  }

  const handleNext = () => {
    if (!canGoNext()) {
      if (currentStep === 1) toast.error("Please select customer and event date")
      else if (currentStep === 2) toast.error("Please add at least one package")
      return
    }
    setCurrentStep(s => Math.min(s + 1, 3))
  }

  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 1))

  // Recalculate distance surcharges for existing items when effective distance changes
  useEffect(() => {
    const recalc = async () => {
      if (!bookingItems.length) return
      const km = Number(distanceKm) || 0
      const updated: BookingItem[] = []
      for (const i of bookingItems) {
        const baseUnit = (i.unit_price - (i.distance_addon || 0))
        const addon = await computeDistanceAddon(i.variant.id, km, baseUnit)
        const unit = baseUnit + addon
        updated.push({ ...i, unit_price: unit, total_price: unit * i.quantity, distance_addon: addon })
      }
      setBookingItems(updated)
    }
    recalc()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceKm])

  // Listen for product selection skip to flag 'products_pending' on a specific item
  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.itemId as string | undefined
      if (!id) return
      setBookingItems(prev => prev.map(i => i.id === id ? { ...i, products_pending: true } : i))
    }
    window.addEventListener('pkg-products-skipped', handler as any)
    return () => window.removeEventListener('pkg-products-skipped', handler as any)
  }, [])

  // Listen for reserved products and attach them to the matching booking item
  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.itemId as string | undefined
      const products = e?.detail?.products as Array<{ id: string; name: string; qty: number; image_url?: string }>
      if (!id || !Array.isArray(products)) return
      setBookingItems(prev => prev.map(i => i.id === id ? { ...i, selected_products: products, products_pending: false } : i))
    }
    window.addEventListener('pkg-products-selected', handler as any)
    return () => window.removeEventListener('pkg-products-selected', handler as any)
  }, [])

  // When product selection dialog opens, restore any previously selected products for that booking item
  useEffect(() => {
    if (productDialogOpen && productDialogContext?.itemId) {
      const bookingItem = bookingItems.find(i => i.id === productDialogContext.itemId)
      if (bookingItem?.selected_products && bookingItem.selected_products.length > 0) {
        // Dispatch event to restore previous selection
        setTimeout(() => {
          const ev = new CustomEvent('pkg-restore-selection', { 
            detail: { 
              itemId: productDialogContext.itemId, 
              selected_products: bookingItem.selected_products 
            } 
          })
          window.dispatchEvent(ev)
        }, 100)
      }
    }
  }, [productDialogOpen, productDialogContext?.itemId, bookingItems])

  // Resolve effective km from selected customer's pincode using optional mapping tables
  useEffect(() => {
    const resolveKm = async () => {
      const pin = selectedCustomer?.pincode?.trim()
      if (!pin) { setDistanceKm(0); return }
      // Use dynamic base pincode from company settings
      const basePin = basePincode
      
      // Same pincode = 0 km
      if (pin === basePin) { setDistanceKm(0); return }
      
      // 1) Check exact distance table first (highest priority - cached distances)
      try {
        const { data: exactData, error: exactError } = await supabase
          .from('pincode_distances_exact')
          .select('distance_km, method')
          .eq('from_pincode', basePin)
          .eq('to_pincode', pin)
          .limit(1)
        
        if (!exactError && exactData && exactData.length > 0) {
          setDistanceKm(Number(exactData[0].distance_km))
          return
        }
      } catch (error) {
        console.warn('Cache lookup error:', error)
      }
      
      // 2) Distance not in cache - fetch from API and cache it
      try {
        const response = await fetch(`/api/calculate-distance?from=${basePin}&to=${pin}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.distanceKm) {
            setDistanceKm(data.distanceKm)
            
            // Cache the result in database for future use
            await supabase.from('pincode_distances_exact').insert({
              from_pincode: basePin,
              to_pincode: pin,
              distance_km: data.distanceKm,
              method: data.method || 'api',
              source: data.method === 'geolocation' ? 'OpenStreetMap API' : 'Estimation',
              verified: data.method === 'geolocation'
            }).catch((err: any) => {
              console.warn('Failed to cache distance:', err)
            })
            
            return
          }
        }
      } catch (error) {
        console.warn('Distance API error:', error)
      }
      
      // Fallback: Use improved region-based estimation
      const basePincodeNum = 390001
      const customerPincode = parseInt(pin)
      if (!isNaN(customerPincode)) {
        const fromRegion = Math.floor(basePincodeNum / 10000)
        const toRegion = Math.floor(customerPincode / 10000)
        
        let estimatedKm: number
        if (fromRegion === toRegion) {
          // Same sub-region (39xxxx to 39xxxx)
          estimatedKm = Math.abs(customerPincode - basePincodeNum) / 100
        } else {
          // Different regions - use larger multiplier
          const regionDiff = Math.abs(fromRegion - toRegion)
          estimatedKm = regionDiff * 200 // ~200 km per region
        }
        setDistanceKm(Math.round(estimatedKm))
      } else {
        setDistanceKm(0)
      }
    }
    resolveKm()
  }, [selectedCustomer?.pincode, basePincode])

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
          orderValue: totals.subtotalAfterDiscount || totals.subtotal, // Apply coupon after manual discount
          customerId: selectedCustomer?.id,
          franchise_id: currentUser?.franchise_id || null,
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

  const handleSubmit = async (asQuote: boolean = false) => {
    if (!selectedCustomer || bookingItems.length === 0 || !formData.event_date) {
      toast.error("Missing required information")
      return
    }
    setLoading(true)
    try {
      // ==================================================================
      // EDIT MODE: Update existing quote
      // ==================================================================
      if (isEditMode && editQuoteId) {
        // Resolve event date/time
        const eventDate = new Date(formData.event_date)
        const [hours, minutes] = formData.event_time.split(":")
        eventDate.setHours(parseInt(hours), parseInt(minutes))

        // Combine delivery/return dates with times
        const deliveryDateISO = formData.delivery_date ? (() => {
          const d = new Date(formData.delivery_date)
          const [hh, mm] = (formData.delivery_time || '00:00').split(':')
          d.setHours(parseInt(hh||'0'), parseInt(mm||'0'))
          return d.toISOString()
        })() : null
        const returnDateISO = formData.return_date ? (() => {
          const d = new Date(formData.return_date)
          const [hh, mm] = (formData.return_time || '00:00').split(':')
          d.setHours(parseInt(hh||'0'), parseInt(mm||'0'))
          return d.toISOString()
        })() : null

        // 1. Update quote header
        const { error: updateError } = await supabase
          .from("package_bookings")
          .update({
            customer_id: selectedCustomer.id,
            event_type: formData.event_type,
            event_participant: formData.event_participant,
            payment_type: formData.payment_type,
            custom_amount: formData.custom_amount,
            discount_amount: formData.discount_amount,
            coupon_code: formData.coupon_code || null,
            coupon_discount: formData.coupon_discount || 0,
            event_date: eventDate.toISOString(),
            delivery_date: deliveryDateISO,
            return_date: returnDateISO,
            venue_address: formData.venue_address,
            groom_name: formData.groom_name || null,
            groom_whatsapp: formData.groom_whatsapp || null,
            groom_address: formData.groom_address || null,
            bride_name: formData.bride_name || null,
            bride_whatsapp: formData.bride_whatsapp || null,
            notes: formData.notes || null,
            distance_km: distanceKm,
            distance_amount: (totals as any).distanceSurcharge || 0,
            tax_amount: totals.gst,
            subtotal_amount: totals.subtotal,
            total_amount: totals.grand,
            security_deposit: (totals as any).baseDeposit || 0,
            amount_paid: totals.payable + ((totals as any).baseDeposit || 0),
            pending_amount: totals.remaining,
            sales_closed_by_id: selectedStaff || null,
            use_custom_pricing: useCustomPricing || false,
            custom_package_price: useCustomPricing ? customPricing.package_price : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editQuoteId)

        if (updateError) throw updateError

        // 2. Delete existing items
        const { error: deleteError } = await supabase
          .from("package_booking_items")
          .delete()
          .eq('booking_id', editQuoteId)

        if (deleteError) throw deleteError

        // 3. Insert updated items
        const itemRows = bookingItems.map((itm) => ({
          booking_id: editQuoteId,
          category_id: itm.category.id,
          variant_id: itm.variant.id,
          // Ensure NOT NULL constraint on package_booking_items.package_id
          package_id: (itm.variant as any)?.package_id || null,
          variant_name: itm.variant.variant_name || itm.variant.name,
          variant_inclusions: itm.custom_inclusions || itm.variant.inclusions || [],
          quantity: itm.quantity,
          unit_price: itm.unit_price,
          total_price: itm.total_price,
          security_deposit: itm.security_deposit,
          extra_safas: itm.extra_safas || 0,
          distance_addon: itm.distance_addon || 0,
          reserved_products: itm.selected_products || [],
        }))

        const { error: itemsErr } = await supabase
          .from("package_booking_items")
          .insert(itemRows)

        if (itemsErr) throw itemsErr

        toast.success("Quote updated successfully")
        router.push(`/quotes?refresh=${Date.now()}`)
        router.refresh()
        setLoading(false)
        return
      }

      // ==================================================================
      // CREATE MODE: Create new booking/quote
      // ==================================================================
      // Resolve event date/time
      const eventDate = new Date(formData.event_date)
      const [hours, minutes] = formData.event_time.split(":")
      eventDate.setHours(parseInt(hours), parseInt(minutes))

      // ✅ BUG FIX #1: Validate user session loaded and use dynamic franchise_id
      if (!currentUser?.franchise_id) {
        toast.error("Session error: Please refresh the page")
        setLoading(false)
        return
      }
      const franchiseId = currentUser.franchise_id  // ✅ Use logged-in user's franchise directly

      // Generate number (quote vs booking)
      let numberStr = ''
      if (asQuote) {
        // Try server-side generator; gracefully fallback if missing
        let qn: any = null
        try {
          const res = await supabase.rpc('generate_quote_number')
          qn = res.data
        } catch (e) {
          console.warn('generate_quote_number RPC not available, using fallback')
        }
        const uniq = `${Date.now()}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`
        numberStr = (qn as any) || `QT-${uniq}`
      } else {
        // Reuse booking number generator as a unique string for package_number
        const { data: bn } = await supabase.rpc('generate_booking_number')
        numberStr = (bn as any) || `PKG-${Date.now()}`
      }

      // Combine delivery/return dates with times if provided
      const deliveryDateISO = formData.delivery_date ? (() => {
        const d = new Date(formData.delivery_date)
        const [hh, mm] = (formData.delivery_time || '00:00').split(':')
        d.setHours(parseInt(hh||'0'), parseInt(mm||'0'))
        return d.toISOString()
      })() : null
      const returnDateISO = formData.return_date ? (() => {
        const d = new Date(formData.return_date)
        const [hh, mm] = (formData.return_time || '00:00').split(':')
        d.setHours(parseInt(hh||'0'), parseInt(mm||'0'))
        return d.toISOString()
      })() : null

      // Determine status based on payment type:
      // - Quote → "quote" (not an order yet)
      // - Full payment → "confirmed" (ready to proceed)
      // - Advance/Partial payment → "pending_payment" (needs payment confirmation)
      let bookingStatus = 'pending_payment' // default for new bookings
      if (asQuote) {
        bookingStatus = 'quote'
      } else if (formData.payment_type === 'full') {
        bookingStatus = 'confirmed'
      }

      const insertPayload: any = {
        package_number: numberStr,
        is_quote: asQuote,
        customer_id: selectedCustomer.id,
        franchise_id: franchiseId,
        event_type: formData.event_type,
        event_participant: formData.event_participant,
        payment_type: formData.payment_type,
        custom_amount: formData.custom_amount || 0,
        event_date: eventDate.toISOString(),
        event_time: formData.event_time || null,
        delivery_date: deliveryDateISO,
        delivery_time: formData.delivery_time || null,
        return_date: returnDateISO,
        return_time: formData.return_time || null,
        venue_address: formData.venue_address,
        groom_name: formData.groom_name || null,
        groom_whatsapp: formData.groom_whatsapp || null,
        groom_address: formData.groom_address || null,
        bride_name: formData.bride_name || null,
        bride_whatsapp: formData.bride_whatsapp || null,
        notes: formData.notes || null,
        distance_km: distanceKm || 0,
        distance_amount: (totals as any).distanceSurcharge || 0,
        tax_amount: totals.gst,
        gst_percentage: gstPercentage,
        subtotal_amount: totals.subtotal,
        total_amount: totals.grand,
        security_deposit: (totals as any).securityDeposit || 0,
        amount_paid: asQuote ? 0 : totals.payable,
        pending_amount: asQuote ? totals.grand : totals.remaining,
        status: bookingStatus,
        sales_closed_by_id: selectedStaff || null,
        use_custom_pricing: useCustomPricing || false,
        custom_package_price: useCustomPricing ? customPricing.package_price : null,
        coupon_code: formData.coupon_code || null,
        coupon_discount: formData.coupon_discount || 0,
        discount_amount: formData.discount_amount || 0,
      }

  // Resilient insert: handle unknown columns and duplicate package_number conflicts
  const regenPrefix = asQuote ? 'QT' : 'PKG'
  const safeInsert = async (payload: any) => {
        let attemptPayload = { ...payload }
        const tried = new Set<string>()
        for (let i = 0; i < 8; i++) {
          const { data, error } = await supabase
            .from("package_bookings")
            .insert(attemptPayload)
            .select()
            .single()
          if (!error) return { data, error: null as any }
          const msg = (error as any)?.message || ''
          const code = (error as any)?.code || ''
          // 1) Unknown column -> drop and retry
          const match = msg.match(/Could not find the '(.*?)' column of 'package_bookings'/)
          if (match && match[1] && !tried.has(match[1])) {
            const col = match[1]
            tried.add(col)
            // Drop the offending column and retry
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [col]: _, ...rest } = attemptPayload
            attemptPayload = rest
            continue
          }
          // 2) Duplicate package_number -> regenerate and retry
          if (
            code === '23505' ||
            /duplicate key value violates unique constraint\s+"package_bookings_package_number_key"/i.test(msg)
          ) {
            const uniq = `${Date.now()}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`
            attemptPayload = {
              ...attemptPayload,
              package_number: `${regenPrefix}-${uniq}`
            }
            continue
          }
          // No parsable unknown column -> stop
          return { data: null as any, error }
        }
        return { data: null as any, error: new Error('Failed to insert booking after stripping columns') }
      }

      const { data: booking, error: bookingError } = await safeInsert(insertPayload)

      if (bookingError) throw bookingError

      const itemsData = bookingItems.map(item => ({
        booking_id: booking.id,
        category_id: item.category.id,
        variant_id: item.variant.id,
        // Ensure NOT NULL constraint on package_booking_items.package_id
        package_id: (item.variant as any)?.package_id || null,
        variant_name: (item.variant.variant_name || item.variant.name) ?? null,
        variant_inclusions: (item.custom_inclusions && item.custom_inclusions.length > 0)
          ? item.custom_inclusions
          : (Array.isArray(item.variant.inclusions)
              ? item.variant.inclusions
              : (typeof item.variant.inclusions === 'string'
                  ? item.variant.inclusions.split(',').map(s => s.trim()).filter(Boolean)
                  : [])),
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        extra_safas: item.extra_safas,
        reserved_products: item.selected_products || []
      }))

      let { error: itemsError } = await supabase.from("package_booking_items").insert(itemsData)
      if (itemsError) {
        const msg = (itemsError as any)?.message || ''
        // Fallback: strip snapshot columns if migration not yet applied
        if (/Could not find the '(variant_inclusions|variant_name|reserved_products)' column/i.test(msg)) {
          const stripped = itemsData.map(({ variant_inclusions, variant_name, reserved_products, ...rest }) => rest)
          const retry = await supabase.from("package_booking_items").insert(stripped)
          if (retry.error) throw retry.error
        } else {
          throw itemsError
        }
      }

      // ✅ Step 1: Insert into package_booking_product_items junction table (proper records)
      if (!itemsError && bookingItems.length > 0) {
        const productItemsToInsert: any[] = []
        
        for (const item of bookingItems) {
          if (item.selected_products && item.selected_products.length > 0) {
            for (const product of item.selected_products) {
              // Fetch product to get rental price (unit_price)
              const { data: productData } = await supabase
                .from('products')
                .select('rental_price')
                .eq('id', product.id)
                .single()
              
              const unitPrice = productData?.rental_price || 0
              
              productItemsToInsert.push({
                package_booking_id: booking.id,
                product_id: product.id,
                quantity: product.qty || 0,
                unit_price: unitPrice,
                total_price: unitPrice * (product.qty || 0)
              })
            }
          }
        }
        
        if (productItemsToInsert.length > 0) {
          const { error: productItemsError } = await supabase
            .from('package_booking_product_items')
            .insert(productItemsToInsert)
          
          if (productItemsError) {
            console.warn('[Book Package] Failed to insert product items:', productItemsError)
            // Don't fail the booking if product items insertion fails
          }
        }
      }

      // ✅ Step 2: Deduct inventory for selected products
      if (!itemsError) {
        try {
          for (const item of bookingItems) {
            if (item.selected_products && item.selected_products.length > 0) {
              for (const product of item.selected_products) {
                // Get current stock before deduction
                const { data: productData, error: fetchError } = await supabase
                  .from('products')
                  .select('stock_available, name')
                  .eq('id', product.id)
                  .single()
                
                if (fetchError) {
                  console.warn(`[Book Package] Error fetching product ${product.id}:`, fetchError)
                  continue
                }
                
                const currentStock = productData?.stock_available || 0
                const newStock = Math.max(0, currentStock - (product.qty || 0))
                
                // Warn if stock goes negative
                if (newStock < currentStock - (product.qty || 0)) {
                  console.warn(`[Book Package] Product ${product.id} (${productData?.name}) reserved more than available. Current: ${currentStock}, Requested: ${product.qty}, Will reserve: ${newStock}`)
                }
                
                // Deduct stock
                const { error: deductError } = await supabase
                  .from('products')
                  .update({ stock_available: newStock })
                  .eq('id', product.id)
                
                if (deductError) {
                  console.warn(`[Book Package] Failed to deduct stock for product ${product.id}:`, deductError)
                  continue
                }
              }
            }
          }
        } catch (inventoryError) {
          console.warn('[Book Package] Warning: Inventory deduction incomplete or failed', inventoryError)
          // Don't fail the whole booking creation if inventory deduction has issues
          toast.warning("Booking created but inventory update may be incomplete. Please verify stock levels.")
        }
      }

      // Coupon usage tracking removed in simplified coupon model.
      // If you need analytics, consider implementing server-side logging or re-adding a coupon_usage table.

  toast.success(asQuote ? "Quote created!" : "Order created!")

  // Trigger background PDF generation (fire & forget)
  if (booking?.id) {
    triggerPDFGeneration(booking.id, "package_booking")
  }

  // Auto-send invoice via WhatsApp (fire & forget, only for orders not quotes)
  if (!asQuote && booking?.id) {
    sendInvoiceViaWhatsApp({ orderId: booking.id, orderType: "package_booking", sendConfirmation: true })
      .then(r => r.success && toast.success("Invoice sent on WhatsApp!"))
  }
  
  // Add timestamp to force page reload and refetch
  const redirectPath = asQuote ? "/quotes" : "/bookings"
  router.push(`${redirectPath}?refresh=${Date.now()}`)
  router.refresh() // Force refresh to ensure data is reloaded
    } catch (err: any) {
      toast.error(err.message || "Error creating booking")
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while quote data is being loaded
  if (loadingQuoteData) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-green-700 mb-4" />
              <p className="text-xl font-medium text-gray-700">Loading quote data...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the quote details</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
  <CustomerFormDialog open={showNewCustomer} onOpenChange={setShowNewCustomer} onCustomerCreated={handleCustomerCreated} />
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-green-800">
            {isEditMode ? 'Edit Package Booking' : 'Create Package Booking'}
          </h1>
          {isEditMode && (
            <p className="text-sm text-gray-600 mt-1">Update package details and settings</p>
          )}
        </div>

        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon
                const isActive = currentStep === step.id
                const isComplete = currentStep > step.id
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? "bg-green-700 text-white" : isComplete ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                        {isComplete ? <CheckCircle className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
                      </div>
                      <div className={`mt-2 text-sm font-medium ${isActive ? "text-green-700" : isComplete ? "text-green-600" : "text-gray-400"}`}>{step.name}</div>
                    </div>
                    {idx < STEPS.length - 1 && <div className={`h-1 flex-1 mx-4 rounded ${isComplete ? "bg-green-500" : "bg-gray-200"}`} />}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Category Selection */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Select Category</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayCategories.map(cat => (
                      <Card
                        key={cat.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedCategory?.id === cat.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'
                        }`}
                        onClick={() => {
                          setSelectedCategory(cat)
                          const variants = allVariants.filter(v => 
                            v.category_id === cat.id || (v as any).package_id === cat.id
                          )
                          setVariantsForCategory(variants)
                          setVariantSelectionOpen(true)
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-semibold text-gray-900 leading-snug whitespace-normal break-words min-h-[40px]">
                            {cat.name}
                          </div>
                          {/* Show count badge, hide description */}
                          <div className="mt-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] border bg-gray-50 text-gray-700">
                            {(variantCounts[cat.id] ?? 0)} packages
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Variant Selection (disabled; we open the dialog instead) */}
                {SHOW_VARIANT_GRID && selectedCategory && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Select Variant</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search variants..."
                          value={packageSearch}
                          onChange={e => setPackageSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2">
                      {filteredVariants.length === 0 && (
                        <div className="col-span-3 text-center text-sm text-gray-500 py-8 border rounded">
                          No variants found for this category.
                        </div>
                      )}
                      {filteredVariants.map(variant => {
                        const inclusions: string[] = Array.isArray(variant.inclusions)
                          ? variant.inclusions
                          : typeof variant.inclusions === 'string'
                            ? variant.inclusions.split(',').map(s => s.trim()).filter(Boolean)
                            : []
                        return (
                          <Card 
                            key={variant.id} 
                            className="border hover:shadow-md transition cursor-pointer hover:border-green-500"
                            onClick={() => setVariantSelectionOpen(true)}
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-green-800">{variant.name || variant.variant_name}</div>
                                  <div className="text-xs text-gray-500 font-normal mt-1">Base: {formatCurrency(variant.base_price)}</div>
                                </div>
                                <Badge variant="secondary" className="ml-2">{formatCurrency(variant.base_price)}</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {inclusions.length > 0 && (
                                <div>
                                  <div className="text-[10px] text-gray-500 font-medium mb-1">Includes:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {inclusions.slice(0, 4).map((inc, idx) => (
                                      <span key={idx} className="px-2 py-0.5 border rounded text-[10px] bg-gray-50 truncate max-w-[140px]" title={inc}>
                                        {inc}
                                      </span>
                                    ))}
                                    {inclusions.length > 4 && (
                                      <span className="px-2 py-0.5 text-[10px] text-gray-500">+{inclusions.length - 4} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="pt-2 border-t">
                                <div className="text-xs text-gray-600">
                                  <div className="flex justify-between">
                                    <span>Extra Safa Price:</span>
                                    <span className="font-medium">{formatCurrency(variant.extra_safa_price || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Customer Selection (mirrored from Product Order page) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Customer
                      <Button size="sm" variant="outline" onClick={() => setShowNewCustomer(true)}>
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
                          <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
                          <div className="text-xs text-blue-700">{selectedCustomer.phone}</div>
                          {selectedCustomer.pincode && (
                            <div className="text-[11px] text-blue-700">Pincode: {selectedCustomer.pincode}</div>
                          )}
                          {selectedCustomer.email && (
                            <div className="text-xs text-blue-600">{selectedCustomer.email}</div>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)} aria-label="Clear selection">
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
                                <div className="text-xs text-muted-foreground">{c.phone}</div>
                              </button>
                            ))}
                            {customerSearch && filteredCustomers.length === 0 && (
                              <div className="p-3 text-xs text-muted-foreground">No matches</div>
                            )}
                            {!customerSearch && customers.length > 5 && (
                              <div className="p-3 text-xs text-muted-foreground text-center bg-muted/30">
                                Showing first 5 of {customers.length} customers. Type to search more...
                              </div>
                            )}
                            {!customerSearch && customers.length === 0 && (
                              <div className="p-3 text-xs text-muted-foreground">No customers found</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Event & Wedding Details - mirrored from product booking (without Booking Type) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event & Wedding Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {/* Row 1: Event Type, Event Participant */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Event Type</Label>
                        <Select value={formData.event_type} onValueChange={(v) => setFormData(f => ({ ...f, event_type: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                        <Select value={formData.event_participant} onValueChange={(v) => setFormData(f => ({ ...f, event_participant: v as any }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Groom">Groom Only</SelectItem>
                            <SelectItem value="Bride">Bride Only</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Dates & Times */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Event Date & Time *</Label>
                        <Popover open={eventDateOpen} onOpenChange={setEventDateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.event_date ? format(new Date(formData.event_date), "dd/MM/yyyy") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.event_date ? new Date(formData.event_date) : undefined}
                              onSelect={(d: any) => { setFormData(f => ({ ...f, event_date: d?.toISOString() || "" })); setEventDateOpen(false) }}
                            />
                          </PopoverContent>
                        </Popover>
                        <TimePicker value={formData.event_time} onChange={value => setFormData(f => ({ ...f, event_time: value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Delivery Date & Time</Label>
                        <Popover open={deliveryDateOpen} onOpenChange={setDeliveryDateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.delivery_date ? format(new Date(formData.delivery_date), "dd/MM/yyyy") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.delivery_date ? new Date(formData.delivery_date) : undefined}
                              onSelect={(d: any) => { setFormData(f => ({ ...f, delivery_date: d?.toISOString() || "" })); setDeliveryDateOpen(false) }}
                            />
                          </PopoverContent>
                        </Popover>
                        <TimePicker value={formData.delivery_time} onChange={value => setFormData(f => ({ ...f, delivery_time: value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Return Date & Time</Label>
                        <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.return_date ? format(new Date(formData.return_date), "dd/MM/yyyy") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.return_date ? new Date(formData.return_date) : undefined}
                              onSelect={(d: any) => { setFormData(f => ({ ...f, return_date: d?.toISOString() || "" })); setReturnDateOpen(false) }}
                            />
                          </PopoverContent>
                        </Popover>
                        <TimePicker value={formData.return_time} onChange={value => setFormData(f => ({ ...f, return_time: value }))} />
                      </div>
                    </div>

                    {/* Distance (km) removed; pricing will use customer pincode */}

                    {/* Venue Address moved below in Bride Information */}
                  </CardContent>
                </Card>

                {/* Groom Information */}
                {(formData.event_participant === "Groom" || formData.event_participant === "Both") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Groom Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Groom Name</Label>
                          <Input value={formData.groom_name} onChange={(e) => setFormData(f => ({ ...f, groom_name: e.target.value }))} className="mt-1" placeholder="Enter groom's full name" />
                        </div>
                        <div>
                          <Label className="text-xs">Additional WhatsApp Number</Label>
                          <Input value={formData.groom_whatsapp} onChange={(e) => setFormData(f => ({ ...f, groom_whatsapp: e.target.value }))} className="mt-1" placeholder="WhatsApp number" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Home Address</Label>
                        <Textarea rows={2} value={formData.groom_address} onChange={(e) => setFormData(f => ({ ...f, groom_address: e.target.value }))} className="mt-1" placeholder="Full address with locality and pin code" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bride Information (Venue Address moved here) */}
                {(formData.event_participant === "Bride" || formData.event_participant === "Both") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Bride Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Bride Name</Label>
                          <Input value={formData.bride_name} onChange={(e) => setFormData(f => ({ ...f, bride_name: e.target.value }))} className="mt-1" placeholder="Enter bride's full name" />
                        </div>
                        <div>
                          <Label className="text-xs">Additional WhatsApp Number</Label>
                          <Input value={formData.bride_whatsapp} onChange={(e) => setFormData(f => ({ ...f, bride_whatsapp: e.target.value }))} className="mt-1" placeholder="WhatsApp number" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Venue Address</Label>
                        <Textarea rows={2} value={formData.venue_address} onChange={(e) => setFormData(f => ({ ...f, venue_address: e.target.value }))} className="mt-1" placeholder="Enter venue address (e.g., Grand Palace Banquet, Connaught Place, Delhi - 110001)" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea rows={3} value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions or requirements" />
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Review & Confirm</h2>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Customer:</span> {selectedCustomer ? selectedCustomer.name : "—"}</div>
                  {selectedCustomer?.pincode && (
                    <div><span className="font-medium">Pincode:</span> {selectedCustomer.pincode}</div>
                  )}
                  <div><span className="font-medium">Event:</span> {formData.event_type} on {formData.event_date ? format(new Date(formData.event_date), "PPP p") : "—"}</div>
                  <div><span className="font-medium">Venue:</span> {formData.venue_address || "—"}</div>
                  {totals.securityDeposit > 0 && (
                    <div>
                      <span className="font-medium">{DEPOSIT_POLICY.label}:</span> {formatCurrency(totals.securityDeposit)}
                      <span className="ml-1 text-[11px] text-gray-500">{DEPOSIT_POLICY.collectAt === 'booking' ? '(collected now)' : DEPOSIT_POLICY.collectAt === 'delivery' ? '(collect at delivery)' : '(not collected)'}</span>
                    </div>
                  )}
                  {formData.payment_type === 'advance' && (
                    <div><span className="font-medium">Advance (50%):</span> {formatCurrency(totals.advanceDue)}</div>
                  )}
                </div>
                <div className="border rounded overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingItems.map(i => {
                        return (
                        <tr key={i.id} className="border-t">
                          <td className="p-2">
                            <div className="space-y-2">
                              {/* Category name in green badge */}
                              <div className="text-xs font-semibold text-green-800 bg-green-50 px-2 py-1 rounded inline-block border border-green-200">
                                {i.category.name}
                              </div>
                              
                              {/* Variant and inclusions */}
                              {(i.variant?.name || i.variant?.variant_name) && (
                                <div className="space-y-1.5">
                                  <div className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded inline-block border border-blue-200">
                                    ◆ {i.variant.name || i.variant.variant_name}
                                  </div>
                                  {/* Show inclusions (prefer custom edits) */}
                                  {(() => {
                                    const inclusions: string[] = (i.custom_inclusions && i.custom_inclusions.length > 0)
                                      ? i.custom_inclusions
                                      : (Array.isArray(i.variant?.inclusions)
                                          ? i.variant.inclusions
                                          : typeof i.variant?.inclusions === 'string'
                                            ? (() => { try { const parsed = JSON.parse(i.variant.inclusions as any); return Array.isArray(parsed) ? parsed : (i.variant.inclusions as string).split(',').map(s => s.trim()).filter(Boolean) } catch { return (i.variant.inclusions as string).split(',').map(s => s.trim()).filter(Boolean) } })()
                                            : [])
                                    if (inclusions.length > 0) {
                                      return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {inclusions.map((inc, idx) => (
                                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                                              ✓ {inc}
                                            </span>
                                          ))}
                                        </div>
                                      )
                                    } else {
                                      // Show message when no inclusions specified
                                      return (
                                        <div className="text-[10px] text-gray-500 italic mt-1">
                                          Standard package inclusions apply
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              )}
                              
                              {/* Reserved products (if any) */}
                              {Array.isArray(i.selected_products) && i.selected_products.length > 0 && (
                                <div className="mt-1">
                                  <div className="text-[10px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded inline-block border border-purple-200">Reserved Products</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {i.selected_products.map(sp => (
                                      <span key={sp.id} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200" title={sp.name}>
                                        {sp.name} × {sp.qty}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Extra safas calculation */}
                              {i.extra_safas > 0 && (
                                <div className="text-xs text-gray-700 font-medium bg-orange-50 px-2 py-1 rounded border border-orange-200">
                                  + Extra Safas: <span className="font-semibold">{i.extra_safas}</span> × {formatCurrency(i.variant.extra_safa_price || 0)} = <span className="font-bold text-orange-700">{formatCurrency(i.extra_safas * (i.variant.extra_safa_price || 0))}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-right">{i.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(i.total_price * i.quantity)}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Items ({bookingItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-72 overflow-auto pr-1">
                  {bookingItems.length === 0 && <div className="text-xs text-gray-500">No items added.</div>}
                  {bookingItems.map(i => {
                    return (
                    <div key={i.id} className="border rounded p-3 space-y-2 text-xs relative">
                      <button onClick={() => removeItem(i.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500" aria-label="Remove"><X className="h-4 w-4" /></button>
                      <div className="space-y-1.5 pr-6">
                        {/* Category badge */}
                        {i.category && (
                          <div className="text-[9px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-block border border-green-200">
                            {i.category.name}
                          </div>
                        )}
                        
                        {/* Variant name */}
                        <div className="font-bold text-sm text-gray-900">{i.variant?.name || i.variant?.variant_name || "Package"}</div>
                        
                        {/* Variant and inclusions */}
                        {(i.variant?.name || i.variant?.variant_name) && (
                          <div className="space-y-1">
                            <div className="text-[10px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded inline-block border border-blue-200">
                              ◆ {i.variant.name || i.variant.variant_name}
                            </div>
                            {/* Show inclusions in sidebar (prefer custom edits) */}
                            {(() => {
                              const inclusions: string[] = (i.custom_inclusions && i.custom_inclusions.length > 0)
                                ? i.custom_inclusions
                                : (Array.isArray(i.variant?.inclusions)
                                    ? i.variant.inclusions
                                    : typeof i.variant?.inclusions === 'string'
                                      ? (() => { try { const parsed = JSON.parse(i.variant.inclusions as any); return Array.isArray(parsed) ? parsed : (i.variant.inclusions as string).split(',').map(s => s.trim()).filter(Boolean) } catch { return (i.variant.inclusions as string).split(',').map(s => s.trim()).filter(Boolean) } })()
                                      : [])
                              if (inclusions.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-0.5 mt-1">
                                    {inclusions.map((inc, idx) => (
                                      <span key={idx} className="text-[8px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                        ✓ {inc}
                                      </span>
                                    ))}
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="text-[8px] text-gray-400 italic mt-0.5">
                                    Standard inclusions
                                  </div>
                                )
                              }
                            })()}
                          </div>
                        )}
                        {i.products_pending && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px]">Products pending</Badge>
                        )}
                        {/* Reserved products preview */}
                        {Array.isArray(i.selected_products) && i.selected_products.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {i.selected_products.map(sp => (
                              <span key={sp.id} className="text-[8px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded" title={sp.name}>
                                {sp.name} × {sp.qty}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Extra safas with calculation */}
                        {i.extra_safas > 0 && (
                          <div className="text-[9px] text-orange-700 font-medium bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                            + {i.extra_safas} Extra × {formatCurrency(i.variant.extra_safa_price || 0)} = <span className="font-bold">{formatCurrency(i.extra_safas * (i.variant.extra_safa_price || 0))}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(i.id, i.quantity - 1)}>-</Button>
                          <span className="px-2">{i.quantity}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(i.id, i.quantity + 1)}>+</Button>
                        </div>
                        <div className="font-bold text-sm">{formatCurrency(i.total_price * i.quantity)}</div>
                      </div>
                    </div>
                  )})}
                </div>
                <div className="border-t pt-3 space-y-1 text-sm">
                  {/* Subtle context: resolved distance in km, for internal clarity */}
                  {selectedCustomer?.pincode ? (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Distance (from pincode {basePincode})</span>
                      <span>{Number(distanceKm) || 0} km</span>
                    </div>
                  ) : null}
                  {/* Hide explicit distance surcharge; show combined subtotal */}
                  {useCustomPricing && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      <div className="flex items-center gap-1 font-medium mb-1">
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Custom Pricing</Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between"><span>Items Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                  
                  
                  {!useCustomPricing && totals.manualDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({formData.discount_type === 'percentage' ? `${formData.discount_amount}%` : 'Flat'})</span>
                      <span>-{formatCurrency(totals.manualDiscount)}</span>
                    </div>
                  )}
                  
                  {!useCustomPricing && totals.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon ({formData.coupon_code})</span>
                      <span>-{formatCurrency(totals.couponDiscount)}</span>
                    </div>
                  )}
                  
                  {!useCustomPricing && (totals.manualDiscount > 0 || totals.couponDiscount > 0) && (
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="font-medium">After Discounts</span>
                      <span className="font-medium">{formatCurrency(totals.subtotalAfterCoupon || totals.subtotal)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>GST ({gstPercentage}%)</span>
                    <span>{formatCurrency(totals.gst)}</span>
                  </div>
                  
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                    <span>Grand Total</span>
                    <span>{formatCurrency(totals.grand)}</span>
                  </div>
                  
                  {/* Payment Breakdown - Show only when items are added */}
                  {bookingItems.length > 0 && (
                    <>
                      <div className="h-px bg-gray-200 my-3" />
                      <div className="space-y-2">
                        {formData.payment_type === 'full' && (
                          <>
                            <div className="flex justify-between text-sm text-amber-700">
                              <span>+ Deposit (Refundable, No GST)</span>
                              <span>+{formatCurrency(totals.securityDeposit)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2 text-green-700">
                              <span>Payable Now</span>
                              <span>{formatCurrency(totals.grand + totals.securityDeposit)}</span>
                            </div>
                          </>
                        )}
                        {formData.payment_type === 'advance' && (
                          <>
                            <div className="flex justify-between text-sm text-amber-700">
                              <span>+ Deposit (Refundable, No GST)</span>
                              <span>+{formatCurrency(totals.securityDeposit)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2 text-blue-700">
                              <span>Payable Now (Total)</span>
                              <span>{formatCurrency(totals.payableNowTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mt-2 pt-2 border-t">
                              <span>Remaining (Total)</span>
                              <span>{formatCurrency(totals.remainingTotal)}</span>
                            </div>
                          </>
                        )}
                        {formData.payment_type === 'partial' && (
                          <>
                            <div className="flex justify-between text-purple-600 font-semibold">
                              <span>Package Partial Payment</span>
                              <span>{formatCurrency(totals.payable)}</span>
                            </div>

                            {/* For partial payments we DO NOT collect the security deposit now.
                                The deposit is moved to the remaining payment, so show only the
                                package partial amount as payable now. */}
                            <div className="flex justify-between font-bold text-lg border-t pt-2 text-purple-700">
                              <span>Total to Pay Now</span>
                              <span>{formatCurrency(totals.payable)}</span>
                            </div>

                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Remaining Package Later</span>
                                <span>{formatCurrency(Math.max(0, (totals.remaining || 0) - (totals.securityDeposit || 0)))}</span>
                              </div>
                              {totals.securityDeposit > 0 && (
                                <div className="flex justify-between text-amber-700">
                                  <span>{DEPOSIT_POLICY.label} (Collected later)</span>
                                  <span>{formatCurrency(totals.securityDeposit)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-medium">
                                <span>Remaining (Total)</span>
                                <span>{formatCurrency(totals.remaining)}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Discount & Coupon Section */}
                <div className="space-y-4 pt-3 border-t">
                    {/* Custom Price (before GST) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Custom Price (before GST)</Label>
                        <Button size="sm" type="button" variant={useCustomPricing ? 'default' : 'outline'} onClick={() => setUseCustomPricing(v => !v)}>
                          {useCustomPricing ? 'On' : 'Off'}
                        </Button>
                      </div>
                      {useCustomPricing && (
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <Label className="text-[11px]">Amount (before GST)</Label>
                            <Input
                              type="number"
                              value={customPricing.package_price || ''}
                              onChange={(e) => setCustomPricing(cp => ({ ...cp, package_price: e.target.value === '' ? 0 : Number(e.target.value) }))}
                              placeholder="Enter final package price (pre-GST)"
                              min={0}
                            />
                          </div>
                          <p className="text-[11px] text-amber-700">
                            GST 5% will be added on top. Discounts and coupons are ignored in custom price mode.
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Manual Discount */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Discount (Optional)</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={formData.discount_type} 
                          onValueChange={(v: "flat" | "percentage") => setFormData(f => ({ ...f, discount_type: v }))}
                          disabled={useCustomPricing}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">₹ Flat</SelectItem>
                            <SelectItem value="percentage">% Percent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={formData.discount_amount || ""}
                          onChange={(e) => setFormData(f => ({ ...f, discount_amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
                          placeholder={formData.discount_type === "flat" ? "Enter amount" : "Enter percentage"}
                          min={0}
                          max={formData.discount_type === "percentage" ? 100 : undefined}
                          disabled={useCustomPricing}
                        />
                      </div>
                      {formData.discount_amount > 0 && (
                        <p className="text-xs text-green-600">
                          Discount: -{formatCurrency(totals.manualDiscount || 0)}
                        </p>
                      )}
                    </div>

                    {/* Coupon Code */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Coupon Code (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={formData.coupon_code}
                          onChange={(e) => {
                            setFormData(f => ({ ...f, coupon_code: e.target.value.toUpperCase() }))
                            setCouponError("")
                          }}
                          placeholder="Enter coupon code"
                          maxLength={50}
                          disabled={formData.coupon_discount > 0 || useCustomPricing}
                        />
                        {formData.coupon_discount > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveCoupon}
                            className="whitespace-nowrap"
                            disabled={useCustomPricing}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={couponValidating || !formData.coupon_code.trim() || useCustomPricing}
                            className="whitespace-nowrap"
                          >
                            {couponValidating ? "Validating..." : "Apply"}
                          </Button>
                        )}
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-600">{couponError}</p>
                      )}
                      {formData.coupon_discount > 0 && (
                        <p className="text-xs text-green-600">
                          Coupon Applied: -{formatCurrency(formData.coupon_discount)}
                        </p>
                      )}
                    </div>
                  </div>
                
                <div className="space-y-2 pt-3 border-t">
                    <Label className="text-xs">Payment Type</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(["full","advance","partial"] as const).map(pt => (
                      <Button
                        key={pt}
                        size="sm"
                        type="button"
                        variant={formData.payment_type === pt ? "default" : "outline"}
                        onClick={() => setFormData(f => ({ ...f, payment_type: pt }))}
                      >
                        {pt.charAt(0).toUpperCase() + pt.slice(1)}
                      </Button>
                    ))}
                  </div>
                  {formData.payment_type === "partial" && (
                    <div className="mt-2">
                      <Label className="text-xs">Custom Amount</Label>
                      <Input
                        type="number"
                        value={formData.custom_amount || ''}
                        onChange={e => setFormData(f => ({ ...f, custom_amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        min={0}
                      />
                    </div>
                  )}
                  <div className="mt-2 text-sm space-y-1">
                    <div className="flex justify-between text-xs text-gray-600"><span>Package now</span><span>{formatCurrency(totals.payable)}</span></div>
                    {totals.depositDueNow > 0 && (
                      <div className="flex justify-between text-xs text-amber-700">
                        <span className="flex items-center gap-1">
                          {DEPOSIT_POLICY.label} now
                          <span className="text-[9px] text-amber-600">(Refundable)</span>
                        </span>
                        <span>+{formatCurrency(totals.depositDueNow)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="font-semibold">Payable Now (Total)</span>
                      <span className="font-semibold text-green-700">{formatCurrency(totals.payableNowTotal)}</span>
                    </div>
                    <div className="h-px bg-gray-100 my-1" />
                    <div className="flex justify-between text-xs text-gray-600"><span>Package later</span><span>{formatCurrency(totals.remaining)}</span></div>
                    {totals.depositDueLater > 0 && (
                      <div className="flex justify-between text-xs text-amber-700">
                        <span className="flex items-center gap-1">
                          {DEPOSIT_POLICY.label} at delivery
                          <span className="text-[9px] text-amber-600">(Refundable)</span>
                        </span>
                        <span>+{formatCurrency(totals.depositDueLater)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-500"><span>Remaining (Total)</span><span>{formatCurrency(totals.remainingTotal)}</span></div>
                  </div>
                </div>
                {currentStep === 3 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Label className="text-xs">Sales Closed By</Label>
                    <Select 
                      value={selectedStaff || "none"} 
                      onValueChange={(val) => setSelectedStaff(val === "none" ? "" : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {staffMembers.length === 0 && (
                          <SelectItem value="no-staff" disabled>No staff members found</SelectItem>
                        )}
                        {staffMembers.map(staff => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role === 'franchise_admin' ? 'Admin' : 'Staff'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-500 mt-1">Track which team member closed this sale for incentives</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="space-y-2">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button variant="outline" className="flex-1" onClick={handleBack} disabled={loading}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                {currentStep < 3 && (
                  <Button className="flex-1" onClick={handleNext} disabled={!canGoNext()}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
              {currentStep === 3 && (
                <div className="space-y-2">
                  <Button className="w-full" disabled={loading} onClick={() => handleSubmit(false)}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isEditMode ? 'Update Quote' : 'Create Booking'}
                  </Button>
                  {!isEditMode && (
                    <Button variant="outline" className="w-full" disabled={loading} onClick={() => handleSubmit(true)}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Save as Quote
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Variant selection dialog (portal-like simple overlay) */}
      {variantSelectionOpen && selectedCategory && (
        <VariantDialog
          category={selectedCategory}
          variants={variantsForCategory}
          customerPincode={selectedCustomer?.pincode}
          distanceKm={Number(distanceKm) || 0}
          onClose={() => setVariantSelectionOpen(false)}
          onAdd={(variant, extraSafas, customInclusions) => {
            addPackageItem(selectedCategory, variant, extraSafas, customInclusions).then((created) => {
              // Open product selection dialog after adding a variant
              setProductDialogContext({
                category: selectedCategory,
                variant,
                eventDate: formData.event_date,
                itemId: created.id,
                distanceKm: Number(distanceKm) || 0,
                pincode: selectedCustomer?.pincode,
                customInclusions
              })
              setProductDialogOpen(true)
            })
            setVariantSelectionOpen(false)
          }}
        />
      )}

      {/* Product Selection Dialog */}
      {productDialogOpen && productDialogContext && (
        <ProductSelectionDialog
          open={productDialogOpen}
          onOpenChange={setProductDialogOpen}
          context={productDialogContext}
        />
      )}
    </div>
  )
}

interface VariantDialogProps { 
  category: PackageCategory
  variants: PackageVariant[]
  customerPincode?: string
  distanceKm: number
  onClose: () => void
  onAdd: (variant: PackageVariant, extraSafas: number, customInclusions: string[]) => void
}

function VariantDialog({ category, variants, customerPincode, distanceKm, onClose, onAdd }: VariantDialogProps) {
  const [extraSafas, setExtraSafas] = useState<Record<string, number | string>>({})
  const [editingInclusions, setEditingInclusions] = useState<string | null>(null)
  const [customInclusions, setCustomInclusions] = useState<Record<string, string[]>>({})
  const [distancePricing, setDistancePricing] = useState<Record<string, number>>({})
  const [newInclusionInput, setNewInclusionInput] = useState<Record<string, string>>({})

  // Sort variants by package number extracted from category name
  const sortedVariants = useMemo(() => {
    return [...variants].sort((a, b) => {
      // Extract package number from category name (e.g., "Package 1", "Package 2", etc.)
      const extractPackageNumber = (name: string) => {
        const match = name.match(/Package\s+(\d+)/i)
        return match ? parseInt(match[1]) : 999
      }

      const aNum = extractPackageNumber(category.name)
      const bNum = extractPackageNumber(category.name)

      // If both have package numbers, sort by number
      if (aNum !== 999 && bNum !== 999) {
        return aNum - bNum
      }

      // If only one has package number, prioritize it
      if (aNum !== 999) return -1
      if (bNum !== 999) return 1

      // Fallback to name comparison
      return (a.name || a.variant_name || '').localeCompare(b.name || b.variant_name || '')
    })
  }, [variants, category.name])

  // Fetch distance pricing for all variants
  useEffect(() => {
    const fetchDistancePricing = async () => {
      const variantIds = sortedVariants.map(v => v.id)
      if (variantIds.length === 0) return

      const { data } = await supabase
        .from('distance_pricing')
        .select('*')
        .in('package_variant_id', variantIds)
        .order('min_distance_km')

      if (data) {
        const pricingMap: Record<string, number> = {}
        sortedVariants.forEach(v => {
          const tiers = data.filter((d: any) => d.package_variant_id === v.id)
          const tier = tiers.find((t: any) => distanceKm >= t.min_distance_km && distanceKm <= t.max_distance_km)
          pricingMap[v.id] = tier?.additional_price || 0
        })
        setDistancePricing(pricingMap)
      }
    }
    fetchDistancePricing()
  }, [sortedVariants, distanceKm])

  // Initialize custom inclusions from variant defaults
  useEffect(() => {
    const initialInclusions: Record<string, string[]> = {}
    sortedVariants.forEach(v => {
      const inclusions: string[] = Array.isArray(v.inclusions)
        ? v.inclusions
        : typeof v.inclusions === 'string'
          ? v.inclusions.split(',').map(s => s.trim()).filter(Boolean)
          : []
      initialInclusions[v.id] = [...inclusions]
    })
    setCustomInclusions(initialInclusions)
  }, [sortedVariants])

  const toggleInclusion = (variantId: string, inclusion: string) => {
    setCustomInclusions(prev => {
      const current = prev[variantId] || []
      if (current.includes(inclusion)) {
        return { ...prev, [variantId]: current.filter(i => i !== inclusion) }
      } else {
        return { ...prev, [variantId]: [...current, inclusion] }
      }
    })
  }

  const addCustomInclusion = (variantId: string) => {
    const value = newInclusionInput[variantId]?.trim()
    if (!value) return
    setCustomInclusions(prev => ({
      ...prev,
      [variantId]: [...(prev[variantId] || []), value]
    }))
    setNewInclusionInput(prev => ({ ...prev, [variantId]: '' }))
  }

  const removeCustomInclusion = (variantId: string, value: string) => {
    setCustomInclusions(prev => ({
      ...prev,
      [variantId]: (prev[variantId] || []).filter(v => v !== value)
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl border my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{category.name}</h2>
            <p className="text-xs text-gray-500 mt-1">Select variant and customize details</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          {variants.length === 0 && (
            <div className="text-sm text-gray-500">No variants available.</div>
          )}
          <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto">
            {sortedVariants.map((v, index) => {
              const safas = extraSafas[v.id] === '' ? 0 : (extraSafas[v.id] || 0)
              const distanceAddon = Number(distancePricing[v.id] || 0)
              const defaultInclusions: string[] = Array.isArray(v.inclusions)
                ? v.inclusions
                : typeof v.inclusions === 'string'
                  ? v.inclusions.split(',').map(s => s.trim()).filter(Boolean)
                  : []
              const currentInclusions = customInclusions[v.id] || defaultInclusions
              const isEditingThis = editingInclusions === v.id
              const extraSafasCost = Number(safas || 0) * Number(v.extra_safa_price || 0)
              const totalPrice = Number(v.base_price || 0) + extraSafasCost + distanceAddon

              return (
                <div key={v.id} className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition bg-white min-h-[300px] flex flex-col">
                  {/* Header with Package Number */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b">
                    <div className="flex-1">
                      <div className="text-sm text-blue-600 font-medium mb-1">
                        {(() => {
                          // Extract package number from category name
                          const match = category.name.match(/Package\s+(\d+)/i)
                          return match ? `Package ${match[1]}` : `Package ${index + 1}`
                        })()}
                      </div>
                      <div className="font-semibold text-base text-green-800">{v.name || v.variant_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Base: {formatCurrency(v.base_price)}</div>
                    </div>
                    <Badge variant="outline" className="text-sm font-medium">{formatCurrency(totalPrice)}</Badge>
                  </div>

                  {/* Price Breakdown */}
                  <div className="text-[10px] space-y-0.5 text-gray-600 bg-gray-50 p-2 rounded flex-shrink-0">
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span>{formatCurrency(v.base_price)}</span>
                    </div>
                    {extraSafasCost > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Extra Safas ({safas} × {formatCurrency(v.extra_safa_price || 0)}):</span>
                        <span>+ {formatCurrency(extraSafasCost)}</span>
                      </div>
                    )}
                    {distanceAddon > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Distance Addon ({distanceKm}km):</span>
                        <span>+ {formatCurrency(distanceAddon)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-0.5 mt-1">
                      <span>Variant Total:</span>
                      <span>{formatCurrency(totalPrice)}</span>
                    </div>
                    {(v.security_deposit || category.security_deposit) && (
                      <>
                        <div className="h-px bg-gray-300 my-1" />
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>Security Deposit:</span>
                          <span>{formatCurrency(v.security_deposit || category.security_deposit || 0)}</span>
                        </div>
                        <div className="text-[9px] text-amber-600 italic">
                          (Refundable, separate from price)
                        </div>
                      </>
                    )}
                  </div>

                  {/* Inclusions - Flexible height */}
                  <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] text-gray-500 font-medium">Inclusions:</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px]"
                        onClick={() => setEditingInclusions(isEditingThis ? null : v.id)}
                      >
                        {isEditingThis ? 'Done' : 'Edit'}
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {isEditingThis ? (
                        <div className="space-y-3 border rounded p-2 bg-blue-50">
                          {/* Default inclusions with checkboxes */}
                          <ul className="space-y-1">
                            {defaultInclusions.map((inc, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={currentInclusions.includes(inc)}
                                  onChange={() => toggleInclusion(v.id, inc)}
                                  className="rounded"
                                />
                                <span className={!currentInclusions.includes(inc) ? 'line-through text-gray-400' : 'text-gray-800'}>
                                  {inc}
                                </span>
                              </li>
                            ))}
                          </ul>

                          {/* Custom inclusions with remove buttons */}
                          {(currentInclusions.filter(ci => !defaultInclusions.includes(ci))).length > 0 && (
                            <div>
                              <div className="text-[10px] text-gray-600 font-medium mb-1">Custom items</div>
                              <ul className="space-y-1">
                                {currentInclusions.filter(ci => !defaultInclusions.includes(ci)).map((ci, idx) => (
                                  <li key={idx} className="flex items-center justify-between gap-2 bg-white/70 rounded px-2 py-1">
                                    <span className="text-[11px] text-gray-800 break-words whitespace-normal">{ci}</span>
                                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-red-600" onClick={() => removeCustomInclusion(v.id, ci)}>Remove</Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-1 mt-1">
                            <Input
                              type="text"
                              placeholder="Add custom item..."
                              value={newInclusionInput[v.id] || ''}
                              onChange={e => setNewInclusionInput(prev => ({ ...prev, [v.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addCustomInclusion(v.id)}
                              className="h-8 text-[12px]"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-8 px-3"
                              onClick={() => addCustomInclusion(v.id)}
                              title="Add inclusion"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {currentInclusions.map((inc, idx) => (
                            <li key={idx} className="text-[11px] text-gray-800 break-words whitespace-normal border rounded px-2 py-1 bg-gray-50">
                              {inc}
                            </li>
                          ))}
                          {currentInclusions.length === 0 && (
                            <li className="text-[11px] text-gray-500 italic">No inclusions listed</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Extra Safas and Add Button - Fixed at bottom */}
                  <div className="flex-shrink-0 space-y-3">
                    {/* Extra Safas */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <Input
                        type="number"
                        min={0}
                        value={safas || ''}
                        onChange={e => {
                          const value = e.target.value;
                          setExtraSafas(prev => ({ ...prev, [v.id]: value === '' ? '' : Math.max(0, Number(value)) }));
                        }}
                        className="h-8 w-20 placeholder:text-gray-300 placeholder:opacity-50"
                        placeholder="0"
                      />
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setExtraSafas(prev => ({ ...prev, [v.id]: Number(safas || 0) + 10 }))}>+10</Button>
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setExtraSafas(prev => ({ ...prev, [v.id]: Number(safas || 0) + 20 }))}>+20</Button>
                      </div>
                      {(v.extra_safa_price || 0) > 0 && <span className="text-gray-500">{formatCurrency(v.extra_safa_price || 0)}/safa</span>}
                    </div>

                    <Button size="sm" className="w-full" onClick={() => onAdd(v, Number(safas || 0), currentInclusions)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Variant
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// --- Product Selection Dialog ---
interface ProductSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: { category: PackageCategory; variant: PackageVariant; eventDate?: string; itemId?: string; distanceKm?: number; pincode?: string; customInclusions?: string[] } | null
}

function ProductSelectionDialog({ open, onOpenChange, context }: ProductSelectionDialogProps) {
  if (!context) return null
  type ProductRow = { id: string; name: string; image_url?: string; category?: string; category_id?: string | null; subcategory?: string | null; subcategory_id?: string | null; stock_available?: number; price?: number; rental_price?: number; barcode?: string | null; product_code?: string | null }
  const [products, setProducts] = useState<ProductRow[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selection, setSelection] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryOptions, setCategoryOptions] = useState<{ key: string; label: string }[]>([])
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null)
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([])
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true)
  const [availabilityModalFor, setAvailabilityModalFor] = useState<{ id: string; name: string } | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityRows, setAvailabilityRows] = useState<{ date: string; kind: 'order' | 'package'; ref?: string; qty: number; returnStatus?: 'returned' | 'in_progress'; returnDate?: string }[]>([])
  const subcatsRef = useRef<HTMLDivElement | null>(null)
  
  // Custom product creation
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false)
  const [customProductData, setCustomProductData] = useState({ name: '', category_id: '', image_url: '', rental_price: '' })
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Helpers: label cleanup and unwanted filters
  const toTitle = (s?: string | null) => {
    if (!s) return ''
    return s
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b(vip)\b/gi, 'VIP')
      .replace(/\b(\w)/g, m => m.toUpperCase())
      .trim()
  }
  const isUnwantedCategory = (label: string) => /demo/i.test(label)

  useEffect(() => {
    const load = async () => {
      setProductsLoading(true)
      try {
        // Load products with images and categories (no hard dependency on is_active column)
        const { data } = await supabase
          .from("products")
          .select("id,name,image_url,category,category_id,subcategory,subcategory_id,stock_available,price,rental_price,barcode,product_code")
          .order("name")
        let rows: ProductRow[] = (data || []) as any
      // Normalize: if legacy 'category' holds a UUID, treat it as category_id
      rows = rows.map(r => {
        const looksUUID = typeof r.category === 'string' && /^[0-9a-fA-F\-]{32,36}$/.test(r.category)
        return looksUUID && !r.category_id ? { ...r, category_id: r.category } : r
      })
      // Map subcategory_id -> subcategory name when text is missing
      const subIds = Array.from(new Set(rows.map(r => r.subcategory_id).filter(Boolean))) as string[]
      if (subIds.length > 0) {
        const { data: subRows } = await supabase.from('product_categories').select('id,name').in('id', subIds)
        const subMap = new Map<string, string>((subRows || []).map((s: any) => [s.id as string, (s as any).name as string]))
        rows = rows.map(r => (!r.subcategory && r.subcategory_id && subMap.get(r.subcategory_id)) ? { ...r, subcategory: subMap.get(r.subcategory_id)! } : r)
      }
      setProducts(rows)

      // Build category options from category_ids and legacy text categories
      const ids = Array.from(new Set(rows.map(r => r.category_id).filter(Boolean))) as string[]
      const legacyLabels = Array.from(
        new Set(
          rows
            .filter(r => r.category && (!r.category_id))
            .map(r => r.category as string)
        )
      )
      let options: { key: string; label: string }[] = []
      if (ids.length > 0) {
  const { data: catRows } = await supabase.from('product_categories').select('id,name').in('id', ids)
  const mapped = (catRows || []).map((c: any) => ({ key: c.id as string, label: (c as any).name as string }))
        options = options.concat(mapped)
      }
      if (legacyLabels.length > 0) {
        options = options.concat(legacyLabels.map(l => ({ key: `legacy:${l}`, label: l })))
      }
      // Dedupe and sort
      const seen = new Set<string>()
      options = options.filter(o => {
        const k = `${o.key}|${o.label}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      }).sort((a, b) => a.label.localeCompare(b.label))
  setCategoryOptions(options)
  if (options.length > 0 && !selectedCategoryKey) setSelectedCategoryKey(options[0].key)

      // Build subcategory options for current category
      const subSet = new Set<string>()
      const consider = selectedCategoryKey
        ? rows.filter(r => selectedCategoryKey.startsWith('legacy:')
            ? (r.category || '') === selectedCategoryKey.substring('legacy:'.length) && !r.category_id
            : (r.category_id || (typeof r.category === 'string' && /^[0-9a-fA-F\-]{32,36}$/.test(r.category) ? r.category : '')) === selectedCategoryKey)
        : rows
      consider.forEach(r => { if (r.subcategory) subSet.add(r.subcategory) })
      setSubCategoryOptions(Array.from(subSet).sort((a,b) => a.localeCompare(b)))
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setProductsLoading(false)
      }
    }
    if (open) load()
  }, [open])

  // Recompute subcategory options whenever category selection or products change
  useEffect(() => {
    if (!open) return
    const subSet = new Set<string>()
    const rows = products
    const consider = selectedCategoryKey
      ? rows.filter(r => selectedCategoryKey.startsWith('legacy:')
          ? (r.category || '') === selectedCategoryKey.substring('legacy:'.length) && !r.category_id
          : (r.category_id || (typeof r.category === 'string' && /^[0-9a-fA-F\-]{32,36}$/.test(r.category) ? r.category : '')) === selectedCategoryKey)
      : rows
    consider.forEach(r => { if (r.subcategory) subSet.add(r.subcategory) })
    const options = Array.from(subSet).sort((a,b) => a.localeCompare(b))
    setSubCategoryOptions(options)
    if (selectedSubCategory && !options.includes(selectedSubCategory)) {
      setSelectedSubCategory(null)
    }
  }, [open, selectedCategoryKey, products])

  // Initialize selection from previously selected products if the dialog reopens
  useEffect(() => {
    if (!open) {
      // Reset selection when dialog closes
      return
    }
    
    // When dialog opens, check if there are any previously selected products for this booking item
    // This will be populated via a global event or we'll load from the booking item
    const handlePreviousSelection = (e: any) => {
      const itemId = e?.detail?.itemId as string | undefined
      const selectedProducts = e?.detail?.selected_products as Array<{ id: string; name: string; qty: number }> | undefined
      
      if (itemId === context?.itemId && Array.isArray(selectedProducts)) {
        // Initialize selection from previously selected products
        const newSelection: Record<string, number> = {}
        selectedProducts.forEach(sp => {
          newSelection[sp.id] = sp.qty || 1
        })
        setSelection(newSelection)
      }
    }
    
    window.addEventListener('pkg-restore-selection', handlePreviousSelection as any)
    return () => window.removeEventListener('pkg-restore-selection', handlePreviousSelection as any)
  }, [open, context?.itemId])

  // On-demand availability fetch for a single product around event date (5-day window)
  const checkAvailability = async (productId: string, productName: string) => {
    setAvailabilityModalFor({ id: productId, name: productName })
    setAvailabilityLoading(true)
    setAvailabilityRows([])
    try {
      const base = context?.eventDate ? new Date(context.eventDate) : new Date()
      const start = new Date(base); start.setDate(start.getDate() - 2)
      const end = new Date(base); end.setDate(end.getDate() + 2)
      const startISO = start.toISOString(); const endISO = end.toISOString()

      const { data: orderItems } = await supabase
        .from('product_order_items')
        .select('product_id, quantity, order:product_orders(id, event_date, delivery_date, return_date, order_number, status)')
        .eq('product_id', productId)

      // Get order IDs for barcode status check
      const orderIds = (orderItems || [])
        .map((item: any) => item.order?.id)
        .filter(Boolean)

      // Fetch barcode assignments to determine return status
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('booking_barcode_assignments')
        .select('booking_id, status, returned_at')
        .in('booking_id', orderIds)
        .eq('booking_type', 'product')

      // Create return status map
      const returnStatusMap = new Map<string, { returned: number; pending: number; returnDate?: string }>()
      barcodeData?.forEach((bc: any) => {
        if (!returnStatusMap.has(bc.booking_id)) {
          returnStatusMap.set(bc.booking_id, { returned: 0, pending: 0 })
        }
        const stats = returnStatusMap.get(bc.booking_id)!
        if (bc.status === 'returned' || bc.status === 'completed') {
          stats.returned++
        } else {
          stats.pending++
        }
      })

      const rows: { date: string; kind: 'order' | 'package'; ref?: string; qty: number; returnStatus?: 'returned' | 'in_progress'; returnDate?: string }[] = []
      const within = (iso?: string | null) => iso ? (new Date(iso) >= new Date(startISO) && new Date(iso) <= new Date(endISO)) : false
      const overlap = (a?: string | null, b?: string | null) => {
        const s = a ? new Date(a) : null; const e = b ? new Date(b) : null
        const S = new Date(startISO); const E = new Date(endISO)
        if (!s && !e) return false
        const from = s ?? e!; const to = e ?? s!
        return from <= E && to >= S
      }
      for (const r of (orderItems || []) as any[]) {
        const st = r.order?.status
        if (!st || ['cancelled'].includes(st)) continue
        const d = r.order?.event_date
        const hit = d ? within(d) : overlap(r.order?.delivery_date, r.order?.return_date)
        if (!hit) continue
        
        // Determine return status
        const orderId = r.order?.id
        const barcodeStats = orderId ? returnStatusMap.get(orderId) : undefined
        let returnStatus: 'returned' | 'in_progress' | undefined
        if (barcodeStats) {
          if (barcodeStats.pending > 0) {
            returnStatus = 'in_progress'
          } else if (barcodeStats.returned > 0) {
            returnStatus = 'returned'
          }
        }
        
        rows.push({ 
          date: d || r.order?.delivery_date || r.order?.return_date, 
          kind: 'order', 
          ref: r.order?.order_number, 
          qty: Number(r.quantity)||0,
          returnStatus,
          returnDate: r.order?.return_date
        })
      }
      rows.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setAvailabilityRows(rows)
    } catch (e) {
      setAvailabilityRows([])
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const setQty = (id: string, qty: number) => setSelection(prev => ({ ...prev, [id]: Math.max(0, qty) }))

  const filtered = useMemo(() => {
    let rows = products
    if (selectedCategoryKey) {
      if (selectedCategoryKey.startsWith('legacy:')) {
        const label = selectedCategoryKey.substring('legacy:'.length)
        rows = rows.filter(p => (p.category || '') === label && !p.category_id)
      } else {
        rows = rows.filter(p => (p.category_id || (typeof p.category === 'string' && /^[0-9a-fA-F\-]{32,36}$/.test(p.category) ? p.category : '')) === selectedCategoryKey)
      }
    }
    if (selectedSubCategory) {
      rows = rows.filter(p => (p.subcategory || '') === selectedSubCategory)
    }
    if (onlyInStock) rows = rows.filter(p => (p.stock_available ?? 0) > 0)
    if (search) {
      const q = search.toLowerCase().trim()
      rows = rows.filter(p => (
        p.name.toLowerCase().includes(q) ||
        (p.barcode ? String(p.barcode).toLowerCase().includes(q) : false) ||
        (p.product_code ? String(p.product_code).toLowerCase().includes(q) : false)
      ))
    }
    return rows
  }, [products, selectedCategoryKey, selectedSubCategory, onlyInStock, search])

  const totalSelected = Object.values(selection).reduce((a, b) => a + (b || 0), 0)

  const selectedList = useMemo(() => {
    const map: { id: string; name: string; qty: number; image_url?: string; rental_price?: number; price?: number }[] = []
    for (const [pid, qty] of Object.entries(selection)) {
      if (!qty) continue
      const p = products.find(x => x.id === pid)
      if (!p) continue
      map.push({ id: pid, name: p.name, qty, image_url: p.image_url, rental_price: p.rental_price, price: p.price })
    }
    return map
  }, [selection, products])

  const handleSave = async () => {
    if (totalSelected === 0) { onOpenChange(false); return }
    setSaving(true)
    try {
      // Dispatch selection to parent so sidebar + review can show reserved products for this booking item
      if (context?.itemId) {
        const ev = new CustomEvent('pkg-products-selected', { detail: { itemId: context.itemId, products: selectedList } })
        window.dispatchEvent(ev)
      }
      // Inventory is not deducted at this step; it's informational selection
      toast.success("Products selected successfully")
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || "Unable to save selection")
    } finally {
      setSaving(false)
    }
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
          // Convert base64 to blob
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          
          // Generate unique filename
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(7)
          const fileExt = blob.type.split('/')[1] || 'jpg'
          const fileName = `product-${timestamp}-${randomStr}.${fileExt}`
          
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, blob, {
              contentType: blob.type,
              cacheControl: '3600',
              upsert: true
            })
          
          if (uploadError) {
            console.error('[Custom Product] Supabase upload error:', uploadError)
            throw uploadError
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)
          
          imageUrl = publicUrl
          toast.success('Image uploaded successfully!')
        } catch (uploadError: any) {
          console.error('[Custom Product] Image upload failed:', uploadError)
          toast.error('Image upload failed, creating product without image')
          imageUrl = null
        }
      }

      // Generate a safe product_code to satisfy NOT NULL/UNIQUE constraints
      const productCode = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`

      // Get franchise_id - REQUIRED for franchise isolation
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

      // CRITICAL: Ensure franchise_id is set for proper isolation
      if (!createdByFranchiseId) {
        toast.error('Unable to determine franchise. Please try again.')
        throw new Error('franchise_id is required for custom product creation')
      }

      // Build base payload (use minimal fields to avoid schema mismatch)
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
        franchise_id: createdByFranchiseId // ALWAYS set franchise_id
      }

      // Safe insert with auto-removal of unknown columns
      const insertProductSafely = async (payload: any) => {
        let attempt = { ...payload }
        const dropped = new Set<string>()
        for (let i = 0; i < 6; i++) {
          const { data, error } = await supabase.from('products').insert(attempt).select().single()
          if (!error) return { data, error: null as any }
          const msg: string = (error as any)?.message || ''
          // If PostgREST tells us a column is missing, drop it and retry
          const m = msg.match(/Could not find the '(.*?)' column of 'products'/)
          if (m && m[1] && !dropped.has(m[1])) {
            const col = m[1]
            dropped.add(col)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [col]: _, ...rest } = attempt
            attempt = rest
            continue
          }
          return { data: null as any, error }
        }
        return { data: null as any, error: new Error('Failed to insert product after resolving columns') }
      }

      const { data: product, error } = await insertProductSafely(basePayload)
      
      if (error) {
        console.error('[Custom Product] Product creation error:', error)
        throw error
      }
      
      // Auto-generate barcodes for the custom product (generate 5 barcodes by default)
      try {
        const { generateBarcodesForProduct } = await import('@/lib/barcode-utils')
        const barcodeResult = await generateBarcodesForProduct(
          product.id,
          productCode,
          createdByFranchiseId,
          5 // Generate 5 barcodes for custom products
        )
        
        if (!barcodeResult.success) {
          console.error('Barcode generation failed:', barcodeResult.error)
          // Non-fatal: continue without barcodes
        }
      } catch (barcodeError) {
        console.error('Error generating barcodes:', barcodeError)
        // Non-fatal: continue
      }
      
      // Add to products list
      setProducts(prev => [...prev, product as any])
      
      // Auto-select the new product
      setSelection(prev => ({ ...prev, [product.id]: 1 }))
      
      toast.success(`Product "${product.name}" created and added!`)
      
      // Reset form and close dialog
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
      
      // Wait for video element to be ready
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
    // Close current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Toggle facing mode
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user'
    setCameraFacing(newFacing)
    
    // Open new camera
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

  const variantInclusions: string[] = (context.customInclusions && context.customInclusions.length > 0)
    ? context.customInclusions
    : (Array.isArray((context.variant as any).inclusions)
        ? ((context.variant as any).inclusions as string[])
        : typeof (context.variant as any).inclusions === "string"
          ? ((context.variant as any).inclusions as string).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[1400px] h-[95vh] max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {`Select Products for ${context.category.name}${(context.variant as any)?.name || (context.variant as any)?.variant_name ? ` – ${(context.variant as any).name || (context.variant as any).variant_name}` : ''}`}
            {context.eventDate ? (
              <span className="ml-2 text-xs text-gray-500">Availability window: {new Date(new Date(context.eventDate).setDate(new Date(context.eventDate).getDate()-2)).toLocaleDateString()} → {new Date(new Date(context.eventDate).setDate(new Date(context.eventDate).getDate()+2)).toLocaleDateString()}</span>
            ) : (
              <span className="ml-2 text-xs text-orange-600">Set event date to check availability</span>
            )}
            {/* Show pincode and distance context for pricing */}
            <span className="block mt-1 text-xs text-gray-600">
              Pricing context: Pincode-driven distance applied
              {typeof context.distanceKm === 'number' && context.pincode ? (
                <>
                  {" "}• {context.distanceKm} km (from pincode {context.pincode})
                </>
              ) : null}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 min-h-0 overflow-hidden bg-gray-50">
          {/* Left: Products pane - Clean & Spacious */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Toolbar - Minimal & Clean */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 space-y-3">
              {/* Search Bar - Prominent */}
              <div className="relative max-w-md">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-10 h-11 text-base border-gray-300 focus:border-black focus:ring-black"
                  placeholder="Search products or scan barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = search.trim().toLowerCase()
                      if (!q) return
                      const exact = products.find(p => (p.barcode && String(p.barcode).toLowerCase() === q) || (p.product_code && String(p.product_code).toLowerCase() === q))
                      if (exact) {
                        setSelection(prev => ({ ...prev, [exact.id]: (prev[exact.id] || 0) + 1 }))
                        setSearch("")
                        toast.success(`Added ${exact.name}`)
                      }
                    }
                  }}
                />
              </div>
              
              {/* Category Pills - Horizontal Scroll */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {categoryOptions.map(opt => {
                    const count = products.filter(p => {
                      if (opt.key.startsWith('legacy:')) {
                        const label = opt.key.substring('legacy:'.length)
                        return (p.category || '') === label && !p.category_id
                      }
                      const cid = (p.category_id || (typeof p.category === 'string' && /^[0-9a-fA-F\-]{32,36}$/.test(p.category) ? p.category : ''))
                      return cid === opt.key
                    }).length
                    if (count === 0) return null
                    const shown = toTitle(opt.label)
                    if (isUnwantedCategory(shown)) return null
                    return (
                      <button
                        key={opt.key}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategoryKey === opt.key
                            ? 'bg-black text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                          setSelectedCategoryKey(opt.key)
                          setSelectedSubCategory(null)
                        }}
                      >
                        {shown}
                      </button>
                    )
                  })}
                </div>
                
                {/* Right side controls */}
                <div className="flex-shrink-0 flex items-center gap-3 ml-auto">
                  <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" 
                      checked={onlyInStock} 
                      onChange={(e) => setOnlyInStock(e.target.checked)} 
                    />
                    In Stock Only
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCustomProductDialog(true)}
                    className="border-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Custom Product
                  </Button>
                </div>
              </div>
              
              {/* Subcategories */}
              {subCategoryOptions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  <button
                    className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      !selectedSubCategory
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-transparent text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedSubCategory(null)}
                  >
                    All
                  </button>
                  {subCategoryOptions.map(sc => (
                    <button
                      key={sc}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        selectedSubCategory === sc
                          ? 'bg-gray-200 text-gray-900'
                          : 'bg-transparent text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedSubCategory(sc)}
                    >
                      {toTitle(sc)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Grid - Clean & Spacious */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-4 gap-4">
              {productsLoading ? (
                // Loading skeleton - Apple-like
                Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl overflow-hidden border border-gray-200 animate-pulse">
                    <div className="aspect-square w-full bg-gray-100"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                      <div className="h-10 bg-gray-100 rounded-lg"></div>
                    </div>
                  </div>
                ))
              ) : (
                filtered.map(p => {
                  const qty = selection[p.id] || 0
                  const isSelected = qty > 0
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => setQty(p.id, qty + 1)}
                      className={`group relative bg-white rounded-xl overflow-hidden border transition-all text-left ${
                        isSelected 
                          ? 'border-black shadow-lg ring-2 ring-black ring-opacity-5' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {/* Product Image */}
                      <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                        
                        {/* Stock Badge */}
                        {(p.stock_available ?? 0) > 0 ? (
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                            {p.stock_available} left
                          </div>
                        ) : (
                          <div className="absolute top-2 right-2 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-white">
                            Out of stock
                          </div>
                        )}
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 left-2 bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {qty}
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]" title={p.name}>
                          {p.name}
                        </h3>
                        
                        {/* Price - For Reference Only */}
                        {(p.rental_price || p.price) ? (
                          <p className="text-xs text-gray-500">
                            Price: {formatCurrency(p.rental_price || p.price || 0)} <span className="text-[10px]">(reference)</span>
                          </p>
                        ) : null}
                        
                        {/* Quantity Controls - Only show when selected */}
                        {isSelected ? (
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setQty(p.id, qty - 1)
                              }}
                              className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <Input
                              type="number"
                              min={0}
                              max={p.stock_available ?? 999}
                              value={qty || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                const newQty = Math.max(0, Math.min(p.stock_available ?? 999, Number(e.target.value) || 0))
                                setQty(p.id, newQty)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && qty === 0) {
                                  setQty(p.id, 0)
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 h-8 text-center font-bold text-lg border-gray-200 focus:border-black focus:ring-black placeholder:text-gray-300 placeholder:opacity-50"
                              placeholder="0"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setQty(p.id, qty + 1)
                              }}
                              disabled={(p.stock_available ?? 0) <= qty}
                              className="w-8 h-8 rounded-md bg-black text-white flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setAvailabilityModalFor(p)
                              }}
                              className="w-full py-1.5 text-xs text-gray-600 hover:text-black border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              Check Availability
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setQty(p.id, 1)
                              }}
                              disabled={(p.stock_available ?? 0) === 0}
                              className="w-full py-2.5 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add to Selection
                            </button>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
              {!productsLoading && filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                  <Package className="h-20 w-20 mb-4" />
                  <p className="text-lg font-medium">No products found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Right: Selection Summary - Clean Sidebar */}
          <div className="w-96 flex-shrink-0 bg-white border-l flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Selection Summary</h2>
              <p className="text-sm text-gray-500 mt-1">{totalSelected} {totalSelected === 1 ? 'item' : 'items'} selected</p>
            </div>
            
            {/* Selected Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedList.length > 0 ? (
                <div className="space-y-3">
                  {selectedList.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={item.name}>{item.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">Qty: {item.qty}</p>
                        {(item.rental_price || item.price) ? (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatCurrency((item.rental_price || item.price || 0) * item.qty)} <span className="text-[10px]">(ref)</span>
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => setSelection(prev => { const { [item.id]:_, ...rest } = prev; return rest })}
                        className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ShoppingCart className="h-16 w-16 mb-3" />
                  <p className="text-sm font-medium">No items selected</p>
                  <p className="text-xs mt-1">Select products to add them here</p>
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="flex-shrink-0 border-t px-6 py-4 space-y-3 bg-white">
              {selectedList.length > 0 && (
                <button
                  onClick={() => setSelection({})}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all selections
                </button>
              )}
              
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  toast.message("Product selection skipped", { description: "You can add items later from the package wizard." })
                  // Mark the related booking item as products pending (if known)
                  if (context?.itemId) {
                    // update bookingItems state in parent via custom event
                    const ev = new CustomEvent('pkg-products-skipped', { detail: { itemId: context.itemId } })
                    window.dispatchEvent(ev)
                  }
                  onOpenChange(false)
                }}
              >
                Skip
              </Button>
              <Button onClick={handleSave} disabled={saving || totalSelected === 0}>
                {saving ? "Saving..." : `Reserve ${totalSelected} Item${totalSelected>1 ? 's' : ''}`}
              </Button>
            </div>
            </div>
          </div>
        </div>
      </DialogContent>
      {/* Availability Modal */}
      {availabilityModalFor && (
        <Dialog open={true} onOpenChange={() => setAvailabilityModalFor(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Availability for {availabilityModalFor.name}</DialogTitle>
            </DialogHeader>
            <div className="text-sm space-y-2">
              <div className="text-xs text-gray-600">Checking 5-day window around event date.</div>
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

      {/* Custom Product Creation Dialog */}
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
                {categoryOptions.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
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
              
              {/* Image Upload Options */}
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

              {/* Or divider */}
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
    </Dialog>
  )
}
