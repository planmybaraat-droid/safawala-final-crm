"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

interface Franchise {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  owner_name: string
  manager_name: string
  gst_number: string
  pan_number: string
  license_number: string
  bank_account_number: string
  bank_name: string
  bank_ifsc: string
  opening_date: string
  monthly_target: number
  security_deposit: number
  agreement_start_date: string
  agreement_end_date: string
  notes: string
  commission_rate: number
  is_active: boolean
  created_at: string
}

export default function AdminFranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modals state
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selected, setSelected] = useState<Franchise | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [form, setForm] = useState({
    name: "", code: "", owner_name: "", manager_name: "",
    phone: "", email: "", address: "", city: "", state: "",
    pincode: "", gst_number: "", pan_number: "", license_number: "",
    bank_account_number: "", bank_name: "", bank_ifsc: "",
    opening_date: "", monthly_target: "", security_deposit: "",
    agreement_start_date: "", agreement_end_date: "", notes: "",
    commission_rate: "15", is_active: true
  })

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    fetch("/api/franchises")
      .then(r => r.json())
      .then(d => {
        setFranchises(d.data ?? d ?? [])
      })
      .catch(() => setFranchises([]))
      .finally(() => setLoading(false))
  }

  const filtered = franchises.filter(f => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      f.name?.toLowerCase().includes(q) ||
      f.code?.toLowerCase().includes(q) ||
      f.city?.toLowerCase().includes(q) ||
      f.owner_name?.toLowerCase().includes(q)
    
    if (statusFilter === "active") return matchesSearch && f.is_active === true
    if (statusFilter === "inactive") return matchesSearch && f.is_active === false
    return matchesSearch
  })

  const resetForm = (f?: Franchise) => {
    if (f) {
      setForm({
        name: f.name || "", code: f.code || "",
        owner_name: f.owner_name || "", manager_name: f.manager_name || "",
        phone: f.phone || "", email: f.email || "",
        address: f.address || "", city: f.city || "",
        state: f.state || "", pincode: f.pincode || "",
        gst_number: f.gst_number || "", pan_number: f.pan_number || "",
        license_number: f.license_number || "",
        bank_account_number: f.bank_account_number || "",
        bank_name: f.bank_name || "", bank_ifsc: f.bank_ifsc || "",
        opening_date: f.opening_date || "", monthly_target: String(f.monthly_target ?? ""),
        security_deposit: String(f.security_deposit ?? ""),
        agreement_start_date: f.agreement_start_date || "",
        agreement_end_date: f.agreement_end_date || "",
        notes: f.notes || "",
        commission_rate: String(f.commission_rate ?? 15),
        is_active: f.is_active !== false
      })
    } else {
      setForm({
        name: "", code: "", owner_name: "", manager_name: "",
        phone: "", email: "", address: "", city: "", state: "",
        pincode: "", gst_number: "", pan_number: "", license_number: "",
        bank_account_number: "", bank_name: "", bank_ifsc: "",
        opening_date: "", monthly_target: "", security_deposit: "",
        agreement_start_date: "", agreement_end_date: "", notes: "",
        commission_rate: "15", is_active: true
      })
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.city) return

    // Auto-generate a simple code in background: 3 letters of name + 3 digits
    const cleanedName = form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    const generatedCode = cleanedName.length >= 3 
      ? cleanedName.slice(0, 3) + Math.floor(100 + Math.random() * 900)
      : cleanedName + Math.floor(100 + Math.random() * 900)

    setSubmitting(true)
    try {
      const res = await fetch("/api/franchises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: generatedCode,
          commission_rate: parseFloat(form.commission_rate || "15"),
          monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : null,
          security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Franchise created successfully")
        setShowAdd(false)
        load()
      } else {
        toast.error(data.error || "Failed to create franchise")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/franchises", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          ...form,
          commission_rate: parseFloat(form.commission_rate || "15"),
          monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : null,
          security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Franchise updated successfully")
        setShowEdit(false)
        setSelected(null)
        load()
      } else {
        toast.error(data.error || "Failed to update franchise")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (f: Franchise) => {
    try {
      const res = await fetch("/api/franchises", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: f.id,
          is_active: !f.is_active
        })
      })
      if (res.ok) load()
    } catch {}
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 38, borderRadius: 8, border: "1.5px solid rgba(201,168,76,0.2)",
    padding: "0 12px", fontSize: 13, outline: "none", background: "#fff",
    color: BROWN, boxSizing: "border-box"
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a07040", marginBottom: 4
  }

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      {/* Page Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BROWN }}>Franchise Management</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#a07040", marginTop: 2 }}>
            {loading ? "Loading..." : `${franchises.length} branches registered`}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true) }} style={{
          fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 10,
          background: BROWN, color: GOLD, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Franchise
        </button>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total Branches", value: String(franchises.length), color: BROWN },
            { label: "Active Branches", value: String(franchises.filter(f => f.is_active).length), color: "#16a34a" },
            { label: "Suspended Branches", value: String(franchises.filter(f => !f.is_active).length), color: "#dc2626" },
            { label: "Avg Commisson Rate", value: `${(franchises.reduce((s, f) => s + (f.commission_rate || 0), 0) / (franchises.length || 1)).toFixed(1)}%`, color: GOLD }
          ].map((st, idx) => (
            <div key={idx} style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#a07040", textTransform: "uppercase", letterSpacing: "0.06em" }}>{st.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: st.color, marginTop: 4 }}>{st.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Search by branch name, code, city, owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, maxWidth: 360, height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
              padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none"
            }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
              padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none", cursor: "pointer"
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Franchises Table */}
        <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>Loading franchises data...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>No franchises found matching criteria.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: `1px solid ${BORDER}` }}>
                  {["Branch Code", "Branch Name", "Owner Name", "Location", "Commission", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                    <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 700, color: BROWN }}>{f.code}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BROWN }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: "#a07040" }}>{f.email}</div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: BROWN }}>{f.owner_name || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: BROWN }}>{f.city}, {f.state}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: BROWN }}>{f.commission_rate ?? 15}%</td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        onClick={() => toggleStatus(f)}
                        style={{
                          border: "none", background: "none", cursor: "pointer",
                          fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                          backgroundColor: f.is_active ? "#f0fdf4" : "#fef2f2",
                          color: f.is_active ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {f.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setSelected(f); setShowView(true) }} style={{
                          fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8,
                          background: "transparent", border: `1px solid ${BORDER}`, color: BROWN, cursor: "pointer",
                        }}>View</button>
                        <button onClick={() => { setSelected(f); resetForm(f); setShowEdit(true) }} style={{
                          fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8,
                          background: "transparent", border: `1px solid ${BORDER}`, color: BROWN, cursor: "pointer",
                        }}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <form onSubmit={handleCreate} style={{ background: CREAM, borderRadius: 20, padding: 28, width: "100%", maxWidth: 640, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>Add New Franchise</h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Company Name *</label>
                <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Owner Name</label>
                <input style={inputStyle} value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Manager Name</label>
                <input style={inputStyle} value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Mobile / Phone</label>
                <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Email Address</label>
                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Street Address</label>
                <input style={inputStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>City *</label>
                <input required style={inputStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Pincode</label>
                <input style={inputStyle} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>GST Number</label>
                <input style={inputStyle} value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>PAN Number</label>
                <input style={inputStyle} value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Commission Rate (%)</label>
                <input style={inputStyle} type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>License Number</label>
                <input style={inputStyle} value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />
              </div>

              {/* Section: Financial */}
              <div style={{ gridColumn: "span 2", borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Financial & Agreement</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Security Deposit (₹)</label>
                <input style={inputStyle} type="number" placeholder="e.g. 200000" value={form.security_deposit} onChange={e => setForm({ ...form, security_deposit: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Monthly Target (₹)</label>
                <input style={inputStyle} type="number" placeholder="e.g. 500000" value={form.monthly_target} onChange={e => setForm({ ...form, monthly_target: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Agreement Start Date</label>
                <input style={inputStyle} type="date" value={form.agreement_start_date} onChange={e => setForm({ ...form, agreement_start_date: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Agreement End Date</label>
                <input style={inputStyle} type="date" value={form.agreement_end_date} onChange={e => setForm({ ...form, agreement_end_date: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Opening Date</label>
                <input style={inputStyle} type="date" value={form.opening_date} onChange={e => setForm({ ...form, opening_date: e.target.value })} />
              </div>

              {/* Section: Bank */}
              <div style={{ gridColumn: "span 2", borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Bank Details</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Bank Name</label>
                <input style={inputStyle} placeholder="e.g. HDFC Bank" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Account Number</label>
                <input style={inputStyle} value={form.bank_account_number} onChange={e => setForm({ ...form, bank_account_number: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>IFSC Code</label>
                <input style={inputStyle} placeholder="e.g. HDFC0001234" value={form.bank_ifsc} onChange={e => setForm({ ...form, bank_ifsc: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Internal Notes</label>
                <textarea rows={2} style={{ ...inputStyle, height: 54, padding: 8, resize: "vertical" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer"
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none", background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer"
              }}>{submitting ? "Creating..." : "Save Franchise"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <form onSubmit={handleUpdate} style={{ background: CREAM, borderRadius: 20, padding: 28, width: "100%", maxWidth: 640, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>Edit Franchise: {selected.code}</h3>
              <button type="button" onClick={() => { setShowEdit(false); setSelected(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Company Name *</label>
                <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Branch Code *</label>
                <input required disabled style={{ ...inputStyle, background: "#e8ddd0", cursor: "not-allowed" }} value={form.code} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Owner Name</label>
                <input style={inputStyle} value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Manager Name</label>
                <input style={inputStyle} value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Mobile / Phone</label>
                <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Email Address</label>
                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Street Address</label>
                <input style={inputStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>City *</label>
                <input required style={inputStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Pincode</label>
                <input style={inputStyle} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>GST Number</label>
                <input style={inputStyle} value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>PAN Number</label>
                <input style={inputStyle} value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Commission Rate (%)</label>
                <input style={inputStyle} type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>License Number</label>
                <input style={inputStyle} value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />
              </div>

              <div style={{ gridColumn: "span 2", borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Financial & Agreement</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Security Deposit (₹)</label>
                <input style={inputStyle} type="number" value={form.security_deposit} onChange={e => setForm({ ...form, security_deposit: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Monthly Target (₹)</label>
                <input style={inputStyle} type="number" value={form.monthly_target} onChange={e => setForm({ ...form, monthly_target: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Agreement Start Date</label>
                <input style={inputStyle} type="date" value={form.agreement_start_date} onChange={e => setForm({ ...form, agreement_start_date: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Agreement End Date</label>
                <input style={inputStyle} type="date" value={form.agreement_end_date} onChange={e => setForm({ ...form, agreement_end_date: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Opening Date</label>
                <input style={inputStyle} type="date" value={form.opening_date} onChange={e => setForm({ ...form, opening_date: e.target.value })} />
              </div>

              <div style={{ gridColumn: "span 2", borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Bank Details</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Bank Name</label>
                <input style={inputStyle} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Account Number</label>
                <input style={inputStyle} value={form.bank_account_number} onChange={e => setForm({ ...form, bank_account_number: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>IFSC Code</label>
                <input style={inputStyle} value={form.bank_ifsc} onChange={e => setForm({ ...form, bank_ifsc: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Internal Notes</label>
                <textarea rows={2} style={{ ...inputStyle, height: 54, padding: 8, resize: "vertical" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => { setShowEdit(false); setSelected(null) }} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer"
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none", background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer"
              }}>{submitting ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {showView && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: CREAM, borderRadius: 20, padding: 28, width: "100%", maxWidth: 560, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>{selected.name}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: selected.is_active ? "#f0fdf4" : "#fef2f2", color: selected.is_active ? "#16a34a" : "#dc2626" }}>
                {selected.is_active ? "Active" : "Suspended"}
              </span>
            </div>

            {/* Basic Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, fontSize: 13, color: BROWN }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>CODE</span><br />{selected.code}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>COMMISSION</span><br />{selected.commission_rate}%</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>OWNER</span><br />{selected.owner_name || "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>MANAGER</span><br />{selected.manager_name || "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", textDecoration: "none", border: "1px solid #bbf7d0" }}>
                    Call {selected.phone}
                  </a>
                )}
                {selected.phone && (
                  <a href={`https://wa.me/91${selected.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", textDecoration: "none", border: "1px solid #bbf7d0" }}>
                    WhatsApp
                  </a>
                )}
              </div>
              <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>ADDRESS</span><br />{[selected.address, selected.city, selected.state, selected.pincode].filter(Boolean).join(", ")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>GSTIN</span><br />{selected.gst_number || "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>PAN</span><br />{selected.pan_number || "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>LICENSE</span><br />{selected.license_number || "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>OPENING DATE</span><br />{selected.opening_date || "—"}</div>
              </div>
            </div>

            {/* Financial */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Financial & Agreement</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: BROWN }}>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>SECURITY DEPOSIT</span><br />{selected.security_deposit ? `₹${Number(selected.security_deposit).toLocaleString("en-IN")}` : "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>MONTHLY TARGET</span><br />{selected.monthly_target ? `₹${Number(selected.monthly_target).toLocaleString("en-IN")}` : "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>AGREEMENT START</span><br />{selected.agreement_start_date || "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>AGREEMENT END</span><br />{selected.agreement_end_date || "—"}</div>
              </div>
            </div>

            {/* Bank */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase", marginBottom: 8 }}>Bank Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: BROWN }}>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>BANK</span><br />{selected.bank_name || "—"}</div>
                <div><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>IFSC</span><br />{selected.bank_ifsc || "—"}</div>
                <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: 10, color: "#a07040", fontWeight: 700 }}>ACCOUNT NUMBER</span><br />{selected.bank_account_number || "—"}</div>
              </div>
            </div>

            {selected.notes && (
              <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: BROWN, marginBottom: 16 }}>
                <strong>Notes:</strong> {selected.notes}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowView(false); resetForm(selected); setShowEdit(true) }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: BROWN, color: GOLD, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Edit Franchise</button>
              <button onClick={() => { setShowView(false); setSelected(null) }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
