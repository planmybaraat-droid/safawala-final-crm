"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

const DEPT_COLORS: Record<string, string> = {
  booking: "#22c55e", warehouse: "#a855f7", qc: "#eab308",
  delivery: "#14b8a6", styling: "#ec4899", accounts: "#ef4444",
  manager: "#3b82f6", admin: "#f97316", franchise: "#8b5cf6",
}

const ALL_DEPTS = ["all", "booking", "warehouse", "qc", "delivery", "styling", "accounts", "manager", "admin", "franchise"]
const ROLES = ["staff", "franchise_admin", "super_admin", "readonly"]

interface StaffUser {
  id: string
  name: string
  email: string
  role: string
  department: string
  franchise_id: string
  base_salary: number | null
  is_active: boolean
  permissions: Record<string, boolean>
  franchise?: { name: string; code: string }
}

// Map departments to their predefined system permissions
function getPermissionsForDepartment(department: string, role: string): Record<string, boolean> {
  const allPerms = [
    "dashboard", "bookings", "customers", "inventory", "packages", "vendors", 
    "quotes", "invoices", "laundry", "expenses", "deliveries", "productArchive", 
    "payroll", "attendance", "reports", "financials", "franchises", "staff", 
    "settings", "integrations"
  ]
  
  const permissions: Record<string, boolean> = {}
  allPerms.forEach(p => {
    permissions[p] = false
  })

  if (role === "super_admin" || department === "admin") {
    allPerms.forEach(p => { permissions[p] = true })
    return permissions
  }

  switch (department) {
    case "manager":
      ["dashboard", "bookings", "customers", "inventory", "packages", "vendors", "quotes", "invoices", "laundry", "expenses", "deliveries", "payroll", "attendance", "reports"].forEach(p => { permissions[p] = true })
      break
    case "booking":
      ["dashboard", "bookings", "customers", "packages"].forEach(p => { permissions[p] = true })
      break
    case "warehouse":
      ["dashboard", "inventory", "deliveries", "laundry"].forEach(p => { permissions[p] = true })
      break
    case "qc":
      ["dashboard", "inventory", "laundry"].forEach(p => { permissions[p] = true })
      break
    case "delivery":
      ["dashboard", "deliveries"].forEach(p => { permissions[p] = true })
      break
    case "styling":
      ["dashboard", "bookings"].forEach(p => { permissions[p] = true })
      break
    case "accounts":
      ["dashboard", "invoices", "expenses", "payroll", "attendance", "financials"].forEach(p => { permissions[p] = true })
      break
    case "franchise":
      ["dashboard", "bookings", "customers", "inventory", "packages", "quotes", "invoices", "laundry", "expenses", "deliveries", "payroll", "attendance", "reports"].forEach(p => { permissions[p] = true })
      break
    default:
      ["dashboard"].forEach(p => { permissions[p] = true })
      break
  }
  return permissions
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [franchises, setFranchises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Modal states
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "staff",
    franchise_id: "", department: "booking", base_salary: "",
    is_active: true
  })

  useEffect(() => {
    load()
    loadFranchises()
  }, [])

  function load() {
    setLoading(true)
    fetch("/api/staff")
      .then(r => r.json())
      .then(d => {
        setStaff(d.staff ?? [])
      })
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }

  function loadFranchises() {
    fetch("/api/franchises")
      .then(r => r.json())
      .then(d => {
        const list = d.data ?? d ?? []
        setFranchises(list)
        if (list.length > 0 && !form.franchise_id) {
          setForm(f => ({ ...f, franchise_id: list[0].id }))
        }
      })
      .catch(() => {})
  }

  const filtered = staff.filter(s => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q)
    
    if (activeTab === "all") return matchesSearch
    return matchesSearch && s.department === activeTab
  })

  const resetForm = (s?: StaffUser) => {
    if (s) {
      setForm({
        name: s.name || "",
        email: s.email || "",
        password: "", // Always clear password on edit
        role: s.role || "staff",
        franchise_id: s.franchise_id || (franchises[0]?.id ?? ""),
        department: s.department || "booking",
        base_salary: s.base_salary ? String(s.base_salary) : "",
        is_active: s.is_active !== false
      })
    } else {
      setForm({
        name: "", email: "", password: "", role: "staff",
        franchise_id: franchises[0]?.id ?? "", department: "booking", base_salary: "",
        is_active: true
      })
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.franchise_id) {
      toast.error("Please fill in name, email, password, and franchise.")
      return
    }
    setSubmitting(true)
    try {
      const permissions = getPermissionsForDepartment(form.department, form.role)
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          base_salary: form.base_salary ? parseFloat(form.base_salary) : null,
          permissions
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Staff account created successfully")
        setShowAdd(false)
        load()
      } else {
        toast.error(data.error || "Failed to create user")
      }
    } catch {
      toast.error("Error creating staff.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      const permissions = getPermissionsForDepartment(form.department, form.role)
      const payload: any = {
        id: selected.id,
        name: form.name,
        email: form.email,
        role: form.role,
        franchise_id: form.franchise_id,
        department: form.department,
        base_salary: form.base_salary ? parseFloat(form.base_salary) : null,
        is_active: form.is_active,
        permissions
      }
      if (form.password) payload.password = form.password

      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: [payload] })
      })
      const data = await res.json()
      if (res.ok && !data.results?.[0]?.error) {
        toast.success("Staff account updated successfully")
        setShowEdit(false)
        setSelected(null)
        load()
      } else {
        toast.error(data.results?.[0]?.error || data.error || "Failed to update staff")
      }
    } catch {
      toast.error("Error updating staff.")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (s: StaffUser) => {
    try {
      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: [{
            id: s.id,
            is_active: !s.is_active
          }]
        })
      })
      const data = await res.json()
      if (res.ok && !data.results?.[0]?.error) {
        toast.success(`Staff ${!s.is_active ? "activated" : "deactivated"}`)
        load()
      } else {
        toast.error(data.results?.[0]?.error || data.error || "Failed to update status")
      }
    } catch {
      toast.error("Error updating status")
    }
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

      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BROWN }}>Staff & Employee Management</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#a07040", marginTop: 2 }}>
            {loading ? "Loading..." : `${staff.length} staff registered across branches`}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true) }} style={{
          fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 10,
          background: BROWN, color: GOLD, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Staff Member
        </button>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Search & Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="Search staff by name, email or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", maxWidth: 360, height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
              padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none"
            }}
          />

          {/* Department Tabs */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {ALL_DEPTS.map(d => (
              <button
                key={d}
                onClick={() => setActiveTab(d)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: `1.5px solid ${activeTab === d ? (DEPT_COLORS[d] || GOLD) : BORDER}`,
                  background: activeTab === d ? (DEPT_COLORS[d] || GOLD) : CREAM,
                  color: activeTab === d ? "#fff" : BROWN,
                  cursor: "pointer", whiteSpace: "nowrap"
                }}
              >
                {d === "all" ? "All Departments" : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>Loading staff profiles...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>No staff found in this department.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Branch / Franchise", "Department", "Role", "Salary", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const deptColor = DEPT_COLORS[s.department] || GOLD
                  return (
                    <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: BROWN }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "#a07040" }}>{s.email}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: BROWN }}>
                        {s.franchise?.name || "All Branches"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          backgroundColor: `${deptColor}12`, color: deptColor, textTransform: "capitalize"
                        }}>
                          {s.department || "No dept"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: BROWN, textTransform: "capitalize" }}>
                        {s.role?.replace("_", " ")}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: BROWN }}>
                        {s.base_salary ? `₹${s.base_salary.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => toggleStatus(s)}
                          style={{
                            border: "none", background: "none", cursor: "pointer",
                            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                            backgroundColor: s.is_active ? "#f0fdf4" : "#fef2f2",
                            color: s.is_active ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {s.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => { setSelected(s); resetForm(s); setShowEdit(true) }} style={{
                          fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8,
                          background: "transparent", border: `1px solid ${BORDER}`, color: BROWN, cursor: "pointer",
                        }}>Edit & Permissions</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <form onSubmit={handleCreate} style={{ background: CREAM, borderRadius: 20, padding: 28, width: "100%", maxWidth: 540, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>Add Staff Account</h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Employee Name *</label>
                <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Email Address *</label>
                <input required type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Password *</label>
                <input required type="password" style={inputStyle} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Branch / Franchise *</label>
                <select style={inputStyle} value={form.franchise_id} onChange={e => setForm({ ...form, franchise_id: e.target.value })}>
                  {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>System Role *</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Department *</label>
                <select style={inputStyle} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {ALL_DEPTS.filter(d => d !== "all").map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Base Monthly Salary (₹)</label>
                <input style={inputStyle} type="number" placeholder="e.g. 25000" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer"
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none", background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer"
              }}>{submitting ? "Creating..." : "Save Account"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <form onSubmit={handleUpdate} style={{ background: CREAM, borderRadius: 20, padding: 28, width: "100%", maxWidth: 540, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>Edit Staff Account</h3>
              <button type="button" onClick={() => { setShowEdit(false); setSelected(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Employee Name *</label>
                <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Email Address *</label>
                <input required type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Reset Password (leave empty to keep)</label>
                <input type="password" placeholder="New password" style={inputStyle} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Branch / Franchise *</label>
                <select style={inputStyle} value={form.franchise_id} onChange={e => setForm({ ...form, franchise_id: e.target.value })}>
                  {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>System Role *</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Department *</label>
                <select style={inputStyle} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {ALL_DEPTS.filter(d => d !== "all").map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                <label style={labelStyle}>Base Monthly Salary (₹)</label>
                <input style={inputStyle} type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} />
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

    </div>
  )
}
