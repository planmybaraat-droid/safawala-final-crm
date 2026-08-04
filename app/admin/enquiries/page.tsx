"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  new:       { label: "New",       bg: "#fef9ec", color: "#b08030" },
  called:    { label: "Called",    bg: "#eff6ff", color: "#1d4ed8" },
  meeting:   { label: "Meeting",   bg: "#f5f3ff", color: "#7c3aed" },
  converted: { label: "Converted", bg: "#f0fdf4", color: "#16a34a" },
  rejected:  { label: "Rejected",  bg: "#fef2f2", color: "#dc2626" },
}

const BUDGET_OPTIONS = ["5 to 15", "15 to 25", "25 to 50", "50+"]

const SOURCES = [
  { label: "Website", value: "website" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "Google", value: "google" },
  { label: "Referral", value: "referral" },
  { label: "Other", value: "other" }
]

const SVGS = {
  whatsapp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#16a34a" }}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.117-2.877-6.979C16.602 1.9 14.124.879 11.487.879 6.052.879 1.631 5.3 1.627 10.734c-.001 1.693.454 3.342 1.32 4.768l-.865 3.16 3.25-.853-.021.011zm11.367-7.4c-.273-.136-1.617-.798-1.87-.89-.252-.093-.437-.136-.62.136-.182.273-.706.89-.865 1.072-.16.182-.32.205-.593.069-.273-.136-1.152-.424-2.196-1.356-.812-.724-1.36-1.619-1.52-1.892-.16-.273-.018-.42.12-.557.123-.122.272-.32.409-.477.137-.16.182-.273.273-.455.09-.182.046-.341-.023-.477-.069-.136-.62-1.493-.85-2.04-.223-.538-.45-.465-.62-.473-.16-.008-.344-.01-.527-.01-.182 0-.477.068-.73.341-.251.273-.956.934-.956 2.278 0 1.343.979 2.64 1.115 2.822.137.182 1.927 2.942 4.67 4.128.653.282 1.162.451 1.56.577.656.208 1.253.179 1.727.108.527-.078 1.617-.66 1.846-1.3.228-.638.228-1.185.16-1.3-.069-.113-.252-.205-.526-.341z" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function FranchiseEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
  // Modals
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add Form State
  const [form, setForm] = useState({
    full_name: "", whatsapp: "", email: "", city: "", state: "", pincode: "",
    investment_budget: "5 to 15", current_profession: "", years_in_business: "",
    has_space: "no", space_size: "", lead_source: "website", callback_time: "",
    annual_turnover: "", territory_interest: "", message: "", notes: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/franchise-enquiries?limit=500")
      const d = await res.json()
      setEnquiries(d.data ?? [])
    } catch (e) {
      toast.error("Failed to load franchise enquiries")
    } finally {
      setLoading(false)
    }
  }

  // Filtered list
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      const q = search.toLowerCase()
      const matchSearch = !q || 
        e.full_name?.toLowerCase().includes(q) || 
        e.city?.toLowerCase().includes(q) || 
        e.whatsapp?.includes(q) ||
        e.email?.toLowerCase().includes(q)
      
      const matchStatus = !statusFilter || e.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [enquiries, search, statusFilter])

  // Counters
  const counters = useMemo(() => {
    const counts: Record<string, number> = { total: enquiries.length }
    Object.keys(STATUS_META).forEach(s => {
      counts[s] = enquiries.filter(e => e.status === s).length
    })
    return counts
  }, [enquiries])

  // Handle Updates
  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/franchise-enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      })
      if (res.ok) {
        toast.success("Enquiry updated")
        loadData()
        setSelectedLead(null)
      } else {
        toast.error("Failed to update status")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  // Handle Manual Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.whatsapp || !form.city) {
      toast.error("Name, WhatsApp, and City are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/franchise-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        toast.success("Franchise enquiry added successfully")
        setShowAdd(false)
        setForm({
          full_name: "", whatsapp: "", email: "", city: "", state: "", pincode: "",
          investment_budget: "5 to 15", current_profession: "", years_in_business: "",
          has_space: "no", space_size: "", lead_source: "website", callback_time: "",
          annual_turnover: "", territory_interest: "", message: "", notes: ""
        })
        loadData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create enquiry")
      }
    } catch {
      toast.error("Failed to submit enquiry")
    } finally {
      setSaving(false)
    }
  }

  const formatWhatsApp = (phone: string) => {
    let clean = phone.replace(/\D/g, "")
    if (clean.length === 10) clean = "91" + clean
    return `https://wa.me/${clean}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    })
  }

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      
      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>Franchise Enquiries</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
            Manage franchise application requests and callback requests.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background: BROWN, color: GOLD, border: "none", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.2s"
        }}>
          {SVGS.plus} Add Enquiry
        </button>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Status Counters widgets */}
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
          <div onClick={() => setStatusFilter("")} style={{
            background: statusFilter === "" ? "#e2d2b5" : CREAM,
            border: `1.5px solid ${statusFilter === "" ? GOLD : BORDER}`,
            borderRadius: 12, padding: "12px 18px", cursor: "pointer", minWidth: 100, flexShrink: 0
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: BROWN }}>
              {counters.total}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>ALL ENQUIRIES</div>
          </div>
          {Object.entries(STATUS_META).map(([k, v]) => {
            const count = counters[k]
            const active = statusFilter === k
            return (
              <div key={k} onClick={() => setStatusFilter(active ? "" : k)} style={{
                background: active ? v.bg : CREAM,
                border: `1.5px solid ${active ? v.color : BORDER}`,
                borderRadius: 12, padding: "12px 18px", cursor: "pointer", minWidth: 100, flexShrink: 0
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: v.color }}>{count}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>{v.label}</div>
              </div>
            )
          })}
        </div>

        {/* Filters and search row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 260, maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a07040" }}>{SVGS.search}</span>
            <input
              placeholder="Search by name, whatsapp, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
                padding: "0 14px 0 34px", fontSize: 13, background: CREAM, color: BROWN, outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
              padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none", cursor: "pointer"
            }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {statusFilter && (
            <button onClick={() => setStatusFilter("")} style={{
              fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10,
              background: "transparent", border: `1px solid ${GOLD}`, color: BROWN, cursor: "pointer"
            }}>
              Clear Status Filter
            </button>
          )}
        </div>

        {/* List Grid / Table */}
        <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#a07040" }}>Loading enquiries...</div>
          ) : filteredEnquiries.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#a07040" }}>
              No matching records found.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div style={{ display: "none", overflowX: "auto" }} className="desktop-view-block">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: `1px solid ${BORDER}` }}>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>Name</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>WhatsApp</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>City / State</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>Budget</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>Source</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#805020", textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnquiries.map((e, idx, arr) => {
                      const isLast = idx === arr.length - 1
                      const st = STATUS_META[e.status] ?? { label: e.status, bg: "#fff", color: BROWN }
                      return (
                        <tr key={e.id} style={{ borderBottom: isLast ? "none" : "1px solid rgba(201,168,76,0.1)" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>{e.full_name}</div>
                            {e.email && <div style={{ fontSize: 11, color: "#a07040" }}>{e.email}</div>}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <a href={formatWhatsApp(e.whatsapp)} target="_blank" style={{ textDecoration: "none", color: BROWN, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                {SVGS.whatsapp} {e.whatsapp}
                              </a>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: BROWN }}>
                            {e.city}{e.state ? `, ${e.state}` : ""}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: BROWN, fontWeight: 600 }}>
                            ₹{e.investment_budget}L
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 12, color: BROWN, textTransform: "capitalize" }}>
                            {e.lead_source || "website"}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 12, color: "#a07040" }}>
                            {formatDate(e.created_at)}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20, background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <button onClick={() => setSelectedLead(e)} style={{
                              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
                              background: "transparent", border: `1px solid ${BORDER}`, color: BROWN, cursor: "pointer"
                            }}>
                              View / Update
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="mobile-view-block" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
                {filteredEnquiries.map(e => {
                  const st = STATUS_META[e.status] ?? { label: e.status, bg: "#fff", color: BROWN }
                  return (
                    <div key={e.id} style={{
                      background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 14,
                      display: "flex", flexDirection: "column", gap: 8
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: BROWN }}>
                            {e.full_name}
                          </div>
                          <span style={{ fontSize: 10, color: "#a07040", marginTop: 2, display: "block" }}>
                            {e.city}{e.state ? `, ${e.state}` : ""}
                          </span>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: BROWN, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "4px 0" }}>
                        <div><strong>Budget:</strong> ₹{e.investment_budget}L</div>
                        <div><strong>Source:</strong> {e.lead_source}</div>
                        <div><strong>Date:</strong> {formatDate(e.created_at)}</div>
                      </div>

                      <div style={{ display: "flex", gap: 6, borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: 10, marginTop: 4 }}>
                        <a href={formatWhatsApp(e.whatsapp)} target="_blank" style={{
                          flex: 1, textDecoration: "none", background: "#f0fdf4", color: "#16a34a",
                          borderRadius: 8, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, gap: 4, border: "1px solid rgba(22,163,74,0.1)"
                        }}>
                          {SVGS.whatsapp} WhatsApp
                        </a>
                        <button onClick={() => setSelectedLead(e)} style={{
                          flex: 1, background: "transparent", border: `1px solid ${BORDER}`,
                          borderRadius: 8, height: 32, fontSize: 11, fontWeight: 700, color: BROWN, cursor: "pointer"
                        }}>
                          Details / Edit
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details/Update Dialog */}
      {selectedLead && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }} onClick={() => setSelectedLead(null)}>
          <div style={{
            background: CREAM, borderRadius: 20, width: "100%", maxWidth: 600,
            border: `1px solid ${BORDER}`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column"
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BROWN }}>
                  Franchise Enquiry Details
                </h3>
                <span style={{ fontSize: 11, color: "#a07040", marginTop: 2, display: "block" }}>
                  Submitted on {formatDate(selectedLead.created_at)}
                </span>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN }}>
                {SVGS.close}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              
              {/* Profile Card */}
              <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>Contact Name</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BROWN, marginTop: 2 }}>{selectedLead.full_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>WhatsApp Number</div>
                  <a href={formatWhatsApp(selectedLead.whatsapp)} target="_blank" style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    {SVGS.whatsapp} {selectedLead.whatsapp} ↗
                  </a>
                </div>
                {selectedLead.email && (
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>Email Address</div>
                    <div style={{ fontSize: 13, color: BROWN, marginTop: 2 }}>{selectedLead.email}</div>
                  </div>
                )}
              </div>

              {/* Specific info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div><strong>City/State:</strong> {selectedLead.city}, {selectedLead.state || "—"}</div>
                <div><strong>Pincode:</strong> {selectedLead.pincode || "—"}</div>
                <div><strong>Investment Budget:</strong> ₹{selectedLead.investment_budget} Lakhs</div>
                <div><strong>Profession:</strong> {selectedLead.current_profession || "—"}</div>
                <div><strong>Years in Business:</strong> {selectedLead.years_in_business || "—"}</div>
                <div><strong>Space Size (Sq Ft):</strong> {selectedLead.space_size || "—"} (Has Space: {selectedLead.has_space})</div>
                <div><strong>Annual Turnover:</strong> {selectedLead.annual_turnover || "—"}</div>
                <div><strong>Territory Interest:</strong> {selectedLead.territory_interest || "—"}</div>
                <div style={{ gridColumn: "span 2" }}><strong>Message from Applicant:</strong><br />
                  <p style={{ margin: "4px 0 0", padding: 10, background: "#fcf8f2", borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)", fontSize: 12, whiteSpace: "pre-wrap" }}>
                    {selectedLead.message || "No custom message provided."}
                  </p>
                </div>
              </div>

              {/* Status Update Actions */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Update Stage Status</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_META).map(([k, v]) => {
                    const isActive = selectedLead.status === k
                    return (
                      <button
                        key={k}
                        disabled={saving}
                        onClick={() => handleUpdateStatus(selectedLead.id, k, selectedLead.notes || "")}
                        style={{
                          padding: "6px 12px", fontSize: 12, fontWeight: 700, borderRadius: 20,
                          cursor: "pointer", border: `1.5px solid ${isActive ? v.color : BORDER}`,
                          background: isActive ? v.bg : "transparent",
                          color: isActive ? v.color : BROWN,
                          display: "flex", alignItems: "center", gap: 4
                        }}
                      >
                        {v.label} {isActive && "✓"}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Lead Notes */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 6 }}>Follow-up Comments & Progress Notes</label>
                <textarea
                  defaultValue={selectedLead.notes || ""}
                  onBlur={e => handleUpdateStatus(selectedLead.id, selectedLead.status, e.target.value)}
                  placeholder="Enter logs or notes here... Click outside to auto-save"
                  style={{
                    width: "100%", minHeight: 60, borderRadius: 8, border: `1.5px solid ${BORDER}`,
                    background: CREAM, color: BROWN, fontSize: 12, padding: 8, outline: "none", resize: "vertical", boxSizing: "border-box"
                  }}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 20px", display: "flex", justifyContent: "flex-end", background: "rgba(201,168,76,0.03)" }}>
              <button onClick={() => setSelectedLead(null)} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`,
                background: "transparent", color: BROWN, fontSize: 12, fontWeight: 700, cursor: "pointer"
              }}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Lead Dialog */}
      {showAdd && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }} onClick={() => setShowAdd(false)}>
          <div style={{
            background: CREAM, borderRadius: 20, width: "100%", maxWidth: 600,
            border: `1px solid ${BORDER}`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column"
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: BROWN }}>
                Create Franchise Enquiry Manually
              </h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN }}>
                {SVGS.close}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Full Name *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>WhatsApp Number *</label>
                  <input
                    required
                    placeholder="e.g. 9876543210"
                    value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Investment Budget *</label>
                  <select
                    value={form.investment_budget}
                    onChange={e => setForm(f => ({ ...f, investment_budget: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  >
                    {BUDGET_OPTIONS.map(opt => <option key={opt} value={opt}>₹{opt} Lakhs</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>City *</label>
                  <input
                    required
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>State</label>
                  <input
                    value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Pincode</label>
                  <input
                    value={form.pincode}
                    onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Current Profession</label>
                  <input
                    value={form.current_profession}
                    onChange={e => setForm(f => ({ ...f, current_profession: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Years in Business</label>
                  <input
                    value={form.years_in_business}
                    onChange={e => setForm(f => ({ ...f, years_in_business: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Space size (SqFt)</label>
                  <input
                    value={form.space_size}
                    onChange={e => setForm(f => ({ ...f, space_size: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Has Space?</label>
                  <select
                    value={form.has_space}
                    onChange={e => setForm(f => ({ ...f, has_space: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Lead Source</label>
                  <select
                    value={form.lead_source}
                    onChange={e => setForm(f => ({ ...f, lead_source: e.target.value }))}
                    style={{ width: "100%", height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: "0 10px", fontSize: 13, color: BROWN, outline: "none", boxSizing: "border-box" }}
                  >
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#a07040", display: "block", marginBottom: 3 }}>Message / Additional details</label>
                <textarea
                  rows={2}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  style={{ width: "100%", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "#fff", padding: 8, fontSize: 13, color: BROWN, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, background: BROWN, color: GOLD, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Submitting..." : "Save Enquiry"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Inject CSS styling for responsiveness */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-view-block {
            display: block !important;
          }
          .mobile-view-block {
            display: none !important;
          }
        }
      `}</style>

    </div>
  )
}
