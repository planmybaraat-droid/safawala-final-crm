"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PortalIcon } from "@/components/portal/portal-icons"

const ArrowLeftIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
)
const ArrowRightIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
)
const SaveIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17,21 17,13 7,13 7,21"/>
    <polyline points="7,3 7,8 15,8"/>
  </svg>
)

const COLOR = "#8b5cf6"
const COLOR_DARK = "#6d28d9"

function fmt(n: number) { return `₹${(n??0).toLocaleString("en-IN")}` }

interface Customer { id:string; name:string; phone:string; customer_code:string; email?:string; whatsapp?:string; city?:string }
interface PackageCategory { id:string; name:string; description?:string; security_deposit?:number }
interface PackageVariant { id:string; category_id:string; package_id?:string; name?:string; variant_name?:string; base_price:number; security_deposit?:number; inclusions?:string[]|string }
interface CartItem { category:PackageCategory; variant:PackageVariant; quantity:number; unit_price:number }

const EVENT_TYPES = ["Wedding","Engagement","Reception","Birthday","Anniversary","Corporate","Other"]
const PAYMENT_METHODS = ["Cash","UPI","Card","Bank Transfer","Cheque","Online"]

function StepDot({ n, current }: { n:number; current:number }) {
  const active = n===current, completed = n<current
  return (
    <div style={{ width:28, height:28, borderRadius:"50%", background:completed?COLOR:active?"white":"rgba(255,255,255,0.3)", border:active?`2px solid ${COLOR}`:"none", display:"flex", alignItems:"center", justifyContent:"center", color:completed?"white":active?COLOR:"rgba(255,255,255,0.5)", fontSize:12, fontWeight:800, transition:"all 0.3s" }}>
      {completed ? <PortalIcon name="check" size={14} /> : n}
    </div>
  )
}

function NewPackageBookingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledCustomerId = searchParams.get("customer_id")

  const [step, setStep] = useState(1)
  const [isQuote, setIsQuote] = useState(searchParams.get("is_quote") === "true")

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [custSearch, setCustSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer|null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showNewCust, setShowNewCust] = useState(false)
  const [newCust, setNewCust] = useState({ name:"", phone:"+91", email:"", city:"" })
  const [savingCust, setSavingCust] = useState(false)

  // Packages
  const [categories, setCategories] = useState<PackageCategory[]>([])
  const [variants, setVariants] = useState<PackageVariant[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory|null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  // Event details
  const [eventDate, setEventDate] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [venue, setVenue] = useState("")
  const [eventType, setEventType] = useState("Wedding")
  const [groomName, setGroomName] = useState("")
  const [brideName, setBrideName] = useState("")
  const [notes, setNotes] = useState("")

  // Staff
  const [staffList, setStaffList] = useState<any[]>([])
  const [salesStaffId, setSalesStaffId] = useState("")

  // Pricing
  const [discountAmount, setDiscountAmount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState<{ code:string; message:string }|null>(null)
  const [couponError, setCouponError] = useState("")
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    if (prefilledCustomerId) {
      fetch(`/api/customers/${prefilledCustomerId}`)
        .then(r=>r.ok?r.json():null)
        .then(d=>{ if(d) setSelectedCustomer(d.data||d.customer||d) })
        .catch(()=>{})
    }
  }, [prefilledCustomerId])

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      const res = await fetch("/api/customers?limit=200&basic=1")
      const data = await res.json()
      setCustomers(Array.isArray(data)?data:data.data||data.customers||[])
    } catch {} finally { setLoadingCustomers(false) }
  }, [])

  // Reuse the same read-only fetch calls book-package/page.tsx uses for category/variant data
  const loadPackages = useCallback(async () => {
    setLoadingPackages(true)
    try {
      const [catRes, variantRes] = await Promise.all([
        fetch('/api/packages/categories', { cache: 'no-store' }),
        fetch('/api/packages/variants', { cache: 'no-store' }),
      ])
      const catJson = catRes.ok ? await catRes.json() : { data: [] }
      const variantJson = variantRes.ok ? await variantRes.json() : { data: [] }
      setCategories(catJson.data || [])
      setVariants(variantJson.data || [])
    } catch (e) { console.warn("[New Package Booking] Failed to load packages:", e) }
    finally { setLoadingPackages(false) }
  }, [])

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/staff")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load staff")
      const list: any[] = Array.isArray(data) ? data : data.data || []
      setStaffList(list)
      if (list.length > 0) setSalesStaffId(list[0].id)
    } catch { setStaffList([]) }
  }, [])

  useEffect(() => { if(step===1&&!prefilledCustomerId) loadCustomers() }, [step, prefilledCustomerId, loadCustomers])
  useEffect(() => { if(step===2) loadPackages() }, [step, loadPackages])
  useEffect(() => { if(step===4) loadStaff() }, [step, loadStaff])

  const categoryVariants = variants.filter(v =>
    selectedCategory && (v.category_id === selectedCategory.id || (v as any).package_id === selectedCategory.id)
  )

  function addVariantToCart(variant: PackageVariant) {
    if (!selectedCategory) return
    setCart(c => {
      const existing = c.find(i => i.variant.id === variant.id)
      if (existing) return c.map(i => i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...c, { category: selectedCategory, variant, quantity: 1, unit_price: variant.base_price || 0 }]
    })
    toast.success(`${variant.variant_name || variant.name} added`)
  }
  function removeFromCart(variantId: string) { setCart(c => c.filter(i => i.variant.id !== variantId)) }
  function updateQty(variantId: string, qty: number) {
    if (qty<=0) return removeFromCart(variantId)
    setCart(c => c.map(i => i.variant.id===variantId ? { ...i, quantity: qty } : i))
  }

  const subtotal = cart.reduce((s,i)=>s+(i.quantity*i.unit_price),0)
  const grandTotal = Math.max(0, subtotal - discountAmount - couponDiscount)
  const balance = Math.max(0, grandTotal - amountPaid)
  const securityDeposit = cart.reduce((s,i)=>s + (Number(i.variant.security_deposit)||Number(i.category.security_deposit)||0) * i.quantity, 0)

  const filteredCustomers = customers.filter(c=>
    !custSearch ||
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.phone.includes(custSearch) ||
    c.customer_code?.toLowerCase().includes(custSearch.toLowerCase())
  )

  async function createCustomer() {
    if (!newCust.name.trim()) return
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

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setApplyingCoupon(true); setCouponError(""); setCouponApplied(null)
    try {
      const res = await fetch("/api/offers/validate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ code: couponCode.trim(), orderValue: subtotal }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) { setCouponError(data.error || data.message || "Invalid coupon code"); setCouponDiscount(0); return }
      setCouponDiscount(Number(data.discount) || 0)
      setCouponApplied({ code: couponCode.trim().toUpperCase(), message: data.message || "Coupon applied!" })
    } catch { setCouponError("Failed to validate coupon") }
    finally { setApplyingCoupon(false) }
  }
  function removeCoupon() { setCouponApplied(null); setCouponDiscount(0); setCouponCode(""); setCouponError("") }

  async function saveBooking() {
    if (!selectedCustomer) return
    setSaving(true); setSaveError("")
    try {
      const res = await fetch("/api/portal/create-package-booking", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          is_quote: isQuote,
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
          security_deposit: securityDeposit,
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          items: cart.map(i=>({
            category_id: i.category.id,
            variant_id: i.variant.id,
            package_id: (i.variant as any).package_id || null,
            variant_name: i.variant.variant_name || i.variant.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: i.quantity*i.unit_price,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||"Failed to create package booking")
      router.push(`/portal/booking/bookings/${data.data.id}?kind=package`)
    } catch(e:any) { setSaveError(e.message); setSaving(false) }
  }

  const canGoStep2 = !!selectedCustomer
  const canGoStep3 = cart.length > 0
  const canGoStep4 = !!eventDate
  const canSave = !!selectedCustomer && cart.length>0 && (isQuote || !!eventDate)

  const stepLabels = ["Customer","Packages","Event Details","Review"]

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F3EEFC 0%,#F3EEFC 100%)", fontFamily:"var(--font-inter), Inter, sans-serif" }}>
      <div style={{ background:`linear-gradient(135deg,${COLOR_DARK},${COLOR})`, padding:"20px 16px 16px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={()=>router.push("/portal/booking/bookings")} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ color:"white", fontSize:18, fontWeight:900, margin:0, display:"flex", alignItems:"center", gap:8 }}><PortalIcon name="package" size={17} /> New Package Booking</h1>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:11, margin:0 }}>{stepLabels[step-1]} — Step {step} of 4</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {[1,2,3,4].map((n,i)=>(
            <div key={n} style={{ display:"flex", alignItems:"center", flex:i<3?1:"none" }}>
              <StepDot n={n} current={step} />
              {i<3 && <div style={{ flex:1, height:2, background:n<step?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.25)", margin:"0 4px" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 120px" }}>

        {/* STEP 1: Customer */}
        {step===1 && (
          <div>
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
                    style={{ width:"100%", padding:"12px 0", borderRadius:14, border:`1.5px dashed ${COLOR}`, background:"#F3EEFC", color:COLOR_DARK, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
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

        {/* STEP 2: Package Selection */}
        {step===2 && (
          <div>
            {cart.length>0 && (
              <div style={{ background:"white", borderRadius:18, padding:16, marginBottom:12 }}>
                <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Selected Packages ({cart.length}) · {fmt(subtotal)}</p>
                {cart.map(item=>(
                  <div key={item.variant.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:"#1e1208" }}>{item.category.name} — {item.variant.variant_name||item.variant.name}</p>
                      <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.45)" }}>{fmt(item.unit_price)} each</p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      <button onClick={()=>updateQty(item.variant.id, item.quantity-1)} style={{ width:28, height:28, borderRadius:8, border:"1px solid rgba(0,0,0,0.1)", background:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ fontSize:14, fontWeight:800, color:"#1e1208", minWidth:20, textAlign:"center" }}>{item.quantity}</span>
                      <button onClick={()=>updateQty(item.variant.id, item.quantity+1)} style={{ width:28, height:28, borderRadius:8, border:"none", background:COLOR, color:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                    <button onClick={()=>removeFromCart(item.variant.id)} style={{ width:28, height:28, borderRadius:8, border:"none", background:"#fee2e2", color:"#dc2626", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {loadingPackages ? (
              <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"30px 0" }}>Loading packages…</p>
            ) : !selectedCategory ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>SELECT A PACKAGE CATEGORY</p>
                {categories.map(cat=>(
                  <div key={cat.id} onClick={()=>setSelectedCategory(cat)}
                    style={{ background:"white", borderRadius:14, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:800, color:"#1e1208" }}>{cat.name}</p>
                      {cat.description && <p style={{ margin:0, fontSize:11, color:"rgba(80,55,30,0.5)" }}>{cat.description}</p>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.25)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                  </div>
                ))}
                {categories.length===0 && <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"20px 0" }}>No package categories found</p>}
              </div>
            ) : (
              <div>
                <button onClick={()=>setSelectedCategory(null)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, color:COLOR_DARK, marginBottom:12, fontFamily:"inherit", padding:0 }}>
                  <ArrowLeftIcon size={13} /> All Categories
                </button>
                <p style={{ margin:"0 0 8px", fontSize:14, fontWeight:800, color:"#1e1208" }}>{selectedCategory.name} — Variants</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {categoryVariants.map(v=>{
                    const inCart = cart.find(i=>i.variant.id===v.id)
                    return (
                      <div key={v.id} style={{ background:"white", borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:"#1e1208" }}>{v.variant_name||v.name}</p>
                          <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.45)" }}>Deposit: {fmt(v.security_deposit||0)}</p>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                          <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:800, color:COLOR_DARK }}>{fmt(v.base_price)}</p>
                          {inCart ? (
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <button onClick={()=>updateQty(v.id, inCart.quantity-1)} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(0,0,0,0.1)", background:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                              <span style={{ fontSize:13, fontWeight:800, color:"#1e1208", minWidth:18, textAlign:"center" }}>{inCart.quantity}</span>
                              <button onClick={()=>updateQty(v.id, inCart.quantity+1)} style={{ width:26, height:26, borderRadius:7, border:"none", background:COLOR, color:"white", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                            </div>
                          ) : (
                            <button onClick={()=>addVariantToCart(v)}
                              style={{ padding:"5px 12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {categoryVariants.length===0 && <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"20px 0" }}>No variants in this category</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Event Details */}
        {step===3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1e1208" }}>Event Details</p>
              <div style={{ marginBottom:12 }}>
                <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>EVENT DATE {!isQuote && "*"}</p>
                <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)}
                  style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:`1.5px solid ${eventDate?COLOR:"rgba(0,0,0,0.1)"}`, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
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

        {/* STEP 4: Review */}
        {step===4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"white", borderRadius:18, padding:16, border:"1.5px solid rgba(139,92,246,0.15)" }}>
              <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:COLOR_DARK, letterSpacing:1.2, textTransform:"uppercase" }}>Sales Representative / Staff Member</p>
              <select value={salesStaffId} onChange={e=>setSalesStaffId(e.target.value)}
                style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1.5px solid rgba(139,92,246,0.25)", fontSize:13, fontWeight:700, color:"#1e1208", outline:"none", fontFamily:"inherit", background:"#FAFAFC" }}>
                <option value="">Select Sales Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department || s.role || "Sales"})</option>)}
              </select>
            </div>

            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Booking Summary</p>
              {[
                { label:"Customer", value:selectedCustomer?.name },
                { label:"Type", value:isQuote?"Package (Quote)":"Package" },
                { label:"Event Date", value:eventDate ? new Date(eventDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—" },
                { label:"Venue", value:venue||"—" },
                { label:"Packages", value:`${cart.length} package${cart.length!==1?"s":""}` },
                { label:"Security Deposit", value:fmt(securityDeposit) },
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600 }}>{r.label}</span>
                  <span style={{ fontSize:12, color:"#1e1208", fontWeight:700 }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Pricing</p>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600 }}>Subtotal</span>
                <span style={{ fontSize:12, color:"#1e1208", fontWeight:700 }}>{fmt(subtotal)}</span>
              </div>

              <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:11, color:"rgba(80,55,30,0.5)", fontWeight:600, display:"block", marginBottom:6 }}>Coupon Code</span>
                {couponApplied ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#dcfce7", borderRadius:10, padding:"8px 12px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:800, color:"#15803d" }}><PortalIcon name="check" size={12} /> {couponApplied.code} · − {fmt(couponDiscount)}</span>
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
                      style={{ padding:"5px 12px", borderRadius:16, border:`1.5px solid ${paymentMethod===m?COLOR:"rgba(0,0,0,0.08)"}`, background:paymentMethod===m?"#F3EEFC":"white", color:paymentMethod===m?COLOR_DARK:"rgba(80,55,30,0.5)", fontSize:11, fontWeight:paymentMethod===m?700:500, cursor:"pointer", fontFamily:"inherit" }}>
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

            {saveError && <div style={{ background:"#fee2e2", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:8 }}><span style={{ color:"#b91c1c", display:"inline-flex", flexShrink:0 }}><PortalIcon name="alert-triangle" size={14} /></span><p style={{ margin:0, fontSize:12, color:"#b91c1c", fontWeight:600 }}>{saveError}</p></div>}

            <button onClick={saveBooking} disabled={saving||!canSave}
              style={{ width:"100%", height:56, borderRadius:16, border:"none", background:saving||!canSave?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:saving||!canSave?"#9ca3af":"white", fontSize:16, fontWeight:800, cursor:saving||!canSave?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:saving||!canSave?"none":`0 6px 20px ${COLOR}55`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {saving ? "Creating…" : isQuote ? <><SaveIcon size={16} /> Save as Quote</> : <><PortalIcon name="check" size={16} /> Confirm Booking</>}
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"white", borderTop:"1px solid rgba(0,0,0,0.06)", padding:"12px 16px calc(env(safe-area-inset-bottom,0px) + 12px)", display:"flex", gap:10, zIndex:50 }}>
        {step>1 && (
          <button onClick={()=>setStep(s=>s-1)}
            style={{ flex:1, height:48, borderRadius:14, border:"1.5px solid rgba(0,0,0,0.1)", background:"white", color:"rgba(80,55,30,0.7)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <ArrowLeftIcon size={14} /> Back
          </button>
        )}
        {step<4 && (
          <button onClick={()=>setStep(s=>s+1)} disabled={step===1?!canGoStep2:step===2?!canGoStep3:false}
            style={{ flex:2, height:48, borderRadius:14, border:"none", background:(step===1&&!canGoStep2)||(step===2&&!canGoStep3)?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:(step===1&&!canGoStep2)||(step===2&&!canGoStep3)?"#9ca3af":"white", fontSize:14, fontWeight:800, cursor:(step===1&&!canGoStep2)||(step===2&&!canGoStep3)?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            Next <ArrowRightIcon size={14} />
          </button>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function NewPackageBookingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F3EEFC,#F3EEFC)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #8b5cf630", borderTopColor:"#8b5cf6", animation:"spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <NewPackageBookingInner />
    </Suspense>
  )
}
