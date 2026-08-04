"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalEmptyState, PortalSkeleton, PortalListCard } from "@/components/portal/portal-shared"

const COLOR = "#ec4899"

export default function EarningsPage() {
  const [payroll, setPayroll] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchPayroll() }, [])

  async function fetchPayroll() {
    try {
      const res = await fetch("/api/payroll?limit=12")
      const data = await res.json()
      const records = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      setPayroll(records)
      if (records.length > 0) {
        const total = records.reduce((s: number, r: any) => s + (r.net_salary ?? r.amount ?? 0), 0)
        setSummary({ total, count: records.length, latest: records[0] })
      }
    } catch { setPayroll([]) }
    finally { setLoading(false) }
  }

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

  return (
    <div>
      <PortalPageHeader title="Earnings" subtitle="Salary + commission" color={COLOR} backHref="/portal/styling" />

      {summary && (
        <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${COLOR}18, ${COLOR}08)`, border: `1px solid ${COLOR}22` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: COLOR }}>Total Earned (All Time)</p>
          <p className="text-[28px] font-black" style={{ color: "#1e1208" }}>{fmt(summary.total)}</p>
          <p className="text-[11px] mt-1" style={{ color: "rgba(80,55,30,0.5)" }}>{summary.count} payroll records</p>
        </div>
      )}

      <PortalSectionLabel label="Payroll History" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : payroll.length === 0 ? (
          <PortalEmptyState icon="rupee" title="No payroll records" subtitle="Your salary history will appear here" color={COLOR} />
        ) : payroll.map(r => (
          <PortalListCard
            key={r.id}
            title={r.month ?? r.period ?? `Payroll #${r.id?.slice(0, 6)}`}
            subtitle={`Salary: ${fmt(r.basic_salary ?? 0)}${r.commission ? ` · Commission: ${fmt(r.commission)}` : ""}`}
            meta={r.paid_date ? new Date(r.paid_date).toLocaleDateString("en-IN") : r.status}
            badge={r.status ?? "paid"}
            color={COLOR}
            icon="rupee"
          />
        ))}
      </div>
      <div className="h-4" />
    </div>
  )
}
