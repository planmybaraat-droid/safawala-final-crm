"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  generated: { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6", label: "Generated" },
  quote:     { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6", label: "Generated" },
  sent:      { bg: "#fef9c3", text: "#a16207", dot: "#eab308", label: "Sent" },
  accepted:  { bg: "#dcfce7", text: "#15803d", dot: "#22c55e", label: "Accepted" },
  rejected:  { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444", label: "Rejected" },
  converted: { bg: "#f3e8ff", text: "#6d28d9", dot: "#8b5cf6", label: "Converted ✓" },
  expired:   { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: "Expired" },
}

const FILTERS = ["all", "generated", "sent", "accepted", "rejected", "converted"]

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString("en-IN")}` }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status?.toLowerCase()] ?? { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: status }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  )
}

/* ── Quote Detail Sheet ── */
function QuoteDetailSheet({ quote, onClose, onUpdated }: { quote: any; onClose: () => void; onUpdated: () => void }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState("")

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500) }

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) { showToast(`Status → ${newStatus}`); onUpdated() }
    } finally { setUpdating(false) }
  }

  async function downloadPDF() {
    try {
      const res = await fetch(`/api/quotes/download-pdf?id=${quote.id}`)
      if (!res.ok) throw new Error("Failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `${quote.quote_number || "quote"}.pdf`
      a.click(); URL.revokeObjectURL(url)
      showToast("PDF downloaded ✓")
    } catch { showToast("PDF download failed") }
  }

  const initials = (quote.customer_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: COLOR, color: "white", borderRadius: 12, padding: "8px 20px", fontSize: 12, fontWeight: 700, zIndex: 200 }}>{toast}</div>}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", zIndex: 1, paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} /></div>

        {/* Hero */}
        <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 800 }}>
                {initials}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#1e1208" }}>{quote.customer_name}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(80,55,30,0.45)", fontFamily: "monospace" }}>{quote.quote_number}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge status={quote.status} />
            {quote.event_date && <span style={{ fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>📅 {fmtDate(quote.event_date)}</span>}
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Amount */}
          <div style={{ background: "#f0fdf4", borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.45)", letterSpacing: 1, textTransform: "uppercase" }}>Quote Amount</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#15803d" }}>{fmt(quote.total_amount)}</p>
          </div>

          {/* Details */}
          <div style={{ background: "#f9fafb", borderRadius: 14, padding: "14px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Details</p>
            {[
              { label: "Phone", value: quote.customer_phone },
              { label: "Event Date", value: fmtDate(quote.event_date) },
              { label: "Groom", value: quote.groom_name },
              { label: "Bride", value: quote.bride_name },
              { label: "Venue", value: quote.venue_address },
              { label: "Payment Type", value: quote.payment_type },
              { label: "Created", value: fmtDate(quote.created_at) },
            ].map(({ label, value }) => value && (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 11, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: "#1e1208", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            {quote.customer_phone && (
              <a href={`tel:${quote.customer_phone}`} style={{ flex: 1, height: 44, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>📞 Call</a>
            )}
            <button onClick={downloadPDF}
              style={{ flex: 1, height: 44, borderRadius: 12, background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#475569", fontFamily: "inherit" }}>
              📄 PDF
            </button>
          </div>

          {/* Update Status */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Update Status</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(["generated", "sent", "accepted", "rejected", "converted"] as const).map(s => {
                const c = STATUS_CONFIG[s]
                return (
                  <button key={s} onClick={() => updateStatus(s)} disabled={updating || quote.status === s}
                    style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: quote.status === s ? c.dot : c.bg, color: quote.status === s ? "white" : c.text, fontSize: 11, fontWeight: 700, cursor: quote.status === s ? "default" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Convert to Booking */}
          {quote.status === "accepted" && (
            <button onClick={() => router.push(`/portal/booking/bookings/${quote.id}?kind=product`)}
              style={{ width: "100%", height: 50, borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 20px ${COLOR}50` }}>
              📋 Convert to Booking
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<any | null>(null)

  async function fetchQuotes() {
    setLoading(true)
    try {
      const res = await fetch("/api/quotes?limit=200")
      const data = await res.json()
      setQuotes(data.data ?? data ?? [])
    } catch { setQuotes([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchQuotes() }, [])

  const filtered = useMemo(() =>
    quotes.filter(q =>
      (filter === "all" || q.status === filter) &&
      (!search ||
        q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_phone?.includes(search))
    ), [quotes, search, filter])

  const stats = useMemo(() => ({
    total: quotes.length,
    generated: quotes.filter(q => q.status === "generated" || q.status === "quote").length,
    converted: quotes.filter(q => q.status === "converted").length,
    revenue: quotes.filter(q => q.status !== "rejected").reduce((s, q) => s + (q.total_amount ?? 0), 0),
  }), [quotes])

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/booking")}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>Quotes</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{stats.total} total · {stats.converted} converted</p>
          </div>
          <button onClick={() => router.push("/portal/booking/bookings/new?is_quote=true")}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", color: "white", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            +
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total", value: stats.total },
            { label: "Generated", value: stats.generated },
            { label: "Converted", value: stats.converted },
            { label: "Revenue", value: fmt(stats.revenue), small: true },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 10px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: "white", fontSize: s.small ? 11 : 17, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(34,197,94,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Quote # or customer name..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: filter === f ? COLOR : "rgba(255,255,255,0.8)", color: filter === f ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
              {STATUS_CONFIG[f]?.label ?? `All (${stats.total})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "12px 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: "14px 16px", display: "flex", gap: 12, opacity: 1 - i * 0.1 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0fdf4", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: "#f0fdf4", borderRadius: 6, width: "60%", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 10, background: "#f0fdf4", borderRadius: 6, width: "40%", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208", margin: "0 0 6px" }}>No quotes found</p>
          </div>
        ) : filtered.map(q => {
          const initials = (q.customer_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
          return (
            <div key={q.id} onClick={() => setSelected(q)}
              style={{ background: "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid rgba(34,197,94,0.08)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.customer_name}</p>
                  <StatusBadge status={q.status} />
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(80,55,30,0.5)", fontFamily: "monospace" }}>{q.quote_number}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "rgba(80,55,30,0.4)" }}>📅 {fmtDate(q.event_date)}</span>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#1e1208" }}>{fmt(q.total_amount)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button onClick={() => router.push("/portal/booking/bookings/new?is_quote=true")}
        style={{ position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, border: "none", borderRadius: 18, padding: "14px 20px", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${COLOR}55`, fontFamily: "inherit" }}>
        <span style={{ fontSize: 18 }}>+</span> New Quote
      </button>

      {selected && <QuoteDetailSheet quote={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); fetchQuotes() }} />}

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
