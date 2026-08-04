"use client"

import { useState } from "react"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh"]

const BUDGETS = ["₹5 – 15 Lakhs","₹15 – 25 Lakhs","₹25 – 50 Lakhs","₹50 Lakhs+"]
const PROFESSIONS = ["Business Owner","Service Professional","Government Employee","Retired","Student","Homemaker","Other"]
const LEAD_SOURCES = ["Instagram","Facebook","Google Search","Friend / Referral","Walk-in / Event","Exhibition / Trade Show","YouTube","WhatsApp","Other"]
const CALLBACK_TIMES = ["Morning (9 AM – 12 PM)","Afternoon (12 PM – 3 PM)","Evening (3 PM – 6 PM)","Night (6 PM – 9 PM)","Anytime"]
const TURNOVERS = ["Not applicable","Under ₹5 Lakhs / year","₹5 – 20 Lakhs / year","₹20 – 50 Lakhs / year","Above ₹50 Lakhs / year"]

const BENEFITS = [
  { icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  ), text: "Exclusive territory rights in your city" },
  { icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
  ), text: "Ready-made product catalog & stock support" },
  { icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
  ), text: "Full CRM, billing & operations software" },
  { icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2.77h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg>
  ), text: "Marketing & social media support" },
  { icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  ), text: "Complete training & onboarding program" },
  { icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ), text: "ROI achievable within 12–18 months" },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b5a2b" }}>
        {label}{required && <span style={{ color: GOLD, marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 42, borderRadius: 8, border: "1.5px solid #e8ddd0",
  padding: "0 12px", fontSize: 13, outline: "none", background: CREAM,
  color: BROWN, boxSizing: "border-box", fontFamily: "inherit",
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%238b5a2b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  paddingRight: 32,
}

export default function FranchiseEnquiryPage() {
  const [form, setForm] = useState({
    full_name: "", whatsapp: "", email: "", city: "", state: "",
    pincode: "", investment_budget: "", current_profession: "",
    years_in_business: "", has_space: "", space_size: "",
    lead_source: "", callback_time: "", annual_turnover: "",
    territory_interest: "", message: "",
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.whatsapp || !form.city) {
      setError("Please fill in Name, WhatsApp and City.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/franchise-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: WARM, fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23c9a84c' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    }}>

      {/* Minimal Header — logo only */}
      <header style={{
        background: "rgba(253,246,237,0.97)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BORDER}`,
        padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <img src="/safawalalogo.svg" alt="Safawala" style={{ height: 36, objectFit: "contain" }} />
      </header>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 20px 64px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-block", background: "rgba(201,168,76,0.12)",
            border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20,
            padding: "5px 16px", fontSize: 11, fontWeight: 700,
            color: "#8b5a2b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14,
          }}>
            Franchise Opportunity 2026
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, color: BROWN, lineHeight: 1.15, margin: "0 0 12px" }}>
            Be the Wedding King<br />of Your City
          </h1>
          <p style={{ fontSize: "clamp(14px, 2vw, 16px)", color: "#8b5a2b", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Join India's fastest growing wedding accessories brand. Low investment, exclusive territory, full support — from day one.
          </p>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
          background: "rgba(201,168,76,0.2)", borderRadius: 14, overflow: "hidden",
          border: "1px solid rgba(201,168,76,0.25)", marginBottom: 44,
        }} className="stats-bar">
          {[
            { num: "11+", label: "Active Franchises" },
            { num: "5,000+", label: "Weddings Served" },
            { num: "₹7–10L", label: "Avg Monthly Revenue" },
            { num: "12–18 mo", label: "ROI Timeline" },
          ].map((s, i) => (
            <div key={i} style={{
              background: CREAM, padding: "18px 16px", textAlign: "center",
              borderRight: i < 3 ? "1px solid rgba(201,168,76,0.2)" : "none",
            }}>
              <div style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, color: BROWN }}>{s.num}</div>
              <div style={{ fontSize: "clamp(10px, 1.5vw, 11px)", color: "#8b5a2b", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column: benefits left, form right */}
        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 44, alignItems: "start" }}>

          {/* Left: Benefits */}
          <div>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700, color: BROWN, margin: "0 0 8px" }}>
              Why Partner with Safawala?
            </h2>
            <p style={{ fontSize: 14, color: "#8b5a2b", lineHeight: 1.7, margin: "0 0 28px" }}>
              Safawala is a premium wedding accessories rental and sales brand. We give you everything you need to run a profitable business in your city — products, training, software, and brand power.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
              {BENEFITS.map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "rgba(253,246,237,0.85)", borderRadius: 12,
                  border: `1px solid ${BORDER}`, padding: "13px 16px",
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{b.icon}</div>
                  <div style={{ fontSize: 13, color: BROWN, fontWeight: 500, lineHeight: 1.4 }}>{b.text}</div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div style={{
              background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`,
              padding: "22px 24px", borderLeft: `4px solid ${GOLD}`,
            }}>
              <p style={{ fontSize: 14, color: BROWN, fontStyle: "italic", lineHeight: 1.7, margin: "0 0 14px" }}>
                "I started my Safawala franchise in Pune with just a small shop. In 8 months I crossed ₹10L monthly revenue. The team support is incredible."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${GOLD}, #8b6914)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "#fff",
                }}>R</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>Rahul Sharma</div>
                  <div style={{ fontSize: 11, color: "#8b5a2b" }}>Safawala Franchise Owner — Pune</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div style={{
            background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)",
            borderRadius: 20, border: `1px solid rgba(201,168,76,0.3)`,
            boxShadow: "0 8px 40px rgba(61,28,2,0.1), 0 2px 8px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            {/* Form header */}
            <div style={{
              background: `linear-gradient(135deg, ${BROWN} 0%, #5c2d0a 100%)`,
              padding: "22px 26px",
            }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#fff" }}>
                Franchise Enquiry Form
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(201,168,76,0.8)" }}>
                Our team will contact you within 24 working hours
              </p>
            </div>

            {submitted ? (
              <div style={{ padding: "44px 26px", textAlign: "center" }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "rgba(201,168,76,0.12)", border: `2px solid ${GOLD}`,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: BROWN, margin: "0 0 10px" }}>Enquiry Submitted!</h3>
                <p style={{ fontSize: 14, color: "#8b5a2b", lineHeight: 1.7, margin: "0 0 24px" }}>
                  Thank you for your interest in a Safawala franchise. Our team will contact you on WhatsApp within 24 working hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ full_name:"",whatsapp:"",email:"",city:"",state:"",pincode:"",investment_budget:"",current_profession:"",years_in_business:"",has_space:"",space_size:"",lead_source:"",callback_time:"",annual_turnover:"",territory_interest:"",message:"" }) }}
                  style={{ background: "none", border: `1.5px solid ${GOLD}`, color: BROWN, fontSize: 13, fontWeight: 600, padding: "10px 24px", borderRadius: 10, cursor: "pointer" }}
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}>

                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>{error}</div>
                )}

                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>
                  Personal Information
                </div>

                <div className="form-grid-2">
                  <Field label="Full Name" required>
                    <input style={inputStyle} placeholder="Your full name" value={form.full_name} onChange={e => set("full_name", e.target.value)} required />
                  </Field>
                  <Field label="WhatsApp Number" required>
                    <input style={inputStyle} placeholder="+91 98765 43210" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} required />
                  </Field>
                  <Field label="Email Address">
                    <input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
                  </Field>
                  <Field label="Current Profession">
                    <select style={selectStyle} value={form.current_profession} onChange={e => set("current_profession", e.target.value)}>
                      <option value="">Select...</option>
                      {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `1px solid ${BORDER}`, paddingBottom: 6, marginTop: 2 }}>
                  Location Details
                </div>

                <div className="form-grid-3">
                  <Field label="City" required>
                    <input style={inputStyle} placeholder="Your city" value={form.city} onChange={e => set("city", e.target.value)} required />
                  </Field>
                  <Field label="State">
                    <select style={selectStyle} value={form.state} onChange={e => set("state", e.target.value)}>
                      <option value="">Select state</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Pincode">
                    <input style={inputStyle} placeholder="400001" maxLength={6} value={form.pincode} onChange={e => set("pincode", e.target.value)} />
                  </Field>
                </div>

                <Field label="Preferred Territory / Area of Interest">
                  <input style={inputStyle} placeholder="e.g. Western suburbs of Mumbai, entire Nashik district..." value={form.territory_interest} onChange={e => set("territory_interest", e.target.value)} />
                </Field>

                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `1px solid ${BORDER}`, paddingBottom: 6, marginTop: 2 }}>
                  Business Details
                </div>

                <div className="form-grid-2">
                  <Field label="Investment Budget">
                    <select style={selectStyle} value={form.investment_budget} onChange={e => set("investment_budget", e.target.value)}>
                      <option value="">Select range...</option>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Years in Business / Work">
                    <select style={selectStyle} value={form.years_in_business} onChange={e => set("years_in_business", e.target.value)}>
                      <option value="">Select...</option>
                      {["Fresher / Student","1–2 years","3–5 years","5–10 years","10+ years"].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <Field label="Current Annual Business Turnover">
                    <select style={selectStyle} value={form.annual_turnover} onChange={e => set("annual_turnover", e.target.value)}>
                      <option value="">Select...</option>
                      {TURNOVERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Do you have a shop / space?">
                    <select style={selectStyle} value={form.has_space} onChange={e => set("has_space", e.target.value)}>
                      <option value="">Select...</option>
                      {["Yes — owned","Yes — rented","No — looking for space","No — will arrange later"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>

                {form.has_space?.startsWith("Yes") && (
                  <Field label="Available Space Size (sq ft)">
                    <input style={inputStyle} placeholder="e.g. 500 sq ft" value={form.space_size} onChange={e => set("space_size", e.target.value)} />
                  </Field>
                )}

                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `1px solid ${BORDER}`, paddingBottom: 6, marginTop: 2 }}>
                  Contact Preferences
                </div>

                <div className="form-grid-2">
                  <Field label="How did you hear about us?">
                    <select style={selectStyle} value={form.lead_source} onChange={e => set("lead_source", e.target.value)}>
                      <option value="">Select source...</option>
                      {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Preferred Callback Time">
                    <select style={selectStyle} value={form.callback_time} onChange={e => set("callback_time", e.target.value)}>
                      <option value="">Select time...</option>
                      {CALLBACK_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Message / Questions">
                  <textarea
                    style={{ ...inputStyle, height: 80, padding: "10px 12px", resize: "vertical" } as React.CSSProperties}
                    placeholder="Tell us more about yourself or any questions you have..."
                    value={form.message}
                    onChange={e => set("message", e.target.value)}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%", height: 48, borderRadius: 12, border: "none",
                    background: loading ? "#b0956a" : `linear-gradient(135deg, ${BROWN} 0%, #5c2d0a 100%)`,
                    color: GOLD, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginTop: 4,
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.3)", borderTopColor: GOLD, animation: "spin 0.8s linear infinite" }} />
                      Submitting...
                    </>
                  ) : "Submit Franchise Enquiry →"}
                </button>

                <p style={{ fontSize: 11, color: "#8b5a2b", textAlign: "center", margin: "2px 0 0", lineHeight: 1.5 }}>
                  By submitting you agree to be contacted by the Safawala team on WhatsApp & phone.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: BROWN, padding: "22px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(201,168,76,0.7)", margin: 0 }}>
          © 2026 Safawala.com by Ronak · All franchise territories are exclusive · Franchise Opportunity 2026
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 860px) {
          .main-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (max-width: 600px) {
          .stats-bar { grid-template-columns: repeat(2, 1fr) !important; }
          .stats-bar > div:nth-child(2) { border-right: none !important; }
          .stats-bar > div:nth-child(1), .stats-bar > div:nth-child(2) { border-bottom: 1px solid rgba(201,168,76,0.2); }
        }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 500px) {
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .form-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 400px) {
          .stats-bar { grid-template-columns: 1fr 1fr !important; }
        }
        select option { background: #fdf6ed; color: #3d1c02; }
        input:focus, select:focus, textarea:focus {
          border-color: #c9a84c !important;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }
      `}</style>
    </div>
  )
}
