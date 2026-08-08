"use client"

import { useEffect, useState } from "react"

const DEPT_ORDER = ["booking", "warehouse", "qc", "delivery", "travels", "styling", "accounts"]

const DEPT_LABELS: Record<string, string> = {
  booking: "Booking",
  warehouse: "Warehouse",
  qc: "QC",
  delivery: "Delivery",
  travels: "Travels",
  styling: "Styling",
  accounts: "Accounts",
}

const DOT_COLOR: Record<string, string> = {
  waiting: "#d4d4d8",
  in_progress: "#3b82f6",
  completed: "#22c55e",
}

interface JobTrackerProps {
  jobId?: string
  job?: any
}

/**
 * Horizontal 7-stage job tracker strip: one dot per department task,
 * colored by status, with the department label underneath.
 */
export function JobTracker({ jobId, job: jobProp }: JobTrackerProps) {
  const [job, setJob] = useState<any>(jobProp || null)
  const [loading, setLoading] = useState(!jobProp)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (jobProp) {
      setJob(jobProp)
      setLoading(false)
      return
    }
    if (!jobId) return
    setLoading(true)
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setJob(d.data)
        else setError(d.error || "Job not found")
      })
      .catch(() => setError("Failed to load job"))
      .finally(() => setLoading(false))
  }, [jobId, jobProp])

  if (loading) {
    return (
      <div className="mx-4 rounded-2xl p-4" style={{ background: "#ffffff", border: "1px solid #f4f4f5" }}>
        <div className="h-3 w-24 rounded-full animate-pulse mb-3" style={{ background: "#f4f4f5" }} />
        <div className="flex justify-between">
          {DEPT_ORDER.map((d) => (
            <div key={d} className="w-8 h-8 rounded-full animate-pulse" style={{ background: "#f4f4f5" }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !job) return null

  const tasksByDept: Record<string, any> = {}
  for (const t of job.job_tasks || []) tasksByDept[t.department] = t

  return (
    <div className="mx-4 rounded-2xl p-4" style={{ background: "#ffffff", border: "1px solid #f4f4f5" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#a1a1aa" }}>
          Job Progress
        </p>
        <span className="text-[10px] font-mono font-semibold" style={{ color: "#71717a" }}>
          {job.job_number}
        </span>
      </div>
      <div className="flex items-start justify-between relative">
        <div
          className="absolute top-4 left-4 right-4 h-[2px]"
          style={{ background: "#f4f4f5", zIndex: 0 }}
        />
        {DEPT_ORDER.map((dept) => {
          const task = tasksByDept[dept]
          const status = task?.status || "waiting"
          const color = DOT_COLOR[status] || DOT_COLOR.waiting
          return (
            <div key={dept} className="flex flex-col items-center gap-1.5 relative z-10" style={{ flex: 1 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: color, color: "#ffffff", border: "2px solid #ffffff", boxShadow: "0 0 0 1px #f4f4f5" }}
              >
                {status === "completed" ? "✓" : status === "in_progress" ? "•" : ""}
              </div>
              <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: "#71717a" }}>
                {DEPT_LABELS[dept] || dept}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
