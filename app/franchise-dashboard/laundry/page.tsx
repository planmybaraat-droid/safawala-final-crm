'use client'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { StatsCard } from '@/components/franchise/shared/stats-card'
import { Shirt, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const STATUS_STYLES: Record<string, string> = {
  pending:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress:  'bg-blue-50 text-blue-700 border-blue-200',
  ready:        'bg-green-50 text-green-700 border-green-200',
  delivered:    'bg-gray-50 text-gray-500 border-gray-200',
  overdue:      'bg-red-50 text-red-700 border-red-200',
}

export default function FranchiseLaundryPage() {
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/laundry')
  const batches = data || []

  const inProgress = batches.filter((b: any) => ['pending','in_progress'].includes(b.status)).length // any: API shape
  const ready = batches.filter((b: any) => b.status === 'ready').length
  const overdue = batches.filter((b: any) =>
    b.expected_date && new Date(b.expected_date) < new Date() && b.status !== 'delivered'
  ).length

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Laundry" subtitle="Track laundry batches and vendor status"
        icon={Shirt}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Laundry' }]} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatsCard title="In Progress" value={inProgress} icon={Clock}
          iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatsCard title="Ready to Collect" value={ready} icon={CheckCircle2}
          iconColor="text-green-600" iconBg="bg-green-50" />
        <StatsCard title="Overdue" value={overdue} icon={AlertTriangle}
          iconColor="text-red-500" iconBg="bg-red-50" urgent={overdue > 0} />
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Batch / Items</span><span>Vendor</span><span>Sent Date</span><span>Expected Return</span><span>Status</span>
        </div>

        {loading && <RowSkeleton count={6} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && batches.length === 0 && (
          <EmptyState icon={Shirt} title="No laundry batches"
            description="Create a laundry batch to track items sent for cleaning" />
        )}
        {!loading && !error && batches.map((b: any) => { // any: laundry API response shape
          const isOverdue = b.expected_date && new Date(b.expected_date) < new Date() && b.status !== 'delivered'
          return (
            <div key={b.id}
              className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0f1117] truncate">{b.batch_number || `Batch #${b.id?.slice(0,6)}`}</p>
                <p className="text-xs text-[#9ca3af]">{b.item_count || 0} item{b.item_count !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-sm text-[#4b5563] truncate">{b.vendor_name || b.vendors?.name || '—'}</p>
              <p className="text-sm text-[#4b5563]">{formatDate(b.sent_date)}</p>
              <p className={cn('text-sm', isOverdue ? 'text-red-600 font-semibold' : 'text-[#4b5563]')}>
                {formatDate(b.expected_date)}
              </p>
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize w-fit',
                isOverdue ? STATUS_STYLES.overdue : STATUS_STYLES[b.status] || STATUS_STYLES.pending)}>
                {isOverdue ? 'Overdue' : (b.status || 'pending').replace('_',' ')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
