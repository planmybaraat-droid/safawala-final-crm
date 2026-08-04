"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import {
  Shield, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Sparkles, Package, Users, CheckCircle, Copy, Link2,
  Plus, Minus, Check, RotateCcw, PhoneCall, MessageCircle, Calendar
} from "lucide-react"

interface PackageVariant { id: string; name: string; base_price: number; category_id: string; inclusions?: string[] }
interface PackageCategory { id: string; name: string; display_order?: number }

function sortCategories(cats: PackageCategory[]) {
  return [...cats].sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || "999")
    const numB = parseInt(b.name.match(/\d+/)?.[0] || "999")
    return numA - numB
  })
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  new:        { label: "New",        bg: "#dbeafe", color: "#1d4ed8" },
  contacted:  { label: "Contacted",  bg: "#fef9c3", color: "#854d0e" },
  interested: { label: "Interested", bg: "#ffedd5", color: "#9a3412" },
  converted:  { label: "Converted",  bg: "#dcfce7", color: "#15803d" },
  expired:    { label: "Expired",    bg: "#f3f4f6", color: "#6b7280" },
  rejected:   { label: "Rejected",   bg: "#fee2e2", color: "#b91c1c" },
}

// ─── Password Gate ─────────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: (pw: string) => void }) {
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/public/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem("safawala_packages_access", "1")
        sessionStorage.setItem("safawala_admin_pw", password)
        onUnlock(password)
      } else {
        setError("Incorrect password.")
        setPassword("")
      }
    } catch {
      setError("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef2ff 0%, #f9fafb 50%, #ede9fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "#ffffff", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(79,70,229,0.12), 0 4px 16px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <div style={{ margin: "0 auto 16px", display: "flex", justifyContent: "center" }}>
          <Image src="/safawalalogo.png" alt="Safawala" width={130} height={60} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef2ff", color: "#4f46e5", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <Shield style={{ width: 12, height: 12 }} /> Admin Panel
        </div>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28 }}>
          Enter your password to access the admin panel
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${error ? "#f87171" : "#e5e7eb"}`, borderRadius: 12, overflow: "hidden", background: "#f9fafb" }}>
              <Lock style={{ width: 16, height: 16, color: "#9ca3af", marginLeft: 14, flexShrink: 0 }} />
              <input
                type={show ? "text" : "password"}
                placeholder="Admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError("") }}
                autoFocus
                style={{ flex: 1, border: "none", background: "transparent", padding: "13px 12px", fontSize: 15, color: "#111827", outline: "none" }}
              />
              <button type="button" onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 14px", color: "#9ca3af", display: "flex", alignItems: "center" }}>
                {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
            {error && (
              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6, textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}>
                <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} /> {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={loading || !password} style={{ width: "100%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: loading || !password ? "not-allowed" : "pointer", opacity: loading || !password ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}>
            {loading
              ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Verifying...</>
              : <><Shield style={{ width: 16, height: 16 }} /> Enter Admin Panel</>}
          </button>
        </form>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Lock style={{ width: 12, height: 12 }} /> Safawala — Premium Indian Wedding Accessories
        </p>
      </div>
    </div>
  )
}

// ─── Admin Panel ──────────────────────────────────────────────────
function AdminPanel({ adminPw }: { adminPw: string }) {
  const [tab, setTab] = useState<"ai" | "manual" | "leads">("ai")
  const [variants, setVariants] = useState<PackageVariant[]>([])
  const [categories, setCategories] = useState<PackageCategory[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Link generation shared state
  const [label, setLabel] = useState("")
  const [generatedLink, setGeneratedLink] = useState("")
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // AI tab
  const [aiCommand, setAiCommand] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ id: string; name: string; original_price: number; new_price: number }[]>([])
  const [aiSummary, setAiSummary] = useState("")
  const [aiError, setAiError] = useState("")

  // Manual tab
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({})

  // Leads tab
  const [leads, setLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsLoaded, setLeadsLoaded] = useState(false)
  const [updatingLead, setUpdatingLead] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/public/packages")
        const data = await res.json()
        const sorted = sortCategories(data.categories || [])
        setCategories(sorted)
        setVariants(data.variants || [])
        const init: Record<string, number> = {}
        ;(data.variants || []).forEach((v: PackageVariant) => { init[v.id] = v.base_price })
        setManualPrices(init)
      } catch {}
      finally { setLoadingData(false) }
    }
    load()
  }, [])

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateLink = async (priceMap: Record<string, number>) => {
    if (!label.trim()) { alert("Enter a customer name / quote label first"); return }
    setGenerating(true); setGeneratedLink("")
    try {
      const res = await fetch("/api/public/price-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPw, custom_prices: priceMap, label: label.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setGeneratedLink(`${window.location.origin}/packages/${data.slug}`)
      } else {
        alert(data.error || "Failed to generate link")
      }
    } catch { alert("Error generating link") }
    finally { setGenerating(false) }
  }

  // AI
  const runAI = async () => {
    if (!aiCommand.trim()) { setAiError("Type a command first"); return }
    setAiLoading(true); setAiError(""); setAiResult([]); setAiSummary(""); setGeneratedLink("")
    try {
      const res = await fetch("/api/public/ai-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPw,
          command: aiCommand,
          variants: variants.map(v => ({
            ...v,
            category_name: categories.find(c => c.id === v.category_id)?.name || ""
          }))
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || "AI failed"); return }
      setAiResult(data.selected || [])
      setAiSummary(data.summary || "")
    } catch { setAiError("Network error. Try again.") }
    finally { setAiLoading(false) }
  }

  const generateFromAI = () => {
    const priceMap: Record<string, number> = {}
    aiResult.forEach(r => { priceMap[r.id] = r.new_price })
    generateLink(priceMap)
  }

  const generateFromManual = () => {
    if (!selectedIds.size) { alert("Select at least one package"); return }
    const priceMap: Record<string, number> = {}
    selectedIds.forEach(id => { priceMap[id] = manualPrices[id] ?? 0 })
    generateLink(priceMap)
  }

  // Leads
  const loadLeads = async () => {
    setLeadsLoading(true)
    try {
      const res = await fetch("/api/public/leads", { headers: { "x-admin-password": adminPw } })
      const data = await res.json()
      if (res.ok) { setLeads(data.data || []); setLeadsLoaded(true) }
      else alert(data.error || "Failed to load leads")
    } catch { alert("Error") }
    finally { setLeadsLoading(false) }
  }

  const updateLeadStatus = async (id: string, status: string) => {
    setUpdatingLead(id)
    try {
      const res = await fetch("/api/public/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": adminPw },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch {}
    finally { setUpdatingLead(null) }
  }

  const TABS = [
    { id: "ai" as const,     icon: <Sparkles style={{ width: 14, height: 14 }} />, label: "AI Command" },
    { id: "manual" as const, icon: <Package  style={{ width: 14, height: 14 }} />, label: "Manual"     },
    { id: "leads" as const,  icon: <Users    style={{ width: 14, height: 14 }} />, label: "Leads"       },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Image src="/safawalalogo.png" alt="Safawala" width={110} height={44} style={{ objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7280" }}>
          <Shield style={{ width: 14, height: 14, color: "#4f46e5" }} />
          <span style={{ fontWeight: 700, color: "#4f46e5" }}>Admin Panel</span>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 16px" }}>
        {loadingData ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
            <Loader2 style={{ width: 28, height: 28, color: "#4f46e5" }} className="animate-spin" />
          </div>
        ) : (
          <div style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            {/* Customer label + tabs */}
            <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #f3f4f6" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Customer Name / Quote Label
              </label>
              <input
                type="text"
                placeholder="e.g. Sharma Ji, Mehta Wedding, Patel June 2026"
                value={label}
                onChange={e => { setLabel(e.target.value); setGeneratedLink("") }}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#111827", background: "#f9fafb", outline: "none", marginBottom: 16, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: "10px 10px 0 0", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: tab === t.id ? "#ffffff" : "transparent", color: tab === t.id ? "#4f46e5" : "#6b7280", borderTop: tab === t.id ? "2px solid #4f46e5" : "2px solid transparent" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: 24 }}>

              {/* ── AI COMMAND ── */}
              {tab === "ai" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Compact package reference */}
                  <PackageReference categories={categories} variants={variants} />

                  <div style={{ borderRadius: 12, padding: "12px 16px", background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", marginBottom: 4 }}>How to use</p>
                    <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
                      Type naturally — <em>"Select 41 Safa and 51 Safa, increase by 40%"</em> — AI picks packages and rounds all prices to nearest ₹100.
                    </p>
                  </div>

                  <textarea
                    placeholder='e.g. "Select 41 Safa, 51 Safa and 71 Safa, increase price by 40%"'
                    value={aiCommand}
                    onChange={e => { setAiCommand(e.target.value); setAiError("") }}
                    rows={3}
                    style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#111827", background: "#f9fafb", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />

                  {aiError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#b91c1c", background: "#fee2e2", borderRadius: 10, padding: "10px 14px" }}>
                      <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> {aiError}
                    </div>
                  )}

                  <button onClick={runAI} disabled={aiLoading || !aiCommand.trim()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: aiLoading || !aiCommand.trim() ? "not-allowed" : "pointer", opacity: aiLoading || !aiCommand.trim() ? 0.6 : 1 }}>
                    {aiLoading ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> AI is processing...</> : <><Sparkles style={{ width: 15, height: 15 }} /> Process with AI</>}
                  </button>

                  {aiResult.length > 0 && (
                    <div>
                      {aiSummary && (
                        <div style={{ borderRadius: 10, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 12, fontSize: 13, color: "#15803d", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                          <CheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {aiSummary}
                        </div>
                      )}
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Review & adjust prices</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                        {aiResult.map((r, i) => (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", borderRadius: 10, padding: "10px 14px", border: "1px solid #e5e7eb" }}>
                            <Check style={{ width: 14, height: 14, color: "#4f46e5", flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#374151" }}>{r.name}</span>
                            <span style={{ fontSize: 12, color: "#9ca3af", textDecoration: "line-through" }}>₹{r.original_price.toLocaleString("en-IN")}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <button onClick={() => setAiResult(p => p.map((x, j) => j === i ? { ...x, new_price: Math.max(0, x.new_price - 100) } : x))} style={{ width: 22, height: 22, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus style={{ width: 11, height: 11, color: "#6b7280" }} /></button>
                              <input type="number" value={r.new_price} onChange={e => setAiResult(p => p.map((x, j) => j === i ? { ...x, new_price: Math.round(Number(e.target.value) / 100) * 100 } : x))} style={{ width: 80, border: "1px solid #c7d2fe", borderRadius: 8, padding: "3px 6px", fontSize: 13, fontWeight: 700, color: "#4f46e5", textAlign: "center", background: "#eef2ff", outline: "none" }} />
                              <button onClick={() => setAiResult(p => p.map((x, j) => j === i ? { ...x, new_price: x.new_price + 100 } : x))} style={{ width: 22, height: 22, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus style={{ width: 11, height: 11, color: "#6b7280" }} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={generateFromAI} disabled={generating} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#059669", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1 }}>
                        {generating ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Generating...</> : <><Link2 style={{ width: 14, height: 14 }} /> Generate & Share Link</>}
                      </button>
                    </div>
                  )}

                  <GeneratedLink link={generatedLink} copied={copied} onCopy={copy} />
                </div>
              )}

              {/* ── MANUAL ── */}
              {tab === "manual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Select packages, set custom prices, then generate the link.</p>
                    {selectedIds.size > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", background: "#eef2ff", borderRadius: 999, padding: "2px 10px" }}>{selectedIds.size} selected</span>
                    )}
                  </div>
                  <div style={{ maxHeight: 460, overflowY: "auto" }}>
                    {categories.map(cat => {
                      const catVariants = variants.filter(v => v.category_id === cat.id)
                      if (!catVariants.length) return null
                      const allSelected = catVariants.every(v => selectedIds.has(v.id))
                      const toggleCat = () => setSelectedIds(prev => {
                        const s = new Set(prev)
                        if (allSelected) catVariants.forEach(v => s.delete(v.id))
                        else catVariants.forEach(v => s.add(v.id))
                        return s
                      })
                      return (
                        <div key={cat.id} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 6px", padding: "0 2px" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{cat.name}</p>
                            <button onClick={toggleCat} style={{ fontSize: 10, fontWeight: 700, color: allSelected ? "#b91c1c" : "#4f46e5", background: allSelected ? "#fee2e2" : "#eef2ff", border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                            {catVariants.map(v => {
                              const checked = selectedIds.has(v.id)
                              return (
                                <div key={v.id}
                                  onClick={() => setSelectedIds(prev => { const s = new Set(prev); s.has(v.id) ? s.delete(v.id) : s.add(v.id); return s })}
                                  style={{ display: "flex", flexDirection: "column", gap: 6, padding: "9px 10px", borderRadius: 10, background: checked ? "#eef2ff" : "#f9fafb", border: `1.5px solid ${checked ? "#a5b4fc" : "#e5e7eb"}`, cursor: "pointer", transition: "all 0.1s" }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <div style={{ width: 15, height: 15, borderRadius: 4, border: `2px solid ${checked ? "#4f46e5" : "#d1d5db"}`, background: checked ? "#4f46e5" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      {checked && <Check style={{ width: 9, height: 9, color: "#fff" }} />}
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: checked ? "#3730a3" : "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                                  </div>
                                  {checked ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}>
                                      <button onClick={() => setManualPrices(p => ({ ...p, [v.id]: Math.max(0, (p[v.id] || 0) - 100) }))} style={{ width: 20, height: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Minus style={{ width: 9, height: 9, color: "#6b7280" }} /></button>
                                      <input type="number" value={manualPrices[v.id] || 0} onChange={e => setManualPrices(p => ({ ...p, [v.id]: Math.round(Number(e.target.value) / 100) * 100 }))} style={{ flex: 1, minWidth: 0, border: "1px solid #c7d2fe", borderRadius: 6, padding: "2px 4px", fontSize: 12, fontWeight: 700, color: "#4f46e5", textAlign: "center", background: "#fff", outline: "none" }} />
                                      <button onClick={() => setManualPrices(p => ({ ...p, [v.id]: (p[v.id] || 0) + 100 }))} style={{ width: 20, height: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Plus style={{ width: 9, height: 9, color: "#6b7280" }} /></button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, paddingLeft: 22 }}>₹{(v.base_price || 0).toLocaleString("en-IN")}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={generateFromManual} disabled={generating || !selectedIds.size} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: generating || !selectedIds.size ? "not-allowed" : "pointer", opacity: generating || !selectedIds.size ? 0.6 : 1 }}>
                    {generating ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Generating...</> : <><Link2 style={{ width: 14, height: 14 }} /> Generate Link ({selectedIds.size} selected)</>}
                  </button>
                  <GeneratedLink link={generatedLink} copied={copied} onCopy={copy} />
                </div>
              )}

              {/* ── LEADS ── */}
              {tab === "leads" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!leadsLoaded ? (
                    <div style={{ textAlign: "center", padding: "32px 0" }}>
                      <Users style={{ width: 40, height: 40, color: "#d1d5db", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>Load all enquiries submitted by customers</p>
                      <button onClick={loadLeads} disabled={leadsLoading} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: leadsLoading ? "not-allowed" : "pointer", opacity: leadsLoading ? 0.7 : 1 }}>
                        {leadsLoading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Loading...</> : <><Users style={{ width: 14, height: 14 }} /> Load Leads</>}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{leads.length} leads</span>
                        <button onClick={loadLeads} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                          <RotateCcw style={{ width: 12, height: 12 }} /> Refresh
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 500, overflowY: "auto" }}>
                        {leads.length === 0 ? (
                          <p style={{ textAlign: "center", color: "#9ca3af", padding: "32px 0", fontSize: 14 }}>No leads yet.</p>
                        ) : leads.map(lead => {
                          const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                          const date = lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""
                          return (
                            <div key={lead.id} style={{ background: "#f9fafb", borderRadius: 14, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{lead.name} <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>{date}</span></span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color }}>{sc.label}</span>
                              </div>
                              <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                                <a href={`tel:${lead.phone}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}>
                                  <PhoneCall style={{ width: 13, height: 13 }} /> {lead.phone}
                                </a>
                                <a href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, "")}`} target="_blank" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#059669", textDecoration: "none" }}>
                                  <MessageCircle style={{ width: 12, height: 12 }} /> WhatsApp
                                </a>
                              </div>
                              {lead.package_interest && <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><Package style={{ width: 12, height: 12 }} /> {lead.package_interest}</p>}
                              {lead.event_date && <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}><Calendar style={{ width: 12, height: 12 }} /> {new Date(lead.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{lead.location ? ` · ${lead.location}` : ""}</p>}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                                  <button key={s} disabled={updatingLead === lead.id} onClick={() => updateLeadStatus(lead.id, s)} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, border: "none", cursor: lead.status === s ? "default" : "pointer", background: lead.status === s ? cfg.bg : "#f3f4f6", color: lead.status === s ? cfg.color : "#9ca3af", opacity: updatingLead === lead.id ? 0.5 : 1 }}>
                                    {cfg.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Compact Package Reference (for AI tab) ───────────────────────
function PackageReference({ categories, variants }: { categories: PackageCategory[]; variants: PackageVariant[] }) {
  const [open, setOpen] = useState(false)
  if (!variants.length) return null
  return (
    <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>
          <Package style={{ width: 13, height: 13, color: "#4f46e5" }} />
          Browse all packages ({variants.length})
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", background: "#fff", borderTop: "1px solid #f3f4f6", maxHeight: 380, overflowY: "auto" }}>
          {categories.map(cat => {
            const catVars = variants.filter(v => v.category_id === cat.id)
            if (!catVars.length) return null
            return (
              <div key={cat.id} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
                  {cat.name} <span style={{ fontWeight: 400, color: "#d1d5db" }}>· {catVars.length} packages</span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {catVars.map(v => (
                    <div key={v.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{v.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", whiteSpace: "nowrap", flexShrink: 0 }}>₹{(v.base_price || 0).toLocaleString("en-IN")}</span>
                      </div>
                      {v.inclusions && v.inclusions.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {v.inclusions.map((inc, i) => (
                            <span key={i} style={{ fontSize: 10, background: "#eef2ff", color: "#6366f1", borderRadius: 4, padding: "1px 5px", lineHeight: 1.5 }}>{inc}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Generated Link display ───────────────────────────────────────
function GeneratedLink({ link, copied, onCopy }: { link: string; copied: boolean; onCopy: (t: string) => void }) {
  if (!link) return null
  return (
    <div style={{ borderRadius: 14, padding: 16, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
        <CheckCircle style={{ width: 13, height: 13 }} /> Link ready — share with customer
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input readOnly value={link} onClick={e => (e.target as HTMLInputElement).select()} style={{ flex: 1, border: "1px solid #c7d2fe", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#4f46e5", background: "#fff", outline: "none", fontWeight: 600 }} />
        <button onClick={() => onCopy(link)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Copy style={{ width: 13, height: 13 }} />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#818cf8", marginTop: 8, margin: "8px 0 0" }}>Customer opens this link → sees their custom packages and price.</p>
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────────────
export default function PackagesPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [adminPw, setAdminPw] = useState("")
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const cached = sessionStorage.getItem("safawala_packages_access")
    const pw = sessionStorage.getItem("safawala_admin_pw")
    if (cached === "1" && pw) { setUnlocked(true); setAdminPw(pw) }
    setChecking(false)
  }, [])

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 style={{ width: 24, height: 24, color: "#4f46e5" }} className="animate-spin" />
    </div>
  )

  if (!unlocked) return <PasswordGate onUnlock={(pw) => { setAdminPw(pw); setUnlocked(true) }} />

  return <AdminPanel adminPw={adminPw} />
}
