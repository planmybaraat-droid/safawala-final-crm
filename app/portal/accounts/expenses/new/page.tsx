"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#ef4444"

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

export default function AddExpensePage() {
  const router = useRouter()
  const [form, setForm] = useState({ description: "", amount: "", category: "", expense_date: new Date().toISOString().split("T")[0], vendor: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }))

  async function save() {
    if (!form.description || !form.amount) { setError("Description and amount are required"); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid amount"); return }
    setSaving(true); setError("")
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount,
        category: form.category || "other",
        expense_date: form.expense_date,
        vendor: form.vendor || null,
        notes: form.notes || null,
        status: "approved",
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to save expense"); setSaving(false); return }
    router.push("/portal/accounts/expenses")
  }

  return (
    <div className="pb-6">
      <PortalPageHeader title="Add Expense" subtitle="Log a business expense" color={COLOR} backHref="/portal/accounts/expenses" />

      <PortalSectionLabel label="Expense Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <Field label="Description" value={form.description} onChange={set("description")} placeholder="e.g. Office supplies" required />
        <Field label="Amount (₹)" value={form.amount} onChange={set("amount")} type="number" placeholder="e.g. 1500" required />
        <SelectField label="Category" value={form.category} onChange={set("category")} options={[
          { value: "salaries", label: "Salaries" },
          { value: "rent", label: "Rent" },
          { value: "supplies", label: "Supplies" },
          { value: "logistics", label: "Logistics" },
          { value: "marketing", label: "Marketing" },
          { value: "utilities", label: "Utilities" },
          { value: "maintenance", label: "Maintenance" },
          { value: "other", label: "Other" },
        ]} />
        <Field label="Expense Date" value={form.expense_date} onChange={set("expense_date")} type="date" />
        <Field label="Vendor / Paid To" value={form.vendor} onChange={set("vendor")} placeholder="Optional" />
        <Field label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional" />
      </div>

      {error && <p className="mx-4 mt-3 text-[12px] font-semibold text-center" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="mx-4 mt-4">
        <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl text-[14px] font-black text-white" style={{ background: COLOR, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Save Expense"}
        </button>
      </div>
    </div>
  )
}
