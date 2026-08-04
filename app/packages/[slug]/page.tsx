"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  PhoneCall, MessageCircle, Loader2, AlertCircle,
  Sparkles, Send, X, CheckCircle, ChevronRight
} from "lucide-react"

interface PriceLink {
  id: string
  label: string
  custom_prices: Record<string, number>
  is_active: boolean
}

interface Variant {
  id: string
  name: string
  base_price: number
  category_id: string
  inclusions?: string[]
}

interface Category {
  id: string
  name: string
  display_order?: number
}

const WHATSAPP_NUMBER = "919725295692"
const CALL_NUMBER = "+919725295691"

// ─── Header ──────────────────────────────────────────────────────
function Header() {
  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
      <Image src="/safawalalogo.png" alt="Safawala" width={100} height={44} style={{ objectFit: "contain" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#22c55e", color: "#fff", fontWeight: 600, fontSize: 12, borderRadius: 9, padding: "7px 12px", textDecoration: "none" }}>
          <MessageCircle style={{ width: 13, height: 13 }} /> Catalogue
        </a>
        <a href={`tel:${CALL_NUMBER}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 12, borderRadius: 9, padding: "7px 12px", textDecoration: "none" }}>
          <PhoneCall style={{ width: 13, height: 13 }} /> Call Us
        </a>
      </div>
    </header>
  )
}

// ─── Explain Popup ────────────────────────────────────────────────
function ExplainPopup({ variant, price, category, onClose }: {
  variant: Variant; price: number; category?: Category; onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [explanation, setExplanation] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const explain = async () => {
      try {
        const res = await fetch("/api/public/explain-package", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant_name: variant.name,
            price,
            inclusions: variant.inclusions || [],
            category_name: category?.name || "",
          }),
        })
        const data = await res.json()
        if (data.success) setExplanation(data.explanation)
        else setError("Could not generate explanation. Please call us!")
      } catch {
        setError("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    explain()
  }, [])

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, padding: "0" }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 540, padding: "28px 24px 36px", boxSizing: "border-box" }}
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 99, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ede9fe", color: "#7c3aed", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px", marginBottom: 6 }}>
              <Sparkles style={{ width: 11, height: 11 }} /> AI Explanation
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>{variant.name}</h3>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5", margin: "4px 0 0" }}>₹{price.toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X style={{ width: 16, height: 16, color: "#6b7280" }} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", gap: 10 }}>
            <Loader2 style={{ width: 28, height: 28, color: "#7c3aed", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 13, color: "#6b7280" }}>Generating explanation…</p>
          </div>
        ) : error ? (
          <div style={{ background: "#fee2e2", borderRadius: 12, padding: "14px 16px", color: "#b91c1c", fontSize: 13, display: "flex", gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        ) : (
          <div style={{ background: "#faf5ff", borderRadius: 14, padding: "16px 18px", border: "1px solid #e9d5ff" }}>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, margin: 0 }}>{explanation}</p>
          </div>
        )}

        {variant.inclusions && variant.inclusions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>What's included</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {variant.inclusions.map((inc, i) => (
                <span key={i} style={{ fontSize: 12, background: "#f3f4f6", color: "#374151", borderRadius: 6, padding: "4px 10px", fontWeight: 500 }}>
                  {inc}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose}
          style={{ width: "100%", marginTop: 20, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Got it!
        </button>
      </div>
    </div>
  )
}

// ─── Enquire Popup ────────────────────────────────────────────────
function EnquirePopup({ variant, price, linkId, linkLabel, onClose }: {
  variant: Variant; price: number; linkId: string; linkLabel: string; onClose: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("+91")
  const [date, setDate] = useState("")
  const [location, setLocation] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required."); return }
    setLoading(true); setError("")

    try {
      const formattedDate = date
        ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : ""

      // Save to leads
      await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          event_date: date || null,
          message: [
            `Package: ${variant.name} at ₹${price.toLocaleString("en-IN")}`,
            location.trim() ? `Location: ${location.trim()}` : "",
            message.trim() ? message.trim() : "",
          ].filter(Boolean).join("\n"),
          source: "package_link",
          link_label: linkLabel,
          price_link_id: linkId,
        }),
      })

      setSubmitted(true)

      // Open WhatsApp
      const waText = encodeURIComponent(
        `Hi Safawala! I'm interested in *${variant.name}* at *₹${price.toLocaleString("en-IN")}*.\n\n` +
        `*Name:* ${name.trim()}\n` +
        `*Phone:* ${phone.trim()}\n` +
        (formattedDate ? `*Event Date:* ${formattedDate}\n` : "") +
        (location.trim() ? `*Event Location:* ${location.trim()}\n` : "") +
        (message.trim() ? `*Message:* ${message.trim()}\n` : "") +
        `\n_Sent from Safawala custom quote_`
      )
      setTimeout(() => {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`, "_blank")
      }, 500)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb",
    borderRadius: 10, fontSize: 14, background: "#f9fafb", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box", color: "#111827",
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 540, padding: "28px 24px 36px", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 99, margin: "0 auto 20px" }} />

        {submitted ? (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <CheckCircle style={{ width: 52, height: 52, color: "#22c55e", margin: "0 auto 14px" }} />
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#15803d", marginBottom: 8 }}>Enquiry Sent!</h3>
            <p style={{ fontSize: 14, color: "#166534", marginBottom: 20 }}>
              WhatsApp is opening with your details. We'll get back to you very soon!
            </p>
            <button onClick={onClose} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Enquire Now</h3>
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{variant.name} · <span style={{ color: "#4f46e5", fontWeight: 700 }}>₹{price.toLocaleString("en-IN")}</span></p>
              </div>
              <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 16, height: 16, color: "#6b7280" }} />
              </button>
            </div>

            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12, display: "flex", gap: 8 }}>
                <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={inputStyle} placeholder="Your Name *" value={name} onChange={e => setName(e.target.value)} required />
              <input style={inputStyle} placeholder="Phone Number *" value={phone} onChange={e => setPhone(e.target.value)} type="tel" required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Select Event Date</label>
                  <input style={inputStyle} value={date} onChange={e => setDate(e.target.value)} type="date" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Event Location</label>
                  <input style={inputStyle} placeholder="e.g. Vadodara" value={location} onChange={e => setLocation(e.target.value)} />
                </div>
              </div>
              <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Any message (optional)" value={message} onChange={e => setMessage(e.target.value)} />

              <button type="submit" disabled={loading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: loading ? "#86efac" : "#22c55e", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
                {loading
                  ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Sending…</>
                  : <><MessageCircle style={{ width: 15, height: 15 }} /> Send on WhatsApp</>}
              </button>
              <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "4px 0 0" }}>
                Your details will also be saved so we can follow up with you.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Package Card ─────────────────────────────────────────────────
function PackageCard({ variant, price, category, linkId, linkLabel }: {
  variant: Variant; price: number; category?: Category; linkId: string; linkLabel: string
}) {
  const [explainOpen, setExplainOpen] = useState(false)
  const [enquireOpen, setEnquireOpen] = useState(false)

  return (
    <>
      <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.3 }}>{variant.name}</h3>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#4f46e5" }}>₹{price.toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>per event</div>
            </div>
          </div>
          {variant.inclusions && variant.inclusions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {variant.inclusions.map((inc, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, background: "#eef2ff", color: "#4338ca", borderRadius: 6, padding: "3px 9px", lineHeight: 1.5 }}>
                  ✓ {inc}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => setExplainOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#ede9fe", color: "#7c3aed", border: "none", borderRadius: 10, padding: "10px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Sparkles style={{ width: 13, height: 13 }} /> Explain This
            </button>
            <button
              onClick={() => setEnquireOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Send style={{ width: 12, height: 12 }} /> Enquire Now
            </button>
          </div>
        </div>
      </div>

      {explainOpen && (
        <ExplainPopup variant={variant} price={price} category={category} onClose={() => setExplainOpen(false)} />
      )}
      {enquireOpen && (
        <EnquirePopup variant={variant} price={price} linkId={linkId} linkLabel={linkLabel} onClose={() => setEnquireOpen(false)} />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function SlugPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const [link, setLink] = useState<PriceLink | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatId, setSelectedCatId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [linkRes, pkgRes] = await Promise.all([
          fetch(`/api/public/price-links?key=${encodeURIComponent(slug)}`),
          fetch("/api/public/packages"),
        ])
        const linkJson = await linkRes.json()
        const pkgJson = await pkgRes.json()

        if (!linkJson.success || !linkJson.data) {
          setError("This link is invalid or has expired.")
          setLoading(false)
          return
        }

        const priceLink: PriceLink = linkJson.data
        const allVariants: Variant[] = pkgJson.variants || []
        const allCategories: Category[] = pkgJson.categories || []

        // Only keep variants in this price link
        const selectedIds = new Set(Object.keys(priceLink.custom_prices))
        const selectedVariants = allVariants.filter(v => selectedIds.has(v.id))

        // Only keep categories that have at least one selected variant
        const relevantCatIds = new Set(selectedVariants.map(v => v.category_id))
        const relevantCats = allCategories
          .filter(c => relevantCatIds.has(c.id))
          .sort((a, b) => {
            const na = parseInt(a.name.match(/\d+/)?.[0] || "999")
            const nb = parseInt(b.name.match(/\d+/)?.[0] || "999")
            return na - nb
          })

        setLink(priceLink)
        setVariants(selectedVariants)
        setCategories(relevantCats)
        if (relevantCats.length > 0) setSelectedCatId(relevantCats[0].id)
      } catch {
        setError("Failed to load. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const categoryMap = new Map(categories.map(c => [c.id, c]))
  const visibleVariants = variants.filter(v => v.category_id === selectedCatId)

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", fontFamily: "Inter, system-ui, sans-serif" }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 36, height: 36, color: "#4f46e5", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#6b7280", fontSize: 14 }}>Loading your packages…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <div style={{ textAlign: "center", maxWidth: 340, padding: 24 }}>
            <AlertCircle style={{ width: 48, height: 48, color: "#f87171", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Link Not Found</h2>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <a href={`tel:${CALL_NUMBER}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#4f46e5", color: "#fff", borderRadius: 10, padding: "10px 20px", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
              <PhoneCall style={{ width: 14, height: 14 }} /> Call Us
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <Header />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", padding: "24px 20px 28px", textAlign: "center", color: "#fff" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7, margin: "0 0 6px", textTransform: "uppercase" }}>Custom Quote</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px" }}>{link?.label || "Your Packages"}</h1>
        <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>
          {variants.length} package{variants.length !== 1 ? "s" : ""} · {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
        </p>
      </div>

      {/* Category Grid Selector */}
      {categories.length > 1 && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 14px 10px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px 2px" }}>Select Category</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {categories.map(cat => {
              const active = cat.id === selectedCatId
              const count = variants.filter(v => v.category_id === cat.id).length
              // Extract number e.g. "41 Safas" → "41"
              const num = cat.name.match(/\d+/)?.[0] || cat.name
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  style={{
                    border: `2px solid ${active ? "#4f46e5" : "#e5e7eb"}`,
                    borderRadius: 12,
                    background: active ? "#4f46e5" : "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "10px 6px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 900, color: active ? "#fff" : "#111827", lineHeight: 1 }}>{num}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: active ? "rgba(255,255,255,0.8)" : "#6b7280" }}>Safas</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: active ? "rgba(255,255,255,0.2)" : "#f3f4f6", color: active ? "#fff" : "#9ca3af", borderRadius: 99, padding: "1px 7px", marginTop: 2 }}>
                    {count} pkg
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Package Cards */}
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "16px 14px 48px" }}>
        {categories.length === 1 && (
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>
              {categories[0].name} <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>· {visibleVariants.length} packages</span>
            </h2>
          </div>
        )}

        {visibleVariants.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
            <p>No packages in this category.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleVariants.map(v => (
              <PackageCard
                key={v.id}
                variant={v}
                price={link!.custom_prices[v.id]}
                category={categoryMap.get(v.category_id)}
                linkId={link!.id}
                linkLabel={link!.label}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ marginTop: 28, background: "#fff", borderRadius: 16, padding: "18px 18px", border: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Have questions? Talk to us directly</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#22c55e", color: "#fff", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "10px 18px", textDecoration: "none" }}>
              <MessageCircle style={{ width: 14, height: 14 }} /> WhatsApp
            </a>
            <a href={`tel:${CALL_NUMBER}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "10px 18px", textDecoration: "none" }}>
              <PhoneCall style={{ width: 14, height: 14 }} /> Call Us
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
