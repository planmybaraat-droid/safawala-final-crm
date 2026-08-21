"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { PortalIcon } from "@/components/portal/portal-icons"
import { ProductFormSheet } from "./product-form-sheet"
import { BarcodePrintDialog } from "@/components/inventory/barcode-print-dialog"
import { ManageCategoriesSheet } from "./manage-categories-sheet"

const COLOR = "#6f3f7b"
const COLOR_DARK = "#4b2458"

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
  const [categoryRecords, setCategoryRecords] = useState<Array<{ id: string; name: string; parent_id?: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "stock_desc" | "stock_asc" | "name_asc" | "name_desc" | "price_asc" | "price_desc">("created_desc")
  const [franchiseId, setFranchiseId] = useState<string | undefined>()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  // Full product editor (Info/Photos/Pricing/Variants/Barcode) — same
  // component the main dashboard uses, re-skinned as a bottom sheet.
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorProduct, setEditorProduct] = useState<any | null>(null)
  const [barcodeProduct, setBarcodeProduct] = useState<any | null>(null)
  const [menuProduct, setMenuProduct] = useState<any | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkProducts, setBulkProducts] = useState<any[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

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
    Promise.all([
      fetch("/api/warehouse/inventory").then(r => r.json()),
      fetch("/api/warehouse/categories?all=true").then(r => r.json()),
    ])
      .then(([inventoryResult, categoryResult]) => {
        const nextCategories = categoryResult.data ?? []
        const names = Object.fromEntries(nextCategories.map((category: any) => [category.id, category.name]))
        setCategoryRecords(nextCategories)
        setProducts((inventoryResult.data ?? inventoryResult ?? []).map((product: any) => ({
          ...product,
          category: names[product.category_id] || product.category || "Uncategorized",
        })))
      })
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

  function openBulkEditor() {
    setBulkProducts(filtered.map(product => ({ ...product })))
    setBulkOpen(true)
  }

  function updateBulkProduct(id: string, field: string, value: string | number) {
    setBulkProducts(current => current.map(product => product.id === id ? { ...product, [field]: value } : product))
  }

  async function saveBulkProducts() {
    setBulkSaving(true)
    try {
      const responses = await Promise.all(bulkProducts.map(product => fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          price: Number(product.price) || 0,
          regular_price: Number(product.price) || 0,
          rental_price: Number(product.rental_price) || 0,
          stock_total: Number(product.stock_total) || 0,
          stock_available: Number(product.stock_available) || 0,
          reorder_level: Number(product.reorder_level) || 0,
        }),
      })))
      const failed = responses.find(response => !response.ok)
      if (failed) throw new Error(`Bulk update failed (${failed.status})`)
      setBulkOpen(false)
      fetchProducts()
    } catch (error: any) {
      alert(error.message || "Failed to save bulk changes")
    } finally {
      setBulkSaving(false)
    }
  }

  async function importProducts(file: File) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return
    const headers = lines[0].split(",").map(value => value.trim().replace(/^"|"$/g, ""))
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(value => value.trim().replace(/^"|"$/g, ""))
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
    })
    const response = await fetch("/api/inventory/import-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || "Import failed")
    fetchProducts()
    alert(`Import completed. Created: ${result.created || 0}, Updated: ${result.updated || 0}`)
  }

  const categories = useMemo(() => categoryRecords.map(category => category.name).sort(), [categoryRecords])

  function createCatalog() {
    const category = categoryRecords.find(item => item.name === categoryFilter)
    if (!category) return
    window.open(`/api/catalog?category_id=${category.id}&category_name=${encodeURIComponent(category.name)}`, "_blank")
  }

  function resetFilters() {
    setSearch("")
    setFilter("all")
    setCategoryFilter("all")
    setSortBy("created_desc")
  }

  const filtered = useMemo(() => {
    const list = products.filter(p => {
      const available = Number(p.stock_available) || 0
      const reorderLevel = Number(p.reorder_level) || 0
      const matchesStock = filter === "all" ||
        (filter === "in_stock" && available > reorderLevel) ||
        (filter === "low_stock" && available > 0 && available <= reorderLevel) ||
        (filter === "out_of_stock" && available <= 0)

      return matchesStock &&
        (categoryFilter === "all" || p.category === categoryFilter) &&
        (!search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search))
    })
    const sorted = [...list]
    const lastActivity = (product: any) => Math.max(
      new Date(product.updated_at || 0).getTime(),
      new Date(product.created_at || 0).getTime(),
    )
    if (sortBy === "created_desc") sorted.sort((a, b) => lastActivity(b) - lastActivity(a))
    else if (sortBy === "stock_desc") sorted.sort((a, b) => (Number(b.stock_available) || 0) - (Number(a.stock_available) || 0))
    else if (sortBy === "stock_asc") sorted.sort((a, b) => (Number(a.stock_available) || 0) - (Number(b.stock_available) || 0))
    else if (sortBy === "name_asc") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    else if (sortBy === "name_desc") sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""))
    else if (sortBy === "price_asc") sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    else if (sortBy === "price_desc") sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
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
    <div className="warehouse-inventory-page" style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f5f0fb 0%, #ede4f7 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
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

      {/* Main CRM-style inventory filters, scoped to the Warehouse portal. */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "12px 16px 0" }}>
        <div style={{ flex: "1 1 280px", minWidth: 220, height: 40, display: "flex", alignItems: "center", gap: 10, background: "#fefaf6", borderRadius: 10, padding: "0 12px", border: "1px solid rgba(16,37,22,0.15)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(16,37,22,0.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, barcode..."
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#102516", fontFamily: "inherit" }} />
          {search && <button aria-label="Clear search" onClick={() => setSearch("")} style={{ padding: 0, background: "none", border: "none", cursor: "pointer", display: "flex", color: "rgba(16,37,22,0.5)" }}><PortalIcon name="x" size={16} /></button>}
        </div>
        <select aria-label="Stock status" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
          style={{ flex: "0 1 160px", minWidth: 145, height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(16,37,22,0.15)", fontSize: 12, color: "#102516", background: "#fefaf6", fontFamily: "inherit" }}>
          <option value="all">All Products</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select aria-label="Product category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ flex: "0 1 165px", minWidth: 150, height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(16,37,22,0.15)", fontSize: 12, color: "#102516", background: "#fefaf6", fontFamily: "inherit" }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Sort products" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ flex: "0 1 190px", minWidth: 175, height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(16,37,22,0.15)", fontSize: 12, color: "#102516", background: "#fefaf6", fontFamily: "inherit" }}>
          <option value="created_desc">Last Added / Updated</option>
          <option value="stock_desc">Stock: High → Low</option>
          <option value="stock_asc">Stock: Low → High</option>
          <option value="name_asc">Name: A → Z</option>
          <option value="name_desc">Name: Z → A</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
        <button onClick={openBulkEditor} disabled={filtered.length === 0}
          style={{ height: 40, flexShrink: 0, padding: "0 13px", borderRadius: 10, border: "1px solid #bfdbfe", background: "white", color: "#1d4ed8", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, cursor: filtered.length === 0 ? "not-allowed" : "pointer", opacity: filtered.length === 0 ? 0.55 : 1, fontFamily: "inherit" }}>
          <PortalIcon name="edit" size={13} /> Bulk Editor
        </button>
        <button onClick={() => setCategoriesOpen(true)}
          style={{ height: 40, flexShrink: 0, padding: "0 13px", borderRadius: 10, border: "1px solid rgba(16,37,22,0.15)", background: "white", color: "#102516", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" }}>
          <PortalIcon name="bar-chart" size={13} /> Manage Categories
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "8px 16px 0", overflowX: "auto" }}>
        <button onClick={fetchProducts}
          style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${COLOR}35`, background: "white", color: COLOR_DARK, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer" }}>
          Refresh
        </button>
        {categoryFilter !== "all" && <button onClick={createCatalog}
          style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${COLOR}35`, background: "white", color: COLOR_DARK, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer" }}>
          Catalog
        </button>}
        <button onClick={() => window.open("/api/inventory/export-csv", "_blank")}
          style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${COLOR}35`, background: "white", color: COLOR_DARK, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer" }}>
          Export CSV
        </button>
        <button onClick={() => importInputRef.current?.click()}
          style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${COLOR}35`, background: "white", color: COLOR_DARK, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer" }}>
          Import CSV
        </button>
        <input ref={importInputRef} type="file" accept=".csv" hidden onChange={async event => {
          const file = event.target.files?.[0]
          if (!file) return
          try { await importProducts(file) } catch (error: any) { alert(error.message || "Import failed") }
          event.target.value = ""
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px 10px" }}>
        <span style={{ padding: "4px 9px", borderRadius: 999, border: "1px solid rgba(16,37,22,0.1)", background: "#fcf7f0", color: "rgba(16,37,22,0.7)", fontSize: 10, fontWeight: 700 }}>
          {filtered.length} of {products.length} products
        </span>
        {(search || filter !== "all" || categoryFilter !== "all" || sortBy !== "created_desc") && <button onClick={resetFilters}
          style={{ padding: 0, border: "none", background: "transparent", color: "rgba(16,37,22,0.55)", fontSize: 10, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>
          Reset filters
        </button>}
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
          <div className="warehouse-action-sheet" onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "white", borderRadius: "20px 20px 0 0", padding: "8px 0 calc(env(safe-area-inset-bottom,0px) + 8px)" }}>
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

      {bulkOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,10,25,0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "min(1100px, 100%)", maxHeight: "88vh", background: "white", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h2 style={{ margin: 0, fontSize: 18 }}>Batch Products Editor</h2><p style={{ margin: "3px 0 0", color: "#777", fontSize: 11 }}>{bulkProducts.length} filtered products</p></div>
              <button onClick={() => setBulkOpen(false)} style={{ border: 0, background: "#f3eef6", borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8f5fa", zIndex: 1 }}><tr>
                  {["Product Name", "Sale Price", "Rental Price", "Total Stock", "Available", "Reorder Level"].map(label => <th key={label} style={{ padding: 10, textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #e8e0ec" }}>{label}</th>)}
                </tr></thead>
                <tbody>{bulkProducts.map(product => <tr key={product.id} style={{ borderBottom: "1px solid #f0edf2" }}>
                  {[
                    ["name", product.name, "text"],
                    ["price", product.price ?? 0, "number"],
                    ["rental_price", product.rental_price ?? 0, "number"],
                    ["stock_total", product.stock_total ?? 0, "number"],
                    ["stock_available", product.stock_available ?? 0, "number"],
                    ["reorder_level", product.reorder_level ?? 0, "number"],
                  ].map(([field, value, type]) => <td key={String(field)} style={{ padding: 7 }}><input type={String(type)} min={type === "number" ? 0 : undefined} value={value as any} onChange={event => updateBulkProduct(product.id, String(field), type === "number" ? Number(event.target.value) : event.target.value)} style={{ width: field === "name" ? 220 : 105, maxWidth: "100%", border: "1px solid #ddd4e2", borderRadius: 8, padding: "7px 8px", fontSize: 12 }} /></td>)}
                </tr>)}</tbody>
              </table>
            </div>
            <div style={{ padding: 14, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setBulkOpen(false)} disabled={bulkSaving} style={{ padding: "9px 15px", borderRadius: 10, border: "1px solid #ddd", background: "white", fontWeight: 700 }}>Cancel</button>
              <button onClick={saveBulkProducts} disabled={bulkSaving} style={{ padding: "9px 15px", borderRadius: 10, border: 0, background: COLOR, color: "white", fontWeight: 800 }}>{bulkSaving ? "Saving..." : "Save Bulk Changes"}</button>
            </div>
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
