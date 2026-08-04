"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#6366f1"
const COLOR_DARK = "#4338ca"

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString("en-IN")}` }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  paid:     { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  pending:  { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  partial:  { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  overdue:  { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
}

function InvoiceSheet({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", maxHeight: "85vh", overflowY: "auto", zIndex: 1, paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} /></div>
        <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#1e1208" }}>{invoice.customer_name || invoice.booking_number}</h3>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(80,55,30,0.45)", fontFamily: "monospace" }}>{invoice.invoice_number || invoice.booking_number}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#eef2ff", borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Total Amount</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#4338ca" }}>{fmt(invoice.total_amount ?? invoice.amount)}</p>
          </div>
          {[
            { label: "Status", value: invoice.status },
            { label: "Paid", value: fmt(invoice.paid_amount ?? 0) },
            { label: "Balance", value: fmt((invoice.total_amount ?? invoice.amount ?? 0) - (invoice.paid_amount ?? 0)) },
            { label: "Date", value: fmtDate(invoice.created_at) },
            { label: "Event Date", value: fmtDate(invoice.event_date) },
            { label: "Payment Type", value: invoice.payment_type },
          ].map(({ label, value }) => value && (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: 11, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 12, color: "#1e1208", fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AccountsPaymentsPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/invoices?limit=200")
      .then(r => r.json())
      .then(d => setInvoices(d.data ?? d ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    invoices.filter(i =>
      (filter === "all" || (i.status || "pending") === filter) &&
      (!search ||
        i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
        i.invoice_number?.toLowerCase().includes(search.toLowerCase()))
    ), [invoices, search, filter])

  const totalRevenue = invoices.reduce((s, i) => s + (i.paid_amount ?? i.amount ?? 0), 0)
  const totalPending = invoices.reduce((s, i) => s + Math.max(0, (i.total_amount ?? i.amount ?? 0) - (i.paid_amount ?? 0)), 0)

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #eef2ff 0%, #e0e7ff 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/accounts")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>💰 Payments</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{invoices.length} invoices</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total Collected", value: fmt(totalRevenue), color: "#a5f3fc" },
            { label: "Pending Collection", value: fmt(totalPending), color: "#fde68a" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 14px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, margin: "0 0 4px", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: s.color, fontSize: 16, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(99,102,241,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or invoice #..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" }}>
        {["all", "paid", "partial", "pending", "overdue"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: filter === f ? COLOR : "rgba(255,255,255,0.8)", color: filter === f ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: "14px 16px", height: 70, animation: "pulse 1.5s ease-in-out infinite", opacity: 1 - i * 0.1 }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208" }}>No payments found</p>
          </div>
        ) : filtered.map(inv => {
          const balance = (inv.total_amount ?? inv.amount ?? 0) - (inv.paid_amount ?? 0)
          const status = inv.status || (balance <= 0 ? "paid" : "pending")
          const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
          return (
            <div key={inv.id} onClick={() => setSelected(inv)}
              style={{ background: "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid rgba(99,102,241,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `${s.dot}20`, border: `1.5px solid ${s.dot}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {status === "paid" ? "✅" : balance > 0 ? "⏳" : "❌"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customer_name || inv.booking_number}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: s.bg, color: s.text, textTransform: "uppercase", flexShrink: 0 }}>{status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "rgba(80,55,30,0.4)" }}>{fmtDate(inv.created_at)}</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 9, color: "rgba(80,55,30,0.4)", fontWeight: 600 }}>TOTAL</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#1e1208" }}>{fmt(inv.total_amount ?? inv.amount)}</p>
                    </div>
                    {balance > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 9, color: "rgba(80,55,30,0.4)", fontWeight: 600 }}>DUE</p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#dc2626" }}>{fmt(balance)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selected && <InvoiceSheet invoice={selected} onClose={() => setSelected(null)} />}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
