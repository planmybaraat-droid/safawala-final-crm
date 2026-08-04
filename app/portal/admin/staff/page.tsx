"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSearchBar, PortalListCard, PortalEmptyState, PortalSkeleton, PortalFAB } from "@/components/portal/portal-shared"

const COLOR = "#f97316"
const DEPT_COLORS: Record<string, string> = {
  booking: "#22c55e", warehouse: "#a855f7", qc: "#eab308",
  delivery: "#14b8a6", styling: "#ec4899", accounts: "#ef4444",
  manager: "#3b82f6", admin: "#f97316", franchise: "#8b5cf6",
}

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const DEPTS = ["all", "booking", "warehouse", "qc", "delivery", "styling", "accounts"]

  useEffect(() => { fetchStaff() }, [filter])

  async function fetchStaff() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (filter !== "all") params.set("department", filter)
      const res = await fetch(`/api/users?${params}`)
      const data = await res.json()
      setStaff(data.data ?? data ?? [])
    } catch { setStaff([]) }
    finally { setLoading(false) }
  }

  const filtered = staff.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.department?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PortalPageHeader title="Staff Management" subtitle={`${filtered.length} members`} color={COLOR} backHref="/portal/admin" />
      <PortalSearchBar value={search} onChange={setSearch} placeholder="Search name, email or department..." />

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {DEPTS.map(d => (
          <button key={d} onClick={() => setFilter(d)}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0"
            style={{ background: filter === d ? (DEPT_COLORS[d] ?? COLOR) : "rgba(255,255,255,0.7)", color: filter === d ? "white" : "rgba(80,55,30,0.5)", border: `1px solid ${filter === d ? (DEPT_COLORS[d] ?? COLOR) : "rgba(255,255,255,0.9)"}` }}>
            {d === "all" ? "All Depts" : d.replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={7} /> : filtered.length === 0 ? (
          <PortalEmptyState icon="users" title="No staff found" subtitle="Staff members will appear here" color={COLOR} />
        ) : filtered.map(s => (
          <PortalListCard
            key={s.id}
            title={s.name ?? s.email ?? "Staff"}
            subtitle={`${s.role ?? "—"} · ${s.department ?? "No dept"}`}
            meta={s.email}
            badge={s.is_active !== false ? "active" : "inactive"}
            color={DEPT_COLORS[s.department ?? ""] ?? COLOR}
            icon="user"
          />
        ))}
      </div>

      <PortalFAB label="Add Staff" color={COLOR} icon="plus-circle" onClick={() => {}} />
    </div>
  )
}
