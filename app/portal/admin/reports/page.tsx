"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalSkeleton, PortalInfoRow, PortalListCard } from "@/components/portal/portal-shared"

const COLOR = "#f97316"

export default function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/bookings?limit=500").then(r => r.json()),
      fetch("/api/payments?limit=500").then(r => r.json()),
      fetch("/api/customers?limit=500").then(r => r.json()),
      fetch("/api/franchises?limit=50").then(r => r.json()),
    ]).then(([bRes, pRes, cRes, fRes]) => {
      const bookings = (bRes.status === "fulfilled" ? bRes.value.data ?? bRes.value : []) ?? []
      const payments = (pRes.status === "fulfilled" ? pRes.value.data ?? pRes.value : []) ?? []
      const customers = (cRes.status === "fulfilled" ? cRes.value.data ?? cRes.value : []) ?? []
      const franchises = (fRes.status === "fulfilled" ? fRes.value.data ?? fRes.value : []) ?? []

      const revenue = payments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
      const now = new Date()
      const thisMonth = bookings.filter((b: any) => {
        const d = new Date(b.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      const confirmed = bookings.filter((b: any) => b.status === "confirmed").length
      const completed = bookings.filter((b: any) => b.status === "order_complete").length

      setStats({ totalRevenue: revenue, totalBookings: bookings.length, totalCustomers: customers.length, totalFranchises: franchises.length, thisMonthBookings: thisMonth.length, confirmed, completed })
    })
    .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

  return (
    <div>
      <PortalPageHeader title="Admin Reports" subtitle="Business overview" color={COLOR} backHref="/portal/admin" />

      {loading ? (
        <div className="mx-4 mt-4"><PortalSkeleton rows={8} /></div>
      ) : stats && (
        <>
          <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${COLOR}18, ${COLOR}06)`, border: `1px solid ${COLOR}22` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: COLOR }}>Total Revenue Collected</p>
            <p className="text-[32px] font-black" style={{ color: "#1e1208" }}>{fmt(stats.totalRevenue)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
            {[
              { label: "Total Bookings", value: stats.totalBookings, color: "#3b82f6" },
              { label: "This Month", value: stats.thisMonthBookings, color: COLOR },
              { label: "Confirmed", value: stats.confirmed, color: "#16a34a" },
              { label: "Completed", value: stats.completed, color: "#8b5cf6" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(80,55,30,0.4)" }}>{s.label}</p>
                <p className="text-[24px] font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <PortalSectionLabel label="Platform Summary" />
          <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            <PortalInfoRow label="Total Customers" value={String(stats.totalCustomers)} />
            <PortalInfoRow label="Total Franchises" value={String(stats.totalFranchises)} />
            <PortalInfoRow label="Total Bookings" value={String(stats.totalBookings)} />
            <PortalInfoRow label="Revenue Collected" value={fmt(stats.totalRevenue)} />
            <PortalInfoRow label="Bookings This Month" value={String(stats.thisMonthBookings)} />
          </div>
          <div className="h-6" />
        </>
      )}
    </div>
  )
}
