"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#ec4899"

interface JobTask {
  id: string
  job_id: string
  department: string
  status: 'waiting' | 'in_progress' | 'completed'
  assigned_to?: string | null
  checklist: Array<{ text: string; checked: boolean }>
  photos?: string[]
}

interface Job {
  id: string
  job_number: string
  booking_number: string
  customer_name: string
  event_date: string | null
  job_tasks: JobTask[]
}

const RETURNS_CHECKLIST_DEFAULT = [
  { text: "All safas/turbans returned", checked: false },
  { text: "No visible damage or stains", checked: false },
  { text: "Accessories & pins accounted for", checked: false },
  { text: "Customer confirmed service complete", checked: false },
]

export default function StylingJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedTask, setSelectedTask] = useState<JobTask | null>(null)
  const [checklist, setChecklist] = useState<Array<{ text: string; checked: boolean }>>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [showReturnsCheckIn, setShowReturnsCheckIn] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("safawala_user") || "{}")
      if (user.id) setCurrentUserId(user.id)
    } catch {}
    fetchJobs()
  }, [])

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

  // My assigned styling jobs only (assigned_to === current user).
  const myJobs = jobs.flatMap((job) => {
    const task = (job.job_tasks || []).find((t) => t.department === "styling")
    if (!task || task.status === "completed") return []
    if (currentUserId && task.assigned_to && task.assigned_to !== currentUserId) return []
    return [{ job, task }]
  })

  function openTask(job: Job, task: JobTask) {
    setSelectedJob(job)
    setSelectedTask(task)
    setChecklist(task.checklist && task.checklist.length > 0 ? [...task.checklist] : RETURNS_CHECKLIST_DEFAULT.map((c) => ({ ...c })))
    setPhotos(task.photos ? [...task.photos] : [])
    setShowReturnsCheckIn(false)
  }

  function closeTask() {
    setSelectedJob(null)
    setSelectedTask(null)
    setChecklist([])
    setPhotos([])
    setShowReturnsCheckIn(false)
  }

  function toggleItem(i: number) {
    setChecklist((prev) => prev.map((item, idx) => (idx === i ? { ...item, checked: !item.checked } : item)))
  }

  function addMockPhoto() {
    setPhotos((prev) => [...prev, `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80&mock=${Math.random()}`])
  }

  async function updateStatus(status: 'in_progress' | 'completed', body: any = {}) {
    if (!selectedTask || updating) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/jobs/tasks/${selectedTask.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...body }),
      })
      const data = await res.json()
      if (res.ok) {
        closeTask()
        fetchJobs()
      } else {
        alert(data.error || "Failed to update task status.")
      }
    } catch {
      alert("Error updating task.")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="pb-6">
      <PortalPageHeader title="My Styling Jobs" subtitle="Assigned events & returns check-in" color={COLOR} backHref="/portal/styling" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[12px] font-extrabold text-red-800 flex items-center gap-1.5" style={{ color: "#991b1b" }}>
            <PortalIcon name="alert-triangle" size={14} /> {errorState}
          </p>
        </div>
      )}

      <PortalSectionLabel label={`My Jobs (${myJobs.length})`} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : myJobs.length === 0 ? (
          <PortalEmptyState icon="crown" title="No assigned jobs" subtitle="Register interest in Assignments to get gigs." color={COLOR} />
        ) : (
          myJobs.map(({ job, task }) => (
            <PortalListCard
              key={task.id}
              title={`${job.customer_name} (${job.booking_number})`}
              subtitle={job.job_number}
              meta={task.status === "in_progress" ? "🟢 In Progress" : "🟡 Waiting"}
              badge={task.status}
              color={COLOR}
              icon="crown"
              onClick={() => openTask(job, task)}
            />
          ))
        )}
      </div>

      {selectedTask && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600">{selectedJob.job_number}</span>
                <h3 className="font-extrabold text-[15px] mt-0.5" style={{ color: "#1e1208" }}>{selectedJob.customer_name}</h3>
              </div>
              <button onClick={closeTask} className="text-slate-400 hover:text-slate-600 p-2"><PortalIcon name="x" size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {!showReturnsCheckIn ? (
                <>
                  {selectedTask.status === "waiting" && (
                    <button onClick={() => updateStatus("in_progress")} disabled={updating}
                      className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                      style={{ background: COLOR, opacity: updating ? 0.7 : 1 }}>
                      {updating ? "Starting…" : "👑 Start Event Service"}
                    </button>
                  )}
                  {selectedTask.status === "in_progress" && (
                    <button onClick={() => setShowReturnsCheckIn(true)}
                      className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                      style={{ background: "#22c55e" }}>
                      ✓ Service Done — Start Returns Check-in
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3.5">
                    <p className="text-[11px] font-bold text-pink-700">Returns check-in requires a completed checklist and at least one proof photo.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Returns Checklist</p>
                    {checklist.map((item, i) => (
                      <div key={i} onClick={() => toggleItem(i)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border bg-slate-50/50 hover:bg-slate-50 border-slate-100 cursor-pointer transition-colors">
                        <div className="w-5 h-5 rounded-lg border-2 flex items-center justify-center"
                          style={{ background: item.checked ? COLOR : "#fff", borderColor: item.checked ? COLOR : "rgba(0,0,0,0.15)" }}>
                          {item.checked && <span className="text-white text-[11px] font-bold">✓</span>}
                        </div>
                        <span className="text-[13px] font-bold text-slate-700" style={{ textDecoration: item.checked ? "line-through" : "none", opacity: item.checked ? 0.6 : 1 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Returns Photos (Required)</p>
                      <button onClick={addMockPhoto} className="text-[11px] font-bold text-pink-700 bg-pink-50 px-3 py-1.5 rounded-lg">📷 Add Photo</button>
                    </div>
                    {photos.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                        <p className="text-[11px] text-slate-400">No photos yet. Required to complete.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((src, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100 relative">
                            <img src={src} className="w-full h-full object-cover" alt="Proof" />
                            <button onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => updateStatus("completed", { checklist, photos })}
                    disabled={updating}
                    className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white transition-opacity"
                    style={{ background: "#22c55e", opacity: updating ? 0.7 : 1 }}>
                    {updating ? "Completing…" : "✓ Complete Job"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
