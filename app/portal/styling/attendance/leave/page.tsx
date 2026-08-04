"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#ec4899"

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

export default function ApplyLeavePage() {
  const router = useRouter()
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({ leave_type: "", start_date: today, end_date: today, reason: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }))

  async function save() {
    if (!form.leave_type || !form.start_date) { setError("Leave type and start date are required"); return }
    if (form.end_date < form.start_date) { setError("End date must be after start date"); return }
    setSaving(true); setError("")

    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to submit leave request"); setSaving(false); return }
    router.push("/portal/styling/attendance")
  }

  const days = form.start_date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1)
    : 0

  return (
    <div className="pb-6">
      <PortalPageHeader title="Apply for Leave" subtitle="Submit leave request" color={COLOR} backHref="/portal/styling/attendance" />

      {days > 0 && (
        <div className="mx-4 mt-4 p-3 rounded-2xl text-center" style={{ background: `${COLOR}10`, border: `1px solid ${COLOR}22` }}>
          <p className="text-[24px] font-black" style={{ color: COLOR }}>{days}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(80,55,30,0.4)" }}>{days === 1 ? "Day" : "Days"} Requested</p>
        </div>
      )}

      <PortalSectionLabel label="Leave Details" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        <SelectField label="Leave Type" value={form.leave_type} onChange={set("leave_type")} required options={[
          { value: "sick", label: "Sick Leave" },
          { value: "casual", label: "Casual Leave" },
          { value: "personal", label: "Personal Leave" },
          { value: "emergency", label: "Emergency Leave" },
          { value: "unpaid", label: "Unpaid Leave" },
        ]} />
        <Field label="Start Date" value={form.start_date} onChange={set("start_date")} type="date" required />
        <Field label="End Date" value={form.end_date} onChange={set("end_date")} type="date" required />
        <div className="px-4 py-3">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(80,55,30,0.4)" }}>Reason</label>
          <textarea value={form.reason} onChange={e => set("reason")(e.target.value)} placeholder="Briefly explain the reason..." rows={3}
            className="w-full bg-transparent outline-none text-[13px] resize-none" style={{ color: "#1e1208" }} />
        </div>
      </div>

      {error && <p className="mx-4 mt-3 text-[12px] font-semibold text-center" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="mx-4 mt-4">
        <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl text-[14px] font-black text-white" style={{ background: COLOR, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Submitting..." : "Submit Leave Request"}
        </button>
      </div>
    </div>
  )
}
