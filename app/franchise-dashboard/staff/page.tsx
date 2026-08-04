'use client'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { UserCheck, Phone, Mail, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  super_admin:     'bg-purple-50 text-purple-700 border-purple-200',
  franchise_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  staff:           'bg-green-50 text-green-700 border-green-200',
  readonly:        'bg-gray-50 text-gray-500 border-gray-200',
}

function getInitials(name: string) {
  const p = (name||'U').trim().split(' ')
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : p[0].substring(0,2).toUpperCase()
}

const AVATAR_COLORS = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500']
function avatarColor(id: string) {
  let h = 0; for (const c of (id||'')) h = (h<<5)-h+c.charCodeAt(0)
  return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]
}

export default function FranchiseStaffPage() {
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/staff')
  const staff = data || []
  const activeCount = staff.filter((s: any) => s.is_active !== false).length // any: staff API shape

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Staff" subtitle={`${activeCount} active team member${activeCount !== 1 ? 's' : ''}`}
        icon={UserCheck}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Staff' }]} />

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Name</span><span>Contact</span><span>Role</span><span>Status</span><span>Joined</span>
        </div>

        {loading && <RowSkeleton count={6} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && staff.length === 0 && (
          <EmptyState icon={UserCheck} title="No staff members found"
            description="Add team members via the admin settings panel" />
        )}
        {!loading && !error && staff.map((s: any) => ( // any: staff API response shape
          <div key={s.id}
            className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full ${avatarColor(s.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {getInitials(s.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0f1117] truncate">{s.name}</p>
                <p className="text-xs text-[#9ca3af] truncate">{s.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-[#4b5563] truncate">{s.phone || '—'}</span>
              {s.phone && (
                <a href={`tel:${s.phone}`} className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Phone className="h-3 w-3" />
                </a>
              )}
            </div>
            <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize w-fit',
              ROLE_COLORS[s.role] || ROLE_COLORS.readonly)}>
              {(s.role || 'staff').replace(/_/g,' ')}
            </span>
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit',
              s.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200')}>
              {s.is_active !== false ? 'Active' : 'Inactive'}
            </span>
            <p className="text-xs text-[#9ca3af]">
              {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
