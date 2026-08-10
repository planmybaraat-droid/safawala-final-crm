"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"
import { JobTrackerModal } from "@/components/portal/job-tracker-modal"
import { TeamTravelPanel, type StylingTask } from "@/components/portal/team-travel-panel"

const COLOR = "#14b8a6"

interface Task {
  id: string
  department: string
  task_number: string
  title: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  instructions: string
  checklist: Array<{ text: string; checked: boolean }>
  assigned_to?: string | null
  metadata?: {
    interested_stylists?: Array<{ user_id: string; name: string; note?: string; at: string }>
    assigned_stylist?: { id: string; name: string; assigned_at: string }
  } | null
}

interface WorkOrder {
  id: string
  work_order_number: string
  booking_id: string
  booking_number: string
  customer_name: string
  customer_phone: string
  work_order_tasks: Task[]
}

export default function DeliveryJobsPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [jobsView, setJobsView] = useState<'open' | 'closed'>('open')
  const [showTracker, setShowTracker] = useState(false)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
  const [stylingTask, setStylingTask] = useState<StylingTask | null>(null)

  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null)
  function showToast(message: string, kind: "success" | "error" = "success") {
    setToast({ message, kind })
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => { fetchWorkOrders() }, [])

  async function fetchWorkOrders() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch fulfillment jobs")
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      setWorkOrders(list)
    } catch (err: any) {
      setErrorState(err.message || "Failed to fetch fulfillment jobs")
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Team-assignable jobs: any confirmed rental with both a dispatch task
  // (for the popup header/instructions) and a styling task (what's actually
  // assigned here). Open/Closed reflects stylist assignment, not shipping
  // status — this list is purely about Team & Travel, independent of dispatch.
  const jobs = workOrders.flatMap(wo => {
    const task = (wo.work_order_tasks ?? []).find(t => t.department === "dispatch")
    const styling = (wo.work_order_tasks ?? []).find(t => t.department === "styling")
    if (!task || !styling) return []
    return [{ workOrder: wo, task, styling }]
  })
  const openTasks = jobs.filter(({ styling }) => !styling.assigned_to)
  const closedTasks = jobs.filter(({ styling }) => !!styling.assigned_to)
  const visibleTasks = jobsView === "open" ? openTasks : closedTasks

  function handleOpenTask(wo: WorkOrder, t: Task) {
    setSelectedWO(wo)
    setSelectedTask(t)
    setStylingTask(null)
    fetch(`/api/work-orders/${wo.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const tasks: any[] = d?.data?.work_order_tasks || []
        setStylingTask(tasks.find(t2 => t2.department === "styling") || null)
      })
      .catch(() => {})
  }

  function handleCloseTask() {
    setSelectedTask(null)
    setSelectedWO(null)
    setStylingTask(null)
  }

  return (
    <div className="pb-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-[12px] font-bold max-w-[92vw]"
          style={{ background: toast.kind === "success" ? "#16a34a" : "#dc2626" }}
        >
          <PortalIcon name={toast.kind === "success" ? "check-circle" : "alert-triangle"} size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      <PortalPageHeader title="Fulfillment Jobs" subtitle="Confirmed orders ready to ship" color={COLOR} backHref="/portal/fulfillment" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">
            <PortalIcon name="alert-triangle" size={13} /> Error
          </p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">{errorState}</p>
        </div>
      )}

      <div className="flex gap-2 px-4 pt-4">
        {(['open', 'closed'] as const).map(v => (
          <button
            key={v}
            onClick={() => setJobsView(v)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-center transition-colors"
            style={{
              background: jobsView === v ? COLOR : "#fff",
              color: jobsView === v ? "#fff" : "rgba(80,55,30,0.6)",
              border: `1px solid ${jobsView === v ? COLOR : "rgba(0,0,0,0.08)"}`,
            }}
          >
            {v === 'open' ? `Open Jobs (${openTasks.length})` : `Closed Jobs (${closedTasks.length})`}
          </button>
        ))}
      </div>

      <PortalSectionLabel label={jobsView === 'open' ? "Fulfillment Jobs" : "Fulfillment History"} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : visibleTasks.length === 0 ? (
          <PortalEmptyState
            icon="truck"
            title="No jobs found"
            subtitle={jobsView === 'open' ? "Every event has a stylist assigned." : "No stylists assigned yet."}
            color={COLOR}
          />
        ) : (
          visibleTasks.map(({ workOrder, task, styling }) => (
            <PortalListCard
              key={task.id}
              title={`${workOrder.customer_name} (${workOrder.booking_number})`}
              subtitle={styling.assigned_to ? `Stylist: ${styling.metadata?.assigned_stylist?.name || "Assigned"}` : `${(styling.metadata?.interested_stylists || []).length} interested`}
              badge={styling.assigned_to ? "assigned" : "open"}
              color={COLOR}
              icon="truck"
              onClick={() => handleOpenTask(workOrder, task)}
            />
          ))
        )}
      </div>

      {selectedTask && selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLOR }}>
                  {selectedTask.task_number} · {selectedWO.work_order_number}
                </span>
                <h3 className="font-extrabold text-[15px] mt-0.5" style={{ color: "#1e1208" }}>
                  {selectedWO.customer_name}
                </h3>
              </div>
              <button onClick={handleCloseTask} className="text-slate-400 hover:text-slate-600 p-2"><PortalIcon name="x" size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {selectedTask.instructions && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</p>
                  <p className="text-[13px] text-slate-700 font-semibold leading-relaxed whitespace-pre-line">
                    {selectedTask.instructions}
                  </p>
                </div>
              )}

              {/* Track this Job */}
              <button
                onClick={() => setShowTracker(true)}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border flex items-center justify-center gap-2"
                style={{ borderColor: `${COLOR}40`, color: COLOR, background: `${COLOR}0d` }}
              >
                <PortalIcon name="map-pin" size={14} /> Track this Job
              </button>

              {stylingTask && (
                <TeamTravelPanel
                  key={stylingTask.id}
                  workOrder={selectedWO}
                  stylingTask={stylingTask}
                  onStylingTaskUpdate={setStylingTask}
                  showToast={showToast}
                  onTravelSaved={() => {
                    fetchWorkOrders()
                    setJobsView('closed')
                    handleCloseTask()
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showTracker && selectedWO && (
        <JobTrackerModal workOrderId={selectedWO.id} onClose={() => setShowTracker(false)} />
      )}
    </div>
  )
}
