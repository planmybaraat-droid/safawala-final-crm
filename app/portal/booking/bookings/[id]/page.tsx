"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

const STATUS_META: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed:         { bg: "#dcfce7", text: "#15803d", dot: "#22c55e",  label: "Confirmed" },
  pending:           { bg: "#fef9c3", text: "#a16207", dot: "#eab308",  label: "Pending" },
  pending_payment:   { bg: "#fef9c3", text: "#a16207", dot: "#eab308",  label: "Pending Payment" },
  pending_selection: { bg: "#fff7ed", text: "#c2410c", dot: "#f97316",  label: "Pending Selection" },
  delivered:         { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6",  label: "Delivered" },
  returned:          { bg: "#f3e8ff", text: "#6d28d9", dot: "#8b5cf6",  label: "Returned" },
  order_complete:    { bg: "#dcfce7", text: "#15803d", dot: "#22c55e",  label: "Complete" },
  cancelled:         { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444",  label: "Cancelled" },
  generated:         { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6",  label: "Quote" },
}
const STATUSES = ["pending_payment","pending_selection","confirmed","delivered","returned","order_complete","cancelled"]
const PAYMENT_METHODS = ["Cash","UPI","Card","Bank Transfer","Cheque","Online"]

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString("en-IN")}` }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" }
function waLink(p: string) { const c = (p||"").replace(/\D/g,""); return c.length===10 ? `https://wa.me/91${c}` : `https://wa.me/${c}` }

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status?.toLowerCase()] ?? { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: status }
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.text, fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:20, letterSpacing:0.5, textTransform:"uppercase" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot }} />{s.label}
    </span>
  )
}

function PaymentSheet({ booking, onClose, onSaved }: { booking: any; onClose: ()=>void; onSaved: (b:any)=>void }) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const balance = (Number(booking.total_amount)||0) - (Number(booking.amount_paid)||0)

  async function save() {
    const amt = parseFloat(amount)
    if (!amt||amt<=0) return setErr("Enter a valid amount")
    if (amt > balance+0.01) return setErr(`Exceeds balance of ${fmt(balance)}`)
    setSaving(true); setErr("")
    try {
      const type = booking._kind==="package" ? "package_booking" : "product_order"
      const res = await fetch(`/api/bookings/${booking.id}?type=${type}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ amount_paid: (Number(booking.amount_paid)||0)+amt, payment_method: method }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error||"Failed")
      onSaved({ ...booking, amount_paid: (Number(booking.amount_paid)||0)+amt })
    } catch(e:any) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", flexDirection:"column" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" }} onClick={onClose} />
      <div style={{ position:"relative", marginTop:"auto", background:"white", borderRadius:"24px 24px 0 0", padding:"20px 20px calc(env(safe-area-inset-bottom,20px) + 20px)", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><div style={{ width:36, height:4, borderRadius:2, background:"rgba(0,0,0,0.1)" }} /></div>
        <h3 style={{ margin:"0 0 4px", fontSize:17, fontWeight:900, color:"#1e1208" }}>Record Payment</h3>
        <p style={{ margin:"0 0 16px", fontSize:12, color:"rgba(80,55,30,0.5)" }}>Balance: <strong style={{ color:"#dc2626" }}>{fmt(balance)}</strong></p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          {PAYMENT_METHODS.map(m=>(
            <button key={m} onClick={()=>setMethod(m)}
              style={{ padding:"10px 0", borderRadius:12, border:`2px solid ${method===m?COLOR:"rgba(0,0,0,0.08)"}`, background:method===m?"#f0fdf4":"white", color:method===m?COLOR_DARK:"rgba(80,55,30,0.6)", fontSize:12, fontWeight:method===m?800:600, cursor:"pointer", fontFamily:"inherit" }}>
              {m}
            </button>
          ))}
        </div>
        <div style={{ background:"#f9fafb", borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"rgba(80,55,30,0.5)", letterSpacing:0.5 }}>AMOUNT (₹)</p>
          <input type="number" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" autoFocus
            style={{ width:"100%", border:"none", background:"transparent", outline:"none", fontSize:28, fontWeight:900, color:"#1e1208", fontFamily:"inherit" }} />
        </div>
        {err && <p style={{ margin:"0 0 10px", fontSize:12, color:"#dc2626", fontWeight:600 }}>⚠️ {err}</p>}
        <button onClick={save} disabled={saving||!amount}
          style={{ width:"100%", height:52, borderRadius:16, border:"none", background:saving||!amount?"#e5e7eb":`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:saving||!amount?"#9ca3af":"white", fontSize:15, fontWeight:800, cursor:saving||!amount?"not-allowed":"pointer", fontFamily:"inherit" }}>
          {saving ? "Saving…" : `Record ${method} Payment`}
        </button>
      </div>
    </div>
  )
}

