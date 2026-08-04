"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const COLOR = "#22c55e"
const COLOR_DARK = "#15803d"

export default function NewCustomerPortalPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "", phone: "", whatsapp: "", email: "", city: "", area: "", address: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }))

  async function save() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim() || form.phone.trim(),
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          area: form.area.trim() || null,
          address: form.address.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create customer")
      const customer = data.data || data.customer || data
      router.push(`/portal/booking/customers/${customer.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f0fdf4 0%,#dcfce7 100%)", fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${COLOR_DARK},${COLOR})`, padding: "20px 16px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/portal/booking/customers")}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div>
            <h1 style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>Add Customer</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>New customer profile</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Basic Info */}
        <div style={{ background: "white", borderRadius: 18, overflow: "hidden" }}>
          <p style={{ margin: 0, padding: "12px 16px 8px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1.2, textTransform: "uppercase", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>Basic Info</p>
          {[
            { label: "Full Name *",  key: "name",     type: "text",  placeholder: "e.g. Rahul Sharma" },
            { label: "Phone *",      key: "phone",    type: "tel",   placeholder: "+91 98765 43210" },
            { label: "WhatsApp",     key: "whatsapp", type: "tel",   placeholder: "Same as phone if blank" },
            { label: "Email",        key: "email",    type: "email", placeholder: "Optional" },
          ].map(f => (
            <div key={f.key} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(245,235,224,0.8)" }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: "rgba(80,55,30,0.4)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                {f.label}
              </label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => set(f.key)(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#1e1208", background: "transparent", fontFamily: "inherit" }}
              />
            </div>
          ))}
        </div>

        {/* Address */}
        <div style={{ background: "white", borderRadius: 18, overflow: "hidden" }}>
          <p style={{ margin: 0, padding: "12px 16px 8px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1.2, textTransform: "uppercase", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>Address</p>
          {[
            { label: "City",           key: "city",    placeholder: "e.g. Surat" },
            { label: "Area / Locality", key: "area",    placeholder: "e.g. Adajan" },
            { label: "Full Address",    key: "address", placeholder: "Optional" },
          ].map(f => (
            <div key={f.key} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(245,235,224,0.8)" }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: "rgba(80,55,30,0.4)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                {f.label}
              </label>
              <input
                type="text"
                value={(form as any)[f.key]}
                onChange={e => set(f.key)(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#1e1208", background: "transparent", fontFamily: "inherit" }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fee2e2", borderRadius: 14, padding: "12px 16px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        <button onClick={save} disabled={saving || !form.name || !form.phone}
          style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: saving || !form.name || !form.phone ? "#e5e7eb" : `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, color: saving || !form.name || !form.phone ? "#9ca3af" : "white", fontSize: 15, fontWeight: 800, cursor: saving || !form.name || !form.phone ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: saving || !form.name || !form.phone ? "none" : `0 4px 16px ${COLOR}55` }}>
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>
    </div>
  )
}
