"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel, PortalInfoRow, PortalSkeleton } from "@/components/portal/portal-shared"

const COLOR = "#a855f7"

export default function ProductDetailPortalPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState("")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Damage reporting states
  const [damageModalOpen, setDamageModalOpen] = useState(false)
  const [damageQty, setDamageQty] = useState("1")
  const [damageType, setDamageType] = useState("stain")
  const [damageSeverity, setDamageSeverity] = useState("minor")
  const [damageNotes, setDamageNotes] = useState("")
  const [damageReporting, setDamageReporting] = useState(false)

  useEffect(() => { if (id) load() }, [id])
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000) }, [toast])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?id=${id}`)
      const data = await res.json()
      const p = Array.isArray(data.data) ? data.data[0] : (data.data ?? data)
      if (p) { setProduct(p); setQty(String(p.quantity ?? p.total_quantity ?? 0)) }
    } catch {}
    setLoading(false)
  }

  async function saveQty() {
    if (!product || saving || !qty) return
    setSaving(true)
    const newQty = parseInt(qty, 10)
    if (isNaN(newQty)) { setToast("Invalid quantity"); setSaving(false); return }
    try {
      const res = await fetch("/api/products/bulk-update-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ id, quantity: newQty }] }),
      })
      if (res.ok) { setProduct({ ...product, quantity: newQty }); setToast("Stock updated") }
      else setToast("Failed to update stock")
    } catch { setToast("Error updating stock") }
    setSaving(false)
  }

  async function handleReportDamage() {
    if (damageReporting || !damageQty) return
    const dq = parseInt(damageQty, 10)
    if (isNaN(dq) || dq <= 0) {
      alert("Please enter a valid quantity")
      return
    }
    if (dq > available) {
      alert(`Cannot report more than available stock (${available} units)`)
      return
    }

    setDamageReporting(true)
    try {
      const res = await fetch("/api/products/report-damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          qty_damaged: dq,
          damage_type: damageType,
          severity: damageSeverity,
          description: damageNotes
        })
      })
      const data = await res.json()
      if (res.ok) {
        setToast("Damage reported successfully")
        setDamageModalOpen(false)
        // Reset fields
        setDamageQty("1")
        setDamageType("stain")
        setDamageSeverity("minor")
        setDamageNotes("")
        // Reload product details
        load()
      } else {
        alert(data.error || "Failed to report damage")
      }
    } catch {
      alert("Error reporting damage")
    } finally {
      setDamageReporting(false)
    }
  }

  const fmt = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`
  const available = product?.available_quantity ?? product?.quantity ?? 0
  const booked = product?.booked_quantity ?? 0
  const total = product?.total_quantity ?? product?.quantity ?? 0
  const isLow = available < 5

  if (loading) return (
    <div>
      <PortalPageHeader title="Product" color={COLOR} backHref="/portal/warehouse/inventory" />
      <div className="mx-4 mt-4"><PortalSkeleton rows={7} /></div>
    </div>
  )

  if (!product) return (
    <div>
      <PortalPageHeader title="Not Found" color={COLOR} backHref="/portal/warehouse/inventory" />
      <div className="mx-4 mt-8 text-center"><p style={{ color: "rgba(80,55,30,0.5)" }}>Product not found</p></div>
    </div>
  )

  return (
    <div className="pb-6">
      <PortalPageHeader
        title={product.name ?? "Product"}
        subtitle={product.category ?? product.sku ?? ""}
        color={COLOR}
        backHref="/portal/warehouse/inventory"
        action={{ label: "Full Edit", onClick: () => router.push(`/inventory/edit/${id}`) }}
      />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white text-[12px] font-bold shadow-lg" style={{ background: COLOR }}>
          {toast}
        </div>
      )}

      {/* Stock Summary */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        {[
          { label: "Available", value: available, color: isLow ? "#dc2626" : "#16a34a" },
          { label: "Booked", value: booked, color: "#f59e0b" },
          { label: "Total", value: total, color: COLOR },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            <p className="text-[22px] font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "rgba(80,55,30,0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {isLow && (
        <div className="mx-4 mt-3 p-3 rounded-2xl flex items-center gap-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p className="text-[11px] font-bold" style={{ color: "#dc2626" }}>Low stock — only {available} units available</p>
        </div>
      )}

      {/* Quick Stock Update */}
      <PortalSectionLabel label="Update Stock Quantity" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => setQty(q => String(Math.max(0, parseInt(q || "0", 10) - 1)))} className="w-10 h-10 rounded-xl text-[20px] font-black flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,235,224,0.8)", color: "#1e1208" }}>−</button>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="flex-1 text-center text-[24px] font-black bg-transparent outline-none"
            style={{ color: "#1e1208" }}
          />
          <button onClick={() => setQty(q => String(parseInt(q || "0", 10) + 1))} className="w-10 h-10 rounded-xl text-[20px] font-black flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,235,224,0.8)", color: "#1e1208" }}>+</button>
        </div>
        <div className="px-4 pb-3">
          <button onClick={saveQty} disabled={saving} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white" style={{ background: COLOR, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Update Stock"}
          </button>
        </div>
      </div>

      {/* Damaged Stock Reporting */}
      <PortalSectionLabel label="⚠️ Damaged Stock Reporting" />
      <div className="mx-4 rounded-2xl overflow-hidden p-4 bg-red-50/40 border border-red-100 flex flex-col items-center">
        <p className="text-[11px] font-bold text-red-700/80 text-center mb-3 leading-relaxed">
          Mark units as damaged to archive them and remove them from available inventory.
        </p>
        <button
          onClick={() => setDamageModalOpen(true)}
          className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-opacity"
          style={{ background: "#ef4444" }}
        >
          ⚠️ Report Damaged Stock
        </button>
      </div>

      {/* Product Info */}
      <PortalSectionLabel label="Product Info" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <PortalInfoRow label="Name" value={product.name ?? "—"} />
        <PortalInfoRow label="Category" value={product.category ?? "—"} />
        {product.sku && <PortalInfoRow label="SKU" value={product.sku} />}
        {product.barcode && <PortalInfoRow label="Barcode" value={product.barcode} />}
        {product.product_code && <PortalInfoRow label="Code" value={product.product_code} />}
        {product.rental_price && <PortalInfoRow label="Rental Price" value={fmt(product.rental_price)} />}
        {product.sale_price && <PortalInfoRow label="Sale Price" value={fmt(product.sale_price)} />}
        {product.description && <PortalInfoRow label="Description" value={product.description} />}
      </div>

      {/* REPORT DAMAGE MODAL */}
      {damageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-[15px]" style={{ color: "#1e1208" }}>Report Damaged Stock</h3>
              <button onClick={() => setDamageModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-black">✕</button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>
                  Quantity Damaged
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDamageQty(q => String(Math.max(1, parseInt(q || "1", 10) - 1)))} className="w-9 h-9 rounded-lg text-[18px] font-black flex items-center justify-center bg-slate-100">-</button>
                  <input
                    type="number"
                    value={damageQty}
                    onChange={e => setDamageQty(e.target.value)}
                    min="1"
                    max={available}
                    className="flex-1 text-center font-bold text-[16px] py-1 border rounded-lg bg-transparent"
                  />
                  <button onClick={() => setDamageQty(q => String(Math.min(available, parseInt(q || "1", 10) + 1)))} className="w-9 h-9 rounded-lg text-[18px] font-black flex items-center justify-center bg-slate-100">+</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>
                  Damage Type
                </label>
                <select
                  value={damageType}
                  onChange={e => setDamageType(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none"
                >
                  <option value="stain">Stain</option>
                  <option value="tear">Tear / Rip</option>
                  <option value="burn">Burn Mark</option>
                  <option value="broken">Broken / Bent</option>
                  <option value="colour_fade">Colour Fade</option>
                  <option value="lost">Item Lost</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>
                  Severity
                </label>
                <select
                  value={damageSeverity}
                  onChange={e => setDamageSeverity(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none"
                >
                  <option value="minor">Minor — can be repaired</option>
                  <option value="major">Major — needs replacement</option>
                  <option value="total_loss">Total Loss</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>
                  Notes / Description
                </label>
                <textarea
                  value={damageNotes}
                  onChange={e => setDamageNotes(e.target.value)}
                  placeholder="Describe the damage..."
                  rows={3}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-[13px] font-medium outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleReportDamage}
                  disabled={damageReporting}
                  className="w-full py-3 rounded-xl text-[12px] font-bold text-white transition-opacity"
                  style={{ background: "#ef4444", opacity: damageReporting ? 0.7 : 1 }}
                >
                  {damageReporting ? "Reporting..." : "Confirm Damage Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
