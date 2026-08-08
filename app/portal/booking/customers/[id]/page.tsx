"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"

const COLOR = "#22c55e"
const COLOR_DARK = "#16803c"

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString("en-IN")}` }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" }
function waLink(p: string) { const c = (p||"").replace(/\D/g,""); return c.length===10?`https://wa.me/91${c}`:`https://wa.me/${c}` }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed:      { bg:"#F1EAF5", text:"#15803d" },
  pending:        { bg:"#fef9c3", text:"#a16207" },
  pending_payment:{ bg:"#fef9c3", text:"#a16207" },
  delivered:      { bg:"#dbeafe", text:"#1d4ed8" },
  returned:       { bg:"#f3e8ff", text:"#6d28d9" },
  order_complete: { bg:"#F1EAF5", text:"#15803d" },
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
        const msg = typeof e.error === "string" ? e.error : e.error?.message
        setError(msg || `Error ${cRes.status}`)
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
    try { await navigator.clipboard.writeText(customer.phone); toast.success("Phone copied") } catch { toast.error("Could not copy phone") }
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F1EAF5,#F1EAF5)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"var(--font-inter), Inter, sans-serif" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${COLOR}30`, borderTopColor:COLOR, animation:"spin 1s linear infinite" }} />
      <p style={{ color:"rgba(80,55,30,0.5)", fontSize:13 }}>Loading customer…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error||!customer) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F1EAF5,#F1EAF5)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:20, fontFamily:"var(--font-inter), Inter, sans-serif" }}>
      <div style={{ color:"rgba(80,55,30,0.4)" }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <p style={{ fontWeight:700, fontSize:16, color:"#1e1208" }}>{error||"Customer not found"}</p>
      <button onClick={()=>router.push("/portal/booking/customers")} style={{ background:COLOR, color:"white", border:"none", borderRadius:14, padding:"12px 24px", fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg> Back</button>
    </div>
  )

  const totalSpent = bookings.reduce((s,b)=>s+(b.total_amount??0), 0)
  const totalPaid  = bookings.reduce((s,b)=>s+(b.amount_paid??b.paid_amount??0), 0)
  const initials   = (customer.name||"?").split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase()
  const activeBookings = bookings.filter(b=>!["cancelled","order_complete"].includes(b.status))

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F1EAF5 0%,#F1EAF5 100%)", fontFamily:"var(--font-inter), Inter, sans-serif", paddingBottom:100 }}>
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
        <a href={`tel:${customer.phone}`} style={{ flex:1, height:44, borderRadius:13, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", gap:6, textDecoration:"none", fontSize:13, fontWeight:700, color:"#1d4ed8" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Call</a>
        <a href={waLink(customer.whatsapp||customer.phone)} target="_blank" rel="noreferrer"
          style={{ flex:1, height:44, borderRadius:13, background:"#25d366", display:"flex", alignItems:"center", justifyContent:"center", gap:6, textDecoration:"none", fontSize:13, fontWeight:700, color:"white" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> WhatsApp</a>
        <button onClick={()=>router.push(`/portal/booking/bookings/new?customer_id=${id}`)}
          style={{ flex:1, height:44, borderRadius:13, background:`linear-gradient(135deg,${COLOR},${COLOR_DARK})`, display:"flex", alignItems:"center", justifyContent:"center", gap:4, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"white", fontFamily:"inherit" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Book
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
                      <p style={{ margin:"2px 0 0", fontSize:10, color:"rgba(80,55,30,0.45)", display:"flex", alignItems:"center", gap:4 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {fmtDate(b.event_date)}</p>
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
                style={{ marginTop:12, width:"100%", height:38, borderRadius:12, border:"1px solid rgba(0,0,0,0.08)", background:"#f9fafb", color:"rgba(80,55,30,0.6)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Copy Phone Number
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
                    <p style={{ margin:"0 0 6px", fontSize:11, color:"rgba(80,55,30,0.5)", display:"flex", alignItems:"center", gap:4 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {fmtDate(b.event_date)}</p>
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
              { label:"Status",         value:customer.is_active===false?"Inactive":"Active" },
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
