'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSafeData, useDebounce } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { SectionErrorBoundary } from '@/components/franchise/shared/error-boundary'
import { Users, Search, Plus, ChevronRight, Phone, MessageSquare, Shield, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

// Real fields: id, name, phone, whatsapp, email, address, city, state, pincode,
//              customer_code, franchise_id, status, kyc_status, aadhar_number,
//              pan_number, kyc_document_url, lead_id, created_at, updated_at

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500']
function avatarColor(id: string) {
  let h = 0; for (const c of (id || '')) h = (h << 5) - h + c.charCodeAt(0)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  const p = (name||'U').trim().split(' ')
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : p[0].substring(0,2).toUpperCase()
}

function KycBadge({ status }: { status: string }) {
  if (status === 'verified') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
      <Shield className="h-2.5 w-2.5" /> Verified
    </span>
  )
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
      <ShieldAlert className="h-2.5 w-2.5" /> Pending
    </span>
  )
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 border border-gray-200">
      No KYC
    </span>
  )
}

function CustomerTable() {
  const [searchRaw, setSearchRaw] = useState('')
  const search = useDebounce(searchRaw, 350)

  // Real API: /api/customers?search=&basic=0
  // Full response includes franchise relation and all KYC fields
  const url = search.trim()
    ? `/api/customers?search=${encodeURIComponent(search)}`
    : '/api/customers'

  const { data, loading, error, refetch } = useSafeData<any[]>(url) // any: customers API shape varies with basic param
  const customers = data || []

  return (
    <>
      <div className="flex items-center gap-2 bg-white border border-[#e4e7ef] rounded-xl px-3 py-2.5 max-w-md mb-5">
        <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
        <input type="text" placeholder="Search by name, phone, email, city…"
          value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#0f1117] placeholder:text-[#9ca3af] outline-none" />
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_36px] gap-3 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Customer</span><span>Phone</span><span>City</span><span>Code</span><span>KYC</span><span/>
        </div>
        {loading && <RowSkeleton count={8} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && customers.length === 0 && (
          <EmptyState icon={Users} title={searchRaw ? 'No customers found' : 'No customers yet'}
            description={searchRaw ? 'Try different search terms' : 'Add your first customer to get started'}
            action={!searchRaw ? { label: '+ Add Customer', onClick: () => window.location.href = '/customers/new' } : undefined} />
        )}
        {!loading && !error && customers.map((c: any) => ( // any: customer API response shape
          <div key={c.id}
            className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_36px] gap-3 items-center px-4 py-3 border-b border-[#f1f3f7] last:border-0 hover:bg-[#fafbfc] transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full ${avatarColor(c.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {getInitials(c.name)}
              </div>
              <div className="min-w-0">
                <Link href={`/franchise-dashboard/customers/${c.id}`}
                  className="text-sm font-semibold text-[#0f1117] hover:text-[#d4a017] truncate block transition-colors">
                  {c.name}
                </Link>
                {c.email && <p className="text-[11px] text-[#9ca3af] truncate">{c.email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-[#4b5563] truncate">{c.phone || '—'}</span>
              {c.phone && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <a href={`tel:${c.phone}`} title="Call"
                    className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                    <Phone className="h-3 w-3" />
                  </a>
                  <a href={`https://wa.me/${(c.whatsapp||c.phone).replace(/[^0-9]/g,'')}`}
                    target="_blank" rel="noreferrer" title="WhatsApp"
                    className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                    <MessageSquare className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
            <p className="text-sm text-[#4b5563] truncate">{c.city || '—'}</p>
            <p className="text-xs font-mono text-[#9ca3af] truncate">{c.customer_code || '—'}</p>
            <KycBadge status={c.kyc_status} />
            <Link href={`/franchise-dashboard/customers/${c.id}`}>
              <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] transition-colors" />
            </Link>
          </div>
        ))}
      </div>
      {!loading && customers.length > 0 && (
        <p className="text-xs text-[#9ca3af] mt-3 text-right">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
      )}
    </>
  )
}

export default function FranchiseCustomersPage() {
  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Customers" subtitle="Customer database with contacts, KYC and booking history"
        icon={Users}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Customers' }]}
        action={
          <Link href="/customers/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add Customer
          </Link>
        }
      />
      <SectionErrorBoundary sectionName="Customers List">
        <CustomerTable />
      </SectionErrorBoundary>
    </div>
  )
}
