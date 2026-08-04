"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" }
function waLink(phone: string) {
  let clean = (phone || "").trim().replace(/\D/g, "")
  if ((phone || "").trim().startsWith("+")) return `https://wa.me/${clean}`
  if (clean.length === 11 && clean.startsWith("0")) clean = clean.slice(1)
  if (clean.length === 10) return `https://wa.me/91${clean}`
  return `https://wa.me/${clean}`
}

function KycBadge({ status }: { status?: string }) {
  const s = status || "pending"
  const styles: Record<string, { bg: string; text: string }> = {
    verified:  { bg: "#dcfce7", text: "#15803d" },
    submitted: { bg: "#dbeafe", text: "#1d4ed8" },
    rejected:  { bg: "#fee2e2", text: "#b91c1c" },
    pending:   { bg: "#fef9c3", text: "#a16207" },
  }
  const st = styles[s] ?? styles.pending
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: st.bg, color: st.text, textTransform: "uppercase", letterSpacing: 0.5 }}>KYC: {s}</span>
}

export default function CustomerListPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const fetchCustomers = () => {
    setError("")
    setLoading(true)
    fetch("/api/customers?limit=200")
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || `Error ${r.status}`)
        }
        return r.json()
      })
      .then(d => setCustomers(d.data ?? d ?? []))
      .catch(e => { setError(e.message); setCustomers([]) })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { fetchCustomers() }, [])

  const filtered = useMemo(() =>
    customers.filter(c =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.customer_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    ), [customers, search])

  const thisMonth = customers.filter(c => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

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
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>Customers</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{customers.length} total · +{thisMonth} this month</p>
          </div>
          <button onClick={() => router.push("/portal/booking/customers/new")}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", color: "white", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            +
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total", value: customers.length },
            { label: "New (Month)", value: `+${thisMonth}` },
            { label: "KYC Verified", value: customers.filter(c => c.kyc_status === "verified").length },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 12px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(34,197,94,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, phone, or customer code..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "12px 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: "14px 16px", display: "flex", gap: 12, opacity: 1 - i * 0.1 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0fdf4", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: "#f0fdf4", borderRadius: 6, width: "55%", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 10, background: "#f0fdf4", borderRadius: 6, width: "40%", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208", margin: "0 0 6px" }}>No customers found</p>
            <p style={{ fontSize: 12, color: "rgba(80,55,30,0.5)", margin: 0 }}>Try a different search</p>
          </div>
        ) : filtered.map(c => {
          const initials = (c.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
          return (
            <div key={c.id} onClick={() => router.push(`/portal/booking/customers/${c.id}`)}
              style={{ background: "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid rgba(34,197,94,0.08)", display: "flex", gap: 12, alignItems: "center" }}>
              {/* Avatar */}
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${COLOR}30, ${COLOR_DARK}20)`, border: `2px solid ${COLOR}40`, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR_DARK, fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                {initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1e1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                  <KycBadge status={c.kyc_status} />
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(80,55,30,0.5)", fontFamily: "monospace" }}>{c.phone}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {c.customer_code && <span style={{ fontSize: 10, color: "rgba(80,55,30,0.35)", fontWeight: 600 }}>{c.customer_code}</span>}
                  {c.city && <span style={{ fontSize: 10, color: "rgba(80,55,30,0.4)", fontWeight: 600 }}>📍 {c.city}</span>}
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <a href={`tel:${c.phone}`} style={{ width: 34, height: 34, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>📞</a>
                <a href={waLink(c.whatsapp || c.phone)} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>💬</a>
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button onClick={() => router.push("/portal/booking/customers/new")}
        style={{ position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, border: "none", borderRadius: 18, padding: "14px 20px", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${COLOR}55`, fontFamily: "inherit" }}>
        <span style={{ fontSize: 18 }}>+</span> Add Customer
      </button>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
