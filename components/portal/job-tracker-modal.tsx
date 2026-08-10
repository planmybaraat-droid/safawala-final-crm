"use client"

import { useState, useEffect } from "react"
import { PortalIcon } from "./portal-icons"

const STAGES: Array<{ key: string; label: string; dept: string | null }> = [
  { key: "booking", label: "Booking Confirmed", dept: null },
  { key: "warehouse", label: "Warehouse Picking", dept: "warehouse" },
  { key: "packing", label: "QC Packing", dept: "packing" },
  { key: "dispatch", label: "Delivery Dispatch", dept: "dispatch" },
  { key: "event_team", label: "Event Team Setup", dept: "event_team" },
  { key: "returns", label: "Returns Collection", dept: "returns" },
  { key: "accounts", label: "Accounts & Billing", dept: "accounts" },
]

type StageState = "done" | "active" | "pending" | "cancelled" | "na"

function stateColor(state: StageState) {
  if (state === "done") return "#16a34a"
  if (state === "active") return "#a855f7"
  if (state === "cancelled") return "#dc2626"
  return "#d1d5db" // pending / na
}

function stateLabel(state: StageState, task: any) {
  if (state === "na") return "Not applicable for this order"
  if (state === "done") {
    const when = task?.completed_at
      ? new Date(task.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : null
    return when ? `Completed · ${when}` : "Completed"
  }
  if (state === "active") return "In progress"
  if (state === "cancelled") return "Cancelled"
  return "Waiting"
}

export function JobTrackerModal({ workOrderId, onClose }: { workOrderId: string; onClose: () => void }) {
  const [wo, setWo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/work-orders/${workOrderId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.success) setWo(d.data)
        else setError(d.error || "Failed to load job details")
      })
      .catch(() => { if (!cancelled) setError("Failed to load job details") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [workOrderId])

  const tasksByDept = new Map<string, any>((wo?.work_order_tasks || []).map((t: any) => [t.department, t]))

  function stageState(dept: string | null): StageState {
    if (!dept) return "done"
    const t = tasksByDept.get(dept)
    if (!t) return "na"
    if (t.status === "completed" || t.status === "picked") return "done"
    if (t.status === "active") return "active"
    if (t.status === "cancelled") return "cancelled"
    return "pending"
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Job Tracker</p>
            <h3 className="font-extrabold text-[15px] text-slate-900">{wo?.work_order_number || "…"}</h3>
            {wo?.customer_name && <p className="text-[11px] text-slate-400 mt-0.5">{wo.customer_name} · {wo.booking_number}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><PortalIcon name="x" size={18} /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-[12px] text-slate-400 text-center py-8">Loading job timeline…</p>
          ) : error ? (
            <p className="text-[12px] text-red-500 text-center py-8">{error}</p>
          ) : (
            <div>
              {STAGES.map((stage, i) => {
                const state = stageState(stage.dept)
                const task = stage.dept ? tasksByDept.get(stage.dept) : null
                const isLast = i === STAGES.length - 1
                const color = stateColor(state)
                return (
                  <div key={stage.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: state === "na" ? "#f1f5f9" : `${color}20`, color, border: `2px solid ${color}` }}
                      >
                        {state === "done" ? (
                          <PortalIcon name="check" size={13} />
                        ) : state === "cancelled" ? (
                          <PortalIcon name="x" size={13} />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        )}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 min-h-[22px]" style={{ background: state === "done" ? "#16a34a40" : "#e5e7eb" }} />}
                    </div>
                    <div className="pb-6 flex-1">
                      <p className="text-[13px] font-bold" style={{ color: state === "na" ? "#9ca3af" : "#1e1208" }}>
                        {stage.label}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: state === "na" ? "#cbd5e1" : "#94a3b8" }}>
                        {task?.title && state !== "na" ? task.title : stateLabel(state, task)}
                      </p>
                      {task?.title && state !== "na" && (
                        <p className="text-[10px] mt-0.5 font-semibold" style={{ color }}>{stateLabel(state, task)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
