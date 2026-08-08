"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#22c55e"
const COLOR_DARK = "#16803c"

/* ── Types ── */
interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  event_date: string | null
  location: string | null
  message: string | null
  package_interest: string | null
  status: "new" | "contacted" | "interested" | "converted" | "lost"
  source: string
  notes: string | null
  assigned_to: string | null
  franchise_id: string | null
  created_at: string
}

/* ── Constants ── */
const STATUS_CONFIG = {
  new:        { label: "New",         bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  contacted:  { label: "Contacted",   bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  interested: { label: "Interested",  bg: "#f3e8ff", text: "#6d28d9", dot: "#8b5cf6" },
  converted:  { label: "Converted ✓", bg: "#F1EAF5", text: "#15803d", dot: "#22c55e" },
  lost:       { label: "Lost",        bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
}

const ICON_PROPS = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

const SOURCE_OPTIONS = [
  { label: "Website", value: "website", icon: <svg {...ICON_PROPS}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { label: "Instagram", value: "instagram", icon: <svg {...ICON_PROPS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
  { label: "Facebook", value: "facebook", icon: <svg {...ICON_PROPS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { label: "Google", value: "google", icon: <svg {...ICON_PROPS}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { label: "Walk-in", value: "walk_in", icon: <svg {...ICON_PROPS}><ellipse cx="8" cy="8" rx="3" ry="4"/><ellipse cx="16" cy="16" rx="3" ry="4"/></svg> },
  { label: "Referral", value: "referral", icon: <svg {...ICON_PROPS}><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg> },
  { label: "Manual", value: "manual", icon: <svg {...ICON_PROPS}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> },
  { label: "Other", value: "other", icon: <svg {...ICON_PROPS}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
]

const STATUSES = ["new", "contacted", "interested", "converted", "lost"] as const

function waLink(phone: string) {
  let clean = phone.trim().replace(/\D/g, "")
  if (phone.trim().startsWith("+")) return `https://wa.me/${clean}`
  if (clean.startsWith("00")) clean = clean.slice(2)
  if (clean.length === 11 && clean.startsWith("0")) clean = clean.slice(1)
  if (clean.length === 10) return `https://wa.me/91${clean}`
  return `https://wa.me/${clean}`
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: status }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  )
}

function SourceLabel({ src }: { src: string }) {
  const opt = SOURCE_OPTIONS.find(o => o.value === src)
  return <span style={{ fontSize: 10, color: "rgba(80,55,30,0.5)", fontWeight: 600 }}>{opt?.icon} {opt?.label ?? src}</span>
}

/* ── Add Lead Form ── */
function AddLeadSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [location, setLocation] = useState("")
  const [packageInterest, setPackageInterest] = useState("")
  const [source, setSource] = useState("manual")
  const [status, setStatus] = useState("new")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !eventDate) { setError("Name, phone & event date are required"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || null, event_date: eventDate, location: location || null, package_interest: packageInterest || null, source, status, notes: notes || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", padding: "0 0 env(safe-area-inset-bottom, 16px)", maxHeight: "92vh", overflowY: "auto", zIndex: 1 }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 900, color: "#1e1208", margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            New Lead
          </h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <form onSubmit={submit} style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fee2e2", color: "#dc2626", borderRadius: 12, padding: "10px 14px", fontSize: 12, fontWeight: 600 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {error}</div>}

          {[
            { label: "Full Name *", value: name, setter: setName, placeholder: "Customer full name", type: "text" },
            { label: "WhatsApp / Phone *", value: phone, setter: setPhone, placeholder: "+91 98765 43210", type: "tel" },
            { label: "Email Address", value: email, setter: setEmail, placeholder: "email@example.com", type: "email" },
            { label: "Event Date *", value: eventDate, setter: setEventDate, placeholder: "", type: "date" },
            { label: "Location / Venue", value: location, setter: setLocation, placeholder: "City or venue name", type: "text" },
            { label: "Package Interest", value: packageInterest, setter: setPackageInterest, placeholder: "e.g. Bridal Package", type: "text" },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.5)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.1)", padding: "0 14px", fontSize: 14, fontFamily: "inherit", color: "#1e1208", outline: "none", background: "white" }} />
            </div>
          ))}

          {/* Source */}
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.5)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Lead Source</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SOURCE_OPTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setSource(s.value)}
                  style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: source === s.value ? COLOR : "rgba(0,0,0,0.06)", color: source === s.value ? "white" : "rgba(80,55,30,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.5)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Initial Status</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: status === s ? cfg.dot : "rgba(0,0,0,0.06)", color: status === s ? "white" : "rgba(80,55,30,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.5)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Notes / Requirements</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any special requirements or notes..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.1)", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", color: "#1e1208", outline: "none", resize: "none", background: "white" }} />
          </div>

          <button type="submit" disabled={saving}
            style={{ width: "100%", height: 52, borderRadius: 16, border: "none", background: saving ? "rgba(0,0,0,0.1)" : `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, color: saving ? "rgba(0,0,0,0.3)" : "white", fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: saving ? "none" : `0 6px 20px ${COLOR}50` }}>
            {saving ? "Saving..." : "Add Lead"}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Lead Detail Sheet ── */
function LeadDetailSheet({ lead, onClose, onUpdated }: { lead: Lead; onClose: () => void; onUpdated: () => void }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [note, setNote] = useState(lead.notes || "")
  const [savingNote, setSavingNote] = useState(false)

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    try {
      const res = await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, status: newStatus }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to update status")
      toast.success(`Status → ${newStatus}`); onUpdated()
    } catch (e: any) {
      toast.error(e.message || "Failed to update status")
    } finally { setUpdating(false) }
  }

  async function saveNote() {
    setSavingNote(true)
    try {
      const res = await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, notes: note }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to save note")
      toast.success("Note saved"); onUpdated()
    } catch (e: any) {
      toast.error(e.message || "Failed to save note")
    } finally { setSavingNote(false) }
  }

  async function createBooking() {
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(lead.phone)}`)
      const data = await res.json()
      const customer = data.data?.find((item: any) => item.lead_id === lead.id) || data.data?.[0]
      if (!res.ok || !customer?.id) throw new Error("Converted customer record was not found")
      router.push(`/portal/booking/bookings/new?customer_id=${customer.id}`)
    } catch (e: any) {
      toast.error(e.message || "Unable to create booking")
    }
  }

  const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", zIndex: 1, paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} /></div>

        {/* Hero */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 800 }}>
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#1e1208" }}>{lead.name}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(80,55,30,0.5)", fontFamily: "monospace" }}>{lead.phone}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusBadge status={lead.status} />
            {lead.source && <SourceLabel src={lead.source} />}
            {lead.event_date && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {fmtDate(lead.event_date)}</span>}
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <a href={`tel:${lead.phone}`} style={{ flex: 1, height: 44, borderRadius: 12, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Call
            </a>
            <a href={waLink(lead.phone)} target="_blank" rel="noreferrer"
              style={{ flex: 1, height: 44, borderRadius: 12, background: "#25d366", border: "none", color: "white", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
              <PortalIcon name="whatsapp" size={14} /> WhatsApp
            </a>
            {lead.email && (
              <a href={`mailto:${lead.email}`}
                style={{ flex: 1, height: 44, borderRadius: 12, background: "#F1EAF5", border: "none", color: "#15803d", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email
              </a>
            )}
          </div>

          {/* Lead Details */}
          <div style={{ background: "#f9fafb", borderRadius: 14, padding: "14px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Lead Details</p>
            {[
              { label: "Event Date", value: fmtDate(lead.event_date) },
              { label: "Location", value: lead.location },
              { label: "Package Interest", value: lead.package_interest },
              { label: "Email", value: lead.email },
              { label: "Requirements", value: lead.message },
              { label: "Added", value: fmtDate(lead.created_at) },
            ].map(({ label, value }) => value && (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 11, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: "#1e1208", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Update Status */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Update Status</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUSES.map(s => {
                const c = STATUS_CONFIG[s]
                return (
                  <button key={s} onClick={() => updateStatus(s)} disabled={updating || lead.status === s}
                    style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: lead.status === s ? c.dot : c.bg, color: lead.status === s ? "white" : c.text, fontSize: 11, fontWeight: 700, cursor: lead.status === s ? "default" : "pointer", fontFamily: "inherit", opacity: updating ? 0.7 : 1, transition: "all 0.2s" }}>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "rgba(80,55,30,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Follow-up Notes</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add a note about this lead..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.1)", padding: "12px 14px", fontSize: 13, fontFamily: "inherit", color: "#1e1208", outline: "none", resize: "none" }} />
            <button onClick={saveNote} disabled={savingNote}
              style={{ marginTop: 8, width: "100%", height: 44, borderRadius: 12, border: "none", background: savingNote ? "rgba(0,0,0,0.1)" : COLOR, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {savingNote ? "Saving..." : "Save Note"}
            </button>
          </div>

          {/* Convert to Booking */}
          {lead.status === "converted" && (
            <button onClick={createBooking} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 50, borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 20px ${COLOR}50` }}>
              <PortalIcon name="clipboard" size={16} /> Create Booking from this Lead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "200" })
      if (search) params.set("search", search)
      if (sourceFilter !== "all") params.set("source", sourceFilter)
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load leads")
      setLeads(data.data ?? data ?? [])
    } catch { setLeads([]) }
    finally { setLoading(false) }
  }, [search, sourceFilter])

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300)
    return () => clearTimeout(t)
  }, [fetchLeads])

  const filtered = useMemo(() =>
    leads.filter(l => statusFilter === "all" || l.status === statusFilter),
    [leads, statusFilter]
  )

  const counts = useMemo(() => ({
    all: leads.length,
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    interested: leads.filter(l => l.status === "interested").length,
    converted: leads.filter(l => l.status === "converted").length,
    lost: leads.filter(l => l.status === "lost").length,
  }), [leads])

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F1EAF5 0%, #F1EAF5 100%)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})`, padding: "20px 16px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <button onClick={() => router.push("/portal/booking")}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "white", fontSize: 19, fontWeight: 900, margin: 0 }}>Leads Center</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 }}>{counts.all} total · {counts.new} new</p>
          </div>
          <button onClick={() => { setShowAdd(true) }}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", color: "white", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 300 }}>
            +
          </button>
        </div>

        {/* Status Stats Strip */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", position: "relative", zIndex: 1 }}>
          {(["all", ...STATUSES] as const).map(s => {
            const count = counts[s as keyof typeof counts]
            const cfg = s !== "all" ? STATUS_CONFIG[s] : null
            const isActive = statusFilter === s
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 12px", borderRadius: 12, border: "none", background: isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0, transition: "all 0.2s", backdropFilter: "blur(10px)" }}>
                <span style={{ color: "white", fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{count}</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {s === "all" ? "All" : cfg!.label.replace(" ✓", "")}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Search + Source Filter ── */}
      <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(74,31,94,0.18)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.35)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1e1208", fontFamily: "inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>

        {/* Source chips */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          <button onClick={() => setSourceFilter("all")}
            style={{ padding: "5px 12px", borderRadius: 20, border: "none", background: sourceFilter === "all" ? COLOR : "rgba(255,255,255,0.8)", color: sourceFilter === "all" ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
            All Sources
          </button>
          {SOURCE_OPTIONS.map(s => (
            <button key={s.value} onClick={() => setSourceFilter(s.value)}
              style={{ padding: "5px 12px", borderRadius: 20, border: "none", background: sourceFilter === s.value ? COLOR : "rgba(255,255,255,0.8)", color: sourceFilter === s.value ? "white" : "rgba(80,55,30,0.55)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lead Cards ── */}
      <div style={{ padding: "12px 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [...Array(7)].map((_, i) => (
            <div key={i} style={{ background: "white", borderRadius: 18, padding: "14px 16px", display: "flex", gap: 12, opacity: 1 - i * 0.1 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F1EAF5", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: "#F1EAF5", borderRadius: 6, width: "60%", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 10, background: "#F1EAF5", borderRadius: 6, width: "40%", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ display: "flex", justifyContent: "center", color: "rgba(80,55,30,0.25)", marginBottom: 12 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1e1208", margin: "0 0 6px" }}>No leads found</p>
            <p style={{ fontSize: 12, color: "rgba(80,55,30,0.5)", margin: 0 }}>Try adjusting filters or add a new lead</p>
          </div>
        ) : filtered.map(lead => {
          const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new
          return (
            <div key={lead.id} onClick={() => setSelectedLead(lead)}
              style={{ background: "white", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid rgba(34,197,94,0.08)", display: "flex", gap: 12, alignItems: "flex-start" }}
              onTouchStart={e => (e.currentTarget.style.transform = "scale(0.98)")}
              onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}>
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${cfg.dot}30, ${cfg.dot}15)`, border: `2px solid ${cfg.dot}40`, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.dot, fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                {lead.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1e1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</p>
                  <StatusBadge status={lead.status} />
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(80,55,30,0.5)", fontFamily: "monospace", fontWeight: 500 }}>{lead.phone}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {lead.event_date && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {fmtDate(lead.event_date)}</span>}
                  {lead.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {lead.location}</span>}
                  <SourceLabel src={lead.source} />
                </div>
              </div>

              {/* Quick call/WA */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <a href={`tel:${lead.phone}`} style={{ width: 34, height: 34, borderRadius: 10, background: "#eff6ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>
                <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 10, background: "#F1EAF5", color: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}><PortalIcon name="whatsapp" size={16} /></a>
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        style={{ position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right: 16, zIndex: 40, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, border: "none", borderRadius: 18, padding: "14px 20px", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${COLOR}55`, fontFamily: "inherit" }}>
        <span style={{ fontSize: 18 }}>+</span> New Lead
      </button>

      {/* Sheets */}
      {showAdd && <AddLeadSheet onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchLeads() }} />}
      {selectedLead && <LeadDetailSheet lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdated={() => { setSelectedLead(null); fetchLeads() }} />}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
