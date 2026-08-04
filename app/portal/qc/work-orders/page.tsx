"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#a855f7"
const COLOR_DARK = "#7c3aed"

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

const PASS_FAIL = {
  pass:        { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  fail:        { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  pending:     { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  in_progress: { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  completed:   { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
}

function StatusBadge({ status }: { status: string }) {
  const s = PASS_FAIL[status as keyof typeof PASS_FAIL] ?? { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {status?.replace("_", " ")}
    </span>
  )
}

function WorkOrderSheet({ order, onClose, onUpdated }: { order: any; onClose: () => void; onUpdated: () => void }) {
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState("")
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500) }

  async function updateStatus(status: string) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/work-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) { showToast(`Status → ${status}`); onUpdated() }
    } finally { setUpdating(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: COLOR, color: "white", borderRadius: 12, padding: "8px 20px", fontSize: 12, fontWeight: 700, zIndex: 200 }}>{toast}</div>}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", maxHeight: "88vh", overflowY: "auto", zIndex: 1, paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} /></div>
        <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#1e1208" }}>{order.order_number || order.id?.slice(0, 8)}</h3>
            <div style={{ marginTop: 4 }}><StatusBadge status={order.status} /></div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#faf5ff", borderRadius: 14, padding: 14 }}>
            {[
              { label: "Type", value: order.type },
              { label: "Assigned To", value: order.assigned_to_name || order.assigned_to },
              { label: "Booking", value: order.booking_number },
              { label: "Customer", value: order.customer_name },
              { label: "Notes", value: order.notes },
              { label: "Created", value: fmtDate(order.created_at) },
            ].map(({ label, value }) => value && (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 11, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: "#1e1208", fontWeight: 600, textAlign: "right", maxWidth: "65%", marginLeft: 8 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* QC Actions */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>QC Decision</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => updateStatus("pass")} disabled={updating}
                style={{ flex: 1, height: 52, borderRadius: 14, border: "none", background: "linear-gradient(135deg, #22c55e, #15803d)", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                ✅ PASS
              </button>
              <button onClick={() => updateStatus("fail")} disabled={updating}
                style={{ flex: 1, height: 52, borderRadius: 14, border: "none", background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                ❌ FAIL
              </button>
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Other Status</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["pending", "in_progress", "completed"].map(s => {
                const c = PASS_FAIL[s as keyof typeof PASS_FAIL]
                return (
                  <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                    style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: order.status === s ? c.dot : c.bg, color: order.status === s ? "white" : c.text, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {s.replace("_", " ")}
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

export default function QCWorkOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<any | null>(null)

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      setOrders(data.data ?? data ?? [])
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [])

  const filtered = useMemo(() =>
    orders.filter(o =>
      (filter === "all" || o.status === filter) &&
      (!search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase()))
    ), [orders, search, filter])

  const stats = useMemo(() => ({
    total: orders.length,
    pass: orders.filter(o => o.status === "pass").length,
    fail: orders.filter(o => o.status === "fail").length,
    pending: orders.filter(o => o.status === "pending" || o.status === "in_progress").length,
  }), [orders])

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #faf5ff 0%, #ede9fe 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/qc")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>🔍 QC Work Orders</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{stats.pending} pending inspection</p>
          </div>
          <button onClick={fetchOrders} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>🔄</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.pending, color: "#fde68a" },
            { label: "Pass", value: stats.pass, color: "#bbf7d0" },
            { label: "Fail", value: stats.fail, color: "#fca5a5" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 10px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: s.color || "rgba(255,255,255,0.9)", fontSize: 17, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order # or customer..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" }}>
        {["all", "pending", "in_progress", "pass", "fail", "completed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: filter === f ? COLOR : "rgba(255,255,255,0.8)", color: filter === f ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
            {f === "all" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} style={{ background: "white", borderRadius: 18, height: 70, animation: "pulse 1.5s ease-in-out infinite", opacity: 1 - i * 0.12 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208" }}>No work orders found</p>
          </div>
        ) : filtered.map(o => (
          <div key={o.id} onClick={() => setSelected(o)}
            style={{ background: "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid rgba(168,85,247,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e1208" }}>{o.order_number || o.id?.slice(0, 8)}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(80,55,30,0.5)" }}>{o.customer_name}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {o.type && <span style={{ fontSize: 10, color: "rgba(80,55,30,0.4)", fontWeight: 600 }}>📋 {o.type}</span>}
              <span style={{ fontSize: 10, color: "rgba(80,55,30,0.4)" }}>🗓 {fmtDate(o.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {selected && <WorkOrderSheet order={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); fetchOrders() }} />}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
