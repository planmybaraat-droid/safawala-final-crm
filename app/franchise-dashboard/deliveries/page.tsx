'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { StatusBadge } from '@/components/franchise/shared/status-badge'
import { Truck, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'all',      label: 'All',              icon: Truck },
  { key: 'today',    label: "Today's Deliveries", icon: Truck },
  { key: 'returns',  label: 'Returns Due',        icon: RotateCcw },
  { key: 'overdue',  label: 'Overdue',            icon: AlertTriangle },
]

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function isToday(d: string) {
  return new Date(d).toDateString() === new Date().toDateString()
}

function isOverdue(d: string) {
  return new Date(d) < new Date() && !isToday(d)
}

export default function FranchiseDeliveriesPage() {
  const [tab, setTab] = useState('all')
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/deliveries')

  const deliveries = data || []

  const filtered = useMemo(() => {
    if (tab === 'today')   return deliveries.filter((d: any) => d.delivery_date && isToday(d.delivery_date))
    if (tab === 'returns') return deliveries.filter((d: any) => d.return_date && !d.returned_at)
    if (tab === 'overdue') return deliveries.filter((d: any) =>
      (d.delivery_date && isOverdue(d.delivery_date) && !d.delivered_at) ||
      (d.return_date && isOverdue(d.return_date) && !d.returned_at)
    )
    return deliveries
  }, [deliveries, tab])

  const todayCount = deliveries.filter((d: any) => d.delivery_date && isToday(d.delivery_date)).length
  const overdueCount = deliveries.filter((d: any) =>
    (d.return_date && isOverdue(d.return_date) && !d.returned_at)
  ).length

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title="Deliveries & Returns"
        subtitle="Track all outgoing deliveries and return logistics"
        icon={Truck}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Deliveries' }]}
      />

      {/* Urgent banner */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <span>
            <strong>{overdueCount} overdue return{overdueCount > 1 ? 's' : ''}</strong> — please follow up with customers immediately.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === t.key
                ? 'bg-[#0f1117] text-white'
                : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.key === 'today' && todayCount > 0 && (
              <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                tab === 'today' ? 'bg-white text-[#0f1117]' : 'bg-[#0f1117] text-white')}>
                {todayCount}
              </span>
            )}
            {t.key === 'overdue' && overdueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Customer / Booking</span>
          <span>Delivery Date</span>
          <span>Return Date</span>
          <span>Items</span>
          <span>Status</span>
          <span />
        </div>

        {loading && <RowSkeleton count={6} />}

        {!loading && error && (
          <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={tab === 'overdue' ? CheckCircle2 : Truck}
            title={tab === 'overdue' ? 'No overdue items!' : tab === 'today' ? 'No deliveries today' : 'No deliveries found'}
            description={tab === 'overdue' ? 'All returns are on time.' : 'Deliveries will appear here once bookings are confirmed.'}
          />
        )}

        {!loading && !error && filtered.map((d: any) => {
          const isOvrd = d.return_date && isOverdue(d.return_date) && !d.returned_at
          return (
            <Link
              key={d.id}
              href={`/franchise-dashboard/bookings/${d.booking_id}`}
              className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0f1117] truncate">
                  {d.bookings?.customers?.name || d.customer_name || '—'}
                </p>
                <p className="text-xs text-[#9ca3af] truncate">
                  {d.bookings?.booking_number || `ID: ${d.id?.slice(0,8)}`}
                </p>
              </div>
              <p className={cn('text-sm', isToday(d.delivery_date) ? 'text-purple-600 font-semibold' : 'text-[#4b5563]')}>
                {formatDate(d.delivery_date)}
              </p>
              <p className={cn('text-sm', isOvrd ? 'text-red-600 font-semibold' : 'text-[#4b5563]')}>
                {formatDate(d.return_date)}
              </p>
              <p className="text-sm text-[#4b5563]">{d.items_count || d.item_count || '—'}</p>
              <StatusBadge status={isOvrd ? 'overdue' : d.status || 'pending'} />
              <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] justify-self-end" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
