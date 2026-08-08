"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { toast } from "sonner"
import { fetchProductsWithBarcodes } from "@/lib/product-barcode-service"
import { supabase as supabaseClient } from "@/lib/supabase"

const COLOR = "#22c55e"
const COLOR_DARK = "#16803c"

function fmt(n: number) { return `₹${(n??0).toLocaleString("en-IN")}` }

/* ── Types ── */
interface Customer { id:string; name:string; phone:string; customer_code:string; email?:string; whatsapp?:string; city?:string }
interface Product  { id:string; name:string; product_code:string; category:string; rental_price:number; sale_price:number; image_url?:string; stock_available?:number; category_id?:string }
interface CartItem { product:Product; quantity:number; unit_price:number }
interface StaffMember { id:string; name:string; role?:string; department?:string }

const EVENT_TYPES = ["Wedding","Engagement","Reception","Birthday","Anniversary","Corporate","Other"]
const PAYMENT_METHODS = ["Cash","UPI","Card","Bank Transfer","Cheque","Online"]
const BOOKING_TYPES = [
  { key:"rental", label:"Rental", desc:"Products rented for an event", icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20V8a2 2 0 0 0-2-2h-3a3 3 0 0 1-6 0H6a2 2 0 0 0-2 2v12"/><path d="M4 12H2v7a1 1 0 0 0 1 1h3"/><path d="M20 12h2v7a1 1 0 0 1-1 1h-3"/></svg>
  ) },
  { key:"sale",   label:"Sale",   desc:"Direct product sale to customer", icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  ) },
]
const PRODUCT_CATEGORIES = [
  "Sherwani",
  "Safa/Turban",
  "Indo-Western",
  "Jodhpuri",
  "Kurta Pyjama",
  "Footwear",
  "Accessories",
  "Custom Work"
]

/* ── Step indicator ── */
function StepDot({ n, current, done }: { n:number; current:number; done:boolean }) {
  const active = n===current, completed = done || n<current
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:completed?COLOR:active?"white":"rgba(255,255,255,0.3)", border:active?`2px solid ${COLOR}`:"none", display:"flex", alignItems:"center", justifyContent:"center", color:completed?"white":active?COLOR:"rgba(255,255,255,0.5)", fontSize:12, fontWeight:800, transition:"all 0.3s" }}>
        {completed ? "✓" : n}
      </div>
    </div>
  )
}

function NewBookingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledCustomerId = searchParams.get("customer_id")

  const [step, setStep] = useState(1)
  const [bookingType, setBookingType] = useState<"rental"|"sale">("rental")
  const [isQuote, setIsQuote] = useState(searchParams.get("is_quote") === "true")

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [custSearch, setCustSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer|null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showNewCust, setShowNewCust] = useState(false)
  const [newCust, setNewCust] = useState({ name:"", phone:"+91", email:"", city:"" })
  const [savingCust, setSavingCust] = useState(false)

  // Booking details
  const [eventDate, setEventDate] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [venue, setVenue] = useState("")
  const [eventType, setEventType] = useState("Wedding")
  const [groomName, setGroomName] = useState("")
  const [brideName, setBrideName] = useState("")
  const [notes, setNotes] = useState("")

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  // Custom Product Modal State
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customCategory, setCustomCategory] = useState("Custom Work")
  const [customPrice, setCustomPrice] = useState("")
  const [customQty, setCustomQty] = useState(1)

  // Sales Staff
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [salesStaffId, setSalesStaffId] = useState("")

  // Pricing
  const [discountAmount, setDiscountAmount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("Cash")

  // Coupon
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState<{ code:string; message:string }|null>(null)
  const [couponError, setCouponError] = useState("")
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  // Saving
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Load prefilled customer
  useEffect(() => {
    if (prefilledCustomerId) {
      fetch(`/api/customers/${prefilledCustomerId}`)
        .then(r=>r.ok?r.json():null)
        .then(d=>{ if(d) setSelectedCustomer(d.data||d.customer||d) })
        .catch(()=>{})
    }
  }, [prefilledCustomerId])

  // Load customers
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      const res = await fetch("/api/customers?limit=200&basic=1")
      const data = await res.json()
      setCustomers(Array.isArray(data)?data:data.data||data.customers||[])
    } catch {} finally { setLoadingCustomers(false) }
  }, [])

  // Load products (with images/stock/category, like create-invoice's loadProductsAndCategories)
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const userRes = await fetch('/api/auth/user', { cache: 'no-store' })
      const user = userRes.ok ? await userRes.json() : null
      const franchiseId = user?.franchise_id

      const productsWithBarcodes = await fetchProductsWithBarcodes(franchiseId)

      const { data: categoriesData } = await supabaseClient
        .from('product_categories')
        .select('*')

      const categoryMap: { [key: string]: string } = {}
      if (categoriesData) {
        categoriesData.forEach((c: any) => { categoryMap[c.id] = c.name })
      }

      const mappedProducts: Product[] = productsWithBarcodes
        .filter((p: any) => p.name && (Number(p.rental_price) > 0 || Number((p as any).price || (p as any).sale_price) > 0))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          product_code: p.product_code || '',
          category: p.category_id ? (categoryMap[p.category_id] || '') : '',
          category_id: p.category_id,
          rental_price: p.rental_price || 0,
          sale_price: (p as any).price || (p as any).sale_price || 0,
          image_url: (p as any).image_url || undefined,
          stock_available: p.stock_available ?? 0,
        }))

      setProducts(mappedProducts)
    } catch (e) {
      console.warn("[New Booking] Failed to load products:", e)
    } finally { setLoadingProducts(false) }
  }, [])

  // Barcode scan (camera) — mirrors app/portal/warehouse/scan/page.tsx
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  function stopScan() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function lookupAndAddBarcode(code: string) {
    if (!code.trim()) return
    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}&limit=1`)
      const data = await res.json()
      const list: any[] = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      const product = list[0]
      if (product) {
        addToCart({
          id: product.id,
          name: product.name,
          product_code: product.product_code || '',
          category: product.category || '',
          rental_price: product.rental_price || 0,
          sale_price: product.price || product.sale_price || 0,
          image_url: product.image_url,
          stock_available: product.stock_available,
        })
        toast.success(`${product.name} added to cart`)
        setShowScanModal(false)
      } else {
        setScanError("No product found for this barcode.")
      }
    } catch {
      setScanError("Lookup failed. Try again.")
    }
  }

  async function startScan() {
    setScanError("")
    if (!("BarcodeDetector" in window)) {
      setScanError("This browser doesn't support camera scanning. Use the barcode search box instead.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
      })
      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            const value = codes[0].rawValue
            stopScan()
            lookupAndAddBarcode(value)
            return
          }
        } catch {}
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      setScanError(e?.name === "NotAllowedError" ? "Camera access denied." : "Couldn't access the camera.")
    }
  }

  useEffect(() => () => stopScan(), [])

  // Load staff list (franchise-isolated, safe for any portal staff role to call)
  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/staff")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load staff")
      const list: any[] = Array.isArray(data) ? data : data.data || []
      setStaffList(list)
      if (list.length > 0) setSalesStaffId(list[0].id)
    } catch (e) {
      // Leave the list empty rather than injecting fake IDs — sales_staff_id
      // is stored as a uuid FK, so a placeholder value would break booking
      // creation. The field is optional; the user can still save without it.
      console.warn("[New Booking] Failed to load staff list:", e)
      setStaffList([])
    }
  }, [])

  useEffect(() => { if(step===1&&!prefilledCustomerId) loadCustomers() }, [step, prefilledCustomerId, loadCustomers])
  useEffect(() => { if(step===3) loadProducts() }, [step, loadProducts])
  useEffect(() => { if(step===4) loadStaff() }, [step, loadStaff])

  // Cart helpers
  function addToCart(product: Product) {
    const price = bookingType==="sale" ? product.sale_price : product.rental_price
    setCart(c=>{
      const existing = c.find(i=>i.product.id===product.id)
      if (existing) return c.map(i=>i.product.id===product.id ? {...i, quantity:i.quantity+1} : i)
      return [...c, { product, quantity:1, unit_price:price }]
    })
  }

  function handleAddCustomProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!customName.trim()) {
      toast.error("Please enter a custom product name")
      return
    }
    const priceNum = parseFloat(customPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    const customProd: Product = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      product_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      category: customCategory,
      rental_price: priceNum,
      sale_price: priceNum,
    }

    setCart(prev => [
      ...prev,
      { product: customProd, quantity: customQty, unit_price: priceNum }
    ])

    setShowCustomModal(false)
    setCustomName("")
    setCustomPrice("")
    setCustomQty(1)
    toast.success("Custom product added to booking!")
  }

  function removeFromCart(productId: string) { setCart(c=>c.filter(i=>i.product.id!==productId)) }
  function updateQty(productId: string, qty: number) {
    if (qty<=0) return removeFromCart(productId)
    setCart(c=>c.map(i=>i.product.id===productId?{...i,quantity:qty}:i))
  }
  function updatePrice(productId: string, price: number) {
    setCart(c=>c.map(i=>i.product.id===productId?{...i,unit_price:price}:i))
  }

  const subtotal = cart.reduce((s,i)=>s+(i.quantity*i.unit_price),0)
  const grandTotal = Math.max(0, subtotal - discountAmount - couponDiscount)
  const balance = Math.max(0, grandTotal - amountPaid)

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setApplyingCoupon(true); setCouponError(""); setCouponApplied(null)
    try {
      const res = await fetch("/api/offers/validate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ code: couponCode.trim(), orderValue: subtotal }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setCouponError(data.error || data.message || "Invalid coupon code")
        setCouponDiscount(0)
        return
      }
      setCouponDiscount(Number(data.discount) || 0)
      setCouponApplied({ code: couponCode.trim().toUpperCase(), message: data.message || "Coupon applied!" })
    } catch {
      setCouponError("Failed to validate coupon")
    } finally { setApplyingCoupon(false) }
  }

  function removeCoupon() {
    setCouponApplied(null); setCouponDiscount(0); setCouponCode(""); setCouponError("")
  }

  const filteredProducts = products.filter(p=>
    !productSearch ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(productSearch.toLowerCase())
  )
  const filteredCustomers = customers.filter(c=>
    !custSearch ||
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.phone.includes(custSearch) ||
    c.customer_code?.toLowerCase().includes(custSearch.toLowerCase())
  )

  // Create new customer
  async function createCustomer() {
    if (!newCust.name.trim()) return
    const phoneValidation = validatePhoneWithCountry(newCust.phone)
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Please enter a valid phone number")
      return
    }
    setSavingCust(true)
    try {
      const res = await fetch("/api/customers", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:newCust.name.trim(), phone:newCust.phone.trim(), email:newCust.email||null, city:newCust.city||null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||"Failed to create customer")
      const c = data.data||data.customer||data
      setSelectedCustomer(c)
      setShowNewCust(false)
      setNewCust({name:"",phone:"+91",email:"",city:""})
    } catch(e:any) { toast.error(e.message) } finally { setSavingCust(false) }
  }

  // Save booking
  async function saveBooking(asDraft = false) {
    if (!selectedCustomer) return
    setSaving(true); setSaveError("")
    try {
      const res = await fetch("/api/portal/create-booking", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          booking_type: bookingType,
          is_quote: isQuote,
          is_draft: asDraft,
          event_date: eventDate,
          delivery_date: deliveryDate||null,
          return_date: returnDate||null,
          event_type: eventType,
          venue_address: venue,
          groom_name: groomName,
          bride_name: brideName,
          notes,
          sales_staff_id: salesStaffId || null,
          total_amount: grandTotal,
          subtotal_amount: subtotal,
          discount_amount: discountAmount,
          coupon_code: couponApplied?.code || null,
          coupon_discount: couponDiscount,
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          items: cart.map(i=>({
            product_id: i.product.id.startsWith("custom-") ? null : i.product.id,
            product_name: i.product.name,
            category: i.product.category,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: i.quantity*i.unit_price,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||"Failed to create booking")
      router.push(`/portal/booking/bookings/${data.data.id}?kind=product`)
    } catch(e:any) { setSaveError(e.message); setSaving(false) }
  }

  const canGoStep2 = !!selectedCustomer
  const canGoStep3 = bookingType === "sale" ? true : !!eventDate
  const canSave    = !!selectedCustomer && (bookingType === "sale" || !!eventDate)

  const stepLabels = ["Customer","Details","Products","Review"]

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F1EAF5 0%,#F1EAF5 100%)", fontFamily:"var(--font-inter), Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${COLOR_DARK},${COLOR})`, padding:"20px 16px 16px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={()=>router.push("/portal/booking/bookings")} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ color:"white", fontSize:18, fontWeight:900, margin:0 }}>New Booking</h1>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:11, margin:0 }}>{stepLabels[step-1]} — Step {step} of 4</p>
          </div>
        </div>
        {/* Step progress */}
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {[1,2,3,4].map((n,i)=>(
            <div key={n} style={{ display:"flex", alignItems:"center", flex:i<3?1:"none" }}>
              <StepDot n={n} current={step} done={false} />
              {i<3 && <div style={{ flex:1, height:2, background:n<step?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.25)", margin:"0 4px" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 120px" }}>

        {/* ── STEP 1: Customer ── */}
        {step===1 && (
          <div>
            {/* Booking type toggle */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {BOOKING_TYPES.map(t=>(
                <button key={t.key} onClick={()=>setBookingType(t.key as any)}
                  style={{ padding:"14px 10px", borderRadius:16, border:`2px solid ${bookingType===t.key?COLOR:"rgba(0,0,0,0.08)"}`, background:bookingType===t.key?"#F1EAF5":"white", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                  <p style={{ margin:"0 0 4px", fontSize:22 }}>{t.icon}</p>
                  <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:800, color:bookingType===t.key?COLOR_DARK:"#1e1208" }}>{t.label}</p>
                  <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.5)" }}>{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Save as quote toggle */}
            <div style={{ background:"white", borderRadius:14, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:"#1e1208" }}>Save as Quote</p>
                <p style={{ margin:0, fontSize:11, color:"rgba(80,55,30,0.5)" }}>Convert to booking later</p>
              </div>
              <button onClick={()=>setIsQuote(v=>!v)}
                style={{ width:44, height:24, borderRadius:12, border:"none", background:isQuote?COLOR:"#d1d5db", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:2, left:isQuote?22:2, width:20, height:20, borderRadius:10, background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
              </button>
            </div>

            {/* Customer selection */}
            {selectedCustomer ? (
              <div style={{ background:"white", borderRadius:18, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <p style={{ margin:0, fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Selected Customer</p>
                  <button onClick={()=>setSelectedCustomer(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"rgba(80,55,30,0.5)", fontFamily:"inherit" }}>Change</button>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:16, fontWeight:800, flexShrink:0 }}>
                    {(selectedCustomer.name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:800, color:"#1e1208" }}>{selectedCustomer.name}</p>
                    <p style={{ margin:0, fontSize:11, color:"rgba(80,55,30,0.5)" }}>{selectedCustomer.phone} · {selectedCustomer.customer_code}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:14, padding:"10px 14px", border:"1px solid rgba(74,31,94,0.18)", marginBottom:10 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" value={custSearch} onChange={e=>{ setCustSearch(e.target.value); if(!customers.length) loadCustomers() }}
                    placeholder="Search by name or phone…"
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, background:"transparent", color:"#1e1208", fontFamily:"inherit" }} />
                </div>

                {!showNewCust && (
                  <button onClick={()=>setShowNewCust(true)}
                    style={{ width:"100%", padding:"12px 0", borderRadius:14, border:`1.5px dashed ${COLOR}`, background:"#F1EAF5", color:COLOR_DARK, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
                    + Add New Customer
                  </button>
                )}

                {showNewCust && (
                  <div style={{ background:"white", borderRadius:16, padding:16, marginBottom:10 }}>
                    <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1e1208" }}>New Customer</p>
                    {[
                      { label:"Full Name *",  key:"name",  type:"text",  placeholder:"Customer name" },
                      { label:"Phone *",      key:"phone", type:"tel",   placeholder:"10-digit mobile" },
                      { label:"Email",        key:"email", type:"email",  placeholder:"Optional" },
                      { label:"City",         key:"city",  type:"text",   placeholder:"Optional" },
                    ].map(f=>(
                      <div key={f.key} style={{ marginBottom:10 }}>
                        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)" }}>{f.label}</p>
                        <input type={f.type} value={(newCust as any)[f.key]} onChange={e=>setNewCust(v=>({...v,[f.key]:e.target.value}))}
                          placeholder={f.placeholder}
                          style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>setShowNewCust(false)} style={{ flex:1, height:42, borderRadius:12, border:"1px solid rgba(0,0,0,0.1)", background:"white", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                      <button onClick={createCustomer} disabled={savingCust||!newCust.name||!newCust.phone}
                        style={{ flex:2, height:42, borderRadius:12, border:"none", background:savingCust||!newCust.name||!newCust.phone?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:savingCust||!newCust.name||!newCust.phone?"#9ca3af":"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {savingCust?"Creating…":"Create Customer"}
                      </button>
                    </div>
                  </div>
                )}

                {loadingCustomers ? (
                  <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"20px 0" }}>Loading customers…</p>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {filteredCustomers.slice(0,20).map(c=>(
                      <div key={c.id} onClick={()=>setSelectedCustomer(c)}
                        style={{ background:"white", borderRadius:14, padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:800, flexShrink:0 }}>
                          {(c.name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:"#1e1208" }}>{c.name}</p>
                          <p style={{ margin:0, fontSize:11, color:"rgba(80,55,30,0.5)" }}>{c.phone} {c.city&&`· ${c.city}`}</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.2)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                      </div>
                    ))}
                    {filteredCustomers.length===0&&custSearch && <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"20px 0" }}>No customers found</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Event Details ── */}
        {step===2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1e1208" }}>Event Details</p>

              <div style={{ marginBottom:12 }}>
                <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>EVENT DATE *</p>
                <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)}
                  style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:`1.5px solid ${eventDate?COLOR:"rgba(0,0,0,0.1)"}`, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>

              {bookingType === "rental" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                  <div>
                    <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>DELIVERY DATE</p>
                    <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}
                      style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                  </div>
                  <div>
                    <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>RETURN DATE</p>
                    <input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}
                      style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom:12 }}>
                <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>VENUE ADDRESS</p>
                <textarea value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Full venue address" rows={2}
                  style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", resize:"none", boxSizing:"border-box" }} />
              </div>

              <div style={{ marginBottom:12 }}>
                <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>EVENT TYPE</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {EVENT_TYPES.map(t=>(
                    <button key={t} onClick={()=>setEventType(t)}
                      style={{ padding:"7px 14px", borderRadius:20, border:"none", background:eventType===t?COLOR:"rgba(0,0,0,0.06)", color:eventType===t?"white":"rgba(80,55,30,0.6)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>GROOM NAME</p>
                  <input type="text" value={groomName} onChange={e=>setGroomName(e.target.value)} placeholder="Groom's name"
                    style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                </div>
                <div>
                  <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>BRIDE NAME</p>
                  <input type="text" value={brideName} onChange={e=>setBrideName(e.target.value)} placeholder="Bride's name"
                    style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                </div>
              </div>
            </div>

            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1e1208" }}>Notes</p>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Special instructions or notes…" rows={3}
                style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit", resize:"none", boxSizing:"border-box" }} />
            </div>
          </div>
        )}

        {/* ── STEP 3: Products ── */}
        {step===3 && (
          <div>
            {/* Cart summary */}
            {cart.length>0 && (
              <div style={{ background:"white", borderRadius:18, padding:16, marginBottom:12 }}>
                <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Cart ({cart.length} items) · {fmt(subtotal)}</p>
                {cart.map(item=>(
                  <div key={item.product.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:"#1e1208" }}>
                        {item.product.name}
                        {item.product.id.startsWith("custom-") && <span style={{ marginLeft:6, fontSize:9, background:"#F1EAF5", color:COLOR_DARK, padding:"2px 6px", borderRadius:4, fontWeight:800 }}>CUSTOM</span>}
                      </p>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.45)" }}>₹</p>
                        <input type="number" value={item.unit_price} onChange={e=>updatePrice(item.product.id, parseFloat(e.target.value)||0)}
                          style={{ width:70, border:"none", borderBottom:"1px solid rgba(0,0,0,0.1)", outline:"none", fontSize:12, fontFamily:"inherit", background:"transparent", color:"#1e1208", fontWeight:700 }} />
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      <button onClick={()=>updateQty(item.product.id, item.quantity-1)} style={{ width:28, height:28, borderRadius:8, border:"1px solid rgba(0,0,0,0.1)", background:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ fontSize:14, fontWeight:800, color:"#1e1208", minWidth:20, textAlign:"center" }}>{item.quantity}</span>
                      <button onClick={()=>updateQty(item.product.id, item.quantity+1)} style={{ width:28, height:28, borderRadius:8, border:"none", background:COLOR, color:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                    <button onClick={()=>removeFromCart(item.product.id)} style={{ width:28, height:28, borderRadius:8, border:"none", background:"#fee2e2", color:"#dc2626", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Product Search & Add Custom Product Bar */}
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:14, padding:"10px 14px", border:"1px solid rgba(74,31,94,0.18)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products by name or category…"
                  style={{ flex:1, border:"none", outline:"none", fontSize:13, background:"transparent", color:"#1e1208", fontFamily:"inherit" }} />
                {productSearch && <button onClick={()=>setProductSearch("")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16 }}>×</button>}
              </div>

              <button
                onClick={() => { setShowScanModal(true); setScanError("") }}
                style={{ width:46, height:46, borderRadius:14, border:"none", background:"#1e1208", color:"white", fontSize:16, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
                title="Scan barcode"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>

              <button
                onClick={() => setShowCustomModal(true)}
                style={{ padding:"0 14px", height:46, borderRadius:14, border:"none", background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:"white", fontSize:12, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, flexShrink:0, boxShadow:`0 2px 8px ${COLOR}40` }}
              >
                <span>+ Custom</span>
              </button>
            </div>

            {loadingProducts ? (
              <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"30px 0" }}>Loading products…</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredProducts.map(p=>{
                  const price = bookingType==="sale" ? p.sale_price : p.rental_price
                  const inCart = cart.find(i=>i.product.id===p.id)
                  const outOfStock = p.stock_available !== undefined && p.stock_available <= 0
                  const initials = (p.name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()
                  return (
                    <div key={p.id} style={{ background:"white", borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, opacity:outOfStock?0.55:1 }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width:44, height:44, borderRadius:10, objectFit:"cover", flexShrink:0, background:"#f3f4f6" }} />
                      ) : (
                        <div style={{ width:44, height:44, borderRadius:10, background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:13, fontWeight:800, flexShrink:0 }}>{initials}</div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:"#1e1208", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.45)" }}>{p.category} · {p.product_code}</p>
                        {p.stock_available !== undefined && (
                          <span style={{ display:"inline-block", marginTop:4, fontSize:9, fontWeight:800, padding:"1px 7px", borderRadius:8, background:outOfStock?"#fee2e2":"#dcfce7", color:outOfStock?"#b91c1c":"#15803d" }}>
                            {outOfStock ? "Out of stock" : `${p.stock_available} in stock`}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                        <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:800, color:COLOR_DARK }}>{fmt(price)}</p>
                        {inCart ? (
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <button onClick={()=>updateQty(p.id, inCart.quantity-1)} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(0,0,0,0.1)", background:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                            <span style={{ fontSize:13, fontWeight:800, color:"#1e1208", minWidth:18, textAlign:"center" }}>{inCart.quantity}</span>
                            <button onClick={()=>updateQty(p.id, inCart.quantity+1)} style={{ width:26, height:26, borderRadius:7, border:"none", background:COLOR, color:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                          </div>
                        ) : (
                          <button onClick={()=>!outOfStock && addToCart(p)} disabled={outOfStock}
                            style={{ padding:"5px 12px", borderRadius:10, border:"none", background:outOfStock?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:outOfStock?"#9ca3af":"white", fontSize:12, fontWeight:700, cursor:outOfStock?"not-allowed":"pointer", fontFamily:"inherit" }}>
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredProducts.length===0 && <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"30px 0" }}>No products found</p>}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Review & Save ── */}
        {step===4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {/* Sales Staff Representative Selection */}
            <div style={{ background:"white", borderRadius:18, padding:16, border:"1.5px solid rgba(74,31,94,0.15)" }}>
              <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:COLOR_DARK, letterSpacing:1.2, textTransform:"uppercase" }}>
                Sales Representative / Staff Member *
              </p>
              <select
                value={salesStaffId}
                onChange={e=>setSalesStaffId(e.target.value)}
                style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(74,31,94,0.25)", fontSize:13, fontWeight:700, color:"#1e1208", outline:"none", fontFamily:"inherit", background:"#FAFAFC" }}
              >
                <option value="">Select Sales Staff</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department || s.role || "Sales"})
                  </option>
                ))}
              </select>
              <p style={{ margin:"6px 0 0", fontSize:10, color:"rgba(80,55,30,0.55)" }}>
                Pata chle ki konse sales staff member ne rental/sale deal close ki hai.
              </p>
            </div>

            {/* Summary */}
            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Booking Summary</p>
              {[
                { label:"Customer",     value:selectedCustomer?.name },
                { label:"Type",         value:`${bookingType.charAt(0).toUpperCase()+bookingType.slice(1)}${isQuote?" (Quote)":""}` },
                { label:"Sales Staff",  value:staffList.find(s=>s.id===salesStaffId)?.name || "Assigned Sales Staff" },
                { label:"Event Date",   value:eventDate ? new Date(eventDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—" },
                { label:"Event Type",   value:eventType },
                { label:"Venue",        value:venue||"—" },
                { label:"Items",        value:`${cart.length} item${cart.length!==1?"s":""}` },
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600 }}>{r.label}</span>
                  <span style={{ fontSize:12, color:"#1e1208", fontWeight:700 }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Pricing</p>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600 }}>Subtotal</span>
                <span style={{ fontSize:12, color:"#1e1208", fontWeight:700 }}>{fmt(subtotal)}</span>
              </div>

              {/* Coupon */}
              <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600, display:"block", marginBottom:6 }}>Coupon Code</span>
                {couponApplied ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#dcfce7", borderRadius:10, padding:"8px 12px" }}>
                    <span style={{ fontSize:12, fontWeight:800, color:"#15803d" }}>✓ {couponApplied.code} · − {fmt(couponDiscount)}</span>
                    <button onClick={removeCoupon} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#b91c1c", fontWeight:700, fontFamily:"inherit" }}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="text" value={couponCode} onChange={e=>{ setCouponCode(e.target.value.toUpperCase()); setCouponError("") }}
                        placeholder="Enter coupon code"
                        style={{ flex:1, padding:"9px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.1)", fontSize:12, outline:"none", fontFamily:"inherit", textTransform:"uppercase" }} />
                      <button onClick={applyCoupon} disabled={!couponCode.trim()||applyingCoupon}
                        style={{ padding:"0 16px", borderRadius:10, border:"none", background:!couponCode.trim()||applyingCoupon?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:!couponCode.trim()||applyingCoupon?"#9ca3af":"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {applyingCoupon?"…":"Apply"}
                      </button>
                    </div>
                    {couponError && <p style={{ margin:"6px 0 0", fontSize:11, color:"#dc2626", fontWeight:600 }}>{couponError}</p>}
                  </div>
                )}
              </div>

              <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600 }}>Discount (₹)</span>
                  <input type="number" value={discountAmount||""} onChange={e=>setDiscountAmount(parseFloat(e.target.value)||0)} placeholder="0"
                    style={{ width:90, textAlign:"right", border:"1px solid rgba(0,0,0,0.1)", borderRadius:8, padding:"4px 8px", fontSize:12, outline:"none", fontFamily:"inherit", color:"#15803d", fontWeight:700 }} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
                <span style={{ fontSize:14, color:"#1e1208", fontWeight:800 }}>Grand Total</span>
                <span style={{ fontSize:16, color:"#1e1208", fontWeight:900 }}>{fmt(grandTotal)}</span>
              </div>
              <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600 }}>Advance Paid (₹)</span>
                  <input type="number" value={amountPaid||""} onChange={e=>setAmountPaid(parseFloat(e.target.value)||0)} placeholder="0"
                    style={{ width:90, textAlign:"right", border:"1px solid rgba(0,0,0,0.1)", borderRadius:8, padding:"4px 8px", fontSize:12, outline:"none", fontFamily:"inherit", color:"#15803d", fontWeight:700 }} />
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {PAYMENT_METHODS.map(m=>(
                    <button key={m} onClick={()=>setPaymentMethod(m)}
                      style={{ padding:"5px 12px", borderRadius:16, border:`1.5px solid ${paymentMethod===m?COLOR:"rgba(0,0,0,0.08)"}`, background:paymentMethod===m?"#F1EAF5":"white", color:paymentMethod===m?COLOR_DARK:"rgba(80,55,30,0.5)", fontSize:11, fontWeight:paymentMethod===m?700:500, cursor:"pointer", fontFamily:"inherit" }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0" }}>
                <span style={{ fontSize:13, color:balance>0?"#dc2626":COLOR_DARK, fontWeight:700 }}>Balance Due</span>
                <span style={{ fontSize:15, color:balance>0?"#dc2626":COLOR_DARK, fontWeight:900 }}>{fmt(balance)}</span>
              </div>
            </div>

            {saveError && <div style={{ background:"#fee2e2", borderRadius:14, padding:"12px 16px" }}><p style={{ margin:0, fontSize:12, color:"#b91c1c", fontWeight:600 }}>⚠️ {saveError}</p></div>}

            <div style={{ display:"flex", gap:10 }}>
              {!isQuote && (
                <button onClick={()=>saveBooking(true)} disabled={saving||!selectedCustomer}
                  style={{ flex:1, height:56, borderRadius:16, border:`1.5px solid ${COLOR}`, background:"white", color:saving||!selectedCustomer?"#9ca3af":COLOR_DARK, fontSize:14, fontWeight:800, cursor:saving||!selectedCustomer?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
                  Save as Draft
                </button>
              )}
              <button onClick={()=>saveBooking(false)} disabled={saving||!canSave}
                style={{ flex:2, height:56, borderRadius:16, border:"none", background:saving||!canSave?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:saving||!canSave?"#9ca3af":"white", fontSize:16, fontWeight:800, cursor:saving||!canSave?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:saving||!canSave?"none":`0 6px 20px ${COLOR}55` }}>
                {saving ? "Creating…" : isQuote ? "Save as Quote" : "✓ Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Product Modal */}
      {showCustomModal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <form onSubmit={handleAddCustomProduct} style={{ width:"100%", maxWidth:420, background:"white", borderRadius:24, padding:20, boxShadow:"0 20px 40px rgba(0,0,0,0.2)", position:"relative" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:12, borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:"#1e1208" }}>+ Add Custom Product</h3>
              <button type="button" onClick={()=>setShowCustomModal(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"rgba(0,0,0,0.4)" }}>×</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.6)", marginBottom:4 }}>PRODUCT NAME *</label>
                <input
                  required
                  autoFocus
                  value={customName}
                  onChange={e=>setCustomName(e.target.value)}
                  placeholder="e.g. Custom Safa Package / Velvet Embroidery"
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.15)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
                />
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.6)", marginBottom:4 }}>CATEGORY *</label>
                <select
                  value={customCategory}
                  onChange={e=>setCustomCategory(e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.15)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
                >
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.6)", marginBottom:4 }}>PRICE (₹) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={customPrice}
                    onChange={e=>setCustomPrice(e.target.value)}
                    placeholder="e.g. 2500"
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.15)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.6)", marginBottom:4 }}>QUANTITY *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={customQty}
                    onChange={e=>setCustomQty(parseInt(e.target.value)||1)}
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.15)", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button type="button" onClick={()=>setShowCustomModal(false)} style={{ flex:1, height:44, borderRadius:12, border:"1px solid rgba(0,0,0,0.1)", background:"white", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button type="submit" style={{ flex:2, height:44, borderRadius:12, border:"none", background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                + Add to Booking
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barcode Scan Modal */}
      {showScanModal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ width:"100%", maxWidth:420, background:"white", borderRadius:24, padding:20, boxShadow:"0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:"#1e1208" }}>Scan Barcode</h3>
              <button onClick={()=>{ stopScan(); setShowScanModal(false) }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"rgba(0,0,0,0.4)" }}>×</button>
            </div>
            {scanning ? (
              <>
                <video ref={videoRef} muted playsInline style={{ width:"100%", borderRadius:12, marginBottom:12, background:"#000", maxHeight:260, objectFit:"cover" }} />
                <button onClick={stopScan} style={{ width:"100%", padding:"10px 0", borderRadius:12, border:`1px solid ${COLOR}`, background:"white", color:COLOR_DARK, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel Scan</button>
              </>
            ) : (
              <button onClick={startScan} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:"white", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", marginBottom:12 }}>
                📷 Open Camera
              </button>
            )}
            {scanError && <p style={{ margin:"10px 0 0", fontSize:12, color:"#b91c1c", fontWeight:600 }}>{scanError}</p>}
            <div style={{ marginTop:14 }}>
              <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)" }}>OR ENTER MANUALLY</p>
              <div style={{ display:"flex", gap:8 }}>
                <input type="text" id="manual-barcode-input" placeholder="Type barcode…"
                  onKeyDown={e=>{ if(e.key==="Enter") lookupAndAddBarcode((e.target as HTMLInputElement).value) }}
                  style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1px solid rgba(0,0,0,0.1)", fontSize:13, outline:"none", fontFamily:"inherit" }} />
                <button onClick={()=>{ const el=document.getElementById('manual-barcode-input') as HTMLInputElement; if(el) lookupAndAddBarcode(el.value) }}
                  style={{ padding:"0 16px", borderRadius:10, border:"none", background:COLOR, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Go</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav buttons */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"white", borderTop:"1px solid rgba(0,0,0,0.06)", padding:"12px 16px calc(env(safe-area-inset-bottom,0px) + 12px)", display:"flex", gap:10, zIndex:50 }}>
        {step>1 && (
          <button onClick={()=>setStep(s=>s-1)}
            style={{ flex:1, height:48, borderRadius:14, border:"1.5px solid rgba(0,0,0,0.1)", background:"white", color:"rgba(80,55,30,0.7)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            ← Back
          </button>
        )}
        {step<4 && (
          <button
            onClick={()=>setStep(s=>s+1)}
            disabled={step===1?!canGoStep2:step===2?!canGoStep3:false}
            style={{ flex:2, height:48, borderRadius:14, border:"none", background:(step===1&&!canGoStep2)||(step===2&&!canGoStep3)?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:(step===1&&!canGoStep2)||(step===2&&!canGoStep3)?"#9ca3af":"white", fontSize:14, fontWeight:800, cursor:(step===1&&!canGoStep2)||(step===2&&!canGoStep3)?"not-allowed":"pointer", fontFamily:"inherit" }}>
            {step===3&&cart.length===0 ? "Skip Products →" : "Next →"}
          </button>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F1EAF5,#F1EAF5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #22c55e30", borderTopColor:"#22c55e", animation:"spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <NewBookingInner />
    </Suspense>
  )
}