function StatusSheet({ booking, onClose, onUpdated }: { booking:any; onClose:()=>void; onUpdated:(b:any)=>void }) {
  const [updating, setUpdating] = useState("")
  async function update(status: string) {
    setUpdating(status)
    try {
      const type = booking._kind==="package" ? "package_booking" : "product_order"
      const res = await fetch(`/api/bookings/${booking.id}?type=${type}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ status }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error||"Failed")
      onUpdated({ ...booking, status })
    } catch {} finally { setUpdating("") }
  }
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", flexDirection:"column" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" }} onClick={onClose} />
      <div style={{ position:"relative", marginTop:"auto", background:"white", borderRadius:"24px 24px 0 0", padding:"20px 20px calc(env(safe-area-inset-bottom,20px) + 20px)", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><div style={{ width:36, height:4, borderRadius:2, background:"rgba(0,0,0,0.1)" }} /></div>
        <h3 style={{ margin:"0 0 16px", fontSize:17, fontWeight:900, color:"#1e1208" }}>Update Status</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {STATUSES.map(s=>{
            const meta = STATUS_META[s] ?? { bg:"#f1f5f9", text:"#64748b", dot:"#94a3b8", label:s }
            const isCurrent = booking.status===s
            return (
              <button key={s} onClick={()=>!isCurrent&&update(s)} disabled={isCurrent||!!updating}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:14, border:`2px solid ${isCurrent?meta.dot:"rgba(0,0,0,0.06)"}`, background:isCurrent?meta.bg:"white", cursor:isCurrent?"default":"pointer", fontFamily:"inherit", opacity:updating&&updating!==s?0.5:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:meta.dot }} />
                  <span style={{ fontSize:14, fontWeight:700, color:meta.text }}>{meta.label}</span>
                </div>
                {isCurrent && <span style={{ fontSize:10, fontWeight:700, color:meta.text, background:meta.bg, border:`1px solid ${meta.dot}`, padding:"2px 8px", borderRadius:20 }}>CURRENT</span>}
                {updating===s && <span style={{ fontSize:12, color:meta.text }}>…</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function BookingDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const kind = searchParams.get("kind") || "product"

  const [booking, setBooking] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [showStatus, setShowStatus] = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(""), 3000) }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError("")
    try {
      const type = kind==="package" ? "package_booking" : "product_order"
      const [bRes, iRes] = await Promise.all([
        fetch(`/api/bookings/${id}?type=${type}`),
        fetch(`/api/bookings/${id}/items?source=${type}`),
      ])
      if (!bRes.ok) {
        const e = await bRes.json().catch(()=>({}))
        setError(e.error || `Error ${bRes.status}`)
        return
      }
      const bData = await bRes.json()
      const iData = iRes.ok ? await iRes.json() : {}
      setBooking({ ...(bData.booking || bData.data || bData), _kind: kind })
      setItems(iData.items || iData.data || [])
    } catch { setError("Failed to load — check connection") }
    finally { setLoading(false) }
  }, [id, kind])

  useEffect(() => { load() }, [load])

  async function downloadPDF() {
    try {
      const res = await fetch(`/api/quotes/download-pdf?id=${id}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href=url; a.download=`${booking?.order_number||id}.pdf`; a.click()
      URL.revokeObjectURL(url); showToast("PDF downloaded ✓")
    } catch { showToast("PDF not available") }
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4,#dcfce7)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${COLOR}30`, borderTopColor:COLOR, animation:"spin 1s linear infinite" }} />
      <p style={{ color:"rgba(80,55,30,0.5)", fontSize:13 }}>Loading booking…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error||!booking) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4,#dcfce7)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:20, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ fontSize:48 }}>😕</div>
      <p style={{ fontWeight:700, fontSize:16, color:"#1e1208" }}>{error||"Booking not found"}</p>
      <p style={{ fontSize:12, color:"rgba(80,55,30,0.5)", textAlign:"center", maxWidth:280 }}>
        {error?.includes("403")||error?.includes("Forbidden") ? "You may not have permission to view this booking." : "The booking may not exist or the link is incorrect."}
      </p>
      <button onClick={()=>router.push("/portal/booking/bookings")} style={{ background:COLOR, color:"white", border:"none", borderRadius:14, padding:"12px 24px", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
    </div>
  )

  const customer = booking.customer || {}
  const totalAmount = Number(booking.total_amount)||0
  const amountPaid = Number(booking.amount_paid)||0
  const balance = totalAmount - amountPaid
  const initials = (customer.name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4 0%,#dcfce7 100%)", fontFamily:"'Inter','Segoe UI',sans-serif", paddingBottom:100 }}>
      {toast && <div style={{ position:"fixed", top:60, left:"50%", transform:"translateX(-50%)", background:COLOR_DARK, color:"white", borderRadius:12, padding:"8px 20px", fontSize:12, fontWeight:700, zIndex:200, whiteSpace:"nowrap" }}>{toast}</div>}

      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg,${COLOR_DARK},${COLOR})`, padding:"20px 16px 24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, position:"relative", zIndex:1 }}>
          <button onClick={()=>router.push("/portal/booking/bookings")} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex:1 }}><p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, margin:0 }}>Booking Detail</p></div>
          <button onClick={downloadPDF} style={{ padding:"6px 14px", borderRadius:10, background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", color:"white", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>⬇ PDF</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14, position:"relative", zIndex:1, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.25)", border:"3px solid rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"white", flexShrink:0 }}>
            {kind==="package" ? "📦" : initials}
          </div>
          <div>
            <h1 style={{ color:"white", fontSize:18, fontWeight:900, margin:"0 0 3px" }}>{customer.name||"Unknown Customer"}</h1>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:11, margin:"0 0 6px", fontFamily:"monospace" }}>{booking.order_number||booking.package_number||id?.slice(0,8)}</p>
            <StatusBadge status={booking.status||"pending"} />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, position:"relative", zIndex:1 }}>
          {[
            { label:"Total", value:fmt(totalAmount) },
            { label:"Paid", value:fmt(amountPaid), color:"#bbf7d0" },
            { label:"Balance", value:fmt(balance), color:balance>0?"#fca5a5":"#bbf7d0" },
          ].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 10px", backdropFilter:"blur(10px)" }}>
              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:9, fontWeight:700, margin:"0 0 3px", letterSpacing:0.5, textTransform:"uppercase" }}>{s.label}</p>
              <p style={{ color:s.color||"rgba(255,255,255,0.9)", fontSize:13, fontWeight:900, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:"12px 16px 0", display:"flex", gap:10 }}>
        {customer.phone && <a href={`tel:${customer.phone}`} style={{ flex:1, height:44, borderRadius:13, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", gap:6, textDecoration:"none", fontSize:13, fontWeight:700, color:"#1d4ed8" }}>📞 Call</a>}
        {(customer.whatsapp||customer.phone) && <a href={waLink(customer.whatsapp||customer.phone)} target="_blank" rel="noreferrer" style={{ flex:1, height:44, borderRadius:13, background:"#25d366", display:"flex", alignItems:"center", justifyContent:"center", gap:6, textDecoration:"none", fontSize:13, fontWeight:700, color:"white" }}>💬 WhatsApp</a>}
        {balance>0 && <button onClick={()=>setShowPayment(true)} style={{ flex:1, height:44, borderRadius:13, background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, border:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13, fontWeight:700, color:"white", cursor:"pointer", fontFamily:"inherit" }}>💰 Pay</button>}
      </div>

      <div style={{ padding:"12px 16px 0", display:"flex", flexDirection:"column", gap:12 }}>
        {/* Event Details */}
        <div style={{ background:"white", borderRadius:18, padding:16 }}>
          <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Event Details</p>
          {[
            { label:"Event Date",    value:fmtDate(booking.event_date) },
            { label:"Delivery Date", value:fmtDate(booking.delivery_date) },
            { label:"Return Date",   value:fmtDate(booking.return_date) },
            { label:"Venue",         value:booking.venue_address||booking.venue_name },
            { label:"Event Type",    value:booking.event_type },
            { label:"Groom",         value:booking.groom_name },
            { label:"Bride",         value:booking.bride_name },
          ].filter(r=>r.value && r.value!=="—").map(r=>(
            <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize:11, color:"rgba(80,55,30,0.45)", fontWeight:600, flexShrink:0 }}>{r.label}</span>
              <span style={{ fontSize:12, color:"#1e1208", fontWeight:600, textAlign:"right", maxWidth:"60%", marginLeft:8 }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Items */}
        {items.length>0 && (
          <div style={{ background:"white", borderRadius:18, padding:16 }}>
            <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Items ({items.length})</p>
            {items.map((item:any,i:number)=>(
              <div key={item.id||i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<items.length-1?"1px solid rgba(0,0,0,0.04)":"none" }}>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:"#1e1208" }}>{item.product_name||item.name||"Product"}</p>
                  <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.45)" }}>{item.category&&`${item.category} · `}Qty: {item.quantity}</p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1e1208" }}>{fmt(item.total_price||(item.unit_price*item.quantity))}</p>
                  <p style={{ margin:0, fontSize:10, color:"rgba(80,55,30,0.4)" }}>@ {fmt(item.unit_price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Breakdown */}
        <div style={{ background:"white", borderRadius:18, padding:16 }}>
          <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Payment</p>
          {([
            { label:"Subtotal",  value:fmt(booking.subtotal_amount||totalAmount) },
            booking.discount_amount>0 && { label:"Discount", value:`− ${fmt(booking.discount_amount)}`, color:"#15803d" },
            booking.tax_amount>0 && { label:`GST (${booking.gst_percentage||0}%)`, value:fmt(booking.tax_amount) },
            { label:"Total",     value:fmt(totalAmount), bold:true },
            { label:"Paid",      value:fmt(amountPaid), color:"#15803d" },
            { label:"Balance",   value:fmt(balance), color:balance>0?"#dc2626":"#15803d", bold:true },
          ] as any[]).filter(Boolean).map((r:any)=>(
            <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize:r.bold?13:11, color:"rgba(80,55,30,0.5)", fontWeight:r.bold?700:600 }}>{r.label}</span>
              <span style={{ fontSize:r.bold?14:12, color:r.color||"#1e1208", fontWeight:r.bold?900:700 }}>{r.value}</span>
            </div>
          ))}
          {booking.payment_method && <p style={{ margin:"10px 0 0", fontSize:11, color:"rgba(80,55,30,0.4)" }}>Method: <strong>{booking.payment_method}</strong></p>}
        </div>

        {/* Customer Info */}
        <div style={{ background:"white", borderRadius:18, padding:16 }}>
          <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Customer</p>
          {[
            { label:"Name",     value:customer.name },
            { label:"Phone",    value:customer.phone },
            { label:"WhatsApp", value:customer.whatsapp },
            { label:"Email",    value:customer.email },
            { label:"City",     value:customer.city },
          ].filter(r=>r.value).map(r=>(
            <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize:11, color:"rgba(80,55,30,0.45)", fontWeight:600 }}>{r.label}</span>
              <span style={{ fontSize:12, color:"#1e1208", fontWeight:600 }}>{r.value}</span>
            </div>
          ))}
          <button onClick={()=>router.push(`/portal/booking/customers/${booking.customer_id}`)}
            style={{ marginTop:12, width:"100%", height:40, borderRadius:12, border:`1px solid ${COLOR}`, background:"#f0fdf4", color:COLOR_DARK, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            View Customer Profile →
          </button>
        </div>

        {booking.notes && (
          <div style={{ background:"white", borderRadius:18, padding:16 }}>
            <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Notes</p>
            <p style={{ margin:0, fontSize:13, color:"#1e1208", lineHeight:1.5 }}>{booking.notes}</p>
          </div>
        )}

        <button onClick={()=>setShowStatus(true)}
          style={{ width:"100%", height:52, borderRadius:16, border:"none", background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color:"white", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 4px 16px ${COLOR}55` }}>
          Update Status
        </button>
      </div>

      {showPayment && <PaymentSheet booking={booking} onClose={()=>setShowPayment(false)} onSaved={b=>{setBooking(b);setShowPayment(false);showToast("Payment recorded ✓")}} />}
      {showStatus  && <StatusSheet  booking={booking} onClose={()=>setShowStatus(false)}  onUpdated={b=>{setBooking(b);setShowStatus(false);showToast(`Status → ${b.status.replace(/_/g," ")}`)}} />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
