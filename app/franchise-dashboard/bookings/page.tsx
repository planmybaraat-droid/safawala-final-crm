'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSafeData, useDebounce } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { SectionErrorBoundary } from '@/components/franchise/shared/error-boundary'
import { Calendar, Search, Plus, ChevronRight, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

// Real statuses from the DB (product_orders + package_bookings)
const STATUS_FILTERS = ['all', 'confirmed', 'pending', 'delivered', 'returned', 'cancelled']

// Real normalized fields returned by /api/bookings:
// booking_number, customer (object: name, phone, whatsapp), event_date, delivery_date,
// return_date, total_amount, paid_amount (NOT amount_paid), status, type ('package'|'rental'|'sale'),
// event_type, venue_address, notes, has_modifications

function formatINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function daysLabel(d: string | null | undefined) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d ago`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `in ${diff}d`
}

const STATUS_STYLES: Record<string, string> = {
  confirmed:   'bg-green-50 text-green-700 border-green-200',
  pending:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  delivered:   'bg-blue-50 text-blue-700 border-blue-200',
  returned:    'bg-gray-50 text-gray-500 border-gray-200',
  cancelled:   'bg-red-50 text-red-600 border-red-200',
  quote:       'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status?.toLowerCase()] ?? 'bg-gray-50 text-gray-500 border-gray-200'
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize',
      style
    )}>
      {status || '—'}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    package: 'bg-purple-50 text-purple-700 border-purple-200',
    rental:  'bg-teal-50 text-teal-700 border-teal-200',
    sale:    'bg-orange-50 text-orange-700 border-orange-200',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border capitalize',
      map[type?.toLowerCase()] ?? 'bg-gray-50 text-gray-400 border-gray-200'
    )}>
      {type || '—'}
    </span>
  )
}

function BookingsList() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchRaw, setSearchRaw] = useState('')
  const search = useDebounce(searchRaw, 350)

  // /api/bookings returns normalized array with real fields
  const url = search.trim()
    ? `/api/bookings?search=${encodeURIComponent(search)}`
    : '/api/bookings'

  const { data, loading, error, refetch } = useSafeData<any[]>(url) // any: complex normalized booking union type

  const filtered = useMemo(() => {
    const list = data || []
    if (statusFilter === 'all') return list
    return list.filter((b: any) => b.status?.toLowerCase() === statusFilter) // any: normalized booking shape
  }, [data, statusFilter])

  const balance = (b: any) => (b.total_amount || 0) - (b.paid_amount || b.amount_paid || 0) // any: booking shape

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-[#e4e7ef] rounded-xl px-3 py-2.5 flex-1 max-w-md">
          <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
          <input
            type="text"
            placeholder="Search customer name, booking #, phone…"
            value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#0f1117] placeholder:text-[#9ca3af] outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'bg-[#0f1117] text-white'
                  : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_36px] gap-3 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Customer</span>
          <span>Booking #</span>
          <span>Event Date</span>
          <span>Amount</span>
          <span>Balance</span>
          <span>Status</span>
          <span />
        </div>

        {loading && <RowSkeleton count={10} />}

        {!loading && error && (
          <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={Calendar}
            title={statusFilter !== 'all' ? `No ${statusFilter} bookings` : 'No bookings found'}
            description={searchRaw ? 'Try a different search term' : 'Create your first booking to get started'}
            action={{ label: '+ New Booking', onClick: () => window.location.href = '/create-invoice' }}
          />
        )}

        {!loading && !error && filtered.map((b: any) => { // any: normalized booking union (package | rental | sale)
          const customerName = b.customer?.name || b.customer_name || '—'
          const customerPhone = b.customer?.phone || b.customer_phone || ''
          const balAmt = balance(b)
          const eventLabel = daysLabel(b.event_date)

          return (
            <Link
              key={b.id}
              href={`/franchise-dashboard/bookings/${b.id}`}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_36px] gap-3 items-center px-4 py-3 border-b border-[#f1f3f7] last:border-0 hover:bg-[#fafbfc] transition-colors group"
            >
              {/* Customer */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#fef9ee] border border-[#f5e0a0] flex items-center justify-center text-[#d4a017] text-xs font-bold shrink-0">
                  {customerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0f1117] truncate">{customerName}</p>
                  {customerPhone && (
                    <p className="text-[11px] text-[#9ca3af] truncate">{customerPhone}</p>
                  )}
                </div>
              </div>

              {/* Booking # + type */}
              <div className="min-w-0">
                <p className="text-xs font-mono text-[#4b5563] truncate">{b.booking_number || '—'}</p>
                <TypeBadge type={b.type || b.booking_type || b.booking_kind} />
              </div>

              {/* Event date */}
              <div>
                <p className="text-sm text-[#4b5563]">{formatDate(b.event_date)}</p>
                {eventLabel && (
                  <p className={cn(
                    'text-[10px] font-medium',
                    eventLabel.includes('ago') ? 'text-red-500' : 'text-[#9ca3af]'
                  )}>
                    {eventLabel}
                  </p>
                )}
              </div>

              {/* Total */}
              <div>
                <p className="text-sm font-semibold text-[#0f1117]">{formatINR(b.total_amount)}</p>
                <p className="text-[11px] text-green-600">Paid: {formatINR(b.paid_amount || b.amount_paid || 0)}</p>
              </div>

              {/* Balance */}
              <div>
                {balAmt > 0 ? (
                  <p className="text-sm font-bold text-red-600">{formatINR(balAmt)}</p>
                ) : (
                  <p className="text-sm text-green-600 font-semibold">✓ Cleared</p>
                )}
              </div>

              {/* Status */}
              <StatusBadge status={b.status} />

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af]" />
            </Link>
          )
        })}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#9ca3af] mt-3 text-right">
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
        </p>
      )}
    </>
  )
}

export default function FranchiseBookingsPage() {
  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title="Bookings"
        subtitle="All customer bookings — rentals, packages and sales"
        icon={Calendar}
        breadcrumbs={[
          { label: 'Dashboard', href: '/franchise-dashboard' },
          { label: 'Bookings' },
        ]}
        action={
          <Link
            href="/create-invoice"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> New Booking
          </Link>
        }
      />

      <SectionErrorBoundary sectionName="Bookings List">
        <BookingsList />
      </SectionErrorBoundary>
    </div>
  )
}
