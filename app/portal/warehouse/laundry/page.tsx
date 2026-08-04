"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalListCard, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"

const COLOR = "#a855f7"

export default function LaundryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)

  useEffect(() => { fetchLaundry() }, [])

  async function fetchLaundry() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/laundry?limit=50")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch laundry items")
      }
      setItems(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (err: any) {
      console.error("Failed to fetch laundry:", err)
      setErrorState(err.message || "Failed to fetch laundry items")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const pending = items.filter(i => i.status === "pending" || i.status === "in_laundry" || !i.status)
  const done = items.filter(i => i.status === "completed" || i.status === "returned")

  return (
    <div>
      <PortalPageHeader title="Laundry Queue" subtitle={`${pending.length} pending`} color={COLOR} backHref="/portal/warehouse" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            ⚠️ Error
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">
            {errorState}
          </p>
        </div>
      )}

      {loading ? (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <PortalSkeleton rows={5} />
        </div>
      ) : items.length === 0 ? (
        <PortalEmptyState icon="laundry" title="No items in laundry" subtitle="Items sent for washing will appear here" color={COLOR} />
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <PortalSectionLabel label={`Pending — ${pending.length}`} />
              <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
                {pending.map(i => (
                  <PortalListCard
                    key={i.id}
                    title={i.product_name ?? i.item_name ?? "Item"}
                    subtitle={i.notes ?? (i.sent_at ? `Sent: ${new Date(i.sent_at).toLocaleDateString("en-IN")}` : "In laundry")}
                    badge="in_progress"
                    color={COLOR}
                    icon="laundry"
                  />
                ))}
              </div>
            </>
          )}

          {done.length > 0 && (
            <>
              <PortalSectionLabel label={`Completed — ${done.length}`} />
              <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
                {done.map(i => (
                  <PortalListCard
                    key={i.id}
                    title={i.product_name ?? i.item_name ?? "Item"}
                    subtitle={i.completed_at ? `Done: ${new Date(i.completed_at).toLocaleDateString("en-IN")}` : "Returned to stock"}
                    badge="order_complete"
                    color={COLOR}
                    icon="check-circle"
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
      <div className="h-4" />
    </div>
  )
}
