"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { validatePhoneWithCountry } from "@/lib/form-validation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

function fmt(n: number) { return `₹${(n??0).toLocaleString("en-IN")}` }

/* ── Types ── */
interface Customer { id:string; name:string; phone:string; customer_code:string; email?:string; whatsapp?:string; city?:string }
interface Product  { id:string; name:string; product_code:string; category:string; rental_price:number; sale_price:number }
interface CartItem { product:Product; quantity:number; unit_price:number }

const EVENT_TYPES = ["Wedding","Engagement","Reception","Birthday","Anniversary","Corporate","Other"]
const PAYMENT_METHODS = ["Cash","UPI","Card","Bank Transfer","Cheque","Online"]
const BOOKING_TYPES = [
  { key:"rental", label:"Rental", desc:"Products rented for an event", icon:"👔" },
  { key:"sale",   label:"Sale",   desc:"Direct product sale to customer", icon:"🛍️" },
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

  // Pricing
  const [discountAmount, setDiscountAmount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("Cash")

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

  // Load products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch("/api/products")
      const data = await res.json()
      const list: any[] = Array.isArray(data) ? data : data.data || data.products || []
      setProducts(list.filter((p:any) => p.name && (Number(p.rental_price) > 0 || Number(p.sale_price) > 0)))
    } catch {} finally { setLoadingProducts(false) }
  }, [])

  useEffect(() => { if(step===1&&!prefilledCustomerId) loadCustomers() }, [step, prefilledCustomerId, loadCustomers])
  useEffect(() => { if(step===3) loadProducts() }, [step, loadProducts])

  // Cart helpers
  function addToCart(product: Product) {
    const price = bookingType==="sale" ? product.sale_price : product.rental_price
    setCart(c=>{
      const existing = c.find(i=>i.product.id===product.id)
      if (existing) return c.map(i=>i.product.id===product.id ? {...i, quantity:i.quantity+1} : i)
      return [...c, { product, quantity:1, unit_price:price }]
    })
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
  const grandTotal = Math.max(0, subtotal - discountAmount)
  const balance = Math.max(0, grandTotal - amountPaid)

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
      alert(phoneValidation.error || "Please enter a valid phone number")
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
    } catch(e:any) { alert(e.message) } finally { setSavingCust(false) }
  }

  // Save booking
  async function saveBooking() {
    if (!selectedCustomer) return
    setSaving(true); setSaveError("")
    try {
      const res = await fetch("/api/portal/create-booking", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          booking_type: bookingType,
          is_quote: isQuote,
          event_date: eventDate,
          delivery_date: deliveryDate||null,
          return_date: returnDate||null,
          event_type: eventType,
          venue_address: venue,
          groom_name: groomName,
          bride_name: brideName,
          notes,
          total_amount: grandTotal,
          subtotal_amount: subtotal,
          discount_amount: discountAmount,
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          items: cart.map(i=>({
            product_id: i.product.id,
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
  const canGoStep3 = !!eventDate
  const canSave    = !!selectedCustomer && !!eventDate

  const stepLabels = ["Customer","Details","Products","Review"]

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4 0%,#dcfce7 100%)", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
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
                  style={{ padding:"14px 10px", borderRadius:16, border:`2px solid ${bookingType===t.key?COLOR:"rgba(0,0,0,0.08)"}`, background:bookingType===t.key?"#f0fdf4":"white", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
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
                <div style={{ display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:14, padding:"10px 14px", border:"1px solid rgba(34,197,94,0.2)", marginBottom:10 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" value={custSearch} onChange={e=>{ setCustSearch(e.target.value); if(!customers.length) loadCustomers() }}
                    placeholder="Search by name or phone…"
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, background:"transparent", color:"#1e1208", fontFamily:"inherit" }} />
                </div>

                {!showNewCust && (
                  <button onClick={()=>setShowNewCust(true)}
                    style={{ width:"100%", padding:"12px 0", borderRadius:14, border:`1.5px dashed ${COLOR}`, background:"#f0fdf4", color:COLOR_DARK, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
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
                      <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:"#1e1208" }}>{item.product.name}</p>
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

            {/* Product search */}
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:14, padding:"10px 14px", border:"1px solid rgba(34,197,94,0.2)", marginBottom:10 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products by name or category…"
                style={{ flex:1, border:"none", outline:"none", fontSize:13, background:"transparent", color:"#1e1208", fontFamily:"inherit" }} />
              {productSearch && <button onClick={()=>setProductSearch("")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16 }}>×</button>}
            </div>

            {loadingProducts ? (
              <p style={{ textAlign:"center", color:"rgba(80,55,30,0.4)", fontSize:12, padding:"30px 0" }}>Loading products…</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredProducts.slice(0,50).map(p=>{
                  const price = bookingType==="sale" ? p.sale_price : p.rental_price
                  const inCart = cart.find(i=>i.product.id===p.id)
                  return (
                    <div key={p.id} style={{ background:"white", borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:"#1e1208" }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.45)" }}>{p.category} · {p.product_code}</p>
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
                          <button onClick={()=>addToCart(p)}
                            style={{ padding:"5px 12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
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
            {/* Summary */}
            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Booking Summary</p>
              {[
                { label:"Customer",     value:selectedCustomer?.name },
                { label:"Type",         value:`${bookingType.charAt(0).toUpperCase()+bookingType.slice(1)}${isQuote?" (Quote)":""}` },
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
                      style={{ padding:"5px 12px", borderRadius:16, border:`1.5px solid ${paymentMethod===m?COLOR:"rgba(0,0,0,0.08)"}`, background:paymentMethod===m?"#f0fdf4":"white", color:paymentMethod===m?COLOR_DARK:"rgba(80,55,30,0.5)", fontSize:11, fontWeight:paymentMethod===m?700:500, cursor:"pointer", fontFamily:"inherit" }}>
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

            <button onClick={saveBooking} disabled={saving||!canSave}
              style={{ width:"100%", height:56, borderRadius:16, border:"none", background:saving||!canSave?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:saving||!canSave?"#9ca3af":"white", fontSize:16, fontWeight:800, cursor:saving||!canSave?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:saving||!canSave?"none":`0 6px 20px ${COLOR}55` }}>
              {saving ? "Creating…" : isQuote ? "💾 Save as Quote" : "✓ Confirm Booking"}
            </button>
          </div>
        )}
      </div>

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
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4,#dcfce7)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #22c55e30", borderTopColor:"#22c55e", animation:"spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <NewBookingInner />
    </Suspense>
  )
}
