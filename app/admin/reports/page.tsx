"use client"

import { useEffect, useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts"
import { toast } from "sonner"

const GOLD = "#c9a84c"
const BROWN = "#3d1c02"
const CREAM = "#fdf6ed"
const WARM = "#f5ebe0"
const BORDER = "rgba(201,168,76,0.2)"
const COLORS = ["#c9a84c", "#3d1c02", "#16a34a", "#2563eb", "#d97706", "#7c3aed", "#db2777"]

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [timeRange, setTimeRange] = useState("30")

  useEffect(() => {
    loadReports()
  }, [timeRange])

  const loadReports = async () => {
    setLoading(true)
    try {
      // Fetch data from dashboard stats api which already aggregates booking totals, commissions, etc.
      const res = await fetch(`/api/dashboard/stats?days=${timeRange}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed to load reports")
      setStats(d.data)
    } catch {
      toast.error("Failed to load reports data")
    } finally {
      setLoading(false)
    }
  }

  const salesTrendData = useMemo(() => {
    return (stats?.revenueByMonth || []).map((row: any) => ({ month: row.month, sales: row.revenue }))
  }, [stats])

  const franchisePerformanceData = useMemo(() => {
    return (stats?.franchisePerformance || []).map((f: any) => ({
      name: f.name,
      revenue: f.revenue || 0,
      bookings: f.bookings || 0,
      commission: f.commission || 0,
      commissionRate: f.commissionRate || 0,
      code: f.code || "—",
    }))
  }, [stats])

  const expenseBreakdownData = useMemo(() => {
    return stats?.expenseBreakdown || []
  }, [stats])

  return (
    <div style={{ background: WARM, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>
      
      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: BROWN }}>Analytics & Financial Reports</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#a07040", marginTop: 4 }}>
            Visual breakdowns of corporate sales trends, franchise commissions, and expenses.
          </p>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          style={{
            height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
            padding: "0 14px", fontSize: 13, background: CREAM, color: BROWN, outline: "none", cursor: "pointer"
          }}
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">This Year</option>
        </select>
      </div>

      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { label: "Total Gross Revenue", value: loading ? "—" : `₹${Number(stats?.totalRevenue || 0).toLocaleString("en-IN")}`, desc: "From orders in the selected period" },
            { label: "Total Bookings/Orders", value: loading ? "—" : stats?.totalBookings || 0, desc: "Orders in the selected period" },
            { label: "Active Franchise Branches", value: loading ? "—" : franchisePerformanceData.length, desc: "Branches with orders in this period" },
            { label: "Calculated Commission", value: loading ? "—" : `₹${Number(stats?.commissionEarned || 0).toLocaleString("en-IN")}`, desc: "Based on each branch commission rate" },
          ].map((k, i) => (
            <div key={i} style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: BROWN, margin: "6px 0 2px" }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "#805020" }}>{k.desc}</div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="charts-responsive-grid">
          
          {/* Sales & Commission Trend */}
          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: BROWN }}>Sales & Commission Trend</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
                  <XAxis dataKey="month" stroke={BROWN} fontSize={11} />
                  <YAxis stroke={BROWN} fontSize={11} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="sales" name="Gross Sales (₹)" stroke={GOLD} strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performing Branches */}
          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: BROWN }}>Top Performing Branches</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={franchisePerformanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
                  <XAxis dataKey="name" stroke={BROWN} fontSize={11} />
                  <YAxis stroke={BROWN} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="revenue" name="Total Revenue (₹)" fill={GOLD} radius={[4, 4, 0, 0]}>
                    {franchisePerformanceData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: BROWN }}>Corporate Expense Breakdown</h3>
            {expenseBreakdownData.length === 0 ? (
              <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#a07040", fontSize: 13 }}>
                No expense transactions in the selected period
              </div>
            ) : <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ height: 250, width: 250, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseBreakdownData.map((_entry: { name: string; value: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {expenseBreakdownData.map((e: { name: string; value: number }, index: number) => (
                  <div key={e.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: BROWN }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS[index % COLORS.length] }} />
                      <span>{e.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, marginLeft: "auto" }}>₹{e.value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>}
          </div>

          {/* Commission Ledger settlements summary */}
          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: BROWN }}>Franchise Commission Settlements</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${BORDER}`, paddingBottom: 8 }}>
                    <th style={{ padding: "8px 4px", color: "#a07040" }}>Branch</th>
                    <th style={{ padding: "8px 4px", color: "#a07040" }}>Rate</th>
                    <th style={{ padding: "8px 4px", color: "#a07040" }}>Total Sales</th>
                    <th style={{ padding: "8px 4px", color: "#a07040" }}>Calculated Commission</th>
                    <th style={{ padding: "8px 4px", color: "#a07040" }}>Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {franchisePerformanceData.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                      <td style={{ padding: "10px 4px", fontWeight: 700, color: BROWN }}>{row.name} ({row.code})</td>
                      <td style={{ padding: "10px 4px", color: BROWN }}>{row.commissionRate}%</td>
                      <td style={{ padding: "10px 4px", color: BROWN }}>₹{Number(row.revenue).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 4px", color: BROWN, fontWeight: 600 }}>₹{Math.round(Number(row.commission)).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 4px" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                          background: "#fef3c7", color: "#b45309"
                        }}>CALCULATED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .charts-responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}
