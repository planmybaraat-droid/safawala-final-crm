"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalSearchBar, PortalListCard, PortalEmptyState, PortalSkeleton, PortalFAB, PortalAmount } from "@/components/portal/portal-shared"

const COLOR = "#ef4444"

export default function ExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const CATEGORIES = ["all", "salaries", "rent", "supplies", "logistics", "marketing", "other"]

  useEffect(() => { fetchExpenses() }, [filter])

  async function fetchExpenses() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (filter !== "all") params.set("category", filter)
      const res = await fetch(`/api/expenses?${params}`)
      const data = await res.json()
      setExpenses(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch { setExpenses([]) }
    finally { setLoading(false) }
  }

  const filtered = expenses.filter(e =>
    !search ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  )

  const total = filtered.reduce((s, e) => s + (e.amount ?? 0), 0)

  return (
    <div>
      <PortalPageHeader title="Expenses" subtitle="Track all outflows" color={COLOR} backHref="/portal/accounts" />
      <PortalSearchBar value={search} onChange={setSearch} placeholder="Search expense or category..." />

      {!loading && filtered.length > 0 && (
        <div className="mx-4 mb-3 p-3 rounded-2xl flex items-center justify-between" style={{ background: `${COLOR}12`, border: `1px solid ${COLOR}20` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COLOR }}>Total Outflow</p>
          <PortalAmount amount={total} size="lg" />
        </div>
      )}

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {CATEGORIES.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0"
            style={{ background: filter === f ? COLOR : "rgba(255,255,255,0.7)", color: filter === f ? "white" : "rgba(80,55,30,0.5)", border: `1px solid ${filter === f ? COLOR : "rgba(255,255,255,0.9)"}` }}>
            {f === "all" ? "All" : f.replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={6} /> : filtered.length === 0 ? (
          <PortalEmptyState icon="receipt" title="No expenses found" subtitle="Log business expenses here" color={COLOR} />
        ) : filtered.map(e => (
          <PortalListCard
            key={e.id}
            title={e.description ?? e.category ?? "Expense"}
            subtitle={`${e.category ?? "—"} · ${e.expense_date ? new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}`}
            meta={`₹${(e.amount ?? 0).toLocaleString("en-IN")}`}
            badge={e.status ?? "approved"}
            color={COLOR}
            icon="receipt"
          />
        ))}
      </div>

      <PortalFAB label="Add Expense" color={COLOR} icon="plus-circle" onClick={() => router.push("/portal/accounts/expenses/new")} />
    </div>
  )
}
