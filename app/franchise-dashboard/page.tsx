'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSafeData } from '@/lib/franchise/hooks'
import { StatsCard } from '@/components/franchise/shared/stats-card'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { CardSkeleton, RowSkeleton } from '@/components/franchise/shared/skeleton'
import { StatusBadge } from '@/components/franchise/shared/status-badge'
import {
  Calendar, Users, Truck, DollarSign, Package, AlertTriangle,
  ArrowRight, Plus, RotateCcw, Shirt, CheckCircle2, Clock,
  TrendingUp, FileText, ClipboardCheck, UserPlus, ChevronRight
} from 'lucide-react'

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `in ${diff}d`
}

// ─── Section: Today's Pulse ──────────────────────────────────────────────────
function TodayPulse() {
  const today = new Date().toISOString().split('T')[0]
  const { data: stats, loading, error, refetch } = useSafeData<any>('/api/dashboard')

  if (loading) return <CardSkeleton count={4} />
  if (error) return <ErrorCard message={error} onRetry={refetch} compact />

  const s = stats || {}
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Bookings This Month"
        value={s.totalBookings ?? 0}
        subtitle={`${s.activeBookings ?? 0} active`}
        icon={Calendar}
        iconColor="text-blue-600" iconBg="bg-blue-50"
        trend={s.monthlyGrowth ? { value: s.monthlyGrowth, label: 'vs last month' } : undefined}
        onClick={() => window.location.href = '/franchise-dashboard/bookings'}
      />
      <StatsCard
        title="Deliveries Today"
        value={s.pendingActions?.deliveries ?? 0}
        subtitle="Going out today"
        icon={Truck}
        iconColor="text-purple-600" iconBg="bg-purple-50"
        onClick={() => window.location.href = '/franchise-dashboard/deliveries'}
      />
      <StatsCard
        title="Returns Due"
        value={s.pendingActions?.returns ?? 0}
        subtitle="Expected back"
        icon={RotateCcw}
        iconColor="text-orange-600" iconBg="bg-orange-50"
        urgent={(s.pendingActions?.overdue ?? 0) > 0}
        onClick={() => window.location.href = '/franchise-dashboard/deliveries'}
      />
      <StatsCard
        title="Revenue This Month"
        value={formatINR(s.totalRevenue ?? 0)}
        subtitle={`Avg ${formatINR(s.avgBookingValue ?? 0)} / booking`}
        icon={DollarSign}
        iconColor="text-[#d4a017]" iconBg="bg-[#fef9ee]"
        onClick={() => window.location.href = '/franchise-dashboard/reports'}
      />
    </div>
  )
}

