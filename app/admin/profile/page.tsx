"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {}
    }
    setLoading(false)
  }, [])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })
      if (res.ok) {
        toast.success("Password changed successfully")
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed to change password")
      }
    } catch {
      toast.error("Error updating password")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 38, borderRadius: 8, border: "1.5px solid rgba(201,168,76,0.2)",
    padding: "0 12px", fontSize: 13, outline: "none", background: "#fff",
    color: BROWN, boxSizing: "border-box"
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a07040", marginBottom: 6
  }

  if (loading) {
    return <div style={{ background: WARM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: BROWN }}>Loading profile...</div>
  }

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>
      
      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>Admin Profile</h1>
        <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
          Manage your personal credentials and update your system security password.
        </p>
      </div>

      <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }} className="profile-responsive-grid">
        
        {/* Profile Card */}
        <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, #8b6914)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 800, color: "#fff", boxShadow: "0 4px 14px rgba(201,168,76,0.3)"
          }}>
            {user?.name?.[0] || "S"}
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: BROWN }}>{user?.name || "Super Admin"}</h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", display: "block", marginTop: 4 }}>System Role: Super Admin</span>
          </div>
          
          <div style={{ width: "100%", borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: 14, marginTop: 6, fontSize: 12, color: BROWN, display: "flex", flexDirection: "column", gap: 8 }}>
            <div><strong>Email Address:</strong> {user?.email || "—"}</div>
            <div><strong>Allowed Privileges:</strong> Full System Override Access</div>
            <div><strong>Status:</strong> Active</div>
          </div>
        </div>

        {/* Change Password */}
        <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: BROWN }}>Security Credentials Update</h3>
          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>Current Password</label>
              <input required type="password" style={inputStyle} value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>New Password</label>
              <input required type="password" style={inputStyle} value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input required type="password" style={inputStyle} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
            </div>

            <button type="submit" disabled={saving} style={{
              marginTop: 10, padding: "10px 20px", borderRadius: 8, border: "none",
              background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end"
            }}>
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}
