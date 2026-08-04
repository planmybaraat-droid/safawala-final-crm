"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("company")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Settings State
  const [company, setCompany] = useState({
    name: "Safawala Corporate",
    email: "corporate@safawala.com",
    phone: "+91 99998 88888",
    address: "101 Gold Tower, Vadodara, Gujarat",
    gstin: "24AAACS9999Z1Z0",
    pan: "AAACP9999Z"
  })

  const [pricing, setPricing] = useState({
    defaultGstRate: "18",
    securityDepositPercent: "50",
    minBookingAmount: "5000",
    rentalPeriodDays: "3"
  })

  const [wati, setWati] = useState({
    apiUrl: "https://api.wati.io/api/v1",
    apiKey: "",
    apiKeyConfigured: false,
    templates: {
      booking_confirmation: "booking_confirm_v2",
      order_dispatch: "order_dispatch_update",
      return_reminder: "return_reminder_v1",
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" })
      if (res.ok) {
        const d = await res.json()
        if (d.company) setCompany(d.company)
        if (d.pricing) setPricing(d.pricing)
        if (d.wati) setWati(d.wati)
      }
    } catch {
      // Keep fallbacks
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "company", data: company })
      })
      if (res.ok) {
        toast.success("Company settings saved")
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "pricing", data: pricing })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save pricing")
      }
      toast.success("Pricing and GST settings saved")
    } catch {
      toast.error("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWati = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "wati", data: wati })
      })
      if (res.ok) {
        toast.success("WhatsApp/WATI settings saved")
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Error saving settings")
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

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>System Settings</h1>
        <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
          Manage global corporate configurations, pricing, taxes, and WATI API credentials.
        </p>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, borderBottom: `2px solid ${BORDER}`, paddingBottom: 2 }}>
          <button onClick={() => setActiveTab("company")} style={{
            background: "none", border: "none", padding: "10px 20px", fontSize: 14, fontWeight: 700,
            color: activeTab === "company" ? BROWN : "#a07040", cursor: "pointer",
            borderBottom: activeTab === "company" ? `3px solid ${GOLD}` : "3px solid transparent",
            transition: "all 0.2s"
          }}>
            Company Profile
          </button>
          <button onClick={() => setActiveTab("pricing")} style={{
            background: "none", border: "none", padding: "10px 20px", fontSize: 14, fontWeight: 700,
            color: activeTab === "pricing" ? BROWN : "#a07040", cursor: "pointer",
            borderBottom: activeTab === "pricing" ? `3px solid ${GOLD}` : "3px solid transparent",
            transition: "all 0.2s"
          }}>
            Pricing & Taxes
          </button>
          <button onClick={() => setActiveTab("wati")} style={{
            background: "none", border: "none", padding: "10px 20px", fontSize: 14, fontWeight: 700,
            color: activeTab === "wati" ? BROWN : "#a07040", cursor: "pointer",
            borderBottom: activeTab === "wati" ? `3px solid ${GOLD}` : "3px solid transparent",
            transition: "all 0.2s"
          }}>
            WhatsApp / WATI Setup
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 640 }}>
          
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>Loading configurations...</div>
          ) : activeTab === "company" ? (
            <form onSubmit={handleSaveCompany} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Company / Brand Name</label>
                  <input style={inputStyle} value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Support Email Address</label>
                  <input style={inputStyle} type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Support Phone (WhatsApp)</label>
                  <input style={inputStyle} value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Corporate Address</label>
                  <input style={inputStyle} value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>GSTIN Registration</label>
                  <input style={inputStyle} value={company.gstin} onChange={e => setCompany({ ...company, gstin: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Corporate PAN Card</label>
                  <input style={inputStyle} value={company.pan} onChange={e => setCompany({ ...company, pan: e.target.value })} />
                </div>
              </div>
              
              <button type="submit" disabled={saving} style={{
                marginTop: 10, padding: "10px 20px", borderRadius: 8, border: "none",
                background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end"
              }}>
                {saving ? "Saving..." : "Save Profile Details"}
              </button>
            </form>
          ) : activeTab === "pricing" ? (
            <form onSubmit={handleSavePricing} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Default GST/Tax Rate (%)</label>
                  <input style={inputStyle} type="number" value={pricing.defaultGstRate} onChange={e => setPricing({ ...pricing, defaultGstRate: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Security Deposit Percentage (%)</label>
                  <input style={inputStyle} type="number" value={pricing.securityDepositPercent} onChange={e => setPricing({ ...pricing, securityDepositPercent: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Minimum Booking Order Value (₹)</label>
                  <input style={inputStyle} type="number" value={pricing.minBookingAmount} onChange={e => setPricing({ ...pricing, minBookingAmount: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Standard Rental Period (Days)</label>
                  <input style={inputStyle} type="number" value={pricing.rentalPeriodDays} onChange={e => setPricing({ ...pricing, rentalPeriodDays: e.target.value })} />
                </div>
              </div>
              
              <button type="submit" disabled={saving} style={{
                marginTop: 10, padding: "10px 20px", borderRadius: 8, border: "none",
                background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end"
              }}>
                {saving ? "Saving..." : "Save Pricing Configuration"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveWati} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>WATI API Gateway URL</label>
                  <input style={inputStyle} value={wati.apiUrl} onChange={e => setWati({ ...wati, apiUrl: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>WATI Access Token / API Key</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={wati.apiKey}
                    placeholder={wati.apiKeyConfigured ? "Configured — enter a new key to replace" : "Enter WATI API key"}
                    onChange={e => setWati({ ...wati, apiKey: e.target.value })}
                  />
                </div>
                
                <h4 style={{ margin: "10px 0 6px", fontSize: 11, fontWeight: 700, color: BROWN, textTransform: "uppercase" }}>Approved WATI Message Templates</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: "#a07040", marginBottom: 2 }}>Booking Confirmation</label>
                    <input style={inputStyle} value={wati.templates.booking_confirmation} onChange={e => setWati({ ...wati, templates: { ...wati.templates, booking_confirmation: e.target.value } })} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: "#a07040", marginBottom: 2 }}>Order Dispatch Update</label>
                    <input style={inputStyle} value={wati.templates.order_dispatch} onChange={e => setWati({ ...wati, templates: { ...wati.templates, order_dispatch: e.target.value } })} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: "#a07040", marginBottom: 2 }}>Return Reminder</label>
                    <input style={inputStyle} value={wati.templates.return_reminder} onChange={e => setWati({ ...wati, templates: { ...wati.templates, return_reminder: e.target.value } })} />
                  </div>
                </div>
              </div>
              
              <button type="submit" disabled={saving} style={{
                marginTop: 10, padding: "10px 20px", borderRadius: 8, border: "none",
                background: BROWN, color: GOLD, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end"
              }}>
                {saving ? "Saving..." : "Save WATI Credentials"}
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  )
}
