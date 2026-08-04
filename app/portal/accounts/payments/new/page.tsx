"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

export default function RecordPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("bookingId") ?? ""
  const [bookings, setBookings] = useState<any[]>([])
  const [form, setForm] = useState({ booking_id: bookingId, amount: "", payment_method: "cash", payment_date: new Date().toISOString().split("T")[0], reference: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<any>(null)

  useEffect(() => {
    fetch("/api/bookings?limit=50&status=confirmed")
      .then(r => r.json())
      .then(d => setBookings(d.data ?? d ?? []))
      .catch(() => setBookings([]))
  }, [])

  useEffect(() => {
    if (form.booking_id) {
      const b = bookings.find(b => b.id === form.booking_id)
      setSelectedBooking(b ?? null)
    }
  }, [form.booking_id, bookings])

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }))

  const balance = selectedBooking ? (selectedBooking.total_amount ?? 0) - (selectedBooking.paid_amount ?? 0) : 0

  async function save() {
    if (!form.booking_id || !form.amount) { setError("Booking and amount are required"); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid amount"); return }
    setSaving(true); setError("")
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: form.booking_id,
        amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference_number: form.reference || null,
        notes: form.notes || null,
        status: "paid",
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to record payment"); setSaving(false); return }
    router.push("/portal/accounts/payments")
  }

  const bookingOptions = bookings.map(b => ({ value: b.id, label: `#${b.booking_number} — ${b.customer?.name ?? "Customer"} (₹${((b.total_amount ?? 0) - (b.paid_amount ?? 0)).toLocaleString("en-IN")} due)` }))

  return (
    <div className="pb-6">
      <PortalPageHeader title="Record Payment" subtitle="Log a payment received" color={COLOR} backHref="/portal/accounts/payments" />

      {selectedBooking && (
        <div className="mx-4 mt-4 p-3 rounded-2xl" style={{ background: `${COLOR}10`, border: `1px solid ${COLOR}20` }}>
          <p className="text-[11px] font-bold" style={{ color: "#1e1208" }}>#{selectedBooking.booking_number} · {selectedBooking.customer?.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(80,55,30,0.5)" }}>
            Total: ₹{(selectedBooking.total_amount ?? 0).toLocaleString("en-IN")} · Paid: ₹{(selectedBooking.paid_amount ?? 0).toLocaleString("en-IN")} ·
            <span style={{ color: balance > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}> Balance: ₹{balance.toLocaleString("en-IN")}</span>
          </p>
          {balance > 0 && (
            <button onClick={() => set("amount")(String(balance))} className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${COLOR}20`, color: COLOR }}>
              Fill full balance ₹{balance.toLocaleString("en-IN")}
            </button>
          )}
        </div>
      )}

      <PortalSectionLabel label="Payment Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <SelectField label="Booking" value={form.booking_id} onChange={set("booking_id")} options={bookingOptions} required />
        <Field label="Amount (₹)" value={form.amount} onChange={set("amount")} type="number" placeholder="e.g. 5000" required />
        <SelectField label="Payment Method" value={form.payment_method} onChange={set("payment_method")} options={[
          { value: "cash", label: "Cash" },
          { value: "upi", label: "UPI" },
          { value: "card", label: "Card" },
          { value: "bank_transfer", label: "Bank Transfer" },
          { value: "cheque", label: "Cheque" },
        ]} />
        <Field label="Payment Date" value={form.payment_date} onChange={set("payment_date")} type="date" />
        <Field label="Reference / UTR" value={form.reference} onChange={set("reference")} placeholder="Optional" />
        <Field label="Notes" value={form.notes} onChange={set("notes")} placeholder="Optional" />
      </div>

      {error && <p className="mx-4 mt-3 text-[12px] font-semibold text-center" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="mx-4 mt-4">
        <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl text-[14px] font-black text-white" style={{ background: COLOR, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Record Payment"}
        </button>
      </div>
    </div>
  )
}
