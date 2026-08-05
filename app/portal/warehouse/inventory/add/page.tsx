"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader } from "@/components/portal/portal-shared"

const COLOR = "#0ea5e9"

export default function AddInventoryItemPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [barcode, setBarcode] = useState("")
  const [stockTotal, setStockTotal] = useState("1")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/warehouse/categories")
      .then(r => r.json())
      .then(d => setCategories(d.data ?? []))
      .catch(() => setCategories([]))
  }, [])

  async function save() {
    const trimmedName = name.trim()
    const stock = Number(stockTotal)
    if (!trimmedName) { setError("Item name is required"); return }
    if (!Number.isInteger(stock) || stock < 1) { setError("Enter a valid quantity (at least 1)"); return }

    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/warehouse/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          category_id: categoryId || null,
          barcode: barcode.trim() || null,
          stock_total: stock,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Unable to add item")
      router.push("/portal/warehouse/inventory")
    } catch (e: any) {
      setError(e.message || "Unable to add item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <PortalPageHeader title="Add Item" subtitle="Create a new inventory item" color={COLOR} backHref="/portal/warehouse/inventory" />

      <div style={{ padding: "16px 16px 100px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(80,55,30,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Item Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Maroon Silk Safa"
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 16 }}
          />

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(80,55,30,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Category</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 16, background: "white", color: categoryId ? "#1e1208" : "#94a3b8" }}
          >
            <option value="">Select category (optional)</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(80,55,30,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Barcode</label>
          <input
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            placeholder="Scan or leave blank to auto-generate"
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 16 }}
          />

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(80,55,30,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Quantity *</label>
          <input
            type="number"
            min={1}
            value={stockTotal}
            onChange={e => setStockTotal(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          />

          {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "12px 0 0", fontWeight: 600 }}>{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            style={{ width: "100%", marginTop: 20, border: 0, borderRadius: 12, padding: 14, background: COLOR, color: "white", fontSize: 14, fontWeight: 800, cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}
          >
            {saving ? "Adding…" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  )
}
