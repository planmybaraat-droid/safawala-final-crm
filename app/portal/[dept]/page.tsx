"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getPortalConfig } from "@/lib/portal-config"
import { PortalDeptHeader } from "@/components/portal/portal-dept-header"
import { PortalHomeCard } from "@/components/portal/portal-home-card"
import { PortalListCard } from "@/components/portal/portal-shared"
import type { PortalConfig } from "@/lib/portal-config"
import { usePortalUser } from "@/components/portal/portal-user-context"

interface DashboardStats {
  todayBookings: number
  pendingPayments: number
  newLeads: number
  lowStock: number
  pendingQC: number
  unpaidInvoices: number
  stylistJobs: number
  activeStaff: number
}

export default function PortalHomePage() {
  const params = useParams()
  const router = useRouter()
  const dept = params.dept as string
  const user = usePortalUser()
  const config: PortalConfig | null = getPortalConfig(dept)
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    pendingPayments: 0,
    newLeads: 0,
    lowStock: 0,
    pendingQC: 0,
    unpaidInvoices: 0,
    stylistJobs: 0,
    activeStaff: 0,
  })
  const [loading, setLoading] = useState(true)

  const JOB_DEPTS: Record<string, { taskDept: string; jobsUrl: string }> = {
    warehouse: { taskDept: "warehouse", jobsUrl: "/portal/warehouse/tasks" },
    qc: { taskDept: "packing", jobsUrl: "/portal/qc/packing" },
    fulfillment: { taskDept: "dispatch", jobsUrl: "/portal/fulfillment/jobs" },
    accounts: { taskDept: "accounts", jobsUrl: "/portal/accounts/jobs" },
  }
  const [jobStats, setJobStats] = useState<{ open: number; recent: any[] }>({ open: 0, recent: [] })
  const [jobsLoading, setJobsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    if (JOB_DEPTS[dept]) fetchJobStats()
  }, [user, dept])

  async function fetchJobStats() {
    setJobsLoading(true)
    try {
      const taskDept = JOB_DEPTS[dept].taskDept
      const res = await fetch("/api/work-orders")
      const data = await res.json()
      const workOrders = Array.isArray(data.data) ? data.data : []
      const tasks = workOrders.flatMap((wo: any) =>
        (wo.work_order_tasks || [])
          .filter((t: any) => t.department === taskDept)
          .map((t: any) => ({ workOrder: wo, task: t }))
      )
      const open = tasks.filter(({ task }: any) => task.status === "active" || task.status === "pending").length
      const recent = [...tasks]
        .sort((a: any, b: any) => new Date(b.task.created_at || 0).getTime() - new Date(a.task.created_at || 0).getTime())
        .slice(0, 5)
      setJobStats({ open, recent })
    } catch {
      // non-blocking — home cards fall back to "—"
    } finally {
      setJobsLoading(false)
    }
  }

  async function fetchStats() {
    try {
      if (dept === "booking" || dept === "admin") {
        const today = new Date().toISOString().split("T")[0]
        const [bookingsRes, leadsRes] = await Promise.allSettled([
          fetch(`/api/bookings?date_from=${today}&date_to=${today}&limit=1`),
          fetch(`/api/leads?limit=1&created_today=true`),
        ])
        const bookingsData = bookingsRes.status === "fulfilled" && bookingsRes.value.ok
          ? await bookingsRes.value.json() : null
        const leadsData = leadsRes.status === "fulfilled" && leadsRes.value.ok
          ? await leadsRes.value.json() : null
        setStats(prev => ({
          ...prev,
          todayBookings: bookingsData?.total ?? bookingsData?.data?.length ?? 0,
          newLeads: leadsData?.total ?? leadsData?.data?.length ?? 0,
        }))
      } else if (dept === "warehouse") {
        const inventoryRes = await fetch("/api/warehouse/inventory")
        if (!inventoryRes.ok) throw new Error("Unable to load warehouse inventory")
        const inventoryData = await inventoryRes.json()
        const products = Array.isArray(inventoryData.data) ? inventoryData.data : []
        const lowStock = products.filter((product: any) => {
          const available = Number(product.stock_available) || 0
          const reorderLevel = Number(product.reorder_level) || 0
          return available > 0 && available <= reorderLevel
        }).length
        setStats(prev => ({ ...prev, lowStock }))
      }
    } catch {
      // stats stay at 0 — non-blocking
    } finally {
      setLoading(false)
    }
  }

  if (!config) return null

  const greeting = getGreeting()
  const firstName = user.name?.split(" ")[0] || "there"

  const recentJobsSection = JOB_DEPTS[dept] && (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#71717a" }}>Recent Jobs</p>
        <button
          onClick={() => router.push(JOB_DEPTS[dept].jobsUrl)}
          className="text-[11px] font-bold"
          style={{ color: config.color }}
        >
          View all
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)" }}>
        {jobsLoading ? (
          <div className="p-6 text-center text-[12px] text-slate-400">Loading…</div>
        ) : jobStats.recent.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-slate-400">No recent jobs yet</div>
        ) : (
          jobStats.recent.map(({ workOrder, task }: any) => (
            <PortalListCard
              key={task.id}
              title={`${workOrder.customer_name} (${workOrder.booking_number})`}
              subtitle={task.title}
              badge={task.status}
              color={config.color}
              icon="clipboard"
              onClick={() => router.push(JOB_DEPTS[dept].jobsUrl)}
            />
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className={dept === "warehouse" ? "warehouse-home-page" : undefined}>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-6 text-white warehouse-home-hero"
        style={{
          background: `linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -25)})`,
        }}
      >
        <div>
          <p className="text-[11px] font-semibold opacity-70 mb-0.5 uppercase tracking-wider">
            {greeting}
          </p>
          <h1 className="text-xl font-black leading-tight">{firstName}</h1>
          <p className="text-[11px] opacity-70 mt-1">{config.portalName}</p>
        </div>

        {/* Date pill */}
        <div
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 py-4 space-y-3">
        {dept === "booking" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <PortalHomeCard
                title="Today's Bookings"
                value={loading ? "—" : stats.todayBookings}
                subtitle="Confirmed today"
                icon="calendar"
                color={config.color}
                onClick={() => router.push("/portal/booking/bookings")}
              />
              <PortalHomeCard
                title="New Leads"
                value={loading ? "—" : stats.newLeads}
                subtitle="Awaiting follow-up"
                icon="target"
                color={config.color}
                onClick={() => router.push("/portal/booking/leads")}
              />
            </div>
            <PortalHomeCard
              title="Create New Booking"
              value="+ New"
              subtitle="Start a fresh booking for a customer"
              icon="plus-circle"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/booking/bookings/new")}
            />
            <PortalHomeCard
              title="All Quotes"
              value="View"
              subtitle="Manage sent quotes and conversions"
              icon="document"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/booking/quotes")}
            />
            <PortalHomeCard
              title="Customers"
              value="Search"
              subtitle="Find customer profiles and history"
              icon="users"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/booking/customers")}
            />
          </>
        )}

        {dept === "warehouse" && (
          <>
            <PortalHomeCard
              title="Picking"
              value="Open Jobs"
              subtitle="Process warehouse picking workflow"
              icon="clipboard"
              color={config.color}
              variant="action"
              badge={jobsLoading ? undefined : jobStats.open}
              onClick={() => router.push("/portal/warehouse/tasks")}
            />
            {recentJobsSection}
            <div className="grid grid-cols-2 gap-3">
              <PortalHomeCard
                title="Low Stock"
                value={loading ? "—" : stats.lowStock}
                subtitle="Items below minimum"
                icon="alert-triangle"
                color={config.color}
                onClick={() => router.push("/portal/warehouse/inventory")}
              />
              <PortalHomeCard
                title="Inventory"
                value="View All"
                subtitle="Full stock list"
                icon="package"
                color={config.color}
                onClick={() => router.push("/portal/warehouse/inventory")}
              />
            </div>
            <PortalHomeCard
              title="Laundry Queue"
              value="View"
              subtitle="Items sent for washing"
              icon="laundry"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/warehouse/laundry")}
            />
          </>
        )}

        {dept === "qc" && (
          <>
            <PortalHomeCard
              title="Packing Queue"
              value="Open Jobs"
              subtitle="Quality check, then pack orders picked from the warehouse"
              icon="laundry"
              color={config.color}
              variant="action"
              badge={jobsLoading ? undefined : jobStats.open}
              onClick={() => router.push("/portal/qc/packing")}
            />
            {recentJobsSection}
            <PortalHomeCard
              title="Damage Reports"
              value="View"
              subtitle="Items flagged damaged during QC"
              icon="alert-triangle"
              color={config.color}
              onClick={() => router.push("/portal/qc/damage")}
            />
          </>
        )}

        {dept === "fulfillment" && (
          <>
            <PortalHomeCard
              title="Fulfillment Jobs"
              value="Open Jobs"
              subtitle="Confirmed orders ready to ship"
              icon="clipboard"
              color={config.color}
              variant="action"
              badge={jobsLoading ? undefined : jobStats.open}
              onClick={() => router.push("/portal/fulfillment/jobs")}
            />
            {recentJobsSection}
            <PortalHomeCard
              title="Pending Shipments"
              value={jobsLoading ? "—" : jobStats.open}
              subtitle="Orders ready to ship"
              icon="package"
              color={config.color}
              onClick={() => router.push("/portal/fulfillment/deliveries")}
            />
            <PortalHomeCard
              title="Create Shipment"
              value="Ship Now"
              subtitle="Book courier and generate AWB"
              icon="truck"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/fulfillment/deliveries")}
            />
            <PortalHomeCard
              title="Team & Travel"
              value="Open"
              subtitle="Assign a stylist and book tickets/hotel — independent of pick/pack/QC"
              icon="team"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/fulfillment/team")}
            />
          </>
        )}

        {dept === "styling" && (
          <>
            <PortalHomeCard
              title="My Assignments"
              value="View"
              subtitle="Upcoming safa styling jobs"
              icon="clipboard"
              color={config.color}
              onClick={() => router.push("/portal/styling/assignments")}
            />
            <div className="grid grid-cols-2 gap-3">
              <PortalHomeCard
                title="This Month"
                value={loading ? "—" : stats.stylistJobs}
                subtitle="Jobs completed"
                icon="star"
                color={config.color}
                onClick={() => router.push("/portal/styling/earnings")}
              />
              <PortalHomeCard
                title="Earnings"
                value="View"
                subtitle="Salary + commission"
                icon="rupee"
                color={config.color}
                onClick={() => router.push("/portal/styling/earnings")}
              />
            </div>
          </>
        )}

        {dept === "accounts" && (
          <>
            <PortalHomeCard
              title="Billing Jobs"
              value="Open Jobs"
              subtitle="Verify advances, invoice & collect balances"
              icon="clipboard"
              color={config.color}
              variant="action"
              badge={jobsLoading ? undefined : jobStats.open}
              onClick={() => router.push("/portal/accounts/jobs")}
            />
            {recentJobsSection}
            <PortalHomeCard
              title="Unpaid Invoices"
              value={loading ? "—" : stats.unpaidInvoices}
              subtitle="Awaiting payment collection"
              icon="receipt"
              color={config.color}
              onClick={() => router.push("/portal/accounts/payments")}
            />
            <PortalHomeCard
              title="Record Payment"
              value="+ Add"
              subtitle="Log a new payment received"
              icon="credit-card"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/accounts/payments")}
            />
            <PortalHomeCard
              title="Expenses"
              value="View"
              subtitle="All outgoing expenses"
              icon="bar-chart"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/accounts/expenses")}
            />
          </>
        )}

        {(dept === "admin" || dept === "manager") && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <PortalHomeCard
                title="Today's Bookings"
                value={loading ? "—" : stats.todayBookings}
                subtitle="Confirmed today"
                icon="calendar"
                color={config.color}
                onClick={() => router.push("/dashboard")}
              />
              <PortalHomeCard
                title="Active Staff"
                value={loading ? "—" : stats.activeStaff}
                subtitle="Logged in today"
                icon="team"
                color={config.color}
                onClick={() => router.push(dept === "admin" ? "/portal/admin/staff" : "/portal/manager/staff")}
              />
            </div>
            <PortalHomeCard
              title="Open Full Dashboard"
              value="Go to CRM"
              subtitle="Complete admin view with all modules"
              icon="monitor"
              color={config.color}
              variant="action"
              onClick={() => router.push("/dashboard")}
            />
          </>
        )}

        {dept === "franchise" && (
          <>
            <PortalHomeCard
              title="Revenue This Month"
              value="View"
              subtitle="Your franchise earnings"
              icon="rupee"
              color={config.color}
              onClick={() => router.push("/portal/franchise/revenue")}
            />
            <PortalHomeCard
              title="Inventory"
              value="View"
              subtitle="Your branch stock levels"
              icon="package"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/franchise/inventory")}
            />
          </>
        )}

        {dept === "hr" && (
          <>
            <PortalHomeCard
              title="Staff Directory"
              value="Manage"
              subtitle="All registered staff members"
              icon="team"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/hr/staff")}
            />
            <PortalHomeCard
              title="Attendance & Leaves"
              value="Daily Logs"
              subtitle="Monitor daily logs & leave requests"
              icon="calendar"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/hr/attendance")}
            />
            <PortalHomeCard
              title="Run Payroll"
              value="Compensation"
              subtitle="Review salaries and payouts"
              icon="rupee"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/hr/payroll")}
            />
          </>
        )}

        {/* Khatabook / Ledger Entry Point */}
        <PortalHomeCard
          title={dept === "admin" || dept === "manager" || dept === "hr" ? "Staff Ledgers (Khatabook)" : "My Ledger (Khatabook)"}
          value="Open"
          subtitle={dept === "admin" || dept === "manager" || dept === "hr" ? "Manage employee advances & credit score" : "Track advances, payouts & credit limit"}
          icon="credit-card"
          color={config.color}
          variant="action"
          onClick={() => router.push(`/portal/${dept}/ledger`)}
        />

        {/* Always-visible quick link to profile */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mt-2"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.8)",
          }}
          onClick={() => router.push(`/portal/${dept}/profile`)}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0"
            style={{ background: config.color }}
          >
            {(user.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#1e1208] truncate">{user.name}</p>
            <p className="text-[10px] text-[rgba(80,55,30,0.5)] truncate">{user.email}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(80,55,30,0.3)" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
