'use client'
import { useState } from 'react'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { CardSkeleton } from '@/components/franchise/shared/skeleton'
import { StatsCard } from '@/components/franchise/shared/stats-card'
import { BarChart3, TrendingUp, DollarSign, Calendar, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function formatINR(n: number) { return '₹' + (n || 0).toLocaleString('en-IN') }

function MiniBar({ label, value, max, color = '#d4a017' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#4b5563] truncate max-w-[120px]">{label}</span>
        <span className="font-semibold text-[#0f1117]">{formatINR(value)}</span>
      </div>
      <div className="h-2 bg-[#f1f3f7] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function FranchiseReportsPage() {
  const [period, setPeriod] = useState<'week'|'month'|'quarter'>('month')
  const { data, loading, error, refetch } = useSafeData<any>('/api/dashboard')

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Reports" subtitle="Business performance and analytics"
        icon={BarChart3}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Reports' }]} />

      <div className="flex items-center gap-1.5 mb-6">
        {(['week','month','quarter'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-[#0f1117] text-white' : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]'}`}>
            This {p}
          </button>
        ))}
      </div>

      {loading && <CardSkeleton count={4} />}
      {!loading && error && <ErrorCard message={error} onRetry={refetch} />}

      {!loading && !error && (() => {
        const d = data || {}
        const revenueByMonth: any[] = d.revenueByMonth || [] // any: dynamic dashboard API shape
        const maxRevenue = Math.max(...revenueByMonth.map((r: any) => r.revenue || 0), 1)

        return (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total Revenue" value={formatINR(d.totalRevenue || 0)}
                icon={DollarSign} iconColor="text-[#d4a017]" iconBg="bg-[#fef9ee]"
                trend={d.monthlyGrowth ? { value: d.monthlyGrowth, label: 'vs last month' } : undefined} />
              <StatsCard title="Total Bookings" value={d.totalBookings || 0}
                icon={Calendar} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatsCard title="Customers" value={d.totalCustomers || 0}
                icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50" />
              <StatsCard title="Avg Booking Value" value={formatINR(d.avgBookingValue || 0)}
                icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
            </div>

            {/* Revenue chart */}
            {revenueByMonth.length > 0 && (
              <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
                <h3 className="text-sm font-semibold text-[#0f1117] mb-4">Revenue by Month</h3>
                <div className="space-y-3">
                  {revenueByMonth.slice(-6).map((r: any) => ( // any: revenue API shape
                    <MiniBar key={r.month} label={r.month} value={r.revenue || 0} max={maxRevenue} />
                  ))}
                </div>
              </div>
            )}

            {/* Booking breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
                <h3 className="text-sm font-semibold text-[#0f1117] mb-4">Booking Types</h3>
                <div className="space-y-3">
                  <MiniBar label="Package Bookings" value={d.bookingsByType?.package || 0}
                    max={Math.max(d.bookingsByType?.package || 0, d.bookingsByType?.product || 0, 1)} color="#7c3aed" />
                  <MiniBar label="Product Bookings" value={d.bookingsByType?.product || 0}
                    max={Math.max(d.bookingsByType?.package || 0, d.bookingsByType?.product || 0, 1)} color="#d4a017" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
                <h3 className="text-sm font-semibold text-[#0f1117] mb-4">Pending Actions</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Pending Payments', value: d.pendingActions?.payments || 0, color: 'text-orange-600' },
                    { label: 'Deliveries Due', value: d.pendingActions?.deliveries || 0, color: 'text-blue-600' },
                    { label: 'Returns Expected', value: d.pendingActions?.returns || 0, color: 'text-purple-600' },
                    { label: 'Overdue Items', value: d.pendingActions?.overdue || 0, color: 'text-red-600' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#f1f3f7] last:border-0">
                      <span className="text-sm text-[#4b5563]">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
