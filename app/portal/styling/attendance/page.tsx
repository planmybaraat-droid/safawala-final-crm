"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalListCard, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"

const COLOR = "#ec4899"

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [todayMarked, setTodayMarked] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [attRes, leaveRes] = await Promise.allSettled([
        fetch("/api/attendance?limit=30"),
        fetch("/api/leave-requests?limit=10"),
      ])
      if (attRes.status === "fulfilled" && attRes.value.ok) {
        const d = await attRes.value.json()
        const records = Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])
        setAttendance(records)
        const today = new Date().toISOString().split("T")[0]
        setTodayMarked(records.some((r: any) => r.date?.startsWith(today)))
      }
      if (leaveRes.status === "fulfilled" && leaveRes.value.ok) {
        const d = await leaveRes.value.json()
        setLeaves(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []))
      }
    } catch {}
    finally { setLoading(false) }
  }

  async function markAttendance() {
    setMarking(true)
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0], status: "present", check_in: new Date().toISOString() }),
      })
      setTodayMarked(true)
      fetchData()
    } catch {}
    finally { setMarking(false) }
  }

  const presentDays = attendance.filter(a => a.status === "present").length
  const absentDays = attendance.filter(a => a.status === "absent").length

  return (
    <div>
      <PortalPageHeader title="Attendance" subtitle="Mark attendance & leaves" color={COLOR} backHref="/portal/styling" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {[
          { label: "Present", value: presentDays, color: "#16a34a" },
          { label: "Absent", value: absentDays, color: "#dc2626" },
          { label: "Leaves", value: leaves.length, color: COLOR },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            <p className="text-[20px] font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "rgba(80,55,30,0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mark today */}
      <div className="px-4 mt-4">
        <button
          onClick={markAttendance}
          disabled={todayMarked || marking}
          className="w-full py-3.5 rounded-2xl text-[13px] font-bold text-white transition-opacity"
          style={{ background: todayMarked ? "#16a34a" : COLOR, opacity: marking ? 0.7 : 1 }}
        >
          {todayMarked ? "✓ Attendance Marked for Today" : marking ? "Marking..." : "Mark Present — Today"}
        </button>
      </div>

      <PortalSectionLabel label="Recent Attendance" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {loading ? <PortalSkeleton rows={5} /> : attendance.length === 0 ? (
          <PortalEmptyState icon="calendar" title="No records yet" subtitle="Your attendance will appear here" color={COLOR} />
        ) : attendance.slice(0, 20).map(a => (
          <PortalListCard
            key={a.id}
            title={a.date ? new Date(a.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }) : "Date"}
            subtitle={a.check_in ? `In: ${new Date(a.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}${a.check_out ? ` · Out: ${new Date(a.check_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}` : ""}
            badge={a.status ?? "present"}
            color={COLOR}
            icon="calendar"
          />
        ))}
      </div>

      {leaves.length > 0 && (
        <>
          <PortalSectionLabel label="Leave Requests" />
          <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
            {leaves.map(l => (
              <PortalListCard
                key={l.id}
                title={`${l.leave_type ?? "Leave"} — ${l.start_date ? new Date(l.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}`}
                subtitle={l.reason ?? ""}
                badge={l.status ?? "pending"}
                color={COLOR}
                icon="document"
              />
            ))}
          </div>
        </>
      )}
      <div className="h-4" />
    </div>
  )
}
