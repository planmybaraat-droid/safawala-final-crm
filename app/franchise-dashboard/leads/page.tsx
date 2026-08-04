'use client'
import { useState, useMemo } from 'react'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { StatsCard } from '@/components/franchise/shared/stats-card'
import { UserPlus, Phone, MessageSquare, ChevronRight, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  new:        { label: 'New',        className: 'bg-blue-50 text-blue-700 border-blue-200' },
  contacted:  { label: 'Contacted',  className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  qualified:  { label: 'Qualified',  className: 'bg-purple-50 text-purple-700 border-purple-200' },
  converted:  { label: 'Converted',  className: 'bg-green-50 text-green-700 border-green-200' },
  lost:       { label: 'Lost',       className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

function LeadBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status?.toLowerCase()] ?? { label: status || 'Unknown', className: 'bg-gray-50 text-gray-500 border-gray-200' }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${cfg.className}`}>{cfg.label}</span>
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function FranchiseLeadsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/leads')
  const leads = data || []

  const filtered = useMemo(() =>
    statusFilter === 'all' ? leads : leads.filter((l: any) => l.status === statusFilter) // any: API shape
  , [leads, statusFilter])

  const newCount = leads.filter((l: any) => l.status === 'new').length
  const convertedCount = leads.filter((l: any) => l.status === 'converted').length
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Leads" subtitle="Track and convert enquiries into bookings"
        icon={UserPlus}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Leads' }]} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatsCard title="New Leads" value={newCount} icon={UserPlus}
          iconColor="text-blue-600" iconBg="bg-blue-50" urgent={newCount > 5} />
        <StatsCard title="Converted" value={convertedCount} icon={CheckCircle2}
          iconColor="text-green-600" iconBg="bg-green-50" />
        <StatsCard title="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp}
          iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {['all', ...Object.keys(STATUS_MAP)].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              statusFilter === s ? 'bg-[#0f1117] text-white' : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]')}>
            {s === 'all' ? 'All' : STATUS_MAP[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Lead</span><span>Contact</span><span>Source</span><span>Date</span><span>Status</span>
        </div>

        {loading && <RowSkeleton count={6} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={UserPlus} title="No leads found"
            description="Leads from your public packages page will appear here automatically" />
        )}
        {!loading && !error && filtered.map((l: any) => ( // any: leads API response shape
          <div key={l.id}
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#0f1117] truncate">{l.name || l.customer_name || '—'}</p>
              <p className="text-xs text-[#9ca3af] truncate">{l.notes || l.message || ''}</p>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-[#4b5563] truncate">{l.phone || '—'}</span>
              {l.phone && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`tel:${l.phone}`} className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100"><Phone className="h-3 w-3" /></a>
                  <a href={`https://wa.me/${l.phone}`.replace(/[^0-9+]/g,'')} target="_blank" rel="noreferrer"
                    className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100"><MessageSquare className="h-3 w-3" /></a>
                </div>
              )}
            </div>
            <p className="text-xs text-[#9ca3af] truncate">{l.source || l.lead_source || '—'}</p>
            <p className="text-sm text-[#4b5563]">{formatDate(l.created_at)}</p>
            <LeadBadge status={l.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
