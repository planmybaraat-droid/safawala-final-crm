"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed:         { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  pending:           { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  pending_payment:   { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  pending_selection: { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  generated:         { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  delivered:         { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  returned:          { bg: "#f3e8ff", text: "#6d28d9", dot: "#8b5cf6" },
  order_complete:    { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  cancelled:         { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
}

const STATUS_FILTERS = ["all", "confirmed", "pending", "delivered", "returned", "order_complete", "cancelled"]

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status?.toLowerCase()] ?? { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {status?.replace(/_/g, " ")}
    </span>
  )
}

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString("en-IN")}` }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

export default function BookingListPage() {
  const router = useRouter()
  const [allBookings, setAllBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [bookingTab, setBookingTab] = useState<"rental" | "sales">("rental")
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/bookings?limit=200")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || `Error ${res.status}`)
        setAllBookings([])
        return
      }
      const data = await res.json()
      setAllBookings(data.data ?? data ?? [])
    } catch {
      setError("Network error — check your connection")
      setAllBookings([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Split by tab
  const tabBookings = allBookings.filter(b =>
    bookingTab === "rental"
      ? (b.type === "rental" || b.booking_kind === "package")
      : (b.type === "sale" || b.source === "direct_sales")
  )

  // Apply status filter
  const statusFiltered = statusFilter === "all"
    ? tabBookings
    : tabBookings.filter(b => b.status === statusFilter || (statusFilter === "pending" && b.status?.includes("pending")))

  // Apply search
  const filtered = statusFiltered.filter(b =>
    !search ||
    b.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
    (b.customer as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (b.customer as any)?.phone?.includes(search)
  )

  const rentalCount = allBookings.filter(b => b.type === "rental" || b.booking_kind === "package").length
  const salesCount = allBookings.filter(b => b.type === "sale" || b.source === "direct_sales").length
  const confirmedCount = tabBookings.filter(b => b.status === "confirmed").length
  const pendingCount = tabBookings.filter(b => b.status?.includes("pending")).length
  const totalRevenue = tabBookings.reduce((s, b) => s + (b.total_amount ?? 0), 0)

  const today = new Date().toDateString()
  const todayBookings = tabBookings.filter(b => b.event_date && new Date(b.event_date).toDateString() === today)

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={() => router.push("/portal/booking")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>Bookings</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{allBookings.length} total</p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchBookings() }} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total", value: tabBookings.length },
            { label: "Confirmed", value: confirmedCount, color: "#86efac" },
            { label: "Pending", value: pendingCount, color: "#fde68a" },
            { label: "Revenue", value: fmt(totalRevenue), color: "#bbf7d0", small: true },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 10px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: s.color || "rgba(255,255,255,0.9)", fontSize: s.small ? 11 : 17, fontWeight: 900, margin: 0, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Rental / Sales tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
          {([
            { key: "rental", label: "Rental", count: rentalCount, icon: "👔" },
            { key: "sales", label: "Sales", count: salesCount, icon: "🛍️" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => { setBookingTab(t.key); setStatusFilter("all") }}
              style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", color: bookingTab === t.key ? "white" : "rgba(255,255,255,0.5)", fontWeight: bookingTab === t.key ? 800 : 600, fontSize: 13, borderBottom: bookingTab === t.key ? "2.5px solid white" : "2.5px solid transparent", transition: "all 0.2s", fontFamily: "inherit" }}>
              {t.icon} {t.label} <span style={{ fontSize: 10, opacity: 0.8 }}>({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's events banner */}
      {todayBookings.length > 0 && (
        <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#fef9c3", borderRadius: 14, border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#a16207" }}>{todayBookings.length} Event{todayBookings.length > 1 ? "s" : ""} Today!</p>
            <p style={{ margin: 0, fontSize: 10, color: "#ca8a04" }}>{todayBookings.map(b => (b.customer as any)?.name || b.booking_number).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#fee2e2", borderRadius: 14, border: "1px solid #fca5a5" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>⚠️ {error}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>Make sure you're logged in. <button onClick={fetchBookings} style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: 11 }}>Retry</button></p>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(34,197,94,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search booking # or customer..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>}
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: statusFilter === f ? COLOR : "rgba(255,255,255,0.8)", color: statusFilter === f ? "white" : "rgba(80,55,30,0.55)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", boxShadow: statusFilter === f ? `0 3px 10px ${COLOR}50` : "none", transition: "all 0.2s", fontFamily: "inherit" }}>
            {f === "all" ? `All (${tabBookings.length})` : f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 100px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ background: "white", borderRadius: 18, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", opacity: 1 - i * 0.15 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0fdf4", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: "#f0fdf4", borderRadius: 6, width: "70%", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 10, background: "#f0fdf4", borderRadius: 6, width: "50%", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{bookingTab === "rental" ? "👔" : "🛍️"}</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208", margin: "0 0 6px" }}>No {bookingTab} bookings</p>
            <p style={{ fontSize: 12, color: "rgba(80,55,30,0.5)", margin: 0 }}>
              {search ? "Try a different search" : "Create your first booking with the + button"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(b => {
              const customer = b.customer as any
              const balance = (b.total_amount ?? 0) - (b.paid_amount ?? b.amount_paid ?? 0)
              const initials = (customer?.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
              const isPackage = b.booking_kind === "package"
              return (
                <div key={b.id}
                  onClick={() => router.push(`/portal/booking/bookings/${b.id}?kind=${b.booking_kind || "product"}`)}
                  style={{ background: "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(34,197,94,0.1)", transition: "transform 0.15s", display: "flex", gap: 12, alignItems: "flex-start" }}
                  onTouchStart={e => (e.currentTarget.style.transform = "scale(0.98)")}
                  onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: isPackage ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 15, fontWeight: 800 }}>
                    {isPackage ? "📦" : initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {customer?.name || "Unknown"}
                      </p>
                      <StatusBadge status={b.status ?? "pending"} />
                    </div>
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(80,55,30,0.5)", fontWeight: 500 }}>
                      {b.booking_number} · 📅 {fmtDate(b.event_date)}
                      {isPackage && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "#f3e8ff", padding: "1px 5px", borderRadius: 6 }}>PKG</span>}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 9, color: "rgba(80,55,30,0.4)", fontWeight: 600, letterSpacing: 0.5 }}>TOTAL</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#1e1208" }}>{fmt(b.total_amount)}</p>
                        </div>
                        {balance > 0 && (
                          <div>
                            <p style={{ margin: 0, fontSize: 9, color: "rgba(80,55,30,0.4)", fontWeight: 600, letterSpacing: 0.5 }}>DUE</p>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#dc2626" }}>{fmt(balance)}</p>
                          </div>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.2)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => router.push("/portal/booking/bookings/new")}
        style={{ position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, border: "none", borderRadius: 18, padding: "14px 20px", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${COLOR}55` }}>
        <span style={{ fontSize: 18 }}>+</span> New Booking
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
