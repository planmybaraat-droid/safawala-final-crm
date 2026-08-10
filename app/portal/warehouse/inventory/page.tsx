"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PortalIcon } from "@/components/portal/portal-icons"
import { ProductFormSheet } from "./product-form-sheet"
import { BarcodePrintDialog } from "@/components/inventory/barcode-print-dialog"
import { ManageCategoriesSheet } from "./manage-categories-sheet"

const COLOR = "#a855f7"
const COLOR_DARK = "#7c3aed"

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }

const STATUS: Record<string, { bg: string; text: string; label: string }> = {
  available:     { bg: "#dcfce7", text: "#15803d", label: "Available" },
  rented:        { bg: "#dbeafe", text: "#1d4ed8", label: "Rented" },
  in_laundry:    { bg: "#fef9c3", text: "#a16207", label: "In Laundry" },
  damaged:       { bg: "#fee2e2", text: "#b91c1c", label: "Damaged" },
  inactive:      { bg: "#f1f5f9", text: "#64748b", label: "Inactive" },
}

// The products table tracks stock as separate numeric counters
// (stock_available/stock_booked/stock_damaged/stock_in_laundry) — there is no
// single "status" column, so one is derived here. When a product has zero
// units available, the counter that explains why (damaged > laundry > booked)
// wins; "under_repair" was dropped entirely since no stock_* column for it
// exists in the schema, so that filter could never match anything.
function deriveStatus(p: any): string {
  if (p.is_active === false) return "inactive"
  const available = p.stock_available ?? 0
  if (available > 0) return "available"
  if ((p.stock_damaged ?? 0) > 0) return "damaged"
  if ((p.stock_in_laundry ?? 0) > 0) return "in_laundry"
  if ((p.stock_booked ?? 0) > 0) return "rented"
  return "available"
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
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"name" | "stock_desc" | "stock_asc" | "price_desc">("name")
  const [franchiseId, setFranchiseId] = useState<string | undefined>()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  // Full product editor (Info/Photos/Pricing/Variants/Barcode) — same
  // component the main dashboard uses, re-skinned as a bottom sheet.
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorProduct, setEditorProduct] = useState<any | null>(null)
  const [barcodeProduct, setBarcodeProduct] = useState<any | null>(null)
  const [menuProduct, setMenuProduct] = useState<any | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("safawala_user")
      if (raw) {
        const u = JSON.parse(raw)
        setFranchiseId(u?.franchise_id)
        setIsSuperAdmin(!!u?.is_super_admin)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [])

  function fetchProducts() {
    setLoading(true)
    fetch("/api/warehouse/inventory")
      .then(r => r.json())
      .then(d => setProducts(d.data ?? d ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }

  function openAdd() {
    setEditorProduct(null)
    setEditorOpen(true)
  }

  function openEdit(p: any) {
    setMenuProduct(null)
    setEditorProduct(p)
    setEditorOpen(true)
  }

  // Mirrors app/inventory/dashboard.tsx's handleSaveProduct — same two
  // endpoints (create vs update), same variant-save loop.
  async function handleSaveProduct(data: any) {
    const { images, variants, _variation_count, category_name, product_code, ...productData } = data
    let productId = editorProduct?.id

    if (productId) {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, images }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Update failed (${res.status})`)
      }
    } else {
      const res = await fetch("/api/products/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, images, franchiseId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Create failed (${res.status})`)
      }
      const result = await res.json()
      productId = result.id
    }

    if (variants && variants.length > 0 && productId) {
      for (const variant of variants) {
        if (variant.id) continue
        await fetch(`/api/products/${productId}/variations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variation_name: variant.variation_name,
            color: variant.color,
            design: variant.design,
            material: variant.material,
            size: variant.size,
            sku: variant.sku,
            price_adjustment: variant.price_adjustment || 0,
            rental_price_adjustment: variant.rental_price_adjustment || 0,
            stock_total: variant.stock_total || 0,
            stock_available: variant.stock_available || 0,
            image_url: variant.image_url || null,
          }),
        })
      }
    }

    setEditorOpen(false)
    fetchProducts()
  }

  async function handleDeleteProduct(p: any) {
    setMenuProduct(null)
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      })
      if (!res.ok) throw new Error("Delete failed")
      fetchProducts()
    } catch {
      alert("Failed to delete product")
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => { if (p.category) set.add(p.category) })
    return Array.from(set).sort()
  }, [products])

  const filtered = useMemo(() => {
    const list = products.filter(p =>
      (filter === "all" || deriveStatus(p) === filter) &&
      (categoryFilter === "all" || p.category === categoryFilter) &&
      (!search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search))
    )
    const sorted = [...list]
    if (sortBy === "name") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    else if (sortBy === "stock_desc") sorted.sort((a, b) => (b.stock_available ?? 0) - (a.stock_available ?? 0))
    else if (sortBy === "stock_asc") sorted.sort((a, b) => (a.stock_available ?? 0) - (b.stock_available ?? 0))
    else if (sortBy === "price_desc") sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    return sorted
  }, [products, search, filter, categoryFilter, sortBy])

  // Same 4-stat set app/inventory/dashboard.tsx shows (In Stock/Low Stock/
  // Out of Stock relative to reorder_level, Inventory Value = price × available).
  const stats = useMemo(() => {
    let inStock = 0, lowStock = 0, outOfStock = 0, value = 0
    for (const p of products) {
      const avail = p.stock_available ?? 0
      const reorder = p.reorder_level ?? 0
      if (avail <= 0) outOfStock++
      else if (avail <= reorder) lowStock++
      else inStock++
      value += (p.price || 0) * avail
    }
    return { total: products.length, inStock, lowStock, outOfStock, value }
  }, [products])

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f5f0fb 0%, #ede4f7 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/warehouse")} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <PortalIcon name="package" size={18} /> Inventory
            </h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>Manage products, variants, pricing & barcodes</p>
          </div>
          <button onClick={() => router.push("/portal/warehouse/scan")}
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", color: "white", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <PortalIcon name="camera" size={14} /> Scan
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6, position: "relative", zIndex: 1 }}>
          {[
            { label: "Total", value: stats.total },
            { label: "In Stock", value: stats.inStock, color: "#bbf7d0" },
            { label: "Low Stock", value: stats.lowStock, color: "#fde68a" },
            { label: "Out", value: stats.outOfStock, color: "#fca5a5" },
            { label: "Value", value: `₹${stats.value >= 100000 ? `${(stats.value / 100000).toFixed(1)}L` : stats.value.toLocaleString("en-IN")}`, color: "#e9d5ff" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 6px", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 8, fontWeight: 700, margin: "0 0 3px", letterSpacing: 0.3, textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ color: s.color || "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: `1px solid ${COLOR}30`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, SKU, or barcode..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "rgba(80,55,30,0.5)" }}><PortalIcon name="x" size={16} /></button>}
        </div>
      </div>

      {/* Category / Sort / Manage Categories toolbar */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px 0" }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 11, fontWeight: 700, color: "#1e1208", background: "white", fontFamily: "inherit" }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 11, fontWeight: 700, color: "#1e1208", background: "white", fontFamily: "inherit" }}>
          <option value="name">Name A–Z</option>
          <option value="stock_desc">Stock: High–Low</option>
          <option value="stock_asc">Stock: Low–High</option>
          <option value="price_desc">Price: High–Low</option>
        </select>
        <button onClick={() => setCategoriesOpen(true)}
          style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 10, border: `1px solid ${COLOR}40`, background: `${COLOR}10`, color: COLOR_DARK, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: "inherit" }}>
          <PortalIcon name="bar-chart" size={13} /> Categories
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" }}>
        {["all", "available", "rented", "in_laundry", "damaged"].map(f => (
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
            <div style={{ display: "flex", justifyContent: "center", color: "rgba(80,55,30,0.25)", marginBottom: 12 }}><PortalIcon name="package" size={48} /></div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208" }}>No items found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => openEdit(p)}
                style={{ position: "relative", background: "white", borderRadius: 16, padding: "14px 12px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: `1px solid ${COLOR}15` }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuProduct(p) }}
                  style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.04)", color: "rgba(80,55,30,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <PortalIcon name="more-vertical" size={14} />
                </button>
                {/* Category icon */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${COLOR}25, ${COLOR_DARK}15)`, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR_DARK, marginBottom: 8 }}>
                  <PortalIcon name="box" size={20} />
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 800, color: "#1e1208", lineHeight: 1.3, paddingRight: 20 }}>{p.name}</p>
                {(p.product_code || p.sku) && <p style={{ margin: "0 0 6px", fontSize: 10, color: "rgba(80,55,30,0.4)", fontFamily: "monospace" }}>{p.product_code || p.sku}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <StatusBadge status={deriveStatus(p)} />
                  {typeof p.stock_available === "number" && <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)" }}>Qty: {p.stock_available}{typeof p.stock_total === "number" ? `/${p.stock_total}` : ""}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-card quick actions */}
      {menuProduct && (
        <div style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }} onClick={() => setMenuProduct(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "white", borderRadius: "20px 20px 0 0", padding: "8px 0 calc(env(safe-area-inset-bottom,0px) + 8px)" }}>
            <p style={{ margin: 0, padding: "10px 20px", fontSize: 12, fontWeight: 800, color: "rgba(80,55,30,0.4)", textTransform: "uppercase" }}>{menuProduct.name}</p>
            {[
              { icon: "clipboard", label: "Edit Product", action: () => openEdit(menuProduct) },
              { icon: "printer", label: "Print Barcode", action: () => { setBarcodeProduct(menuProduct); setMenuProduct(null) } },
              { icon: "map-pin", label: "Stock & Damage", action: () => { router.push(`/portal/warehouse/inventory/${menuProduct.id}`); setMenuProduct(null) } },
              { icon: "x", label: "Delete", action: () => handleDeleteProduct(menuProduct), danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", border: "none", background: "none", textAlign: "left", fontSize: 14, fontWeight: 700, color: item.danger ? "#dc2626" : "#1e1208", cursor: "pointer" }}>
                <PortalIcon name={item.icon} size={17} /> {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ProductFormSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        product={editorProduct}
        onSave={handleSaveProduct}
        franchiseId={franchiseId}
      />

      {barcodeProduct && (
        <BarcodePrintDialog
          open={!!barcodeProduct}
          onOpenChange={(o) => !o && setBarcodeProduct(null)}
          product={barcodeProduct}
        />
      )}

      <ManageCategoriesSheet
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        franchiseId={franchiseId}
        isSuperAdmin={isSuperAdmin}
        onChanged={fetchProducts}
      />

      {/* FAB — Add Product */}
      <button onClick={openAdd}
        style={{ position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, border: "none", borderRadius: 18, padding: "14px 20px", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${COLOR}55`, fontFamily: "inherit" }}>
        <span style={{ fontSize: 18 }}>+</span> Add Item
      </button>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}

