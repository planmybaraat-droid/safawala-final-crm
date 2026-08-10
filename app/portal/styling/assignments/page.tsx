"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"
import { getCurrentUser } from "@/lib/auth"

const COLOR = "#ec4899"

interface StylingTask {
  id: string
  status: "pending" | "active" | "completed" | "cancelled"
  assigned_to: string | null
  metadata?: {
    interested_stylists?: Array<{ user_id: string; name: string; note?: string; at: string }>
    assigned_stylist?: { id: string; name: string; assigned_at: string }
  } | null
}

interface WorkOrder {
  id: string
  work_order_number: string
  booking_number: string
  customer_name: string
  event_date: string | null
  venue_address: string | null
  work_order_tasks: StylingTask[]
}

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"available-gigs" | "my-jobs">("available-gigs")
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState("")
  const [errorState, setErrorState] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then(u => setMyUserId(u?.id || null))
    fetchAssignments()
  }, [])

  async function fetchAssignments() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch rental assignments")
      setWorkOrders(Array.isArray(data.data) ? data.data : [])
    } catch (err: any) {
      setErrorState(err.message || "Failed to fetch rental assignments")
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  function stylingTaskOf(wo: WorkOrder): StylingTask | undefined {
    return (wo.work_order_tasks || []).find(t => t.status !== "cancelled")
  }

  async function submitInterest(wo: WorkOrder, task: StylingTask, action: "add" | "remove") {
    setSubmittingId(task.id)
    try {
      const res = await fetch(`/api/work-orders/tasks/${task.id}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: noteDrafts[task.id] || "" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update interest")
      setWorkOrders(prev => prev.map(w => w.id === wo.id
        ? { ...w, work_order_tasks: w.work_order_tasks.map(t => t.id === task.id ? data.data : t) }
        : w
      ))
      setSuccessToast(action === "add" ? `Interest registered for ${wo.customer_name}'s job! 🎯` : "Interest withdrawn.")
      setTimeout(() => setSuccessToast(""), 4000)
    } catch (err: any) {
      alert(err.message || "Failed to update interest")
    } finally {
      setSubmittingId(null)
    }
  }

  const jobsWithTask = workOrders
    .map(wo => ({ wo, task: stylingTaskOf(wo) }))
    .filter((x): x is { wo: WorkOrder; task: StylingTask } => !!x.task)

  const availableGigs = jobsWithTask.filter(({ task }) =>
    !task.assigned_to && !(task.metadata?.interested_stylists || []).some(s => s.user_id === myUserId)
  )
  const myRegisteredJobs = jobsWithTask.filter(({ task }) =>
    task.assigned_to === myUserId || (task.metadata?.interested_stylists || []).some(s => s.user_id === myUserId)
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#fdf2f8", paddingBottom: 40 }}>
      <PortalPageHeader title="Safa Styling Gigs" subtitle="Rental Safa Tying Notifications & Jobs" color={COLOR} backHref="/portal/styling" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1.5 shadow-sm">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5">⚠️ Connection Notice</p>
          <p className="text-[11px] font-medium text-red-700 leading-relaxed">{errorState}</p>
        </div>
      )}

      <div className="flex p-1 bg-white/80 backdrop-blur-md border border-pink-100 rounded-2xl mx-4 mt-4 gap-1 shadow-sm">
        <button
          onClick={() => setActiveTab("available-gigs")}
          className="flex-1 py-2.5 text-[11px] font-extrabold rounded-xl transition-all relative"
          style={{ background: activeTab === "available-gigs" ? COLOR : "transparent", color: activeTab === "available-gigs" ? "white" : "#831843" }}
        >
          Available Gigs ({availableGigs.length})
        </button>
        <button
          onClick={() => setActiveTab("my-jobs")}
          className="flex-1 py-2.5 text-[11px] font-extrabold rounded-xl transition-all"
          style={{ background: activeTab === "my-jobs" ? COLOR : "transparent", color: activeTab === "my-jobs" ? "white" : "#831843" }}
        >
          My Jobs ({myRegisteredJobs.length})
        </button>
      </div>

      {successToast && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-sm flex items-center gap-2">
          <span>🎉</span><span>{successToast}</span>
        </div>
      )}

      {loading ? (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-white/70"><PortalSkeleton rows={5} /></div>
      ) : activeTab === "available-gigs" ? (
        <div className="mt-4">
          <PortalSectionLabel label={`Open Styling Jobs (${availableGigs.length})`} />
          {availableGigs.length === 0 ? (
            <div className="mx-4 rounded-2xl overflow-hidden bg-white/70">
              <PortalEmptyState icon="sparkle" title="No open styling gigs" subtitle="All rental safa tying jobs are currently assigned or claimed" color={COLOR} />
            </div>
          ) : (
            <div className="mx-4 space-y-3.5">
              {availableGigs.map(({ wo, task }) => (
                <div key={wo.id} className="p-4 bg-white border border-pink-100 rounded-2xl flex flex-col gap-2.5 shadow-sm" style={{ borderLeft: `5px solid ${COLOR}` }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">{wo.booking_number}</span>
                      <h3 className="text-xs font-black text-gray-900 mt-1">👤 {wo.customer_name}</h3>
                    </div>
                    <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {task.status === "active" ? "Ready" : "Upcoming"}
                    </span>
                  </div>
                  <div className="bg-pink-50/40 p-2.5 rounded-xl border border-pink-100/60">
                    <p className="text-[10px] text-gray-700 font-semibold leading-relaxed">
                      📍 {wo.venue_address || "Venue Address TBC"}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    📅 {wo.event_date ? new Date(wo.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Date TBC"}
                  </p>
                  <input
                    type="text"
                    value={noteDrafts[task.id] || ""}
                    onChange={e => setNoteDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Optional note — your rate, availability, experience…"
                    className="w-full px-3 py-2 rounded-lg border border-pink-100 text-[11px] font-semibold text-gray-700 focus:outline-none focus:border-pink-400 bg-pink-50/20"
                  />
                  <button
                    onClick={() => submitInterest(wo, task, "add")}
                    disabled={submittingId === task.id}
                    className="w-full mt-1 py-3 text-center text-xs font-black text-white rounded-xl transition-transform active:scale-[0.99] shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, ${COLOR}, #db2777)` }}
                  >
                    🙋 {submittingId === task.id ? "Submitting…" : "I'm Interested"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <PortalSectionLabel label={`My Jobs (${myRegisteredJobs.length})`} />
          {myRegisteredJobs.length === 0 ? (
            <div className="mx-4 rounded-2xl overflow-hidden bg-white/70">
              <PortalEmptyState icon="clipboard" title="No jobs yet" subtitle="Tap 'I'm Interested' on any open gig to register" color={COLOR} />
            </div>
          ) : (
            <div className="mx-4 space-y-3.5">
              {myRegisteredJobs.map(({ wo, task }) => {
                const isAssigned = task.assigned_to === myUserId
                return (
                  <div key={wo.id} className="p-4 bg-white border rounded-2xl flex flex-col gap-2 shadow-sm" style={{ borderLeft: `5px solid ${isAssigned ? "#10b981" : COLOR}`, borderColor: isAssigned ? "#a7f3d0" : "#fbcfe8" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">{wo.booking_number}</span>
                        <h3 className="text-xs font-bold text-gray-800 mt-1">👤 {wo.customer_name}</h3>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase ${isAssigned ? "bg-emerald-100 text-emerald-800" : "bg-pink-100 text-pink-800"}`}>
                        {isAssigned ? "Confirmed ✓" : "Interest Registered"}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 font-semibold">📍 {wo.venue_address || "Venue Address TBC"}</p>
                    {!isAssigned && (
                      <button
                        onClick={() => submitInterest(wo, task, "remove")}
                        disabled={submittingId === task.id}
                        className="mt-1 text-[11px] font-bold text-gray-500 underline disabled:opacity-60"
                      >
                        Withdraw interest
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
