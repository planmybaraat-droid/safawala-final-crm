"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"

const ICONS = {
  rupee: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  building: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M3 9h6" />
      <path d="M3 15h6" />
      <path d="M15 6h2" />
      <path d="M15 10h2" />
      <path d="M15 14h2" />
      <path d="M15 18h2" />
    </svg>
  ),
  cart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  leads: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  clip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function StatCard({ icon, value, label, sub, subColor = "#8b5a2b", accent = GOLD }: {
  icon: React.ReactNode; value: string; label: string; sub?: string; subColor?: string; accent?: string
}) {
  return (
    <div style={{
      background: CREAM, borderRadius: 14, border: `1px solid ${BORDER}`,
      padding: "18px 20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "14px 14px 0 0" }} />
      <div style={{ marginBottom: 10, color: accent }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: BROWN, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: subColor, marginTop: 5, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children, action, href }: { children: React.ReactNode; action?: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: BROWN, letterSpacing: "-0.01em" }}>{children}</h3>
      {action && href && (
        <Link href={href} style={{ fontSize: 11, color: GOLD, fontWeight: 600, textDecoration: "none" }}>{action} →</Link>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalRevenue: 0, monthRevenue: 0, totalFranchises: 0, activeFranchises: 0,
    totalCustomers: 0, totalOrders: 0, pendingOrders: 0, completedOrders: 0,
    totalEmployees: 0, todayBookings: 0, pendingPayments: 0,
    totalLeads: 0,
  })
  const [franchises, setFranchises] = useState<any[]>([])
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlySales, setMonthlySales] = useState<{ name: string; sales: number }[]>([])
  const [enquiryStats, setEnquiryStats] = useState<{ name: string; value: number; color: string }[]>([])

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }

    Promise.allSettled([
      fetch("/api/dashboard/stats", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/franchises?limit=50").then(r => r.json()),
      fetch("/api/users?limit=200").then(r => r.json()),
      fetch("/api/franchise-enquiries?limit=200").then(r => r.json()),
    ]).then(([statsRes, fRes, uRes, eRes]) => {
      const dashboardStats = statsRes.status === "fulfilled" ? (statsRes.value.data ?? {}) : {}
      const fData = fRes.status === "fulfilled" ? (fRes.value.data ?? fRes.value ?? []) : []
      const users = uRes.status === "fulfilled" ? (uRes.value.data ?? uRes.value ?? []) : []
      const enq = eRes.status === "fulfilled" ? (eRes.value.data ?? []) : []

      setStats({
        totalRevenue: Number(dashboardStats.totalRevenue) || 0,
        monthRevenue: Number(dashboardStats.monthRevenue) || 0,
        totalFranchises: fData.length,
        activeFranchises: fData.filter((f: any) => f.is_active !== false).length,
        totalCustomers: Number(dashboardStats.totalCustomers) || 0,
        totalOrders: Number(dashboardStats.totalBookings) || 0,
        pendingOrders: Number(dashboardStats.activeBookings) || 0,
        completedOrders: Number(dashboardStats.completedBookings) || 0,
        totalEmployees: users.length,
        todayBookings: Number(dashboardStats.todayBookings) || 0,
        pendingPayments: Number(dashboardStats.pendingPaymentCount) || 0,
        totalLeads: enq.length,
      })
      setFranchises(fData.slice(0, 5))
      setEnquiries(enq.slice(0, 5))
      setRecentOrders((dashboardStats.recentOrders || []).slice(0, 5))

      setMonthlySales((dashboardStats.revenueByMonth || []).map((row: any) => ({
        name: row.month,
        sales: Number(row.revenue) || 0,
      })))

      // Compute enquiry status breakdown
      const statusMap: Record<string, { color: string }> = {
        new: { color: "#f59e0b" },
        called: { color: "#3b82f6" },
        converted: { color: "#16a34a" },
        rejected: { color: "#ef4444" },
      }
      setEnquiryStats(
        Object.entries(statusMap).map(([status, cfg]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: enq.filter((e: any) => e.status === status).length,
          color: cfg.color,
        }))
      )
    }).finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`

  const ENQUIRY_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    new: { bg: "#fef9ec", color: "#b08030" },
    called: { bg: "#eff6ff", color: "#1d4ed8" },
    converted: { bg: "#f0fdf4", color: "#16a34a" },
    rejected: { bg: "#fef2f2", color: "#dc2626" },
  }


  return (
    <div style={{ background: WARM, fontFamily: "system-ui,-apple-system,sans-serif", minHeight: "100vh", paddingBottom: 40 }}>

      {/* Page header */}
      <div style={{
        background: CREAM, borderBottom: `1px solid ${BORDER}`,
        padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BROWN }}>
            {greeting}, {user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#a07040", marginTop: 2 }}>{dateStr}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/admin/franchises" style={{
            fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 10,
            background: BROWN, color: GOLD, textDecoration: "none", letterSpacing: "0.02em",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {ICONS.plus}
            New Franchise
          </Link>
          <a href="/franchise-enquiry" target="_blank" style={{
            fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 10,
            background: "rgba(201,168,76,0.12)", color: BROWN, border: `1px solid ${BORDER}`,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
          }}>
            {ICONS.link}
            Enquiry Page ↗
          </a>
        </div>
      </div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Row 1: 5 primary stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <StatCard icon={ICONS.rupee} value={loading ? "—" : fmt(stats.totalRevenue)} label="Gross Order Value" sub={`${fmt(stats.monthRevenue)} booked this month`} subColor="#16a34a" accent={GOLD} />
          <StatCard icon={ICONS.building} value={loading ? "—" : String(stats.totalFranchises)} label="Franchises" sub={`${stats.activeFranchises} active`} subColor="#16a34a" accent="#22c55e" />
          <StatCard icon={ICONS.cart} value={loading ? "—" : String(stats.totalOrders)} label="Total Orders" sub={`${stats.pendingOrders} active`} subColor="#f97316" accent="#f97316" />
          <StatCard icon={ICONS.users} value={loading ? "—" : String(stats.totalCustomers)} label="Customers" sub="All franchises" accent="#3b82f6" />
          <StatCard icon={ICONS.user} value={loading ? "—" : String(stats.totalEmployees)} label="Employees" sub="Across all branches" accent="#a855f7" />
        </div>

        {/* Row 2: 4 quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Today's Bookings", value: loading ? "—" : String(stats.todayBookings), color: GOLD },
            { label: "Completed Orders", value: loading ? "—" : String(stats.completedOrders), color: "#16a34a" },
            { label: "Pending Collections", value: loading ? "—" : String(stats.pendingPayments), color: "#ef4444" },
            { label: "Franchise Enquiries", value: loading ? "—" : String(stats.totalLeads), color: "#3b82f6" },
          ].map((s, i) => (
            <div key={i} style={{
              background: CREAM, borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a07040", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Row 2.5: Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
          {/* Sales chart */}
          <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px" }}>
            <SectionTitle>Monthly Sales Performance</SectionTitle>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
                  <XAxis dataKey="name" stroke="#8b5a2b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#8b5a2b" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ background: CREAM, borderColor: GOLD, borderRadius: 10, fontSize: 11, color: BROWN }} />
                  <Area type="monotone" dataKey="sales" stroke={GOLD} strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Enquiry status chart */}
          <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px" }}>
            <SectionTitle action="View all" href="/admin/enquiries">Franchise Enquiry Pipeline</SectionTitle>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enquiryStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
                  <XAxis dataKey="name" stroke="#8b5a2b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#8b5a2b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(value) => `${value} leads`} contentStyle={{ background: CREAM, borderColor: GOLD, borderRadius: 10, fontSize: 11, color: BROWN }} />
                  <Bar dataKey="value" fill={GOLD} radius={[4, 4, 0, 0]}>
                    {enquiryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 3: Top Franchises + Franchise Enquiries */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>

          {/* Top Franchises */}
          <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px" }}>
            <SectionTitle action="Manage all" href="/admin/franchises">Top Franchises</SectionTitle>
            {loading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#a07040", fontSize: 13 }}>Loading...</div>
            ) : franchises.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 13, color: "#a07040", margin: "0 0 12px" }}>No franchises yet</p>
                <Link href="/admin/franchises" style={{
                  fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
                  background: BROWN, color: GOLD, textDecoration: "none",
                }}>Add First Franchise →</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {franchises.map((f, i) => (
                  <div key={f.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10,
                    background: i === 0 ? "rgba(201,168,76,0.08)" : "transparent",
                    border: i === 0 ? `1px solid rgba(201,168,76,0.2)` : "1px solid transparent",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: i === 0 ? GOLD : "rgba(201,168,76,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: i === 0 ? "#fff" : BROWN, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BROWN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: "#a07040" }}>{f.city || "—"} · {f.owner_name || "—"}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                      background: f.is_active !== false ? "#f0fdf4" : "#fef2f2",
                      color: f.is_active !== false ? "#16a34a" : "#dc2626",
                    }}>
                      {f.is_active !== false ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Franchise Enquiries */}
          <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px" }}>
            <SectionTitle action="View all" href="/admin/enquiries">Franchise Enquiries</SectionTitle>
            {loading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#a07040", fontSize: 13 }}>Loading...</div>
            ) : enquiries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 13, color: "#a07040", margin: "0 0 12px" }}>No enquiries yet</p>
                <Link href="/franchise-enquiry" target="_blank" style={{
                  fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
                  background: BROWN, color: GOLD, textDecoration: "none",
                }}>Open Enquiry Page ↗</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {enquiries.map((e) => {
                  const st = ENQUIRY_STATUS_COLOR[e.status] ?? ENQUIRY_STATUS_COLOR.new
                  return (
                    <div key={e.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10, border: "1px solid transparent",
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "rgba(201,168,76,0.12)", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                      }}>{ICONS.user}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: BROWN }}>{e.full_name}</div>
                        <div style={{ fontSize: 11, color: "#a07040" }}>{e.city} · {e.investment_budget || "Budget not specified"}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                        background: st.bg, color: st.color, textTransform: "capitalize", whiteSpace: "nowrap",
                      }}>{e.status}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Recent Orders + Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>

          {/* Recent Orders */}
          <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px" }}>
            <SectionTitle action="View all" href="/admin/reports">Recent Orders</SectionTitle>
            {loading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#a07040", fontSize: 13 }}>Loading...</div>
            ) : recentOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#a07040", fontSize: 13 }}>No orders yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {recentOrders.map((o, i) => {
                  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
                    confirmed: { bg: "#eff6ff", color: "#1d4ed8", label: "Confirmed" },
                    order_complete: { bg: "#f0fdf4", color: "#16a34a", label: "Completed" },
                    pending: { bg: "#fef9ec", color: "#b08030", label: "Pending" },
                    cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
                  }
                  const st = statusMap[o.status] ?? { bg: "#f1f5f9", color: "#64748b", label: o.status }
                  const amt = o.total_amount ? fmt(Number(o.total_amount)) : "—"
                  const date = o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"
                  return (
                    <div key={o.id || i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 10,
                      borderBottom: i < recentOrders.length - 1 ? `1px solid rgba(201,168,76,0.1)` : "none",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0,
                      }}>{ICONS.cart}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: BROWN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {o.customer_name || o.groom_name || "Customer"}
                        </div>
                        <div style={{ fontSize: 11, color: "#a07040" }}>{o.order_number || o.sale_number || o.package_number || "—"} · {date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>{amt}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ background: CREAM, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px" }}>
            <SectionTitle>Quick Actions</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: ICONS.building, label: "Franchises", href: "/admin/franchises", color: GOLD },
                { icon: ICONS.user, label: "Staff", href: "/admin/staff", color: "#3b82f6" },
                { icon: ICONS.chart, label: "Reports", href: "/admin/reports", color: "#22c55e" },
                { icon: ICONS.settings, label: "Settings", href: "/admin/settings", color: "#a855f7" },
                { icon: ICONS.clip, label: "Enquiries", href: "/admin/enquiries", color: "#f97316" },
                { icon: ICONS.link, label: "Enquiry Page", href: "/franchise-enquiry", color: "#8b5a2b" },
              ].map((a, i) => (
                <Link key={i} href={a.href} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "16px 12px", borderRadius: 12,
                  background: WARM, border: `1px solid ${BORDER}`,
                  textDecoration: "none", transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", color: a.color }}>{a.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: BROWN, textAlign: "center" }}>{a.label}</div>
                </Link>
              ))}
            </div>

            {/* System health link */}
            <Link href="/admin/system-health" style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 10,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: BROWN }}>Open System Health</div>
              <div style={{ marginLeft: "auto", fontSize: 10, color: "#64748b" }}>Check now →</div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
