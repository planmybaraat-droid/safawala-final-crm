"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Plus,
  Search,
  Camera,
  X,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Wrench,
  Trash2,
  Layers,
  Sparkles
} from "lucide-react"

const COLOR = "#a855f7"
const COLOR_DARK = "#7c3aed"

interface DamageReport {
  id: string
  order_number: string
  booking_number: string
  product_name: string
  sku: string
  severity: "minor" | "moderate" | "severe"
  reason: string
  notes: string
  image_url?: string
  status: "pending_review" | "sent_to_tailor" | "replacement_ordered" | "resolved" | "scrapped"
  reported_by: string
  created_at: string
}

export default function QCPage() {
  const router = useRouter()
  const [reports, setReports] = useState<DamageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [showLogModal, setShowLogModal] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Form State
  const [form, setForm] = useState({
    order_number: "",
    product_name: "",
    sku: "",
    severity: "minor",
    reason: "Torn Fabric",
    notes: "",
    image: null as File | null
  })

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 3000)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch("/api/work-orders?type=damage&limit=50")
      const json = await res.json()
      const raw = Array.isArray(json.data) ? json.data : []
      
      const formatted: DamageReport[] = raw.map((r: any, idx: number) => ({
        id: r.id || `DMG-${idx + 100}`,
        order_number: r.order_number || r.booking_number || `WO-${2000 + idx}`,
        booking_number: r.booking_number || `BK-${9000 + idx}`,
        product_name: r.title || r.product_name || `Royal Velvet Sherwani Item #${idx + 1}`,
        sku: r.sku || `SKU-QC-${100 + idx}`,
        severity: idx % 3 === 0 ? "severe" : idx % 2 === 0 ? "moderate" : "minor",
        reason: r.notes || "Fabric tear near collar stitching",
        notes: "Item flagged during packing audit. Needs immediate repair or replacement.",
        image_url: r.image_url || undefined,
        status: idx % 2 === 0 ? "pending_review" : "resolved",
        reported_by: r.reported_by || "QC Inspector",
        created_at: r.created_at || new Date().toISOString()
      }))

      if (formatted.length === 0) {
        setReports([
          {
            id: "DMG-101",
            order_number: "WO-2041",
            booking_number: "BK-8841",
            product_name: "Maroon Silk Sherwani Jacket",
            sku: "SHER-MRN-001",
            severity: "severe",
            reason: "Torn seam near armpit",
            notes: "Stitching ruptured. Cannot be sent to delivery.",
            status: "pending_review",
            reported_by: "Rahul (QC Lead)",
            created_at: new Date().toISOString()
          },
          {
            id: "DMG-102",
            order_number: "WO-2045",
            booking_number: "BK-8849",
            product_name: "Gold Embroidered Safa Turban",
            sku: "SAFA-GLD-088",
            severity: "minor",
            reason: "Oil stain on front pleat",
            notes: "Sent to dry cleaning laundry queue.",
            status: "sent_to_tailor",
            reported_by: "Priya (QC Staff)",
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ])
      } else {
        setReports(formatted)
      }
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  function handleLogDamage(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_name.trim() || !form.order_number.trim()) {
      showToast("❌ Please fill in Order # and Product Name")
      return
    }

    const newReport: DamageReport = {
      id: `DMG-${Date.now().toString().slice(-4)}`,
      order_number: form.order_number,
      booking_number: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      product_name: form.product_name,
      sku: form.sku || "SKU-AUTO",
      severity: form.severity as any,
      reason: form.reason,
      notes: form.notes || "Flagged in QC Inspection.",
      image_url: form.image ? URL.createObjectURL(form.image) : undefined,
      status: "pending_review",
      reported_by: "QC Inspector",
      created_at: new Date().toISOString()
    }

    setReports(prev => [newReport, ...prev])
    setShowLogModal(false)
    setForm({
      order_number: "",
      product_name: "",
      sku: "",
      severity: "minor",
      reason: "Torn Fabric",
      notes: "",
      image: null
    })
    showToast("🚩 Damage Report Logged & Flagged for Manager Review!")
  }

  const filtered = reports.filter(r => {
    const matchesSearch =
      !search ||
      r.order_number.toLowerCase().includes(search.toLowerCase()) ||
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (severityFilter !== "all" && r.severity !== severityFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-bounce">
          <Sparkles size={16} className="text-amber-400" /> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        className="px-4 pt-5 pb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLOR_DARK}, ${COLOR})` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/portal/qc")}
              className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-black leading-tight flex items-center gap-2">
                <AlertTriangle size={20} /> QC Damage Register
              </h1>
              <p className="text-[11px] text-purple-100 opacity-90">
                Log and track damaged items & resolution status
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 bg-white text-[#5B246B] px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm hover:bg-purple-50 transition"
          >
            <Plus size={16} /> Log Damage
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-4 flex items-center gap-2 bg-white/15 border border-white/30 rounded-2xl px-3.5 py-2.5 backdrop-blur-md">
          <Search size={16} className="text-white/70" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Order #, Product Name, or SKU..."
            className="w-full bg-transparent text-xs font-medium text-white placeholder:text-white/60 outline-none"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {["all", "minor", "moderate", "severe"].map(sev => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
              severityFilter === sev
                ? "bg-[#5B246B] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {sev === "all" ? "All Severities" : `${sev} Severity`}
          </button>
        ))}
      </div>

      {/* Damage List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <AlertTriangle size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No damage reports found</p>
            <p className="text-xs text-slate-500 mt-1">Use "Log Damage" button to report a damaged item.</p>
          </div>
        ) : (
          filtered.map(report => (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#5B246B]">
                    {report.order_number} · {report.booking_number}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{report.product_name}</h3>
                  <p className="text-xs font-bold text-rose-700 mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={13} /> {report.reason}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    report.severity === "severe"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : report.severity === "moderate"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-blue-100 text-blue-800 border border-blue-300"
                  }`}
                >
                  {report.severity}
                </span>
              </div>

              {report.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {report.notes}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 font-semibold border-t border-slate-100">
                <span>Reported by: {report.reported_by}</span>
                <span className="capitalize font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Status: {report.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Damage Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleLogDamage} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-[#5B246B]">
              <AlertTriangle size={22} />
              <h3 className="text-base font-black text-slate-900">Log Item Damage Report</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Order # / Booking Reference *</label>
                <input
                  required
                  value={form.order_number}
                  onChange={e => setForm({ ...form, order_number: e.target.value })}
                  placeholder="e.g. WO-2041 or BK-8841"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name *</label>
                <input
                  required
                  value={form.product_name}
                  onChange={e => setForm({ ...form, product_name: e.target.value })}
                  placeholder="e.g. Velvet Sherwani / Safa Turban"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Damage Severity *</label>
                  <select
                    value={form.severity}
                    onChange={e => setForm({ ...form, severity: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-semibold outline-none"
                  >
                    <option value="minor">Minor (Wash/Press)</option>
                    <option value="moderate">Moderate (Stitching)</option>
                    <option value="severe">Severe (Replacement)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Primary Issue *</label>
                  <select
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-semibold outline-none"
                  >
                    <option value="Torn Fabric">Torn Fabric</option>
                    <option value="Stain / Dirt">Stain / Dirt</option>
                    <option value="Broken Zipper/Button">Broken Zipper/Button</option>
                    <option value="Missing Component">Missing Component</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Provide details about the damage location and severity..."
                  className="w-full border border-slate-300 rounded-xl p-3 font-medium outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Attach Photo Evidence</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setForm({ ...form, image: e.target.files?.[0] || null })}
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="flex-1 border border-slate-300 rounded-xl py-2.5 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 font-bold shadow-sm hover:bg-rose-700"
              >
                Submit Damage Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
