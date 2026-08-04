"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#0ea5e9"
const COLOR_DARK = "#0369a1"

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

const STATUS: Record<string, { bg: string; text: string; label: string }> = {
  available:     { bg: "#dcfce7", text: "#15803d", label: "Available" },
  rented:        { bg: "#dbeafe", text: "#1d4ed8", label: "Rented" },
  in_laundry:    { bg: "#fef9c3", text: "#a16207", label: "In Laundry" },
  damaged:       { bg: "#fee2e2", text: "#b91c1c", label: "Damaged" },
  under_repair:  { bg: "#fff7ed", text: "#c2410c", label: "Under Repair" },
  inactive:      { bg: "#f1f5f9", text: "#64748b", label: "Inactive" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { bg: "#f1f5f9", text: "#64748b", label: status }
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: s.bg, color: s.text, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
}

export default function WarehouseInventoryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/inventory?limit=200")
      .then(r => r.json())
      .then(d => setProducts(d.data ?? d ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    products.filter(p =>
      (filter === "all" || (p.status || "available") === filter) &&
      (!search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search))
    ), [products, search, filter])

  const stats = useMemo(() => ({
    total: products.length,
    available: products.filter(p => p.status === "available" || !p.status).length,
    rented: products.filter(p => p.status === "rented").length,
    damaged: products.filter(p => p.status === "damaged").length,
  }), [products])

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/warehouse")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>📦 Inventory</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{stats.total} items · {stats.available} available</p>
          </div>
          <button onClick={() => router.push("/portal/warehouse/scan")}
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", color: "white", fontSize: 12, fontWeight: 700 }}>
            📷 Scan
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total", value: stats.total },
            { label: "Available", value: stats.available, color: "#bbf7d0" },
            { label: "Rented", value: stats.rented, color: "#bfdbfe" },
            { label: "Damaged", value: stats.damaged, color: "#fca5a5" },
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(14,165,233,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, SKU, or barcode..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" }}>
        {["all", "available", "rented", "in_laundry", "damaged", "under_repair"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: filter === f ? COLOR : "rgba(255,255,255,0.8)", color: filter === f ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
            {STATUS[f]?.label ?? "All"}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{ padding: "0 16px 100px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[...Array(8)].map((_, i) => <div key={i} style={{ background: "white", borderRadius: 16, height: 120, animation: "pulse 1.5s ease-in-out infinite", opacity: 1 - i * 0.08 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208" }}>No items found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => router.push(`/inventory/edit/${p.id}`)}
                style={{ background: "white", borderRadius: 16, padding: "14px 12px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(14,165,233,0.08)" }}>
                {/* Category icon */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${COLOR}25, ${COLOR_DARK}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8 }}>
                  👘
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 800, color: "#1e1208", lineHeight: 1.3 }}>{p.name}</p>
                {p.sku && <p style={{ margin: "0 0 6px", fontSize: 10, color: "rgba(80,55,30,0.4)", fontFamily: "monospace" }}>{p.sku}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <StatusBadge status={p.status || "available"} />
                  {p.quantity !== undefined && <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)" }}>Qty: {p.quantity}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Add Product */}
      <button onClick={() => router.push("/inventory/add")}
        style={{ position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, border: "none", borderRadius: 18, padding: "14px 20px", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${COLOR}55`, fontFamily: "inherit" }}>
        <span style={{ fontSize: 18 }}>+</span> Add Item
      </button>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
