"use client"

import { useState, useEffect, useCallback } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#6366f1"
const COLOR_DARK = "#4f46e5"

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  present:  { label: "Present",   bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  late:     { label: "Late",      bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  absent:   { label: "Absent",    bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  half_day: { label: "Half Day",  bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  on_leave: { label: "On Leave",  bg: "#ede9fe", text: "#6d28d9", dot: "#8b5cf6" },
}

const DEPT_COLORS: Record<string, string> = {
  booking: "#22c55e", warehouse: "#a855f7", qc: "#eab308",
  delivery: "#14b8a6", styling: "#ec4899", accounts: "#ef4444",
  hr: "#6366f1", manager: "#3b82f6",
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? { label: status, bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

export default function HrAttendancePage() {
  const [staff, setStaff] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [toast, setToast] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [showMarkSheet, setShowMarkSheet] = useState<any | null>(null)

  const today = new Date().toISOString().split("T")[0]

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [staffRes, attRes, leaveRes] = await Promise.allSettled([
        fetch("/api/users?limit=200").then(r => r.json()),
        fetch(`/api/attendance?date=${today}&limit=200`).then(r => r.json()),
        fetch("/api/leave-requests?status=pending&limit=50").then(r => r.json()),
      ])

      const staffData = staffRes.status === "fulfilled" ? (staffRes.value.data ?? []) : []
      const attData = attRes.status === "fulfilled" ? (attRes.value.data ?? []) : []
      const leaveData = leaveRes.status === "fulfilled" ? (leaveRes.value.data ?? []) : []

      setStaff(staffData)
      setAttendance(attData)
      setLeaves(leaveData)
    } catch {}
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  // Build a map of today's attendance by user_id
  const attMap = new Map(attendance.map((a: any) => [a.user_id, a]))

  // Filter staff by dept
  const filteredStaff = selectedDept === "all"
    ? staff
    : staff.filter((s: any) => s.department === selectedDept)

  const depts = ["all", ...Array.from(new Set(staff.map((s: any) => s.department).filter(Boolean)))]

  const present = attendance.filter((a: any) => a.status === "present" || a.status === "late" || a.status === "half_day").length
  const absent = attendance.filter((a: any) => a.status === "absent").length
  const pendingLeaves = leaves.filter((l: any) => l.status === "pending").length

  async function handleLeaveAction(leaveId: string, action: "approved" | "rejected") {
    setActioning(leaveId)
    try {
      const res = await fetch("/api/leave-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leaveId, status: action }),
      })
      if (res.ok) {
        setLeaves(prev => prev.filter(l => l.id !== leaveId))
        showToast(action === "approved" ? "Leave approved ✓" : "Leave rejected")
      } else {
        showToast("Failed to update leave")
      }
    } catch { showToast("Error updating leave") }
    setActioning(null)
  }

  async function markAttendance(userId: string, status: string, checkIn?: string, checkOut?: string) {
    setMarkingId(userId)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, date: today, status, check_in: checkIn || null, check_out: checkOut || null }),
      })
      if (res.ok) {
        const data = await res.json()
        const newRecord = data.data
        setAttendance(prev => {
          const existing = prev.findIndex((a: any) => a.user_id === userId)
          if (existing >= 0) {
            const updated = [...prev]; updated[existing] = newRecord; return updated
          }
          return [...prev, newRecord]
        })
        showToast(`Marked ${status.replace("_", " ")} ✓`)
        setShowMarkSheet(null)
      } else {
        showToast("Failed to mark attendance")
      }
    } catch { showToast("Error marking attendance") }
    setMarkingId(null)
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: COLOR_DARK, color: "white", borderRadius: 12, padding: "8px 20px", fontSize: 12, fontWeight: 700, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <PortalPageHeader title="HR Attendance" subtitle={`Today — ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`} color={COLOR} backHref="/portal/hr" />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 16px 0" }}>
        {[
          { label: "Present Today", value: present, color: "#16a34a" },
          { label: "Absent Today", value: absent, color: "#dc2626" },
          { label: "Pending Leaves", value: pendingLeaves, color: COLOR },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "12px 8px", textAlign: "center" }}>
            <p style={{ margin: "0 0 3px", fontSize: 24, fontWeight: 900, color: s.color }}>{loading ? "…" : s.value}</p>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(80,55,30,0.45)", lineHeight: 1.3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Leaves */}
      <PortalSectionLabel label={`Pending Leaves (${pendingLeaves})`} />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: 16, padding: 16 }}><PortalSkeleton rows={2} /></div>
        ) : leaves.filter(l => l.status === "pending").length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16 }}>
            <PortalEmptyState icon="calendar" title="No Pending Requests" subtitle="All leave requests are processed" color={COLOR} />
          </div>
        ) : (
          leaves.filter(l => l.status === "pending").map(l => {
            const days = Math.max(1, Math.round((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1)
            return (
              <div key={l.id} style={{ background: "white", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 18, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e1208" }}>{l.user?.name ?? l.user_id}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: DEPT_COLORS[l.user?.department] ?? COLOR }}>
                      {l.user?.department ?? "Staff"} · {l.leave_type?.replace(/_/g, " ") ?? "Leave"}
                    </p>
                  </div>
                  <span style={{ background: "#f1f5f9", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "#64748b" }}>
                    {days} {days === 1 ? "day" : "days"}
                  </span>
                </div>
                {l.reason && (
                  <p style={{ margin: "8px 0", fontSize: 11, color: "#475569", background: "#f8fafc", borderRadius: 10, padding: "8px 12px", fontStyle: "italic" }}>
                    "{l.reason}"
                  </p>
                )}
                <p style={{ margin: "6px 0 10px", fontSize: 10, color: "rgba(80,55,30,0.4)", fontWeight: 500 }}>
                  {l.start_date} → {l.end_date}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleLeaveAction(l.id, "approved")} disabled={actioning === l.id}
                    style={{ flex: 1, height: 38, borderRadius: 12, border: "none", background: "#22c55e", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: actioning === l.id ? 0.6 : 1 }}>
                    {actioning === l.id ? "…" : <span style={{ display: "flex", alignItems: "center", gap: 5 }}><PortalIcon name="check" size={14} /> Approve</span>}
                  </button>
                  <button onClick={() => handleLeaveAction(l.id, "rejected")} disabled={actioning === l.id}
                    style={{ flex: 1, height: 38, borderRadius: 12, border: "none", background: "#ef4444", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: actioning === l.id ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <PortalIcon name="x" size={14} /> Reject
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Dept Filter */}
      <PortalSectionLabel label="Today's Attendance" />
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 8, overflowX: "auto" }}>
        {depts.map(d => (
          <button key={d} onClick={() => setSelectedDept(d)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: selectedDept === d ? COLOR : "rgba(255,255,255,0.7)", color: selectedDept === d ? "white" : "rgba(80,55,30,0.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", textTransform: "capitalize" }}>
            {d === "all" ? "All Depts" : d}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: 16, padding: 16 }}><PortalSkeleton rows={5} /></div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16 }}>
            <PortalEmptyState icon="users" title="No staff found" subtitle="Add staff members to track attendance" color={COLOR} />
          </div>
        ) : (
          filteredStaff.map(s => {
            const att = attMap.get(s.id)
            const deptColor = DEPT_COLORS[s.department] ?? COLOR
            return (
              <div key={s.id} style={{ background: "white", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${deptColor}, ${deptColor}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {(s.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e1208" }}>{s.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600 }}>
                    {s.department?.toUpperCase() ?? "—"}
                    {att?.check_in && ` · In: ${att.check_in.slice(0, 5)}`}
                    {att?.check_out && ` · Out: ${att.check_out.slice(0, 5)}`}
                  </p>
                </div>
                {/* Status + Mark button */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  {att ? (
                    <StatusBadge status={att.status} />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(80,55,30,0.3)" }}>Not marked</span>
                  )}
                  <button onClick={() => setShowMarkSheet(s)}
                    style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${COLOR}30`, background: `${COLOR}10`, color: COLOR, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {att ? "Update" : "Mark"}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Mark Attendance Sheet */}
      {showMarkSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => setShowMarkSheet(null)} />
          <div style={{ position: "relative", marginTop: "auto", background: "white", borderRadius: "24px 24px 0 0", padding: "20px 20px calc(env(safe-area-inset-bottom,20px) + 20px)", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} />
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900, color: "#1e1208" }}>Mark Attendance</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(80,55,30,0.5)" }}>{showMarkSheet.name} · {today}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => markAttendance(showMarkSheet.id, key)} disabled={markingId === showMarkSheet.id}
                  style={{ padding: "14px 12px", borderRadius: 14, border: `2px solid ${cfg.dot}30`, background: cfg.bg, color: cfg.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: markingId === showMarkSheet.id ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
