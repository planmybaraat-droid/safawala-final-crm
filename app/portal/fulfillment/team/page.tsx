"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"
import { TeamTravelPanel, type StylingTask } from "@/components/portal/team-travel-panel"

const COLOR = "#14b8a6"

interface WorkOrder {
  id: string
  work_order_number: string
  booking_number: string
  booking_id: string
  customer_name: string
  work_order_tasks: StylingTask[]
}

export default function TeamAssignmentPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [view, setView] = useState<'open' | 'closed'>('open')

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
  const [selectedTask, setSelectedTask] = useState<StylingTask | null>(null)
  const [selectedTravelTask, setSelectedTravelTask] = useState<StylingTask | null>(null)

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
      if (!res.ok) throw new Error(data.error || "Failed to fetch events")
      setWorkOrders(Array.isArray(data.data) ? data.data : [])
    } catch (err: any) {
      setErrorState(err.message || "Failed to fetch events")
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  const jobs = workOrders.flatMap(wo => {
    const task = (wo.work_order_tasks ?? []).find(t => t.department === "styling" && t.status !== "cancelled")
    if (!task) return []
    const travelTask = (wo.work_order_tasks ?? []).find(t => t.department === "travels" && t.status !== "cancelled") || null
    return [{ workOrder: wo, task, travelTask }]
  })
  const openJobs = jobs.filter(({ task, travelTask }) => !task.assigned_to || (travelTask && travelTask.status !== "completed"))
  const closedJobs = jobs.filter(({ task, travelTask }) => !!task.assigned_to && (!travelTask || travelTask.status === "completed"))
  const visibleJobs = view === 'open' ? openJobs : closedJobs

  function openJob(wo: WorkOrder, task: StylingTask, travelTask: StylingTask | null) {
    setSelectedWO(wo)
    setSelectedTask(task)
    setSelectedTravelTask(travelTask)
  }
  function closeJob() {
    setSelectedWO(null)
    setSelectedTask(null)
    setSelectedTravelTask(null)
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

      <PortalPageHeader title="Team & Travel" subtitle="Stylist assignment and ticket/hotel booking, per event" color={COLOR} backHref="/portal/fulfillment" />

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
            onClick={() => setView(v)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-center transition-colors"
            style={{
              background: view === v ? COLOR : "#fff",
              color: view === v ? "#fff" : "rgba(80,55,30,0.6)",
              border: `1px solid ${view === v ? COLOR : "rgba(0,0,0,0.08)"}`,
            }}
          >
            {v === 'open' ? `Open Jobs (${openJobs.length})` : `Closed Jobs (${closedJobs.length})`}
          </button>
        ))}
      </div>

      <PortalSectionLabel label={view === 'open' ? "Team & Travel Jobs" : "Team & Travel History"} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : visibleJobs.length === 0 ? (
          <PortalEmptyState
            icon="team"
            title="No jobs found"
            subtitle={view === 'open' ? "No events need a stylist or travel setup right now." : "No completed events yet."}
            color={COLOR}
          />
        ) : (
          visibleJobs.map(({ workOrder, task, travelTask }) => (
            <PortalListCard
              key={task.id}
              title={`${workOrder.customer_name} (${workOrder.booking_number})`}
              subtitle={task.assigned_to ? `Stylist: ${task.metadata?.assigned_stylist?.name || "Assigned"}` : `${(task.metadata?.interested_stylists || []).length} interested`}
              badge={task.assigned_to && (!travelTask || travelTask.status === "completed") ? "completed" : task.assigned_to ? "travel pending" : "open"}
              color={COLOR}
              icon="team"
              onClick={() => openJob(workOrder, task, travelTask)}
            />
          ))
        )}
      </div>

      {selectedTask && selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLOR }}>{selectedWO.work_order_number}</span>
                <h3 className="font-extrabold text-[15px] mt-0.5" style={{ color: "#1e1208" }}>{selectedWO.customer_name}</h3>
              </div>
              <button onClick={closeJob} className="text-slate-400 hover:text-slate-600 p-2"><PortalIcon name="x" size={18} /></button>
            </div>

            <div className="p-6">
              <TeamTravelPanel
                key={selectedTask.id}
                workOrder={selectedWO}
                stylingTask={selectedTask}
                travelTask={selectedTravelTask}
                onStylingTaskUpdate={setSelectedTask}
                showToast={showToast}
                onTravelSaved={() => {
                  fetchWorkOrders()
                  setView('closed')
                  closeJob()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
