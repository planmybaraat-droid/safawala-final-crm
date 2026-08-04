"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString("en-IN")}` }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" }
function waLink(p: string) { const c = (p||"").replace(/\D/g,""); return c.length===10?`https://wa.me/91${c}`:`https://wa.me/${c}` }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:      { bg:"#dcfce7", text:"#15803d" },
  pending:        { bg:"#fef9c3", text:"#a16207" },
  pending_payment:{ bg:"#fef9c3", text:"#a16207" },
  delivered:      { bg:"#dbeafe", text:"#1d4ed8" },
  returned:       { bg:"#f3e8ff", text:"#6d28d9" },
  order_complete: { bg:"#dcfce7", text:"#15803d" },
  cancelled:      { bg:"#fee2e2", text:"#b91c1c" },
}
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg:"#f1f5f9", text:"#64748b" }
  return <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:s.bg, color:s.text, textTransform:"uppercase", letterSpacing:0.5 }}>{status?.replace(/_/g," ")}</span>
}

const TABS = ["overview","bookings","profile"] as const
type Tab = typeof TABS[number]

export default function CustomerDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("overview")
  const [toast, setToast] = useState("")

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(""),2500) }

  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true); setError("")
    try {
      // Fetch customer profile + all bookings in parallel
      const [cRes, bRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/bookings?limit=300`),
      ])

      if (!cRes.ok) {
        const e = await cRes.json().catch(()=>({}))
        setError(e.error || `Error ${cRes.status}`)
        return
      }

      const cData = await cRes.json()
      setCustomer(cData.data || cData.customer || cData)

      if (bRes.ok) {
        const bData = await bRes.json()
        const all: any[] = bData.data ?? bData ?? []
        // Filter to this customer
        setBookings(all.filter(b => b.customer_id === id || b.customer?.id === id))
      }
    } catch {
      setError("Failed to load — check your connection")
    } finally {
      setLoading(false) }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  async function copyPhone() {
    try { await navigator.clipboard.writeText(customer.phone); showToast("Phone copied ✓") } catch {}
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4,#dcfce7)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${COLOR}30`, borderTopColor:COLOR, animation:"spin 1s linear infinite" }} />
      <p style={{ color:"rgba(80,55,30,0.5)", fontSize:13 }}>Loading customer…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error||!customer) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4,#dcfce7)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:20, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ fontSize:48 }}>😔</div>
      <p style={{ fontWeight:700, fontSize:16, color:"#1e1208" }}>{error||"Customer not found"}</p>
      <button onClick={()=>router.push("/portal/booking/customers")} style={{ background:COLOR, color:"white", border:"none", borderRadius:14, padding:"12px 24px", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
    </div>
  )

  const totalSpent = bookings.reduce((s,b)=>s+(b.total_amount??0), 0)
  const totalPaid  = bookings.reduce((s,b)=>s+(b.amount_paid??b.paid_amount??0), 0)
  const initials   = (customer.name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()
  const activeBookings = bookings.filter(b=>!["cancelled","order_complete"].includes(b.status))

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0fdf4 0%,#dcfce7 100%)", fontFamily:"'Inter','Segoe UI',sans-serif", paddingBottom:100 }}>
      {toast && <div style={{ position:"fixed", top:60, left:"50%", transform:"translateX(-50%)", background:COLOR, color:"white", borderRadius:12, padding:"8px 20px", fontSize:12, fontWeight:700, zIndex:200 }}>{toast}</div>}

      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg,${COLOR_DARK},${COLOR})`, padding:"20px 16px 24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, position:"relative", zIndex:1 }}>
          <button onClick={()=>router.push("/portal/booking/customers")} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex:1 }}><p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, margin:0 }}>Customer Profile</p></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14, position:"relative", zIndex:1 }}>
          <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,0.25)", border:"3px solid rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"white", flexShrink:0 }}>
            {initials}
          </div>
          <div>
            <h1 style={{ color:"white", fontSize:20, fontWeight:900, margin:"0 0 4px" }}>{customer.name}</h1>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:11, margin:0, fontFamily:"monospace" }}>{customer.customer_code} · {customer.phone}</p>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:16, position:"relative", zIndex:1 }}>
          {[
            { label:"Bookings", value:bookings.length },
            { label:"Total Value", value:fmt(totalSpent), small:true },
            { label:"Paid", value:fmt(totalPaid), small:true },
          ].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 10px", backdropFilter:"blur(10px)" }}>
              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:9, fontWeight:700, margin:"0 0 3px", letterSpacing:0.5, textTransform:"uppercase" }}>{s.label}</p>
              <p style={{ color:"white", fontSize:s.small?12:18, fontWeight:900, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:"12px 16px 0", display:"flex", gap:10 }}>
        <a href={`tel:${customer.phone}`} style={{ flex:1, height:44, borderRadius:13, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", gap:6, textDecoration:"none", fontSize:13, fontWeight:700, color:"#1d4ed8" }}>📞 Call</a>
        <a href={waLink(customer.whatsapp||customer.phone)} target="_blank" rel="noreferrer"
          style={{ flex:1, height:44, borderRadius:13, background:"#25d366", display:"flex", alignItems:"center", justifyContent:"center", gap:6, textDecoration:"none", fontSize:13, fontWeight:700, color:"white" }}>💬 WhatsApp</a>
        <button onClick={()=>router.push(`/portal/booking/bookings/new?customer_id=${id}`)}
          style={{ flex:1, height:44, borderRadius:13, background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", gap:4, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"white", fontFamily:"inherit" }}>
          📋 Book
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, padding:"12px 16px 0", borderBottom:"1px solid rgba(0,0,0,0.06)", background:"transparent" }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:"8px 16px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:tab===t?800:600, color:tab===t?COLOR_DARK:"rgba(80,55,30,0.45)", borderBottom:tab===t?`2.5px solid ${COLOR}`:"2.5px solid transparent", textTransform:"capitalize", whiteSpace:"nowrap", fontFamily:"inherit", transition:"all 0.2s" }}>
            {t==="bookings" ? `Bookings (${bookings.length})` : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding:"12px 16px 0" }}>
        {/* OVERVIEW */}
        {tab==="overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {activeBookings.length>0 && (
              <div style={{ background:"white", borderRadius:18, padding:16 }}>
                <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Active Bookings</p>
                {activeBookings.slice(0,3).map(b=>(
                  <div key={b.id} onClick={()=>router.push(`/portal/booking/bookings/${b.id}?kind=${b.booking_kind||"product"}`)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.04)", cursor:"pointer" }}>
                    <div>
                      <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1e1208" }}>{b.booking_number}</p>
                      <p style={{ margin:"2px 0 0", fontSize:10, color:"rgba(80,55,30,0.45)" }}>📅 {fmtDate(b.event_date)}</p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1e1208" }}>{fmt(b.total_amount)}</p>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background:"white", borderRadius:18, padding:16 }}>
              <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Contact Info</p>
              {[
                { label:"Phone",    value:customer.phone },
                { label:"WhatsApp", value:customer.whatsapp||customer.phone },
                { label:"Email",    value:customer.email },
                { label:"City",     value:customer.city },
                { label:"Address",  value:customer.address },
                { label:"Since",    value:fmtDate(customer.created_at) },
              ].map(({label,value})=>value&&(
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"7px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize:11, color:"rgba(80,55,30,0.45)", fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:12, color:"#1e1208", fontWeight:600, textAlign:"right", maxWidth:"60%" }}>{value}</span>
                </div>
              ))}
              <button onClick={copyPhone}
                style={{ marginTop:12, width:"100%", height:38, borderRadius:12, border:"1px solid rgba(0,0,0,0.08)", background:"#f9fafb", color:"rgba(80,55,30,0.6)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                📋 Copy Phone Number
              </button>
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {tab==="bookings" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {bookings.length===0 ? (
              <div style={{ textAlign:"center", padding:"48px 20px", background:"white", borderRadius:18 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <p style={{ fontWeight:700, color:"#1e1208", fontSize:14 }}>No bookings yet</p>
                <button onClick={()=>router.push(`/portal/booking/bookings/new?customer_id=${id}`)}
                  style={{ marginTop:12, padding:"10px 20px", borderRadius:12, background:COLOR, color:"white", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  + Create First Booking
                </button>
              </div>
            ) : bookings.map(b=>(
              <div key={b.id} onClick={()=>router.push(`/portal/booking/bookings/${b.id}?kind=${b.booking_kind||"product"}`)}
                style={{ background:"white", borderRadius:16, padding:"14px 16px", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:800, color:"#1e1208" }}>{b.booking_number}</p>
                    <p style={{ margin:"0 0 6px", fontSize:11, color:"rgba(80,55,30,0.5)" }}>📅 {fmtDate(b.event_date)}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:900, color:"#1e1208" }}>{fmt(b.total_amount)}</p>
                    {((b.total_amount||0)-(b.amount_paid||b.paid_amount||0))>0 && (
                      <p style={{ margin:"3px 0 0", fontSize:11, color:"#dc2626", fontWeight:700 }}>Due: {fmt((b.total_amount||0)-(b.amount_paid||b.paid_amount||0))}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROFILE */}
        {tab==="profile" && (
          <div style={{ background:"white", borderRadius:18, padding:16 }}>
            <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"rgba(80,55,30,0.4)", letterSpacing:1.2, textTransform:"uppercase" }}>Full Profile</p>
            {[
              { label:"Full Name",      value:customer.name },
              { label:"Customer Code",  value:customer.customer_code },
              { label:"Phone",          value:customer.phone },
              { label:"WhatsApp",       value:customer.whatsapp },
              { label:"Email",          value:customer.email },
              { label:"City",           value:customer.city },
              { label:"State",          value:customer.state },
              { label:"Pincode",        value:customer.pincode },
              { label:"Address",        value:customer.address },
              { label:"Bride Name",     value:customer.bride_name },
              { label:"KYC Status",     value:customer.kyc_status },
              { label:"Status",         value:customer.status },
              { label:"Notes",          value:customer.notes },
              { label:"Member Since",   value:fmtDate(customer.created_at) },
            ].map(({label,value})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:11, color:"rgba(80,55,30,0.45)", fontWeight:600, flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:12, color:value?"#1e1208":"rgba(80,55,30,0.25)", fontWeight:600, textAlign:"right", maxWidth:"65%", marginLeft:8 }}>{value||"—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
