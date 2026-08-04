"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#f97316"
const COLOR_DARK = "#c2410c"

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:          { bg: "#fef9c3", text: "#a16207", dot: "#eab308",  label: "Pending" },
  in_transit:       { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6",  label: "In Transit 🚚" },
  delivered:        { bg: "#dcfce7", text: "#15803d", dot: "#22c55e",  label: "Delivered ✓" },
  return_pending:   { bg: "#fef9c3", text: "#a16207", dot: "#eab308",  label: "Return Pending" },
  return_completed: { bg: "#f3e8ff", text: "#6d28d9", dot: "#8b5cf6",  label: "Returned ✓" },
  cancelled:        { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444",  label: "Cancelled" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: status }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  )
}

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

const FILTERS = ["all", "pending", "in_transit", "delivered", "return_pending", "return_completed", "cancelled"]

/* ── Delivery Detail Sheet ── */
function DeliverySheet({ delivery, onClose, onUpdated }: { delivery: any; onClose: () => void; onUpdated: () => void }) {
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState("")
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500) }

  async function updateStatus(status: string) {
    setUpdating(true)
    try {
      const res = await fetch("/api/deliveries/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_id: delivery.id, status }),
      })
      if (res.ok) { showToast(`Status → ${status}`); onUpdated() }
      else showToast("Update failed")
    } catch { showToast("Error") }
    finally { setUpdating(false) }
  }

  const mapUrl = delivery.delivery_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.delivery_address)}` : null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: COLOR, color: "white", borderRadius: 12, padding: "8px 20px", fontSize: 12, fontWeight: 700, zIndex: 200 }}>{toast}</div>}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", zIndex: 1, paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} /></div>

        <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#1e1208" }}>{delivery.customer_name}</h3>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(80,55,30,0.45)", fontFamily: "monospace" }}>{delivery.delivery_number}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge status={delivery.status} />
            <span style={{ fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>📅 {fmtDate(delivery.delivery_date)}</span>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            {delivery.customer_phone && (
              <a href={`tel:${delivery.customer_phone}`} style={{ flex: 1, height: 44, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>📞 Call</a>
            )}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" style={{ flex: 1, height: 44, borderRadius: 12, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#c2410c" }}>🗺️ Map</a>
            )}
          </div>

          {/* Info */}
          <div style={{ background: "#f9fafb", borderRadius: 14, padding: 14 }}>
            {[
              { label: "Phone", value: delivery.customer_phone },
              { label: "Pickup", value: delivery.pickup_address },
              { label: "Delivery Address", value: delivery.delivery_address },
              { label: "Date", value: fmtDate(delivery.delivery_date) },
              { label: "Time", value: delivery.delivery_time },
              { label: "Driver", value: delivery.driver_name },
              { label: "Vehicle", value: delivery.vehicle_number },
              { label: "Special Notes", value: delivery.special_instructions },
            ].map(({ label, value }) => value && (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 11, color: "rgba(80,55,30,0.45)", fontWeight: 600, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 12, color: "#1e1208", fontWeight: 600, textAlign: "right", maxWidth: "60%", marginLeft: 8 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Status Update */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Update Status</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(["pending", "in_transit", "delivered", "return_completed"] as const).map(s => {
                const c = STATUS_CONFIG[s]
                return (
                  <button key={s} onClick={() => updateStatus(s)} disabled={updating || delivery.status === s}
                    style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: delivery.status === s ? c.dot : c.bg, color: delivery.status === s ? "white" : c.text, fontSize: 11, fontWeight: 700, cursor: delivery.status === s ? "default" : "pointer", fontFamily: "inherit" }}>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function DeliveriesPortalPage() {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<any | null>(null)
  const [tab, setTab] = useState<"deliveries" | "returns">("deliveries")

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/deliveries")
      const data = await res.json()
      const list = (data.data ?? data ?? []).map((d: any) => ({
        id: d.id,
        delivery_number: d.delivery_number,
        customer_name: d.customer?.name || "Unknown",
        customer_phone: d.customer?.phone || "",
        pickup_address: d.pickup_address || "",
        delivery_address: d.delivery_address || "",
        delivery_date: d.delivery_date,
        delivery_time: d.delivery_time,
        status: d.status,
        driver_name: d.driver_name || "",
        vehicle_number: d.vehicle_number || "",
        special_instructions: d.special_instructions || "",
        booking_id: d.booking_id,
      }))
      setDeliveries(list)
    } catch { setDeliveries([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() =>
    deliveries.filter(d =>
      (filter === "all" || d.status === filter) &&
      (!search ||
        d.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.delivery_number?.toLowerCase().includes(search.toLowerCase()) ||
        d.delivery_address?.toLowerCase().includes(search.toLowerCase()))
    ), [deliveries, search, filter])

  const stats = useMemo(() => ({
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === "pending").length,
    inTransit: deliveries.filter(d => d.status === "in_transit").length,
    delivered: deliveries.filter(d => d.status === "delivered").length,
  }), [deliveries])

  // Today's deliveries
  const today = new Date().toDateString()
  const todayDeliveries = deliveries.filter(d => d.delivery_date && new Date(d.delivery_date).toDateString() === today)

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #fff7ed 0%, #ffedd5 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/delivery")}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>🚚 Deliveries</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{stats.inTransit} in transit · {stats.pending} pending</p>
          </div>
          <button onClick={fetchData} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>🔄</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.pending, color: "#fde68a" },
            { label: "In Transit", value: stats.inTransit, color: "#bfdbfe" },
            { label: "Done", value: stats.delivered, color: "#bbf7d0" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 10px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: s.color || "rgba(255,255,255,0.9)", fontSize: 17, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today Banner */}
      {todayDeliveries.length > 0 && (
        <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#fff7ed", borderRadius: 14, border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🗓️</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#c2410c" }}>{todayDeliveries.length} Delivery Today!</p>
            <p style={{ margin: 0, fontSize: 10, color: "#ea580c" }}>{todayDeliveries.map(d => d.customer_name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(249,115,22,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Customer name or address..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: filter === f ? COLOR : "rgba(255,255,255,0.8)", color: filter === f ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
            {STATUS_CONFIG[f]?.label ?? "All"}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: "14px 16px", display: "flex", gap: 12, opacity: 1 - i * 0.12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff7ed", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: "#fff7ed", borderRadius: 6, width: "60%", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 10, background: "#fff7ed", borderRadius: 6, width: "40%", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208" }}>No deliveries found</p>
          </div>
        ) : filtered.map(d => {
          const isToday = d.delivery_date && new Date(d.delivery_date).toDateString() === today
          return (
            <div key={d.id} onClick={() => setSelected(d)}
              style={{ background: isToday ? "#fff7ed" : "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: isToday ? "2px solid #fed7aa" : "1px solid rgba(249,115,22,0.08)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${COLOR}25, ${COLOR}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {d.status === "delivered" ? "✅" : d.status === "in_transit" ? "🚚" : d.status === "return_completed" ? "📦" : "📋"}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.customer_name}</p>
                  <StatusBadge status={d.status} />
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(80,55,30,0.5)", fontFamily: "monospace" }}>{d.delivery_number}</p>
                {d.delivery_address && <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(80,55,30,0.4)" }}>📍 {d.delivery_address.length > 40 ? d.delivery_address.slice(0, 40) + "…" : d.delivery_address}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: isToday ? "#c2410c" : "rgba(80,55,30,0.4)", fontWeight: isToday ? 800 : 600 }}>
                    📅 {isToday ? "TODAY" : fmtDate(d.delivery_date)}
                    {d.delivery_time ? ` · ${d.delivery_time}` : ""}
                  </span>
                  {d.driver_name && <span style={{ fontSize: 10, color: "rgba(80,55,30,0.4)" }}>🧑 {d.driver_name}</span>}
                </div>
              </div>

              {/* Quick call */}
              {d.customer_phone && (
                <div onClick={e => e.stopPropagation()}>
                  <a href={`tel:${d.customer_phone}`} style={{ width: 34, height: 34, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>📞</a>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected && <DeliverySheet delivery={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); fetchData() }} />}

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
