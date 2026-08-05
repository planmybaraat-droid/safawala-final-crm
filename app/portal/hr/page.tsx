"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { PortalIcon } from "@/components/portal/portal-icons"
import { useAutoRefresh } from "@/lib/hooks/use-auto-refresh"

const COLOR = "#6366f1"

const MODULES = [
  { href: "/portal/hr/staff",       icon: "team",        label: "Staff",       sub: "Manage team members",    color: "#6366f1" },
  { href: "/portal/hr/attendance",  icon: "calendar",    label: "Attendance",  sub: "Daily presence tracker", color: "#3b82f6" },
  { href: "/portal/hr/payroll",     icon: "rupee",       label: "Payroll",     sub: "Salary & payslips",      color: "#22c55e" },
  { href: "/portal/hr/recruitment", icon: "target",      label: "Recruitment", sub: "Interview pipeline",     color: "#f97316" },
  { href: "/portal/hr/letters",     icon: "document",    label: "HR Letters",  sub: "Offer, joining & more",  color: "#8b5cf6" },
  { href: "/portal/hr/kyc",         icon: "id-card",     label: "KYC Docs",   sub: "Employee verification",  color: "#14b8a6" },
  { href: "/portal/hr/ledger",      icon: "bar-chart",   label: "Ledger",      sub: "Advances & allowances",  color: "#ef4444" },
  { href: "/portal/hr/profile",     icon: "user",        label: "My Profile",  sub: "Account settings",       color: "#94a3b8" },
]

const QUICK_ACTIONS = [
  { href: "/portal/hr/letters",    label: "Generate Offer Letter",   icon: "handshake",    color: "#8b5cf6" },
  { href: "/portal/hr/attendance", label: "Mark Today's Attendance", icon: "check-circle", color: "#22c55e" },
  { href: "/portal/hr/recruitment",label: "Schedule Interview",       icon: "calendar",     color: "#3b82f6" },
]

type StatValue = number | null

export default function HrHomePage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<{ staff: StatValue; todayPresent: StatValue; pendingLeaves: StatValue; openRoles: StatValue }>({
    staff: null, todayPresent: null, pendingLeaves: null, openRoles: null,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const loadStats = useCallback(() => {
    // These endpoints don't return a `total` count, only the page of rows —
    // limit must be high enough that .length is a real total, not a page size.
    // res.ok is checked explicitly: some of these (e.g. /api/users) require
    // franchise_admin and 401 for a plain HR staff account — that's a 403,
    // not zero, so it renders as "—" rather than a misleading 0.
    async function readCount(url: string): Promise<StatValue> {
      const res = await fetch(url)
      if (!res.ok) return null
      const json = await res.json()
      return json.total ?? json.data?.length ?? 0
    }

    const today = new Date().toISOString().split("T")[0]
    Promise.allSettled([
      readCount("/api/users?limit=500"),
      readCount(`/api/attendance?date=${today}&limit=500`),
      readCount("/api/leave-requests?status=pending&limit=500"),
      readCount("/api/recruitment?status=interview_scheduled&limit=500"),
    ]).then(([staffRes, attRes, leaveRes, recruitRes]) => {
      setStats({
        staff:         staffRes.status  === "fulfilled" ? staffRes.value  : null,
        todayPresent:  attRes.status    === "fulfilled" ? attRes.value    : null,
        pendingLeaves: leaveRes.status  === "fulfilled" ? leaveRes.value  : null,
        openRoles:     recruitRes.status === "fulfilled" ? recruitRes.value : null,
      })
    })
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }
    loadStats()
  }, [loadStats])

  // Picks up employee/attendance/leave/recruitment changes made from the
  // Main CRM's other views (or another HR user) without a manual refresh.
  useAutoRefresh(loadStats, 15000)

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", background: `linear-gradient(135deg, ${COLOR}, #4f46e5)`, color: "white" }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, opacity: 0.75 }}>{greeting}</p>
        <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900 }}>{user?.name?.split(" ")[0] ?? "HR Manager"}</h1>
        <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>HR Portal · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
      </div>

      {/* Stats */}
      <div style={{ padding: "16px 16px 4px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Total Staff",           value: stats.staff,         color: COLOR,      icon: "team" },
          { label: "Present Today",         value: stats.todayPresent,  color: "#22c55e",  icon: "check-circle" },
          { label: "Pending Leave Requests",value: stats.pendingLeaves, color: "#f97316",  icon: "file-check" },
          { label: "Interviews Scheduled",  value: stats.openRoles,     color: "#3b82f6",  icon: "user-plus" },
        ].map((s) => (
          <div key={s.label} style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 18, padding: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 12 }}>
              <PortalIcon name={s.icon} size={20} />
            </div>
            <p style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 900, color: "#1e1208" }}>{s.value ?? "—"}</p>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "rgba(80,55,30,0.5)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {MODULES.map(m => (
          <Link key={m.href} href={m.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: `2px solid ${m.color}20`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: m.color }}>
                <PortalIcon name={m.icon} size={22} />
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: "#1e1208" }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(80,55,30,0.4)", fontWeight: 500, lineHeight: 1.3 }}>{m.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: "8px 0 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(80,55,30,0.35)" }}>Quick Actions</p>
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href}
            style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 14, padding: "12px 16px", textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${a.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }}>
              <PortalIcon name={a.icon} size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1208" }}>{a.label}</span>
            <div style={{ marginLeft: "auto", color: "rgba(80,55,30,0.25)" }}>
              <PortalIcon name="chevron-right" size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
