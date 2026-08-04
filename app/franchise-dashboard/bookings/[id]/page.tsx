'use client'

import { use } from 'react'
import Link from 'next/link'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { PageSkeleton } from '@/components/franchise/shared/skeleton'
import { SectionErrorBoundary } from '@/components/franchise/shared/error-boundary'
import {
  Calendar, User, Phone, MapPin, Package, DollarSign,
  Truck, RotateCcw, FileText, ArrowLeft, MessageSquare,
  Clock, AlertTriangle, CheckCircle2
} from 'lucide-react'

// Real normalized booking fields from /api/bookings/:id
// booking_number | customer.{name,phone,whatsapp,email,city} | event_date | delivery_date
// return_date | total_amount | paid_amount | status | type | event_type | venue_address
// venue_name | notes | has_modifications | subtotal_amount | discount_amount | tax_amount
// security_deposit | groom_name | bride_name | groom_whatsapp | bride_whatsapp

function formatINR(n: number | null | undefined) {
  return '₹' + ((n || 0)).toLocaleString('en-IN')
}
function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  })
}
function formatTime(t: string | null | undefined) {
  if (!t) return null
  // Handle "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 py-2.5 border-b border-[#f1f3f7] last:border-0">
      <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider sm:w-40 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="text-sm text-[#0f1117] flex-1">{value}</div>
    </div>
  )
}

