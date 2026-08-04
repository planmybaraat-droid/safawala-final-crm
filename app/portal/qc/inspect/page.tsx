"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalListCard, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#eab308"

export default function InspectPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    try {
      const res = await fetch("/api/bookings?status=confirmed&limit=50")
      const data = await res.json()
      setOrders(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PortalPageHeader title="QC Inspection" subtitle={`${orders.length} orders to inspect`} color={COLOR} backHref="/portal/qc" />

      <div
        className="mx-4 mt-4 p-3 rounded-2xl flex items-start gap-3"
        style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round" className="mt-0.5 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p className="text-[11px]" style={{ color: "rgba(80,55,30,0.6)" }}>
          Inspect each packed order before it leaves the warehouse. Check: clean, pressed, correct items, no damage.
        </p>
      </div>

      <PortalSectionLabel label="Pending Inspection" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : orders.length === 0 ? (
          <PortalEmptyState icon="check-circle" title="All clear!" subtitle="No orders pending QC inspection" color={COLOR} />
        ) : orders.map(o => (
          <PortalListCard
            key={o.id}
            title={`${o.booking_number} — ${(o.customer as any)?.name ?? "Customer"}`}
            subtitle={`Event: ${o.event_date ? new Date(o.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}`}
            meta={o.pickup_date ? new Date(o.pickup_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : undefined}
            badge="confirmed"
            color={COLOR}
            icon="search"
            onClick={() => router.push(`/bookings/${o.id}`)}
          />
        ))}
      </div>
      <div className="h-4" />
    </div>
  )
}
