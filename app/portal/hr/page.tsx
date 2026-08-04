"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PortalIcon } from "@/components/portal/portal-icons"

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

export default function HrHomePage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ staff: 0, todayPresent: 0, pendingLeaves: 0, openRoles: 0 })

  const today = new Date().toISOString().split("T")[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }

    Promise.allSettled([
      fetch("/api/users?limit=1").then(r => r.json()),
      fetch(`/api/attendance?date=${today}&limit=1`).then(r => r.json()),
      fetch("/api/leave-requests?status=pending&limit=1").then(r => r.json()),
      fetch("/api/recruitment?status=interview_scheduled&limit=1").then(r => r.json()),
    ]).then(([staffRes, attRes, leaveRes, recruitRes]) => {
      setStats({
        staff:         staffRes.status  === "fulfilled" ? (staffRes.value.total  ?? staffRes.value.data?.length  ?? 0) : 0,
        todayPresent:  attRes.status    === "fulfilled" ? (attRes.value.total    ?? attRes.value.data?.length    ?? 0) : 0,
        pendingLeaves: leaveRes.status  === "fulfilled" ? (leaveRes.value.total  ?? leaveRes.value.data?.length  ?? 0) : 0,
        openRoles:     recruitRes.status === "fulfilled" ? (recruitRes.value.total ?? recruitRes.value.data?.length ?? 0) : 0,
      })
    })
  }, [today])

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", background: `linear-gradient(135deg, ${COLOR}, #4f46e5)`, color: "white" }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, opacity: 0.75 }}>{greeting}</p>
        <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900 }}>{user?.name?.split(" ")[0] ?? "HR Manager"}</h1>
        <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>HR Portal · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "white", borderBottom: "1px solid #f1f5f9" }}>
        {[
          { label: "Staff",      value: stats.staff,         color: COLOR },
          { label: "Present",    value: stats.todayPresent,  color: "#22c55e" },
          { label: "Leaves",     value: stats.pendingLeaves, color: "#f97316" },
          { label: "Interviews", value: stats.openRoles,     color: "#3b82f6" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "12px 8px", textAlign: "center", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
            <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8" }}>{s.label}</p>
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
