'use client'

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton, PageSkeleton } from '@/components/franchise/shared/skeleton'
import { SectionErrorBoundary } from '@/components/franchise/shared/error-boundary'
import { StatusBadge } from '@/components/franchise/shared/status-badge'
import {
  Users, ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard,
  MessageSquare, Shield, ShieldAlert, Sparkles, Receipt, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function KycSection({ customer }: { customer: any }) { // any: customer API shape
  const hasKyc = customer.aadhar_number || customer.pan_number || customer.kyc_status
  return (
    <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
      <h3 className="text-sm font-semibold text-[#0f1117] mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-[#d4a017]" />
        KYC Documents & Status
      </h3>
      {!hasKyc ? (
        <p className="text-xs text-[#9ca3af]">No KYC documents provided for this customer.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-[#f1f3f7]">
            <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Status</span>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize',
              customer.kyc_status === 'verified' ? 'bg-green-50 text-green-700 border-green-200' :
              customer.kyc_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-gray-50 text-gray-500 border-gray-200'
            )}>
              {customer.kyc_status || 'Pending Verification'}
            </span>
          </div>
          {customer.aadhar_number && (
            <div className="flex justify-between items-center py-2 border-b border-[#f1f3f7]">
              <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Aadhaar Number</span>
              <span className="text-sm font-mono text-[#0f1117]">{customer.aadhar_number}</span>
            </div>
          )}
          {customer.pan_number && (
            <div className="flex justify-between items-center py-2 border-b border-[#f1f3f7]">
              <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">PAN Number</span>
              <span className="text-sm font-mono text-[#0f1117]">{customer.pan_number}</span>
            </div>
          )}
          {customer.kyc_notes && (
            <div className="py-2">
              <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider block mb-1">KYC Notes</span>
              <p className="text-xs text-[#4b5563] bg-[#f8f9fc] p-2.5 rounded-lg border border-[#e4e7ef]">
                {customer.kyc_notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CustomerBookings({ customerId }: { customerId: string }) {
  const { data: bookings, loading, error, refetch } = useSafeData<any[]>('/api/bookings') // any: booking API response

  const customerBookings = useMemo(() => {
    return (bookings || []).filter((b: any) => b.customer_id === customerId) // any: booking shape
  }, [bookings, customerId])

  const totalSpent = useMemo(() => {
    return customerBookings.reduce((sum, b) => sum + (b.paid_amount || b.amount_paid || 0), 0)
  }, [customerBookings])

  return (
    <div className="space-y-4">
      {/* Spent summary widget */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
          <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Total Bookings</p>
          <p className="text-xl font-bold text-[#0f1117] mt-1">{customerBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
          <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Total Spent</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatINR(totalSpent)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e4e7ef] bg-[#f8f9fc]">
          <Calendar className="h-4 w-4 text-[#9ca3af]" />
          <h3 className="text-sm font-semibold text-[#0f1117]">Booking History</h3>
        </div>

        {loading && <RowSkeleton count={3} />}
        {!loading && error && (
          <div className="p-4"><ErrorCard message={error} onRetry={refetch} /></div>
        )}
        {!loading && !error && customerBookings.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Create a booking/invoice for this customer."
            action={{ label: '+ New Booking', onClick: () => window.location.href = '/create-invoice' }}
          />
        )}
        {!loading && !error && customerBookings.map((b: any) => ( // any: booking list item
          <Link
            key={b.id}
            href={`/franchise-dashboard/bookings/${b.id}`}
            className="flex items-center justify-between p-4 border-b border-[#f1f3f7] last:border-0 hover:bg-[#fafbfc] transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-[#0f1117] group-hover:text-[#d4a017] transition-colors">
                {b.booking_number || `Booking #${b.id.substring(0, 8)}`}
              </p>
              <p className="text-xs text-[#9ca3af] mt-1">
                Event: {formatDate(b.event_date)} · {b.event_type || 'General'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#0f1117]">{formatINR(b.total_amount)}</p>
                <p className="text-[10px] text-green-600">Paid: {formatINR(b.paid_amount || b.amount_paid || 0)}</p>
              </div>
              <StatusBadge status={b.status} />
              <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CustomerDetailCard({ id }: { id: string }) {
  const { data: res, loading, error, refetch } = useSafeData<any>(`/api/customers/${id}`) // any: customer API response

  if (loading) return <PageSkeleton />
  if (error || !res?.data) {
    return <ErrorCard message={error || 'Customer not found'} onRetry={refetch} />
  }

  const c = res.data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left 2/3: Basic Details */}
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f1f3f7]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#fef9ee] border border-[#f5e0a0] flex items-center justify-center text-[#d4a017] text-lg font-bold">
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0f1117]">{c.name}</h2>
                {c.customer_code && (
                  <p className="text-xs font-mono text-[#9ca3af] mt-0.5">Code: {c.customer_code}</p>
                )}
              </div>
            </div>
            {c.phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1117] hover:bg-[#2e313c] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Customer
                </a>
                <a
                  href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Email Address</p>
              <p className="text-[#0f1117] mt-1 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-[#9ca3af]" />
                {c.email || 'No email registered'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">WhatsApp Number</p>
              <p className="text-[#0f1117] mt-1 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-[#9ca3af]" />
                {c.whatsapp || c.phone || '—'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Postal Address</p>
              <p className="text-[#0f1117] mt-1 flex items-start gap-1.5">
                <MapPin className="h-4 w-4 text-[#9ca3af] mt-0.5 shrink-0" />
                <span>
                  {c.address ? `${c.address}, ` : ''}
                  {[c.city, c.state, c.pincode].filter(Boolean).join(', ') || 'No address registered'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bookings */}
        <CustomerBookings customerId={c.id} />
      </div>

      {/* Right 1/3: KYC and metadata */}
      <div className="space-y-5">
        <KycSection customer={c} />
      </div>
    </div>
  )
}

export default function FranchiseCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="p-5 lg:p-7 max-w-6xl mx-auto space-y-5">
      <div>
        <Link
          href="/franchise-dashboard/customers"
          className="inline-flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#0f1117] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
      </div>

      <PageHeader
        title="Customer Profile"
        icon={Users}
        breadcrumbs={[
          { label: 'Dashboard', href: '/franchise-dashboard' },
          { label: 'Customers', href: '/franchise-dashboard/customers' },
          { label: 'Profile' },
        ]}
      />

      <SectionErrorBoundary sectionName="Customer Detail">
        <CustomerDetailCard id={id} />
      </SectionErrorBoundary>
    </div>
  )
}
