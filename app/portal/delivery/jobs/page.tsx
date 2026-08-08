"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"

const COLOR = "#14b8a6"

interface JobTask {
  id: string
  job_id: string
  department: string
  status: 'waiting' | 'in_progress' | 'completed'
  assigned_to?: string | null
  assignee_name?: string | null
}

interface Job {
  id: string
  job_number: string
  booking_id: string
  booking_number: string
  customer_name: string
  customer_phone: string
  event_date: string | null
  job_tasks: JobTask[]
}

interface Interest {
  id: string
  role: 'delivery' | 'styling'
  user_id: string
  user?: { id: string; name: string; phone?: string }
}

export default function DeliveryJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)

  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [interests, setInterests] = useState<Interest[]>([])
  const [loadingInterests, setLoadingInterests] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { fetchJobs() }, [])

  async function fetchJobs() {
    setLoading(true)
    setErrorState(null)
    try {
      const res = await fetch("/api/jobs")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs")
      setJobs(Array.isArray(data.data) ? data.data : [])
    } catch (err: any) {
      setErrorState(err.message || "Failed to fetch jobs")
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const deliveryQueue = jobs.flatMap((job) => {
    const deliveryTask = (job.job_tasks || []).find((t) => t.department === "delivery")
    if (!deliveryTask || deliveryTask.status === "completed") return []
    return [{ job, task: deliveryTask }]
  })

  async function openJob(job: Job) {
    setSelectedJob(job)
    setLoadingInterests(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/interests`)
      const data = await res.json()
      setInterests(Array.isArray(data.data) ? data.data : [])
    } catch {
      setInterests([])
    } finally {
      setLoadingInterests(false)
    }
  }

  function closeJob() {
    setSelectedJob(null)
    setInterests([])
  }

  async function updateDeliveryStatus(status: 'in_progress' | 'completed') {
    const task = selectedJob?.job_tasks.find((t) => t.department === "delivery")
    if (!task || updating) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/jobs/tasks/${task.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok) {
        closeJob()
        fetchJobs()
      } else {
        alert(data.error || "Failed to update status.")
      }
    } catch {
      alert("Error updating status.")
    } finally {
      setUpdating(false)
    }
  }

  async function assignRole(role: 'delivery' | 'styling', userId: string) {
    if (!selectedJob || updating) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, user_id: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchJobs()
        // refresh interests + selectedJob assignment display
        const refreshed = await fetch(`/api/jobs/${selectedJob.id}`).then((r) => r.json())
        if (refreshed.success) setSelectedJob(refreshed.data)
      } else {
        alert(data.error || "Failed to assign.")
      }
    } catch {
      alert("Error assigning.")
    } finally {
      setUpdating(false)
    }
  }

  const deliveryInterests = interests.filter((i) => i.role === "delivery")
  const stylingInterests = interests.filter((i) => i.role === "styling")
  const currentDeliveryTask = selectedJob?.job_tasks.find((t) => t.department === "delivery")
  const currentStylingTask = selectedJob?.job_tasks.find((t) => t.department === "styling")

  return (
    <div className="pb-6">
      <PortalPageHeader title="Delivery Jobs" subtitle="Dispatch & team assignment" color={COLOR} backHref="/portal/delivery" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[12px] font-extrabold text-red-800">⚠️ {errorState}</p>
        </div>
      )}

      <PortalSectionLabel label={`Dispatch Queue (${deliveryQueue.length})`} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : deliveryQueue.length === 0 ? (
          <PortalEmptyState icon="truck" title="No jobs to dispatch" subtitle="No active delivery jobs right now." color={COLOR} />
        ) : (
          deliveryQueue.map(({ job, task }) => (
            <PortalListCard
              key={task.id}
              title={`${job.customer_name} (${job.booking_number})`}
              subtitle={job.job_number}
              meta={task.status === "in_progress" ? "🟢 In Progress" : "🟡 Waiting"}
              badge={task.status}
              color={COLOR}
              icon="truck"
              onClick={() => openJob(job)}
            />
          ))
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">{selectedJob.job_number}</span>
                <h3 className="font-extrabold text-[15px] mt-0.5" style={{ color: "#1e1208" }}>{selectedJob.customer_name}</h3>
              </div>
              <button onClick={closeJob} className="text-slate-400 hover:text-slate-600 text-lg font-black p-2">✕</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Status</p>
                {currentDeliveryTask?.status === "waiting" && (
                  <button onClick={() => updateDeliveryStatus("in_progress")} disabled={updating}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                    style={{ background: COLOR, opacity: updating ? 0.7 : 1 }}>
                    {updating ? "Starting…" : "🚚 Start Dispatch"}
                  </button>
                )}
                {currentDeliveryTask?.status !== "completed" && (
                  <button onClick={() => updateDeliveryStatus("completed")} disabled={updating}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                    style={{ background: "#22c55e", opacity: updating ? 0.7 : 1 }}>
                    {updating ? "Completing…" : "✓ Mark Delivered"}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Team Interest</p>
                {loadingInterests ? (
                  <p className="text-[12px] text-slate-400">Loading…</p>
                ) : deliveryInterests.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No one has registered interest yet.</p>
                ) : (
                  <div className="space-y-2">
                    {deliveryInterests.map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <span className="text-[13px] font-bold text-slate-700">{i.user?.name || i.user_id}</span>
                        <button onClick={() => assignRole("delivery", i.user_id)} disabled={updating}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                          style={{ background: currentDeliveryTask?.assigned_to === i.user_id ? "#22c55e" : COLOR }}>
                          {currentDeliveryTask?.assigned_to === i.user_id ? "✓ Assigned" : "Assign"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Styling Team Interest</p>
                {loadingInterests ? (
                  <p className="text-[12px] text-slate-400">Loading…</p>
                ) : stylingInterests.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No stylists have registered interest yet.</p>
                ) : (
                  <div className="space-y-2">
                    {stylingInterests.map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <span className="text-[13px] font-bold text-slate-700">{i.user?.name || i.user_id}</span>
                        <button onClick={() => assignRole("styling", i.user_id)} disabled={updating}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                          style={{ background: currentStylingTask?.assigned_to === i.user_id ? "#22c55e" : "#ec4899" }}>
                          {currentStylingTask?.assigned_to === i.user_id ? "✓ Assigned" : "Assign"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
