'use client'
import { useState, useMemo } from 'react'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { StatsCard } from '@/components/franchise/shared/stats-card'
import { ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const PRIORITY_MAP: Record<string, string> = {
  high:   'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low:    'bg-gray-50 text-gray-500 border-gray-200',
}

function formatDate(d: string) {
  if (!d) return '—'
  const dt = new Date(d)
  const isOverdue = dt < new Date()
  return { str: dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), isOverdue }
}

export default function FranchiseTasksPage() {
  const [filter, setFilter] = useState<'all'|'open'|'in_progress'|'done'>('all')
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/tasks')
  const tasks = data || []

  const filtered = useMemo(() =>
    filter === 'all' ? tasks : tasks.filter((t: any) => t.status === filter) // any: tasks API shape
  , [tasks, filter])

  const openCount = tasks.filter((t: any) => t.status === 'open' || t.status === 'pending').length
  const doneCount = tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length
  const overdueCount = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader title="Tasks & Tickets" subtitle="Manage team tasks and issue tickets"
        icon={ClipboardCheck}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Tasks' }]} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Open Tasks" value={openCount} icon={Clock}
          iconColor="text-blue-600" iconBg="bg-blue-50" urgent={overdueCount > 0} />
        <StatsCard title="Completed" value={doneCount} icon={CheckCircle2}
          iconColor="text-green-600" iconBg="bg-green-50" />
        <StatsCard title="Overdue" value={overdueCount} icon={AlertTriangle}
          iconColor="text-red-500" iconBg="bg-red-50" urgent={overdueCount > 0} />
      </div>

      <div className="flex items-center gap-1.5 mb-5">
        {(['all','open','in_progress','done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              filter === f ? 'bg-[#0f1117] text-white' : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]')}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Task</span><span>Assigned To</span><span>Priority</span><span>Due Date</span><span>Status</span>
        </div>

        {loading && <RowSkeleton count={6} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={ClipboardCheck} title="No tasks found"
            description={filter !== 'all' ? `No ${filter.replace('_',' ')} tasks` : 'All tasks will appear here'} />
        )}
        {!loading && !error && filtered.map((t: any) => { // any: tasks API response shape
          const due = t.due_date ? formatDate(t.due_date) : null
          return (
            <div key={t.id}
              className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0f1117] truncate">{t.title || t.name || '—'}</p>
                {t.description && <p className="text-xs text-[#9ca3af] truncate">{t.description}</p>}
              </div>
              <p className="text-sm text-[#4b5563] truncate">{t.assigned_to_name || t.assignee?.name || '—'}</p>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit capitalize',
                PRIORITY_MAP[t.priority?.toLowerCase()] || PRIORITY_MAP.low)}>
                {t.priority || 'Low'}
              </span>
              <p className={cn('text-sm', due?.isOverdue && t.status !== 'done' ? 'text-red-600 font-semibold' : 'text-[#4b5563]')}>
                {due?.str || '—'}
              </p>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit capitalize',
                t.status === 'done' || t.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200'
                : t.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-500 border-gray-200')}>
                {(t.status || 'open').replace('_',' ')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
