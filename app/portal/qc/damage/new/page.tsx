"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#eab308"

function Field({ label, value, onChange, type = "text", placeholder, required }: any) {
  return (
    <div className="px-4 py-3 border-b border-[rgba(245,235,224,0.8)] last:border-0">
      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>
        {label}{required && <span style={{ color: COLOR }}> *</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent outline-none text-[14px] font-medium" style={{ color: "#1e1208" }} />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }: any) {
  return (
    <div className="px-4 py-3 border-b border-[rgba(245,235,224,0.8)] last:border-0">
      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>
        {label}{required && <span style={{ color: COLOR }}> *</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-[14px] font-medium" style={{ color: value ? "#1e1208" : "rgba(80,55,30,0.35)" }}>
        <option value="">Select...</option>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export default function LogDamagePage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ product_id: "", damage_type: "", severity: "minor", description: "", qty_damaged: "1" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/products?limit=500")
      .then(r => r.json())
      .then(d => setProducts(d.data ?? d ?? []))
      .catch(() => setProducts([]))
  }, [])

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }))

  async function save() {
    if (!form.product_id || !form.damage_type) { setError("Product and damage type are required"); return }
    setSaving(true); setError("")
    const res = await fetch("/api/products/report-damage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.product_id,
        damage_type: form.damage_type,
        severity: form.severity,
        description: form.description || null,
        qty_damaged: parseInt(form.qty_damaged, 10) || 1,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to log damage"); setSaving(false); return }
    router.push("/portal/qc/damage")
  }

  const productOptions = products.map(p => ({ value: p.id, label: `${p.name}${p.barcode ? ` (${p.barcode})` : ""}` }))

  return (
    <div className="pb-6">
      <PortalPageHeader title="Log Damage" subtitle="Report damaged item" color={COLOR} backHref="/portal/qc/damage" />

      <PortalSectionLabel label="Item Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <SelectField label="Product" value={form.product_id} onChange={set("product_id")} options={productOptions} required />
        <Field label="Qty Damaged" value={form.qty_damaged} onChange={set("qty_damaged")} type="number" placeholder="1" />
      </div>

      <PortalSectionLabel label="Damage Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <SelectField label="Damage Type" value={form.damage_type} onChange={set("damage_type")} required options={[
          { value: "stain", label: "Stain" },
          { value: "tear", label: "Tear / Rip" },
          { value: "burn", label: "Burn Mark" },
          { value: "broken", label: "Broken / Bent" },
          { value: "colour_fade", label: "Colour Fade" },
          { value: "lost", label: "Item Lost" },
          { value: "other", label: "Other" },
        ]} />
        <SelectField label="Severity" value={form.severity} onChange={set("severity")} options={[
          { value: "minor", label: "Minor — can be repaired" },
          { value: "major", label: "Major — needs replacement" },
          { value: "total_loss", label: "Total Loss" },
        ]} />
        <div className="px-4 py-3">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>Notes</label>
          <textarea value={form.description} onChange={e => set("description")(e.target.value)} placeholder="Describe the damage..." rows={3}
            className="w-full bg-transparent outline-none text-[13px] resize-none" style={{ color: "#1e1208" }} />
        </div>
      </div>

      {error && <p className="mx-4 mt-3 text-[12px] font-semibold text-center" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="mx-4 mt-4">
        <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl text-[14px] font-black text-white" style={{ background: COLOR, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Log Damage Report"}
        </button>
      </div>
    </div>
  )
}
