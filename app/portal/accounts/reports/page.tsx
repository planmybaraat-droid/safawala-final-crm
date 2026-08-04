"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalSkeleton, PortalEmptyState, PortalInfoRow } from "@/components/portal/portal-shared"

const COLOR = "#ef4444"

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/payments?limit=200").then(r => r.json()),
      fetch("/api/expenses?limit=200").then(r => r.json()),
      fetch("/api/bookings?limit=200").then(r => r.json()),
    ]).then(([pRes, eRes, bRes]) => {
      const rawPayments = pRes.status === "fulfilled" ? (pRes.value.data ?? pRes.value) : []
      const payments = Array.isArray(rawPayments) ? rawPayments : []

      const rawExpenses = eRes.status === "fulfilled" ? (eRes.value.data ?? eRes.value) : []
      const expenses = Array.isArray(rawExpenses) ? rawExpenses : []

      const rawBookings = bRes.status === "fulfilled" ? (bRes.value.data ?? bRes.value) : []
      const bookings = Array.isArray(rawBookings) ? rawBookings : []

      const totalRevenue = payments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
      const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
      const pendingPayments = payments.filter((p: any) => p.status === "pending" || p.status === "partial")
      const pendingAmount = pendingPayments.reduce((s: number, p: any) => s + ((p.total_amount ?? 0) - (p.paid_amount ?? p.amount ?? 0)), 0)

      const now = new Date()
      const thisMonth = bookings.filter((b: any) => {
        const d = new Date(b.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })

      setStats({ totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, pendingAmount, bookingsThisMonth: thisMonth.length, totalBookings: bookings.length })
    })
    .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`

  return (
    <div>
      <PortalPageHeader title="Financial Reports" subtitle="Revenue, expenses & profit" color={COLOR} backHref="/portal/accounts" />

      {loading ? (
        <div className="mx-4 mt-4"><PortalSkeleton rows={6} /></div>
      ) : !stats ? (
        <PortalEmptyState icon="bar-chart" title="No data available" subtitle="Financial summary will appear here" color={COLOR} />
      ) : (
        <>
          {/* Net Profit Card */}
          <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: stats.netProfit >= 0 ? "rgba(34,197,94,0.08)" : `${COLOR}08`, border: `1px solid ${stats.netProfit >= 0 ? "rgba(34,197,94,0.2)" : COLOR + "22"}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: stats.netProfit >= 0 ? "#16a34a" : COLOR }}>Net Profit (All Time)</p>
            <p className="text-[32px] font-black" style={{ color: stats.netProfit >= 0 ? "#166534" : COLOR }}>
              {stats.netProfit < 0 ? "- " : ""}{fmt(stats.netProfit)}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
            {[
              { label: "Total Revenue", value: fmt(stats.totalRevenue), color: "#16a34a" },
              { label: "Total Expenses", value: fmt(stats.totalExpenses), color: COLOR },
              { label: "Pending Collection", value: fmt(stats.pendingAmount), color: "#f59e0b" },
              { label: "This Month's Bookings", value: stats.bookingsThisMonth, color: "#3b82f6" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(80,55,30,0.4)" }}>{s.label}</p>
                <p className="text-[18px] font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <PortalSectionLabel label="Summary" />
          <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            <PortalInfoRow label="Total Bookings" value={String(stats.totalBookings)} />
            <PortalInfoRow label="Revenue Collected" value={fmt(stats.totalRevenue)} />
            <PortalInfoRow label="Pending Collections" value={fmt(stats.pendingAmount)} />
            <PortalInfoRow label="Total Expenses" value={fmt(stats.totalExpenses)} />
            <PortalInfoRow label="Net P&L" value={`${stats.netProfit >= 0 ? "+" : "-"}${fmt(stats.netProfit)}`} />
          </div>
          <div className="h-6" />
        </>
      )}
    </div>
  )
}
