"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

export default function FranchiseBillingPage() {
  const [activeTab, setActiveTab] = useState("invoices")
  const [franchises, setFranchises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const [form, setForm] = useState({
    franchiseId: "", candidateName: "", type: "Setup Fee",
    setupFee: "1000000", securityDeposit: "200000", gstRate: "18",
    status: "pending", notes: ""
  })

  useEffect(() => {
    fetch("/api/franchises")
      .then(r => r.json())
      .then(d => setFranchises(d.data ?? d ?? []))
      .catch(() => {})
    loadInvoices()
    loadQuotes()
  }, [])

  function loadInvoices() {
    setLoading(true)
    fetch("/api/franchise-billing?type=franchise_invoice")
      .then(r => r.json())
      .then(d => setInvoices(d.data ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }

  function loadQuotes() {
    fetch("/api/franchise-billing?type=franchise_quote")
      .then(r => r.json())
      .then(d => setQuotes(d.data ?? []))
      .catch(() => {})
  }

  // Auto calculate total
  const calculatedTotal = useMemo(() => {
    const fee = parseFloat(form.setupFee || "0")
    const dep = parseFloat(form.securityDeposit || "0")
    const gst = parseFloat(form.gstRate || "18")
    const subtotal = fee + dep
    return subtotal + (fee * (gst / 100))
  }, [form.setupFee, form.securityDeposit, form.gstRate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.franchiseId
      ? (franchises.find(f => f.id === form.franchiseId)?.name || "Franchise Branch")
      : form.candidateName || "New Lead Candidate"

    setSaving(true)
    try {
      const isInvoice = activeTab === "invoices"
      const payload = {
        record_type: isInvoice ? "invoice" : "quote",
        franchiseName: name,
        date: new Date().toISOString().split("T")[0],
        amount: calculatedTotal,
        setupFee: parseFloat(form.setupFee || "0"),
        securityDeposit: parseFloat(form.securityDeposit || "0"),
        gstRate: parseFloat(form.gstRate || "18"),
        type: form.type,
        status: isInvoice ? form.status : "sent",
        notes: form.notes,
        validity: isInvoice ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }
      const res = await fetch("/api/franchise-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(isInvoice ? "Invoice saved" : "Quotation saved")
        setShowAdd(false)
        if (isInvoice) loadInvoices(); else loadQuotes()
      } else {
        toast.error(data.error || "Failed to save")
      }
    } catch {
      toast.error("Error saving document")
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
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a07040", marginBottom: 4
  }

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>Franchise Billing Center</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
            Create brand setup quotations, setup fee invoices, and manage security deposits.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background: BROWN, color: GOLD, border: "none", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6
        }}>
          + Generate {activeTab === "invoices" ? "Invoice" : "Quotation"}
        </button>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, borderBottom: `2px solid ${BORDER}`, paddingBottom: 2 }}>
          <button onClick={() => { setActiveTab("invoices"); loadInvoices() }} style={{
            background: "none", border: "none", padding: "10px 20px", fontSize: 14, fontWeight: 700,
            color: activeTab === "invoices" ? BROWN : "#a07040", cursor: "pointer",
            borderBottom: activeTab === "invoices" ? `3px solid ${GOLD}` : "3px solid transparent",
            transition: "all 0.2s"
          }}>
            Brand Invoices
          </button>
          <button onClick={() => { setActiveTab("quotes"); loadQuotes() }} style={{
            background: "none", border: "none", padding: "10px 20px", fontSize: 14, fontWeight: 700,
            color: activeTab === "quotes" ? BROWN : "#a07040", cursor: "pointer",
            borderBottom: activeTab === "quotes" ? `3px solid ${GOLD}` : "3px solid transparent",
            transition: "all 0.2s"
          }}>
            Deal Quotations
          </button>
        </div>

        {/* Table / List */}
        <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#a07040" }}>Loading franchises...</div>
          ) : activeTab === "invoices" ? (
            <>
              {/* Desktop view */}
              <div style={{ display: "none" }} className="desktop-view-block">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: `1px solid ${BORDER}` }}>
                      {["Invoice ID", "Franchise Branch", "Issue Date", "Item Description", "Total Amount (Inc. GST)", "Status", "Action"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <tr key={inv.id} style={{ borderBottom: idx < invoices.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: BROWN }}>{inv.id}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: BROWN }}>{inv.franchiseName}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#a07040" }}>{inv.date}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: BROWN }}>{inv.type}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: BROWN }}>₹{inv.amount.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                            background: inv.status === "paid" ? "#f0fdf4" : inv.status === "pending" ? "#fef9ec" : "#fef2f2",
                            color: inv.status === "paid" ? "#16a34a" : inv.status === "pending" ? "#b08030" : "#dc2626"
                          }}>{inv.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <button onClick={() => setSelectedItem(inv)} style={{
                            fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
                            background: "transparent", border: `1px solid ${BORDER}`, color: BROWN, cursor: "pointer"
                          }}>Print / View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="mobile-view-block" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
                {invoices.map(inv => (
                  <div key={inv.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: BROWN }}>{inv.id} - {inv.franchiseName}</strong>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                        background: inv.status === "paid" ? "#f0fdf4" : inv.status === "pending" ? "#fef9ec" : "#fef2f2",
                        color: inv.status === "paid" ? "#16a34a" : inv.status === "pending" ? "#b08030" : "#dc2626"
                      }}>{inv.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: BROWN }}><strong>Type:</strong> {inv.type}</div>
                    <div style={{ fontSize: 12, color: BROWN }}><strong>Amount:</strong> ₹{inv.amount.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 11, color: "#a07040" }}><strong>Date:</strong> {inv.date}</div>
                    <button onClick={() => setSelectedItem(inv)} style={{ marginTop: 6, width: "100%", height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${BORDER}`, fontSize: 11, color: BROWN, cursor: "pointer" }}>Print / Details</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Desktop view */}
              <div style={{ display: "none" }} className="desktop-view-block">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: `1px solid ${BORDER}` }}>
                      {["Quote ID", "Candidate Name", "Create Date", "Total Value", "Validity Period", "Status", "Action"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((qt, idx) => (
                      <tr key={qt.id} style={{ borderBottom: idx < quotes.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: BROWN }}>{qt.id}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: BROWN }}>{qt.franchiseName}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#a07040" }}>{qt.date}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: BROWN }}>₹{qt.amount.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: BROWN }}>Until {qt.validity}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                            background: qt.status === "accepted" ? "#f0fdf4" : "#eff6ff",
                            color: qt.status === "accepted" ? "#16a34a" : "#1d4ed8"
                          }}>{qt.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <button onClick={() => setSelectedItem(qt)} style={{
                            fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
                            background: "transparent", border: `1px solid ${BORDER}`, color: BROWN, cursor: "pointer"
                          }}>Print / View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="mobile-view-block" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
                {quotes.map(qt => (
                  <div key={qt.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: BROWN }}>{qt.id} - {qt.franchiseName}</strong>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                        background: qt.status === "accepted" ? "#f0fdf4" : "#eff6ff",
                        color: qt.status === "accepted" ? "#16a34a" : "#1d4ed8"
                      }}>{qt.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: BROWN }}><strong>Amount:</strong> ₹{qt.amount.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 11, color: "#a07040" }}><strong>Validity:</strong> {qt.validity}</div>
                    <button onClick={() => setSelectedItem(qt)} style={{ marginTop: 6, width: "100%", height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${BORDER}`, fontSize: 11, color: BROWN, cursor: "pointer" }}>Print / Details</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowAdd(false)}>
          <form onSubmit={handleSubmit} style={{ background: CREAM, borderRadius: 20, padding: 24, width: "100%", maxWidth: 540, border: `1px solid ${BORDER}`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: BROWN }}>
                Generate {activeTab === "invoices" ? "Franchise Setup Invoice" : "Setup Quotation Proposal"}
              </h3>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Existing Franchise Branch</label>
                  <select style={inputStyle} value={form.franchiseId} onChange={e => setForm({ ...form, franchiseId: e.target.value })}>
                    <option value="">-- Select or type Candidate Name --</option>
                    {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>OR Candidate Name (For Quotes)</label>
                  <input placeholder="e.g. Pune Lead Candidate" style={inputStyle} value={form.candidateName} onChange={e => setForm({ ...form, candidateName: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Billing Item Type</label>
                  <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="Setup Fee">Setup Fee</option>
                    <option value="Branding & Marketing Fee">Branding & Marketing Fee</option>
                    <option value="Security Deposit Only">Security Deposit Only</option>
                    <option value="Full Package Deal">Full Package Deal</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Status (For Invoices)</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="paid">PAID</option>
                    <option value="pending">PENDING / PARTIAL</option>
                    <option value="unpaid">UNPAID</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Franchise Setup Fee (₹)</label>
                  <input type="number" style={inputStyle} value={form.setupFee} onChange={e => setForm({ ...form, setupFee: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Security Deposit (₹)</label>
                  <input type="number" style={inputStyle} value={form.securityDeposit} onChange={e => setForm({ ...form, securityDeposit: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>GST Tax Rate (%)</label>
                  <input type="number" style={inputStyle} value={form.gstRate} onChange={e => setForm({ ...form, gstRate: e.target.value })} />
                </div>
              </div>

              {/* Real-time total calculation panel */}
              <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: BROWN }}>
                  <span>Setup Fee + Security Deposit:</span>
                  <span style={{ fontWeight: 700 }}>₹{(parseFloat(form.setupFee || "0") + parseFloat(form.securityDeposit || "0")).toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: BROWN, marginTop: 4 }}>
                  <span>GST Tax ({form.gstRate}% on Setup Fee):</span>
                  <span style={{ fontWeight: 700 }}>₹{(parseFloat(form.setupFee || "0") * (parseFloat(form.gstRate || "18") / 100)).toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: BROWN, marginTop: 8, borderTop: "1px solid rgba(201,168,76,0.15)", paddingTop: 8 }}>
                  <strong>Auto Calculated Total Value:</strong>
                  <strong>₹{calculatedTotal.toLocaleString("en-IN")}</strong>
                </div>
              </div>

            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, height: 38, borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex: 1, height: 38, borderRadius: 8, border: "none", background: BROWN, color: GOLD, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{saving ? "Saving..." : "Generate & Save"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Styled Printable Preview Modal */}
      {selectedItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedItem(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640, border: `1px solid ${BORDER}`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: CREAM }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: BROWN }}>Document Viewer: {selectedItem.id}</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Document Body (Print Layout style) */}
            <div id="billing-print-doc" style={{ padding: 30, color: "#333", fontSize: 13, fontFamily: "serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #333", paddingBottom: 15 }}>
                <div>
                  <h2 style={{ margin: 0, fontStyle: "italic", color: BROWN }}>SAFAWALA BRAND</h2>
                  <span style={{ fontSize: 10, color: "#666" }}>Corporate Franchise Acquisition Division</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <h3 style={{ margin: 0, color: BROWN }}>{selectedItem.id.startsWith("QT") ? "QUOTATION PROPOSAL" : "INVOICE"}</h3>
                  <span style={{ fontSize: 11 }}>Date: {selectedItem.date}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                <div>
                  <strong style={{ fontSize: 11, color: "#666" }}>ISSUED BY:</strong>
                  <div style={{ marginTop: 4 }}>
                    <strong>Safawala Corporate</strong><br />
                    101 Gold Tower, Corporate Area<br />
                    Vadodara, Gujarat
                  </div>
                </div>
                <div>
                  <strong style={{ fontSize: 11, color: "#666" }}>ISSUED TO (BRANCH CANDIDATE):</strong>
                  <div style={{ marginTop: 4 }}>
                    <strong>{selectedItem.franchiseName}</strong><br />
                    Acquisition Agreement setup account
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 30, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333", fontWeight: 700 }}>
                    <th style={{ padding: "8px 0" }}>Item Description</th>
                    <th style={{ padding: "8px 0", textAlign: "right" }}>Subtotal Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "12px 0" }}>Franchise Acquisition Brand Fee & Setup Fee (Includes Brand Licensing rights, training program, setup collateral)</td>
                    <td style={{ padding: "12px 0", textAlign: "right" }}>₹{Number(selectedItem.setupFee || selectedItem.amount * 0.82).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "12px 0" }}>Refundable Brand Security Deposit</td>
                    <td style={{ padding: "12px 0", textAlign: "right" }}>₹{Number(selectedItem.securityDeposit || selectedItem.amount * 0.18).toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ borderTop: "2px solid #333", marginTop: 30, paddingTop: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <div>GST Tax ({selectedItem.gstRate || 18}% on Setup Fee): ₹{(Number(selectedItem.setupFee || 0) * ((selectedItem.gstRate || 18) / 100)).toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Total Due Value: ₹{Number(selectedItem.amount).toLocaleString("en-IN")}</div>
              </div>

              <div style={{ marginTop: 40, borderTop: "1px dashed #ccc", paddingTop: 15, fontSize: 11, color: "#666" }}>
                <strong>Terms:</strong> Standard corporate acquisition policies apply. This document is system-generated and does not require manual signature.
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: 10, background: CREAM }}>
              <button onClick={() => {
                const win = window.open("", "_blank", "width=800,height=900")
                if (!win) return
                const docEl = document.getElementById("billing-print-doc")
                win.document.write(`<html><head><title>Safawala Invoice</title><style>body{font-family:serif;font-size:13px;padding:40px;color:#333;line-height:1.6}table{width:100%;border-collapse:collapse}th,td{padding:8px 0}@media print{body{padding:20px}}</style></head><body>${docEl?.innerHTML || ""}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`)
                win.document.close()
              }} style={{ padding: "8px 16px", borderRadius: 8, background: BROWN, color: GOLD, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Print Document</button>
              <button onClick={() => setSelectedItem(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: BROWN, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>

          </div>
        </div>
      )}

      {/* Styled class selectors responsive overrides */}
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
