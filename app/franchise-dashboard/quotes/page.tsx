'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSafeData, useDebounce } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { FileText, Search, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatINR(n: number) { return '₹' + (n||0).toLocaleString('en-IN') }
function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-50 text-gray-500 border-gray-200',
  sent:      'bg-blue-50 text-blue-700 border-blue-200',
  accepted:  'bg-green-50 text-green-700 border-green-200',
  rejected:  'bg-red-50 text-red-600 border-red-200',
  expired:   'bg-orange-50 text-orange-700 border-orange-200',
  converted: 'bg-purple-50 text-purple-700 border-purple-200',
}

const FILTERS = ['all','draft','sent','accepted','rejected','converted']

export default function FranchiseQuotesPage() {
  const [searchRaw, setSearchRaw] = useState('')
  const [filter, setFilter] = useState('all')
  const search = useDebounce(searchRaw, 350)
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/quotes')
  const quotes = data || []

  const filtered = useMemo(() => {
    let list = filter === 'all' ? quotes : quotes.filter((q: any) => q.status === filter) // any: quotes API shape
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((item: any) => // any: quotes API response shape
        item.customer_name?.toLowerCase().includes(q) ||
        item.customers?.name?.toLowerCase().includes(q) ||
        item.quote_number?.toLowerCase().includes(q)
      )
    }
    return list
  }, [quotes, filter, search])

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Quotes" subtitle="View and manage price quotations"
        icon={FileText}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Quotes' }]}
        action={
          <Link href="/quotes/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors">
            + New Quote
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-[#e4e7ef] rounded-xl px-3 py-2.5 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
          <input type="text" placeholder="Search by customer or quote #…"
            value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#0f1117] placeholder:text-[#9ca3af] outline-none" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-[#0f1117] text-white' : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Customer</span><span>Quote #</span><span>Date</span><span>Amount</span><span>Status</span><span />
        </div>

        {loading && <RowSkeleton count={8} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={FileText} title="No quotes found"
            description="Create a quote to share pricing with customers" />
        )}
        {!loading && !error && filtered.map((q: any) => ( // any: quotes API response
          <Link key={q.id} href={`/quotes/${q.id}`}
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#fef9ee] border border-[#f5e0a0] flex items-center justify-center text-[#d4a017] text-xs font-bold shrink-0">
                {(q.customers?.name || q.customer_name || 'C').charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-[#0f1117] truncate">{q.customers?.name || q.customer_name || '—'}</p>
            </div>
            <p className="text-xs font-mono text-[#9ca3af]">{q.quote_number || '—'}</p>
            <p className="text-sm text-[#4b5563]">{formatDate(q.created_at)}</p>
            <p className="text-sm font-semibold text-[#0f1117]">{formatINR(q.total_amount || q.total)}</p>
            <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize w-fit',
              STATUS_STYLES[q.status] || STATUS_STYLES.draft)}>
              {q.status || 'draft'}
            </span>
            <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] justify-self-end" />
          </Link>
        ))}
      </div>
    </div>
  )
}
