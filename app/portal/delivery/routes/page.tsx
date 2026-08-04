"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalListCard, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#14b8a6"

export default function RoutesPage() {
  const [today, setToday] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bookings?status=confirmed&limit=30")
      .then(r => r.json())
      .then(d => setToday(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])))
      .catch(() => setToday([]))
      .finally(() => setLoading(false))
  }, [])

  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div>
      <PortalPageHeader title="Active Routes" subtitle={dateLabel} color={COLOR} backHref="/portal/delivery" />

      <div className="mx-4 mt-4 p-4 rounded-2xl flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${COLOR}18, ${COLOR}06)`, border: `1px solid ${COLOR}22` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${COLOR}22` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: "#1e1208" }}>{today.length} Orders to Dispatch Today</p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(80,55,30,0.5)" }}>Courier partner handles physical delivery</p>
        </div>
      </div>

      <PortalSectionLabel label="Today's Dispatch Queue" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : today.length === 0 ? (
          <PortalEmptyState icon="map-pin" title="No orders for today" subtitle="Confirmed bookings ready for dispatch appear here" color={COLOR} />
        ) : today.map((o, i) => (
          <PortalListCard
            key={o.id}
            title={`${i + 1}. ${o.booking_number ?? "Order"} — ${(o.customer as any)?.name ?? "Customer"}`}
            subtitle={`${(o.customer as any)?.phone ?? ""}`}
            meta={o.delivery_address ?? o.event_venue ?? "Address pending"}
            badge={o.status ?? "confirmed"}
            color={COLOR}
            icon="map-pin"
          />
        ))}
      </div>
      <div className="h-4" />
    </div>
  )
}
