"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

interface Territory {
  id: string
  name: string
  cities: string[]
  pincodes: string[]
  is_locked: boolean
  assigned_franchise_id: string
  _row_id?: string
}

export default function AdminTerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [franchises, setFranchises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "", citiesRaw: "", pincodesRaw: "", is_locked: false, assigned_franchise_id: ""
  })

  useEffect(() => {
    loadTerritories()
    fetch("/api/franchises")
      .then(r => r.json())
      .then(d => setFranchises(d.data ?? d ?? []))
      .catch(() => {})
  }, [])

  function loadTerritories() {
    setLoading(true)
    fetch("/api/territories")
      .then(r => r.json())
      .then(d => setTerritories(d.data ?? []))
      .catch(() => setTerritories([]))
      .finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    setSubmitting(true)
    try {
      const cities = form.citiesRaw.split(",").map(c => c.trim()).filter(Boolean)
      const pincodes = form.pincodesRaw.split(",").map(p => p.trim()).filter(Boolean)
      const res = await fetch("/api/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, cities, pincodes, is_locked: form.is_locked, assigned_franchise_id: form.assigned_franchise_id })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Territory created")
        setShowAdd(false)
        setForm({ name: "", citiesRaw: "", pincodesRaw: "", is_locked: false, assigned_franchise_id: "" })
        loadTerritories()
      } else {
        toast.error(data.error || "Failed to create territory")
      }
    } catch {
      toast.error("Error creating territory")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLock = async (t: Territory) => {
    const optimistic = territories.map(x => x.id === t.id ? { ...x, is_locked: !x.is_locked } : x)
    setTerritories(optimistic)
    try {
      const res = await fetch("/api/territories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, name: t.name, cities: t.cities, pincodes: t.pincodes, is_locked: !t.is_locked, assigned_franchise_id: t.assigned_franchise_id })
      })
      if (!res.ok) { loadTerritories(); toast.error("Failed to update") }
    } catch { loadTerritories() }
  }

  const assignFranchise = async (t: Territory, franchiseId: string) => {
    const optimistic = territories.map(x => x.id === t.id ? { ...x, assigned_franchise_id: franchiseId } : x)
    setTerritories(optimistic)
    try {
      const res = await fetch("/api/territories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, name: t.name, cities: t.cities, pincodes: t.pincodes, is_locked: t.is_locked, assigned_franchise_id: franchiseId })
      })
      if (res.ok) { toast.success("Assignment saved") }
      else { loadTerritories(); toast.error("Failed to save assignment") }
    } catch { loadTerritories() }
  }

  const deleteTerritory = async (t: Territory) => {
    if (!confirm(`Delete territory "${t.name}"?`)) return
    try {
      const res = await fetch(`/api/territories?id=${t.id}`, { method: "DELETE" })
      if (res.ok) { toast.success("Territory deleted"); loadTerritories() }
      else toast.error("Failed to delete")
    } catch { toast.error("Error deleting territory") }
  }

  const filtered = territories.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.cities?.some(c => c.toLowerCase().includes(search.toLowerCase())) ||
    t.pincodes?.some(p => p.includes(search))
  )

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 38, borderRadius: 8, border: "1.5px solid rgba(201,168,76,0.2)",
    padding: "0 12px", fontSize: 13, outline: "none", background: "#fff", color: BROWN, boxSizing: "border-box"
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a07040", marginBottom: 4
  }

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BROWN }}>Territory Management</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#a07040", marginTop: 2 }}>
            {loading ? "Loading..." : `${territories.length} territories · Define, lock, and assign exclusive regions`}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 10,
          background: BROWN, color: GOLD, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Territory
        </button>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Search by territory name, city or pincode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 360, height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`, padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none" }}
          />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>Loading territories...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>
            No territories yet. Click "Add Territory" to create the first one.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }} className="territories-grid">
            {filtered.map(t => {
              const assigned = franchises.find(f => f.id === t.assigned_franchise_id)
              return (
                <div key={t.id} style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: BROWN }}>{t.name}</h3>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button onClick={() => toggleLock(t)} style={{
                        border: "none", background: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                        backgroundColor: t.is_locked ? "#fef2f2" : "#f0fdf4",
                        color: t.is_locked ? "#dc2626" : "#16a34a",
                      }}>
                        {t.is_locked ? "Locked" : "Open"}
                      </button>
                      <button onClick={() => deleteTerritory(t)} style={{
                        border: "none", background: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8,
                        color: "#dc2626", fontSize: 10, fontWeight: 700
                      }}>Delete</button>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: BROWN, display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    <div><strong style={{ color: "#a07040" }}>Cities:</strong> {t.cities?.join(", ") || "No cities assigned"}</div>
                    <div><strong style={{ color: "#a07040" }}>Pincodes:</strong> {t.pincodes?.join(", ") || "No pincodes assigned"}</div>
                  </div>

                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11, color: "#a07040" }}>
                      {assigned ? <span>Assigned: <strong>{assigned.name}</strong></span> : <span style={{ color: "#999" }}>Not assigned</span>}
                    </div>
                    <select
                      value={t.assigned_franchise_id || ""}
                      onChange={e => assignFranchise(t, e.target.value)}
                      style={{ height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, padding: "0 8px", fontSize: 11, background: WARM, color: BROWN, cursor: "pointer" }}
                    >
                      <option value="">Unassign</option>
                      {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <form onSubmit={handleCreate} style={{ background: CREAM, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>Create Territory</h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Territory Name *</label>
                <input required style={inputStyle} placeholder="e.g. South Vadodara Zone" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Cities (comma separated)</label>
                <input style={inputStyle} placeholder="e.g. Vadodara, Padra" value={form.citiesRaw} onChange={e => setForm({ ...form, citiesRaw: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Pincodes (comma separated)</label>
                <input style={inputStyle} placeholder="e.g. 390012, 390015" value={form.pincodesRaw} onChange={e => setForm({ ...form, pincodesRaw: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Franchise Assignment</label>
                <select style={inputStyle} value={form.assigned_franchise_id} onChange={e => setForm({ ...form, assigned_franchise_id: e.target.value })}>
                  <option value="">Leave Unassigned</option>
                  {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: BROWN, cursor: "pointer", marginTop: 4 }}>
                <input type="checkbox" checked={form.is_locked} onChange={e => setForm({ ...form, is_locked: e.target.checked })} />
                <span>Lock Territory (exclusive assignment)</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer" }}>
                {submitting ? "Saving..." : "Save Territory"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) { .territories-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
