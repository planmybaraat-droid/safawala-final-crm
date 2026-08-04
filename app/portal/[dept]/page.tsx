"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getPortalConfig } from "@/lib/portal-config"
import { PortalDeptHeader } from "@/components/portal/portal-dept-header"
import { PortalHomeCard } from "@/components/portal/portal-home-card"
import { PortalIcon } from "@/components/portal/portal-icons"
import type { PortalConfig } from "@/lib/portal-config"
import type { User } from "@/lib/types"

interface DashboardStats {
  todayBookings: number
  pendingPayments: number
  newLeads: number
  lowStock: number
  pendingQC: number
  pendingDispatch: number
  unpaidInvoices: number
  stylistJobs: number
  activeStaff: number
}

export default function PortalHomePage() {
  const params = useParams()
  const router = useRouter()
  const dept = params.dept as string
  const [user, setUser] = useState<User | null>(null)
  const [config, setConfig] = useState<PortalConfig | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    pendingPayments: 0,
    newLeads: 0,
    lowStock: 0,
    pendingQC: 0,
    pendingDispatch: 0,
    unpaidInvoices: 0,
    stylistJobs: 0,
    activeStaff: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (!raw) return
    try {
      const u: User = JSON.parse(raw)
      setUser(u)
      const c = getPortalConfig(dept)
      if (c) setConfig(c)
    } catch {}
  }, [dept])

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  async function fetchStats() {
    try {
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
    } catch {
      // stats stay at 0 — non-blocking
    } finally {
      setLoading(false)
    }
  }

  if (!config || !user) return null

  const greeting = getGreeting()
  const firstName = user.name?.split(" ")[0] || "there"

  return (
    <div>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -25)})`,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold opacity-70 mb-0.5 uppercase tracking-wider">
              {greeting}
            </p>
            <h1 className="text-xl font-black leading-tight">{firstName}</h1>
            <p className="text-[11px] opacity-70 mt-1">{config.portalName}</p>
          </div>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
          >
            <PortalIcon name={config.icon} size={24} />
          </div>
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
              title="Picking & Packing"
              value="Open Tasks"
              subtitle="Process picking and packing workflows"
              icon="clipboard"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/warehouse/tasks")}
            />
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
              title="Pending Inspections"
              value={loading ? "—" : stats.pendingQC}
              subtitle="Orders waiting for QC check"
              icon="search"
              color={config.color}
              onClick={() => router.push("/portal/qc/inspect")}
            />
            <PortalHomeCard
              title="Start Inspection"
              value="Inspect Now"
              subtitle="Check and approve packed orders"
              icon="check-circle"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/qc/inspect")}
            />
            <PortalHomeCard
              title="Damage Reports"
              value="View"
              subtitle="Log and review item damage"
              icon="alert-triangle"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/qc/damage")}
            />
          </>
        )}

        {dept === "delivery" && (
          <>
            <PortalHomeCard
              title="Pending Shipments"
              value={loading ? "—" : stats.pendingDispatch}
              subtitle="Orders ready to ship"
              icon="package"
              color={config.color}
              onClick={() => router.push("/portal/delivery/deliveries")}
            />
            <PortalHomeCard
              title="Create Shipment"
              value="Ship Now"
              subtitle="Book courier and generate AWB"
              icon="truck"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/delivery/deliveries")}
            />
            <PortalHomeCard
              title="Track Returns"
              value="View"
              subtitle="Monitor incoming return shipments"
              icon="refresh"
              color={config.color}
              variant="action"
              onClick={() => router.push("/portal/delivery/returns")}
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
