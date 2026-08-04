"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalListCard, PortalEmptyState, PortalSkeleton, PortalFAB } from "@/components/portal/portal-shared"

const COLOR = "#eab308"

export default function DamagePage() {
  const router = useRouter()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReports() }, [])

  async function fetchReports() {
    try {
      const res = await fetch("/api/work-orders?type=damage&limit=50")
      const data = await res.json()
      setReports(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch { setReports([]) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PortalPageHeader title="Damage Reports" subtitle="Items flagged with damage" color={COLOR} backHref="/portal/qc" />

      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : reports.length === 0 ? (
          <PortalEmptyState icon="alert-triangle" title="No damage reports" subtitle="Flagged items will appear here" color={COLOR} />
        ) : reports.map(r => (
          <PortalListCard
            key={r.id}
            title={r.title ?? r.product_name ?? "Damage Report"}
            subtitle={r.description ?? r.notes ?? ""}
            meta={r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : undefined}
            badge={r.status ?? "pending"}
            color={COLOR}
            icon="alert-triangle"
          />
        ))}
      </div>

      <PortalFAB label="Log Damage" color={COLOR} onClick={() => router.push("/portal/qc/damage/new")} icon="plus-circle" />
    </div>
  )
}