function Section({ title, icon: Icon, children, badge }: {
  title: string; icon: any; children: React.ReactNode; badge?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#e4e7ef] bg-[#f8f9fc]">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#9ca3af]" />
          <h3 className="text-sm font-semibold text-[#0f1117]">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
    delivered: 'bg-blue-50 text-blue-700 border-blue-200',
    returned:  'bg-gray-50 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize
      ${map[status?.toLowerCase()] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {status || '—'}
    </span>
  )
}

function BookingDetail({ id }: { id: string }) {
  // Try /api/bookings/:id first — if 404, the booking may be in old system
  const { data: booking, loading, error, refetch } = useSafeData<any>(`/api/bookings/${id}`) // any: complex booking union

  if (loading) return <PageSkeleton />

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <ErrorCard
          message={error || 'Booking not found'}
          onRetry={refetch}
        />
        <p className="text-sm text-[#9ca3af] text-center">
          Or{' '}
          <Link href={`/bookings/${id}`} className="text-[#7c3aed] hover:underline">
            view in the full booking system →
          </Link>
        </p>
      </div>
    )
  }

  const b = booking
  const c = b.customer || {}
  const balance = (b.total_amount || 0) - (b.paid_amount || b.amount_paid || 0)
  const isOverdue = b.return_date && new Date(b.return_date) < new Date() && b.status === 'delivered'

  return (
    <div className="space-y-5">
      {/* Modification alert */}
      {b.has_modifications && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This booking has been modified.{b.modification_date && ` Last modified: ${formatDate(b.modification_date)}`}</span>
        </div>
      )}

      {/* Overdue return alert */}
      {isOverdue && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Return is overdue! Expected by {formatDate(b.return_date)}. Please follow up.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left 2/3 ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer info */}
          <Section title="Customer" icon={User}>
            <InfoRow label="Name" value={<span className="font-semibold">{c.name || '—'}</span>} />
            <InfoRow label="Phone" value={
              c.phone ? (
                <div className="flex items-center gap-2">
                  <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline">{c.phone}</a>
                  {(c.whatsapp || c.phone) && (
                    <a
                      href={`https://wa.me/${(c.whatsapp || c.phone).replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
              ) : '—'
            } />
            <InfoRow label="Email" value={c.email || '—'} />
            <InfoRow label="City" value={[c.city, c.state, c.pincode].filter(Boolean).join(', ') || '—'} />
            {c.customer_code && <InfoRow label="Customer Code" value={
              <span className="font-mono text-xs text-[#9ca3af]">{c.customer_code}</span>
            } />}
          </Section>

          {/* Booking details */}
          <Section title="Booking Details" icon={Calendar} badge={<StatusBadge status={b.status} />}>
            <InfoRow label="Booking #" value={
              <span className="font-mono font-semibold">{b.booking_number || '—'}</span>
            } />
            <InfoRow label="Type" value={
              <span className="capitalize">{b.type || b.booking_type || '—'}</span>
            } />
            <InfoRow label="Event Date" value={
              <span className="font-semibold text-[#d4a017]">
                {formatDate(b.event_date)}
                {b.event_time && ` · ${formatTime(b.event_time)}`}
              </span>
            } />
            <InfoRow label="Event Type" value={b.event_type || '—'} />
            <InfoRow label="Venue" value={
              [b.venue_name, b.venue_address].filter(Boolean).join(', ') || '—'
            } />
            <InfoRow label="Delivery Date" value={
              <span>
                {formatDate(b.delivery_date)}
                {b.delivery_time && ` · ${formatTime(b.delivery_time)}`}
              </span>
            } />
            <InfoRow label="Return Date" value={
              <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                {formatDate(b.return_date)}
                {b.return_time && ` · ${formatTime(b.return_time)}`}
              </span>
            } />
            {b.notes && <InfoRow label="Notes" value={
              <span className="text-[#4b5563]">{b.notes}</span>
            } />}
          </Section>

          {/* Groom/Bride info if package */}
          {(b.groom_name || b.bride_name) && (
            <Section title="Bride & Groom Details" icon={User}>
              {b.groom_name && <InfoRow label="Groom" value={b.groom_name} />}
              {b.groom_whatsapp && <InfoRow label="Groom WhatsApp" value={
                <a href={`https://wa.me/${b.groom_whatsapp.replace(/[^0-9]/g,'')}`}
                  target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                  {b.groom_whatsapp}
                </a>
              } />}
              {b.bride_name && <InfoRow label="Bride" value={b.bride_name} />}
              {b.bride_whatsapp && <InfoRow label="Bride WhatsApp" value={
                <a href={`https://wa.me/${b.bride_whatsapp.replace(/[^0-9]/g,'')}`}
                  target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                  {b.bride_whatsapp}
                </a>
              } />}
            </Section>
          )}
        </div>

        {/* ── Right 1/3 ── */}
        <div className="space-y-5">
          {/* Payment summary */}
          <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
            <h3 className="text-sm font-semibold text-[#0f1117] mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#9ca3af]" />
              Payment
            </h3>
            <div className="space-y-2">
              {b.subtotal_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Subtotal</span>
                  <span>{formatINR(b.subtotal_amount)}</span>
                </div>
              )}
              {b.distance_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Travel ({b.distance_km}km)</span>
                  <span>{formatINR(b.distance_amount)}</span>
                </div>
              )}
              {b.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">
                    Discount{b.coupon_code ? ` (${b.coupon_code})` : ''}
                  </span>
                  <span className="text-green-600">-{formatINR(b.discount_amount + (b.coupon_discount || 0))}</span>
                </div>
              )}
              {b.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Tax{b.gst_percentage ? ` (${b.gst_percentage}%)` : ''}</span>
                  <span>{formatINR(b.tax_amount)}</span>
                </div>
              )}
              {b.security_deposit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Security Deposit</span>
                  <span>{formatINR(b.security_deposit)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-[#e4e7ef] pt-2 mt-1">
                <span>Total</span>
                <span>{formatINR(b.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9ca3af]">Paid</span>
                <span className="text-green-600 font-semibold">
                  {formatINR(b.paid_amount || b.amount_paid || 0)}
                </span>
              </div>
              {balance > 0 ? (
                <div className="flex justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
                  <span className="text-red-700 font-semibold text-sm">Balance Due</span>
                  <span className="text-red-700 font-bold text-sm">{formatINR(balance)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-semibold text-sm">Fully Paid</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-[#e4e7ef] p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
              Actions
            </h3>
            <Link
              href={`/bookings/${id}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#f8f9fc] hover:bg-[#f1f3f7] text-sm text-[#0f1117] font-medium transition-colors"
            >
              <FileText className="h-4 w-4 text-[#9ca3af]" />
              Open Full Detail View
            </Link>
            {c.phone && (
              <a
                href={`https://wa.me/${(c.whatsapp || c.phone).replace(/[^0-9]/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 hover:bg-green-100 text-sm text-green-700 font-medium transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp {c.name?.split(' ')[0]}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FranchiseBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="p-5 lg:p-7 max-w-5xl mx-auto">
      <div className="mb-5">
        <Link
          href="/franchise-dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#0f1117] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
      </div>

      <PageHeader
        title="Booking Detail"
        icon={Calendar}
        breadcrumbs={[
          { label: 'Dashboard', href: '/franchise-dashboard' },
          { label: 'Bookings', href: '/franchise-dashboard/bookings' },
          { label: 'Detail' },
        ]}
      />

      <SectionErrorBoundary sectionName="Booking Detail">
        <BookingDetail id={id} />
      </SectionErrorBoundary>
    </div>
  )
}
