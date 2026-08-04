"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

const DOCUMENT_TYPES = [
  { value: "agreement", label: "Franchise Agreement" },
  { value: "loi", label: "Letter of Intent (LOI)" },
  { value: "nda", label: "Non-Disclosure Agreement (NDA)" },
  { value: "renewal", label: "Renewal Letter" },
  { value: "termination", label: "Termination Letter" },
]

export default function FranchiseLegalsPage() {
  const [franchises, setFranchises] = useState<any[]>([])
  const [selectedDoc, setSelectedDoc] = useState("agreement")
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("")
  const [loading, setLoading] = useState(true)

  // Document Fields
  const [fields, setFields] = useState({
    startDate: "2026-07-01",
    endDate: "2031-07-01",
    fee: "1000000",
    territory: "Gujarat Central",
    tokenAmount: "200000",
    validUntil: "2026-08-01",
    ndaDuration: "5 Years",
    renewalDate: "2031-07-01",
    revisedCommission: "18",
    terminationDate: "2026-07-31",
    terminationReason: "Non-compliance with corporate brand guidelines and royalty remittance policies."
  })

  useEffect(() => {
    fetch("/api/franchises")
      .then(r => r.json())
      .then(d => {
        const list = d.data ?? d ?? []
        setFranchises(list)
        if (list.length > 0) {
          setSelectedFranchiseId(list[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectedBranch = useMemo(() => {
    return franchises.find(f => f.id === selectedFranchiseId) || {
      name: "Vadodara Branch",
      owner_name: "Rahul Sharma",
      address: "102 Royal Square, Alkapuri",
      city: "Vadodara",
      state: "Gujarat",
      pincode: "390007"
    }
  }, [franchises, selectedFranchiseId])

  // Dynamic template text compiles based on chosen document type and fields
  const documentPreviewContent = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    
    switch (selectedDoc) {
      case "agreement":
        return `
FRANCHISE OUTLET AGREEMENT

This Franchise Agreement (the "Agreement") is executed on this ${todayStr} by and between:

SAFAWALA CORPORATE, having its primary office at Vadodara, Gujarat (hereinafter referred to as the "Franchisor")

AND

${selectedBranch.name.toUpperCase()} (represented by Owner: ${selectedBranch.owner_name || "—"}), located at ${selectedBranch.address || "—"}, ${selectedBranch.city || "—"}, ${selectedBranch.state || "—"} - ${selectedBranch.pincode || "—"} (hereinafter referred to as the "Franchisee").

WHEREAS:
1. Franchisor owns and operates the premium wedding accessory brand "Safawala".
2. Franchisee desires to obtain license rights to open and operate a franchise branch in the designated territory: ${fields.territory || "—"}.

NOW, THEREFORE, IT IS AGREED AS FOLLOWS:
- License: Franchisor grants Franchisee a non-transferable license to utilize the Safawala brand names, catalog pricing, and software.
- Franchise Setup Fee: Franchisee shall pay a setup fee of ₹${parseFloat(fields.fee || "0").toLocaleString("en-IN")} (plus GST).
- Term: This Agreement is valid starting ${fields.startDate} and expires on ${fields.endDate} unless terminated earlier.
- Commission/Royalty: Franchisee agrees to pay a standard commission on sales as configured in the central ledger.

IN WITNESS WHEREOF, the parties hereto have set their hands on the date first written above.

_____________________                   _____________________
For Safawala Corporate                  For Franchise Branch
(Franchisor)                            (Franchisee)
`

      case "loi":
        return `
LETTER OF INTENT (LOI)

Date: ${todayStr}

To,
${selectedBranch.owner_name || "Applicant Name"}
Proposed Franchise Owner, ${selectedBranch.city || "City"}

Subject: Letter of Intent for Safawala Franchise Acquisition

Dear ${selectedBranch.owner_name || "Sir/Madam"},

We are pleased to issue this Letter of Intent (LOI) to establish a new Safawala franchise branch in ${selectedBranch.city || "—"}, ${selectedBranch.state || "—"}.

Terms of Intent:
1. Token Deposit: A token booking amount of ₹${parseFloat(fields.tokenAmount || "0").toLocaleString("en-IN")} is paid herewith to temporarily lock the territory.
2. Final Agreement: Both parties intend to execute the comprehensive Franchise Outlet Agreement on or before ${fields.validUntil}.
3. Validity: This LOI shall remain valid until ${fields.validUntil}, after which it will expire if not signed off.

We look forward to a successful corporate partnership.

Yours sincerely,

For Safawala Corporate
Acquisition Lead
`

      case "nda":
        return `
NON-DISCLOSURE AGREEMENT (NDA)

This Non-Disclosure Agreement is entered into on ${todayStr} by and between Safawala Corporate ("Disclosing Party") and ${selectedBranch.name} ("Receiving Party").

1. Confidential Information: Receiving Party agrees to hold in strict confidence all business processes, warehouse inventory algorithms, custom fabric details, and software layouts of Safawala.
2. Duration: This obligation of confidentiality shall remain active for a duration of ${fields.ndaDuration} from the execution date.
3. Breach: Any breach of this confidentiality policy will result in immediate termination of licensing rights and legal claims.

Executed on the date first written above.

_____________________                   _____________________
For Safawala Corporate                  For Franchise Branch
`

      case "renewal":
        return `
AGREEMENT RENEWAL ADDENDUM

Date: ${todayStr}

This addendum extends the Franchise Outlet Agreement executed between Safawala Corporate and ${selectedBranch.name}.

Renewal Terms:
1. Extension Date: The franchise agreement is hereby renewed and extended until ${fields.renewalDate}.
2. Revised Commissions: Standard franchise royalty/commission rate is configured at ${fields.revisedCommission}% of total billings.
3. Brand Guidelines: All other terms of the original agreement remain fully operational.

_____________________                   _____________________
For Safawala Corporate                  For Franchise Branch
`

      case "termination":
        return `
FRANCHISE TERMINATION NOTICE

Date: ${todayStr}

To,
${selectedBranch.name}
Attn: ${selectedBranch.owner_name || "Owner"}

Subject: Notice of Franchise Termination

Dear ${selectedBranch.owner_name || "Sir/Madam"},

This is to inform you that the Franchise Outlet Agreement for ${selectedBranch.name} is hereby officially terminated effective ${fields.terminationDate}.

Reason for Termination:
${fields.terminationReason}

Next Steps:
1. Immediately cease usage of the brand logo, name "Safawala", and packaging.
2. Settle all outstanding royalties and return booked rental stocks back to main warehouse within 7 business days.

_____________________
For Safawala Corporate
Compliance Director
`
      default:
        return ""
    }
  }, [selectedDoc, selectedBranch, fields])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(documentPreviewContent.trim())
    toast.success("Document text copied to clipboard!")
  }

  const printDocument = () => {
    const content = documentPreviewContent.trim()
    const win = window.open("", "_blank", "width=800,height=900")
    if (!win) return
    win.document.write(`
      <html><head><title>Safawala Legal Document</title>
      <style>
        body { font-family: serif; font-size: 13px; color: #333; padding: 40px 60px; line-height: 1.7; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
        @media print { body { padding: 20px 40px; } }
      </style></head>
      <body><pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
      </body></html>
    `)
    win.document.close()
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
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>Franchise Legal Center</h1>
        <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
          Generate legal documents such as agreements, NDAs, Letters of Intent (LOIs), renewals, and termination notices.
        </p>
      </div>

      <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: 20 }} className="legals-responsive-grid">
        
        {/* Form Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: BROWN }}>1. Select Document Template</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Document Type</label>
                <select style={inputStyle} value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}>
                  {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Select Franchise</label>
                <select style={inputStyle} value={selectedFranchiseId} onChange={e => setSelectedFranchiseId(e.target.value)}>
                  {franchises.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: BROWN }}>2. Customize Template Fields</h3>
            
            {/* Agreement fields */}
            {selectedDoc === "agreement" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Agreement Start Date</label>
                  <input type="date" style={inputStyle} value={fields.startDate} onChange={e => setFields({ ...fields, startDate: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Agreement End Date</label>
                  <input type="date" style={inputStyle} value={fields.endDate} onChange={e => setFields({ ...fields, endDate: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Setup Fee Amount (₹)</label>
                  <input type="number" style={inputStyle} value={fields.fee} onChange={e => setFields({ ...fields, fee: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Granted Territory</label>
                  <input style={inputStyle} value={fields.territory} onChange={e => setFields({ ...fields, territory: e.target.value })} />
                </div>
              </div>
            )}

            {/* LOI fields */}
            {selectedDoc === "loi" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Token Deposit Amount (₹)</label>
                  <input type="number" style={inputStyle} value={fields.tokenAmount} onChange={e => setFields({ ...fields, tokenAmount: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Proposal Valid Until</label>
                  <input type="date" style={inputStyle} value={fields.validUntil} onChange={e => setFields({ ...fields, validUntil: e.target.value })} />
                </div>
              </div>
            )}

            {/* NDA fields */}
            {selectedDoc === "nda" && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Confidentiality Duration</label>
                <input style={inputStyle} value={fields.ndaDuration} onChange={e => setFields({ ...fields, ndaDuration: e.target.value })} />
              </div>
            )}

            {/* Renewal fields */}
            {selectedDoc === "renewal" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>New Extension Date</label>
                  <input type="date" style={inputStyle} value={fields.renewalDate} onChange={e => setFields({ ...fields, renewalDate: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Revised Commission Rate (%)</label>
                  <input type="number" style={inputStyle} value={fields.revisedCommission} onChange={e => setFields({ ...fields, revisedCommission: e.target.value })} />
                </div>
              </div>
            )}

            {/* Termination fields */}
            {selectedDoc === "termination" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Effective Termination Date</label>
                  <input type="date" style={inputStyle} value={fields.terminationDate} onChange={e => setFields({ ...fields, terminationDate: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Termination Reason</label>
                  <textarea rows={3} style={{ ...inputStyle, height: 70, padding: 8, resize: "vertical" }} value={fields.terminationReason} onChange={e => setFields({ ...fields, terminationReason: e.target.value })} />
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Live Document Preview Sheet */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>Document Preview Sheet</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyToClipboard} style={{
                background: "transparent", border: `1.5px solid ${BORDER}`, borderRadius: 8,
                padding: "6px 12px", fontSize: 11, fontWeight: 700, color: BROWN, cursor: "pointer"
              }}>
                Copy Text
              </button>
              <button onClick={printDocument} style={{
                background: BROWN, border: "none", borderRadius: 8,
                padding: "6px 14px", fontSize: 11, fontWeight: 700, color: GOLD, cursor: "pointer"
              }}>
                Print / Download
              </button>
            </div>
          </div>

          <div style={{
            background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.04)", padding: "40px 30px",
            minHeight: 500, fontFamily: "serif", fontSize: 13, color: "#333",
            lineHeight: "1.6", whiteSpace: "pre-wrap", boxSizing: "border-box"
          }}>
            {documentPreviewContent.trim()}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .legals-responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}