// ─── Section: Action Required ─────────────────────────────────────────────────
function ActionRequired() {
  const { data, loading, error, refetch } = useSafeData<any>('/api/dashboard')

  if (loading) return <RowSkeleton count={4} />
  if (error) return <ErrorCard message={error} onRetry={refetch} compact />

  const payments = (data?.paymentReminders?.list || []).slice(0, 4)
  const deliveries = (data?.deliveryReminders?.list || []).slice(0, 3)
  const overdueCount = data?.pendingActions?.overdue ?? 0

  const allItems = [
    ...deliveries.map((d: any) => ({
      type: 'delivery',
      label: `Delivery: ${d.bookingNumber}`,
      sub: `Due ${formatDate(d.deliveryDate)}`,
      urgent: d.daysUntilDelivery <= 0,
      href: `/franchise-dashboard/deliveries`
    })),
    ...payments.map((p: any) => ({
      type: 'payment',
      label: `Payment due: ${p.bookingNumber}`,
      sub: `${formatINR(p.pendingAmount)} — event ${formatDate(p.eventDate)}`,
      urgent: p.daysUntilEvent <= 3,
      href: `/franchise-dashboard/bookings/${p.id}`
    })),
  ]

  if (allItems.length === 0) {
    return (
      <div className="flex items-center gap-2.5 py-6 px-4 text-sm text-[#9ca3af]">
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        <span>All caught up — no urgent actions!</span>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#f1f3f7]">
      {allItems.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fc] transition-colors group"
        >
          <div className={`w-2 h-2 rounded-full shrink-0 ${item.urgent ? 'bg-red-500' : 'bg-amber-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0f1117] truncate">{item.label}</p>
            <p className="text-xs text-[#9ca3af] truncate">{item.sub}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] shrink-0" />
        </Link>
      ))}
    </div>
  )
}

// ─── Section: Upcoming Bookings ───────────────────────────────────────────────
function UpcomingBookings() {
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/bookings?limit=6')

  if (loading) return <RowSkeleton count={5} />
  if (error) return <ErrorCard message={error} onRetry={refetch} compact />

  const bookings = (data || []).slice(0, 6)

  if (bookings.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#9ca3af]">
        No upcoming bookings
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#f1f3f7]">
      {bookings.map((b: any) => (
        <Link
          key={b.id}
          href={`/franchise-dashboard/bookings/${b.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fc] transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#f1f3f7] flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#4b5563] leading-none">
              {b.event_date ? new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric' }) : '--'}
            </span>
            <span className="text-[8px] text-[#9ca3af] uppercase">
              {b.event_date ? new Date(b.event_date).toLocaleDateString('en-IN', { month: 'short' }) : ''}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0f1117] truncate">
              {b.customers?.name || b.customer_name || 'Customer'}
            </p>
            <p className="text-xs text-[#9ca3af] truncate">
              {b.booking_number} · {b.event_date ? daysUntil(b.event_date) : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={b.status} />
            <span className="text-xs font-semibold text-[#0f1117]">
              {formatINR(b.total_amount || 0)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ─── Section: Recent Customers ────────────────────────────────────────────────
function RecentCustomers() {
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/customers')

  if (loading) return <RowSkeleton count={4} />
  if (error) return <ErrorCard message={error} onRetry={refetch} compact />

  const customers = (data || []).slice(0, 5)

  return (
    <div className="divide-y divide-[#f1f3f7]">
      {customers.map((c: any) => (
        <Link
          key={c.id}
          href={`/franchise-dashboard/customers/${c.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fc] transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-[#d4a017] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(c.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0f1117] truncate">{c.name}</p>
            <p className="text-xs text-[#9ca3af] truncate">{c.phone}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] shrink-0" />
        </Link>
      ))}
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'New Booking',     href: '/create-invoice',                    icon: Plus,          color: 'bg-[#d4a017] text-white' },
  { label: 'Add Customer',    href: '/franchise-dashboard/customers',      icon: UserPlus,      color: 'bg-blue-600 text-white' },
  { label: 'Deliveries',      href: '/franchise-dashboard/deliveries',     icon: Truck,         color: 'bg-purple-600 text-white' },
  { label: 'All Bookings',    href: '/franchise-dashboard/bookings',       icon: Calendar,      color: 'bg-green-600 text-white' },
  { label: 'Inventory',       href: '/franchise-dashboard/inventory',      icon: Package,       color: 'bg-orange-500 text-white' },
  { label: 'Reports',         href: '/franchise-dashboard/reports',        icon: TrendingUp,    color: 'bg-indigo-600 text-white' },
  { label: 'Expenses',        href: '/franchise-dashboard/expenses',       icon: FileText,      color: 'bg-rose-500 text-white' },
  { label: 'Tasks',           href: '/franchise-dashboard/tasks',          icon: ClipboardCheck, color: 'bg-teal-500 text-white' },
]

// ─── Section Card wrapper ─────────────────────────────────────────────────────
function SectionCard({
  title, viewAllHref, children
}: {
  title: string
  viewAllHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e7ef]">
        <h3 className="text-sm font-semibold text-[#0f1117]">{title}</h3>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function FranchiseDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    try {
      const raw = localStorage.getItem('safawala_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore — user display is non-critical
    }
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="p-5 lg:p-7 space-y-6 max-w-7xl mx-auto">

      {/* ── Greeting bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0f1117]">
            {greet()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-xs text-[#9ca3af] mt-0.5">
            {dateStr}
            {user?.franchise_name ? ` · ${user.franchise_name}` : ''}
          </p>
        </div>
        <Link
          href="/create-invoice"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>

      {/* ── KPI row ── */}
      <TodayPulse />

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title="🔴 Action Required" viewAllHref="/franchise-dashboard/bookings">
            <ActionRequired />
          </SectionCard>

          <SectionCard title="📅 Upcoming Bookings" viewAllHref="/franchise-dashboard/bookings">
            <UpcomingBookings />
          </SectionCard>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-5">
          {/* Quick Launch */}
          <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
            <h3 className="text-sm font-semibold text-[#0f1117] mb-3">Quick Launch</h3>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-[#f8f9fc] transition-colors group text-center"
                >
                  <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium text-[#4b5563] leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Customers */}
          <SectionCard title="👥 Recent Customers" viewAllHref="/franchise-dashboard/customers">
            <RecentCustomers />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
