"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSearchBar, PortalListCard, PortalEmptyState, PortalSkeleton, PortalFAB } from "@/components/portal/portal-shared"

const COLOR = "#f97316"

export default function FranchisesPage() {
  const router = useRouter()
  const [franchises, setFranchises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/franchises?limit=50")
      .then(r => r.json())
      .then(d => setFranchises(d.data ?? d ?? []))
      .catch(() => setFranchises([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = franchises.filter(f =>
    !search ||
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.city?.toLowerCase().includes(search.toLowerCase()) ||
    f.code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PortalPageHeader title="Franchises" subtitle={`${filtered.length} branches`} color={COLOR} backHref="/portal/admin" />
      <PortalSearchBar value={search} onChange={setSearch} placeholder="Search franchise name or city..." />

      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : filtered.length === 0 ? (
          <PortalEmptyState icon="building" title="No franchises found" subtitle="Franchise branches will appear here" color={COLOR} />
        ) : filtered.map(f => (
          <PortalListCard
            key={f.id}
            title={f.name ?? "Franchise"}
            subtitle={`${f.city ?? ""}${f.state ? `, ${f.state}` : ""}`}
            meta={f.code ?? f.franchise_code ?? undefined}
            badge={f.status ?? "active"}
            color={COLOR}
            icon="building"
          />
        ))}
      </div>

      <PortalFAB label="Add Franchise" color={COLOR} icon="plus-circle" onClick={() => router.push("/dashboard")} />
    </div>
  )
}
