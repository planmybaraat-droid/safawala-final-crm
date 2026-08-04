"use client"

import { useState, useEffect, useCallback } from "react"
import { PortalPageHeader, PortalSectionLabel, PortalEmptyState, PortalSkeleton } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#6366f1"
const COLOR_DARK = "#4f46e5"

const DEPT_COLORS: Record<string, string> = {
  booking: "#22c55e", warehouse: "#a855f7", qc: "#eab308",
  delivery: "#14b8a6", styling: "#ec4899", accounts: "#ef4444",
  hr: "#6366f1", manager: "#3b82f6",
}

function fmt(n: number) { return `₹${(n || 0).toLocaleString("en-IN")}` }

export default function HrPayrollPage() {
  const today = new Date()
  const defaultMonth = today.toISOString().slice(0, 7)
  const [month, setMonth] = useState(defaultMonth)
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<any[]>([])
  const [payroll, setPayroll] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [toast, setToast] = useState("")

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [staffRes, payrollRes] = await Promise.allSettled([
        fetch("/api/users?limit=200").then(r => r.json()),
        fetch(`/api/payroll/calculate?month=${month}`).then(r => r.json()),
      ])
      const staffData = staffRes.status === "fulfilled" ? (staffRes.value.data ?? []) : []
      const payrollData = payrollRes.status === "fulfilled"
        ? (payrollRes.value.employees ?? payrollRes.value.data ?? [])
        : []

      setStaff(staffData)
      setPayroll(payrollData)
    } catch {}
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  // Merge payroll data with staff data
  const merged = staff.map(s => {
    const p = payroll.find((p: any) => p.user_id === s.id || p.id === s.id)
    return {
      ...s,
      base_salary: p?.base_salary ?? p?.baseSalary ?? 0,
      gross: p?.gross ?? p?.gross_salary ?? 0,
      deductions: p?.deductions ?? p?.total_deductions ?? 0,
      net: p?.net ?? p?.net_salary ?? 0,
      overtime_hours: p?.overtime_hours ?? 0,
      overtime_pay: p?.overtime_pay ?? 0,
      commission: p?.commission ?? 0,
      trip_allowance: p?.trip_allowance ?? 0,
      advance_deduction: p?.advance_deduction ?? 0,
      status: p?.status ?? "pending",
    }
  })

  const totalNet = merged.reduce((s, m) => s + (m.net || m.base_salary || 0), 0)
  const totalPending = merged.filter(m => m.status === "pending").length
  const deptBreakdown = Object.entries(DEPT_COLORS).map(([dept]) => {
    const deptStaff = merged.filter(m => m.department === dept)
    return { dept, count: deptStaff.length, total: deptStaff.reduce((s, m) => s + (m.net || m.base_salary || 0), 0) }
  }).filter(d => d.count > 0)

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  function generatePayslip(s: any) {
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Payslip - ${s.name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #1e1208; }
  .header { background: ${COLOR}; color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 4px; font-size: 20px; } .header p { margin: 0; opacity: 0.8; font-size: 13px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .row.total { font-weight: 900; font-size: 16px; border-top: 2px solid ${COLOR}; border-bottom: none; color: ${COLOR}; padding-top: 16px; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 20px 0 8px; }
  .green { color: #16a34a; } .red { color: #dc2626; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>Salary Payslip</h1>
  <p>${s.name} · ${s.department?.toUpperCase() ?? ""} · ${monthLabel}</p>
</div>
<div class="section-title">Earnings</div>
<div class="row"><span>Basic Salary</span><span class="green">${fmt(s.base_salary)}</span></div>
${s.overtime_pay ? `<div class="row"><span>Overtime Pay (${s.overtime_hours}h)</span><span class="green">${fmt(s.overtime_pay)}</span></div>` : ""}
${s.commission ? `<div class="row"><span>Commission</span><span class="green">${fmt(s.commission)}</span></div>` : ""}
${s.trip_allowance ? `<div class="row"><span>Trip Allowance</span><span class="green">${fmt(s.trip_allowance)}</span></div>` : ""}
<div class="section-title">Deductions</div>
${s.advance_deduction ? `<div class="row"><span>Advance Recovery</span><span class="red">- ${fmt(s.advance_deduction)}</span></div>` : ""}
${(s.deductions - (s.advance_deduction || 0)) > 0 ? `<div class="row"><span>PF / ESI / Tax</span><span class="red">- ${fmt(s.deductions - (s.advance_deduction || 0))}</span></div>` : ""}
<div class="row total"><span>NET SALARY</span><span>${fmt(s.net || s.base_salary)}</span></div>
<p style="margin-top:40px;font-size:11px;color:#94a3b8;text-align:center;">Generated by Safawala HR · ${new Date().toLocaleDateString("en-IN")}</p>
<button class="no-print" onclick="window.print()" style="display:block;margin:20px auto;padding:12px 32px;background:${COLOR};color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Print / Download PDF</button>
</body></html>`
    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close() }
  }

  function whatsappPayslip(s: any) {
    const net = fmt(s.net || s.base_salary)
    const msg = `*Salary Payslip — ${monthLabel}*\n\nDear ${s.name},\n\nYour salary for ${monthLabel} has been processed.\n\n*Net Salary: ${net}*\n\nBasic: ${fmt(s.base_salary)}\n${s.commission ? `Commission: ${fmt(s.commission)}\n` : ""}${s.trip_allowance ? `Trip Allowance: ${fmt(s.trip_allowance)}\n` : ""}${s.deductions ? `Deductions: -${fmt(s.deductions)}\n` : ""}\nThank you,\nSafawala HR`
    const phone = s.phone?.replace(/\D/g, "")
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank")
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: COLOR_DARK, color: "white", borderRadius: 12, padding: "8px 20px", fontSize: 12, fontWeight: 700, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <PortalPageHeader title="Payroll" subtitle={monthLabel} color={COLOR} backHref="/portal/hr" />

      {/* Month picker */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ flex: 1, height: 44, borderRadius: 14, border: "1.5px solid rgba(99,102,241,0.2)", background: "rgba(255,255,255,0.8)", padding: "0 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: "#1e1208", outline: "none" }} />
        <button onClick={load} style={{ height: 44, padding: "0 20px", borderRadius: 14, border: "none", background: COLOR, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Load
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 16px 0" }}>
        {[
          { label: "Total Payroll", value: loading ? "…" : fmt(totalNet), color: COLOR },
          { label: "Staff Count", value: loading ? "…" : staff.length, color: "#16a34a" },
          { label: "Pending", value: loading ? "…" : totalPending, color: "#dc2626" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "12px 8px", textAlign: "center" }}>
            <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(80,55,30,0.4)", lineHeight: 1.3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Dept breakdown */}
      {!loading && deptBreakdown.length > 0 && (
        <>
          <PortalSectionLabel label="By Department" />
          <div style={{ padding: "0 16px", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {deptBreakdown.map(d => (
              <div key={d.dept} style={{ background: "white", border: `2px solid ${DEPT_COLORS[d.dept] ?? COLOR}20`, borderRadius: 14, padding: "10px 14px", flexShrink: 0, textAlign: "center" }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 900, color: DEPT_COLORS[d.dept] ?? COLOR }}>{fmt(d.total)}</p>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: "capitalize", color: "rgba(80,55,30,0.45)" }}>{d.dept} ({d.count})</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Staff salary list */}
      <PortalSectionLabel label={`Staff Payslips (${merged.length})`} />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ background: "rgba(255,255,255,0.65)", borderRadius: 16, padding: 16 }}><PortalSkeleton rows={5} /></div>
        ) : merged.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16 }}>
            <PortalEmptyState icon="rupee" title="No staff found" subtitle="Add staff to manage payroll" color={COLOR} />
          </div>
        ) : (
          merged.map(s => {
            const net = s.net || s.base_salary
            const deptColor = DEPT_COLORS[s.department] ?? COLOR
            return (
              <div key={s.id} style={{ background: "white", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 18, overflow: "hidden" }}>
                <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setSelected(selected?.id === s.id ? null : s)}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${deptColor}20`, display: "flex", alignItems: "center", justifyContent: "center", color: deptColor, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {(s.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e1208" }}>{s.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 600, textTransform: "uppercase" }}>{s.department}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: COLOR }}>{fmt(net)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: s.status === "disbursed" ? "#16a34a" : "#dc2626" }}>{s.status}</p>
                  </div>
                </div>
                {selected?.id === s.id && (
                  <div style={{ borderTop: "1px solid #f1f5f9", padding: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                      {[
                        { label: "Basic Salary", value: fmt(s.base_salary), color: "#16a34a" },
                        { label: "Overtime", value: fmt(s.overtime_pay), color: "#16a34a" },
                        { label: "Commission", value: fmt(s.commission), color: "#16a34a" },
                        { label: "Trip Allowance", value: fmt(s.trip_allowance), color: "#16a34a" },
                        { label: "Deductions", value: `- ${fmt(s.deductions)}`, color: "#dc2626" },
                        { label: "Advance Recovery", value: `- ${fmt(s.advance_deduction)}`, color: "#dc2626" },
                      ].map(row => (
                        <div key={row.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 10px" }}>
                          <p style={{ margin: "0 0 2px", fontSize: 9, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{row.label}</p>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: row.color }}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => generatePayslip(s)}
                        style={{ flex: 1, height: 38, borderRadius: 12, border: "none", background: COLOR, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <PortalIcon name="printer" size={14} /> Payslip PDF
                      </button>
                      <button onClick={() => whatsappPayslip(s)}
                        style={{ flex: 1, height: 38, borderRadius: 12, border: "none", background: "#25d366", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <PortalIcon name="whatsapp" size={14} /> WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
