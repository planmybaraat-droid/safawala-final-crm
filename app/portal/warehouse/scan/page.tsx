"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader } from "@/components/portal/portal-shared"

const COLOR = "#a855f7"

export default function ScanPage() {
  const router = useRouter()
  const [barcode, setBarcode] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function lookupBarcode(code: string) {
    if (!code.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}&limit=1`)
      const data = await res.json()
      const productsList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      const product = productsList[0]
      if (product) setResult(product)
      else setError("No product found for this barcode.")
    } catch { setError("Lookup failed. Try again.") }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PortalPageHeader title="Scan Barcode" subtitle="Enter or scan an item barcode" color={COLOR} backHref="/portal/warehouse" />

      <div className="px-4 py-6">
        {/* Manual entry */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(80,55,30,0.4)" }}>Enter Barcode Manually</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookupBarcode(barcode)}
              placeholder="Scan or type barcode..."
              className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "rgba(0,0,0,0.04)", color: "#1e1208" }}
              autoFocus
            />
            <button
              onClick={() => lookupBarcode(barcode)}
              className="px-4 py-2.5 rounded-xl text-[12px] font-bold text-white"
              style={{ background: COLOR }}
            >
              Look up
            </button>
          </div>
        </div>

        {/* Camera hint */}
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <div>
            <p className="text-[12px] font-bold" style={{ color: COLOR }}>Camera Scanning</p>
            <p className="text-[11px]" style={{ color: "rgba(80,55,30,0.5)" }}>Point your camera at a barcode — it reads automatically on most devices via the keyboard input above.</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: COLOR, borderTopColor: "transparent" }} />
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-4" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
            <p className="text-[13px] font-semibold text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            <div className="px-4 py-3" style={{ background: `${COLOR}15`, borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COLOR }}>Item Found</p>
            </div>
            {[
              ["Name", result.name],
              ["SKU", result.sku],
              ["Barcode", result.barcode],
              ["Stock Available", result.stock_quantity?.toString()],
              ["Unit", result.unit],
              ["Price", result.price ? `₹${result.price.toLocaleString("en-IN")}` : null],
            ].map(([label, value]) => value ? (
              <div key={label} className="flex justify-between items-center px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                <span className="text-[11px] font-semibold" style={{ color: "rgba(80,55,30,0.4)" }}>{label}</span>
                <span className="text-[13px] font-bold" style={{ color: "#1e1208" }}>{value}</span>
              </div>
            ) : null)}
            <div className="p-4">
              <button
                onClick={() => router.push(`/inventory`)}
                className="w-full py-3 rounded-xl text-[13px] font-bold text-white"
                style={{ background: COLOR }}
              >
                View Full Inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
