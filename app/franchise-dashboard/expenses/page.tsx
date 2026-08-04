'use client'
import { useState, useMemo } from 'react'
import { useSafeData, useSafePost } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton, CardSkeleton } from '@/components/franchise/shared/skeleton'
import { StatsCard } from '@/components/franchise/shared/stats-card'
import { Receipt, TrendingDown, Calendar, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}
function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const THIS_MONTH = new Date().toISOString().slice(0, 7)

export default function FranchiseExpensesPage() {
  const [monthFilter, setMonthFilter] = useState(THIS_MONTH)
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/expenses')
  const expenses = data || []

  const filtered = useMemo(() => {
    if (!monthFilter) return expenses
    return expenses.filter((e: any) => // any: expenses API shape
      e.date?.startsWith(monthFilter) || e.expense_date?.startsWith(monthFilter)
    )
  }, [expenses, monthFilter])

  const totalThisMonth = filtered.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) // any: API shape
  const byCategory = filtered.reduce((acc: any, e: any) => { // any: dynamic grouping
    const cat = e.category || e.expense_categories?.name || 'Other'
    acc[cat] = (acc[cat] || 0) + (e.amount || 0)
    return acc
  }, {})
  const topCategory = Object.entries(byCategory).sort((a: any, b: any) => b[1] - a[1])[0]

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title="Expenses"
        subtitle="Track and manage franchise expenditure"
        icon={Receipt}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Expenses' }]}
      />

      {/* Month picker */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide">Month</label>
        <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="bg-white border border-[#e4e7ef] rounded-lg px-3 py-1.5 text-sm text-[#0f1117] outline-none focus:border-[#d4a017]" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total This Month" value={formatINR(totalThisMonth)}
          icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50" />
        <StatsCard title="Transactions" value={filtered.length}
          icon={Receipt} iconColor="text-blue-600" iconBg="bg-blue-50" />
        {topCategory && (
          <StatsCard title="Top Category" value={topCategory[0] as string}
            subtitle={formatINR(topCategory[1] as number)}
            icon={Tag} iconColor="text-purple-600" iconBg="bg-purple-50" />
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Date</span><span>Description</span><span>Category</span><span className="text-right">Amount</span>
        </div>

        {loading && <RowSkeleton count={8} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={Receipt} title="No expenses recorded"
            description={`No expenses found for ${monthFilter}`} />
        )}
        {!loading && !error && filtered.map((e: any) => ( // any: API response shape
          <div key={e.id}
            className="grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors">
            <p className="text-sm text-[#4b5563]">{formatDate(e.date || e.expense_date)}</p>
            <p className="text-sm text-[#0f1117] truncate">{e.description || e.notes || '—'}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
              {e.category || e.expense_categories?.name || 'Other'}
            </span>
            <p className="text-sm font-semibold text-red-600 text-right">{formatINR(e.amount)}</p>
          </div>
        ))}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 items-center px-4 py-3 bg-[#f8f9fc] border-t border-[#e4e7ef]">
            <span className="text-xs font-semibold text-[#0f1117] col-span-3">Total</span>
            <p className="text-sm font-bold text-red-600 text-right">{formatINR(totalThisMonth)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
