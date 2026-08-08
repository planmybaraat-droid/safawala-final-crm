"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"

const COLOR = "#ef4444"

interface JobTask {
  id: string
  job_id: string
  department: string
  status: 'waiting' | 'in_progress' | 'completed'
}

interface Job {
  id: string
  job_number: string
  booking_number: string
  customer_name: string
  event_date: string | null
  job_tasks: JobTask[]
}

export default function AccountsJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  const settlementQueue = jobs.flatMap((job) => {
    const task = (job.job_tasks || []).find((t) => t.department === "accounts")
    if (!task || task.status === "completed") return []
    return [{ job, task }]
  })

  async function markSettled(taskId: string) {
    setUpdatingId(taskId)
    try {
      const res = await fetch(`/api/jobs/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchJobs()
      } else {
        alert(data.error || "Failed to settle job.")
      }
    } catch {
      alert("Error settling job.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="pb-6">
      <PortalPageHeader title="Accounts Jobs" subtitle="Final settlement & job closure" color={COLOR} backHref="/portal/accounts" />

      {errorState && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[12px] font-extrabold text-red-800">⚠️ {errorState}</p>
        </div>
      )}

      <PortalSectionLabel label={`Pending Settlement (${settlementQueue.length})`} />

      <div className="mx-4 rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? (
          <PortalSkeleton rows={6} />
        ) : settlementQueue.length === 0 ? (
          <PortalEmptyState icon="rupee" title="Nothing to settle" subtitle="No jobs awaiting final settlement." color={COLOR} />
        ) : (
          settlementQueue.map(({ job, task }) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3.5" style={{ background: "#fff", borderBottom: "1px solid #f4f4f5" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate" style={{ color: "#18181b" }}>{job.customer_name} ({job.booking_number})</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "#a1a1aa" }}>{job.job_number}</p>
              </div>
              <button
                onClick={() => markSettled(task.id)}
                disabled={updatingId === task.id}
                className="text-[11px] font-bold px-3.5 py-2 rounded-xl text-white flex-shrink-0"
                style={{ background: COLOR, opacity: updatingId === task.id ? 0.7 : 1 }}
              >
                {updatingId === task.id ? "Settling…" : "✓ Mark Settled"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
