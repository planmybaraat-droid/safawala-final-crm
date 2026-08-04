"use client"

import { useState, useEffect, useCallback } from "react"
import { PortalPageHeader, PortalSearchBar, PortalSectionLabel, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#6366f1"
const COLOR_DARK = "#4f46e5"

const DEPT_COLORS: Record<string, string> = {
  booking: "#22c55e", warehouse: "#a855f7", qc: "#eab308",
  delivery: "#14b8a6", styling: "#ec4899", accounts: "#ef4444",
  hr: "#6366f1", manager: "#3b82f6",
}

const DOC_TYPES = [
  { key: "aadhaar", label: "Aadhaar Card",      icon: "id-card",        required: true },
  { key: "pan",     label: "PAN Card",           icon: "credit-card",    required: true },
  { key: "photo",   label: "Passport Photo",     icon: "camera",         required: true },
  { key: "bank",    label: "Bank Passbook",      icon: "landmark",       required: true },
  { key: "resume",  label: "Resume / CV",        icon: "document",       required: false },
  { key: "address", label: "Address Proof",      icon: "map-pin",        required: false },
  { key: "degree",  label: "Education Cert",     icon: "graduation-cap", required: false },
  { key: "police",  label: "Police Verification",icon: "shield",         required: false },
]

interface KycDoc { key: string; status: "pending" | "uploaded" | "verified" | "rejected"; url?: string; note?: string }

export default function KycPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any | null>(null)
  const [kyc, setKyc] = useState<KycDoc[]>([])
  const [kycLoading, setKycLoading] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [toast, setToast] = useState("")

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  useEffect(() => {
    fetch("/api/users?limit=200")
      .then(r => r.json())
      .then(d => setStaff(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function loadKyc(staffId: string) {
    setKycLoading(true)
    try {
      const res = await fetch(`/api/users/${staffId}/kyc`).then(r => r.json())
      const docs: KycDoc[] = DOC_TYPES.map(d => {
        const existing = res.data?.find((k: any) => k.doc_type === d.key)
        return { key: d.key, status: existing?.status ?? "pending", url: existing?.url, note: existing?.note }
      })
      setKyc(docs)
    } catch {
      setKyc(DOC_TYPES.map(d => ({ key: d.key, status: "pending" as const })))
    }
    setKycLoading(false)
  }

  function openStaff(s: any) {
    setSelected(s)
    loadKyc(s.id)
  }

  async function markStatus(docKey: string, status: "verified" | "rejected") {
    if (!selected) return
    setUploading(docKey)
    try {
      await fetch(`/api/users/${selected.id}/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: docKey, status }),
      })
      setKyc(prev => prev.map(d => d.key === docKey ? { ...d, status } : d))
      showToast(`${status === "verified" ? "Verified ✓" : "Marked rejected"}`)
    } catch { showToast("Error updating status") }
    setUploading(null)
  }

  async function handleFileUpload(docKey: string, file: File) {
    if (!selected) return
    setUploading(docKey)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("user_id", selected.id)
      formData.append("doc_type", docKey)
      const res = await fetch("/api/upload", { method: "POST", body: formData }).then(r => r.json())
      if (res.url || res.path) {
        await fetch(`/api/users/${selected.id}/kyc`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_type: docKey, status: "uploaded", url: res.url ?? res.path }),
        })
        setKyc(prev => prev.map(d => d.key === docKey ? { ...d, status: "uploaded", url: res.url ?? res.path } : d))
        showToast("Document uploaded ✓")
      } else {
        showToast("Upload failed")
      }
    } catch { showToast("Error uploading") }
    setUploading(null)
  }

  const filtered = staff.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.department?.toLowerCase().includes(search.toLowerCase()))
  const kycComplete = (s: any) => kyc.filter(d => d.status === "verified").length

  function kycBadge(s: any, kycData?: KycDoc[]) {
    const total = DOC_TYPES.filter(d => d.required).length
    // We show basic badge without loading KYC for each staff
    return null
  }

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#f1f5f9", color: "#64748b", label: "Pending" },
    uploaded: { bg: "#fef9c3", color: "#a16207", label: "Uploaded" },
    verified: { bg: "#dcfce7", color: "#15803d", label: "Verified ✓" },
    rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: COLOR_DARK, color: "white", borderRadius: 12, padding: "8px 20px", fontSize: 12, fontWeight: 700, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Staff detail view */}
      {selected ? (
        <div>
          <PortalPageHeader title={`KYC — ${selected.name}`} subtitle={selected.department?.toUpperCase()} color={COLOR} backHref="#" />
          <button onClick={() => setSelected(null)} style={{ margin: "0 16px 12px", display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
            ← Back to Staff
          </button>

          {kycLoading ? (
            <div style={{ padding: "0 16px" }}><div style={{ background: "rgba(255,255,255,0.65)", borderRadius: 16, padding: 16 }}><PortalSkeleton rows={6} /></div></div>
          ) : (
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {DOC_TYPES.map(doc => {
                const d = kyc.find(k => k.key === doc.key) ?? { key: doc.key, status: "pending" as const }
                const ss = STATUS_STYLES[d.status]
                return (
                  <div key={doc.key} style={{ background: "white", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 18, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                          <PortalIcon name={doc.icon} size={18} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{doc.label}</p>
                          {doc.required && <p style={{ margin: 0, fontSize: 9, color: "#ef4444", fontWeight: 600 }}>Required</p>}
                        </div>
                      </div>
                      <span style={{ background: ss.bg, color: ss.color, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>{ss.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noreferrer"
                          style={{ flex: 1, height: 36, borderRadius: 10, border: `1px solid ${COLOR}30`, background: `${COLOR}10`, color: COLOR, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                          View Doc
                        </a>
                      )}
                      {/* Upload button */}
                      <label style={{ flex: 1, height: 36, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                        {uploading === doc.key ? "Uploading…" : <><PortalIcon name="upload-cloud" size={14} /> Upload</>}
                        <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFileUpload(doc.key, e.target.files[0]) }} disabled={uploading === doc.key} />
                      </label>
                      {d.status === "uploaded" && (
                        <button onClick={() => markStatus(doc.key, "verified")} disabled={uploading === doc.key}
                          style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#dcfce7", color: "#16a34a", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                          ✓
                        </button>
                      )}
                      {d.status === "uploaded" && (
                        <button onClick={() => markStatus(doc.key, "rejected")} disabled={uploading === doc.key}
                          style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#fee2e2", color: "#dc2626", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <PortalPageHeader title="Employee KYC" subtitle="Manage staff documents" color={COLOR} backHref="/portal/hr" />
          <PortalSearchBar value={search} onChange={setSearch} placeholder="Search staff name or department…" />

          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? (
              <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: 16, padding: 16 }}><PortalSkeleton rows={6} /></div>
            ) : filtered.length === 0 ? (
              <div style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16 }}>
                <PortalEmptyState icon="users" title="No staff found" subtitle="Add staff to manage their KYC documents" color={COLOR} />
              </div>
            ) : (
              filtered.map(s => {
                const deptColor = DEPT_COLORS[s.department] ?? COLOR
                return (
                  <div key={s.id} onClick={() => openStaff(s)}
                    style={{ background: "white", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${deptColor}20`, display: "flex", alignItems: "center", justifyContent: "center", color: deptColor, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      {(s.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e1208" }}>{s.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600, textTransform: "uppercase" }}>{s.department ?? "—"}</p>
                    </div>
                    <span style={{ color: "rgba(80,55,30,0.25)" }}><PortalIcon name="chevron-right" size={16} /></span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
