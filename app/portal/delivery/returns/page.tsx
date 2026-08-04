"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"

const COLOR = "#14b8a6"

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bookings?status=delivered&limit=50")
      .then(r => r.json())
      .then(d => setReturns(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])))
      .catch(() => setReturns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PortalPageHeader title="Returns Tracking" subtitle="Expecting items back" color={COLOR} backHref="/portal/delivery" />

      <div className="mx-4 mt-4 p-3 rounded-2xl flex items-start gap-3" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round" className="mt-0.5 flex-shrink-0">
          <polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
        </svg>
        <p className="text-[11px]" style={{ color: "rgba(80,55,30,0.6)" }}>
          For rentals: the Safa Stylist brings items back. For sales orders: no return needed. Track delivered orders awaiting return below.
        </p>
      </div>

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : returns.length === 0 ? (
          <PortalEmptyState icon="refresh" title="No pending returns" subtitle="Delivered orders awaiting return appear here" color={COLOR} />
        ) : returns.map(r => (
          <PortalListCard
            key={r.id}
            title={`${r.booking_number} — ${(r.customer as any)?.name ?? "Customer"}`}
            subtitle={`Delivered: ${r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("en-IN") : "—"}`}
            meta={r.return_time ?? r.event_date ? `Event: ${new Date(r.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : undefined}
            badge="delivered"
            color={COLOR}
            icon="refresh"
          />
        ))}
      </div>
      <div className="h-4" />
    </div>
  )
}
