"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DollarSign,
  Users,
  Calendar,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Calculator,
  Info,
  Clock,
  Minus,
  CreditCard,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PayrollStats {
  total_employees: number
  total_payroll: number
  pending_payments: number
  processed_this_month: number
}

interface PayrollRecord {
  id: string
  user_id: string
  employee_name: string
  employee_id: string
  position: string
  basic_salary: number
  hra: number
  transport_allowance: number
  medical_allowance: number
  other_allowances: number
  overtime_amount: number
  bonus: number
  pf_deduction: number
  esi_deduction: number
  tax_deduction: number
  loan_deduction: number
  other_deductions: number
  gross_salary: number
  total_deductions: number
  net_salary: number
  status: string
  payroll_month: string
  working_days: number
  present_days: number
  absent_days: number
  leave_days: number
  overtime_hours: number
}

interface PayrollAdjustment {
  employee_id: string
  employee_name: string
  type: "extra_salary" | "overtime" | "salary_cut" | "advance"
  amount: number
  hours?: number
  reason: string
  date: string
}

export default function PayrollPage() {
  const [stats, setStats] = useState<PayrollStats>({
    total_employees: 0,
    total_payroll: 0,
    pending_payments: 0,
    processed_this_month: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [filteredRecords, setFilteredRecords] = useState<PayrollRecord[]>([])
  const [allRecords, setAllRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const [selectedEmployee, setSelectedEmployee] = useState<PayrollRecord | null>(null)
  const [extraSalaryDialog, setExtraSalaryDialog] = useState(false)
  const [overtimeDialog, setOvertimeDialog] = useState(false)
  const [salaryCutDialog, setSalaryCutDialog] = useState(false)
  const [advanceSalaryDialog, setAdvanceSalaryDialog] = useState(false)

  const [adjustmentForm, setAdjustmentForm] = useState({
    amount: "",
    hours: "",
    reason: "",
    type: "" as "extra_salary" | "overtime" | "salary_cut" | "advance",
  })

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [viewPayslipDialog, setViewPayslipDialog] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null)

  const [editPayrollDialog, setEditPayrollDialog] = useState(false)
  const [selectedEditRecord, setSelectedEditRecord] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    basic_salary: 0,
    hra: 0,
    transport_allowance: 0,
    medical_allowance: 0,
    overtime_amount: 0,
    bonus: 0,
    other_allowances: 0,
    pf_deduction: 0,
    esi_deduction: 0,
    tax_deduction: 0,
    loan_deduction: 0,
    other_deductions: 0,
    working_days: 30,
    present_days: 30,
    overtime_hours: 0,
  })

  const loadPayrollData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading payroll data...")

      const user = await getCurrentUser()
      setCurrentUser(user)
      console.log("[v0] Current user:", user?.name, "role:", user?.role, "franchise:", user?.franchise_id)

      // Determine franchise filter
      const franchiseFilter = user?.role === "super_admin" ? null : user?.franchise_id

      let employeeQuery = supabase.from("employee_profiles").select(`
          id,
          user_id,
          employee_id,
          department,
          designation,
          basic_salary,
          hra,
          transport_allowance,
          medical_allowance,
          other_allowances,
          pf_deduction,
          esi_deduction,
          tax_deduction,
          other_deductions,
          users!user_id(name, email, franchise_id)
        `)

      if (franchiseFilter) {
        // Filter by franchise through the users table
        employeeQuery = employeeQuery.eq("users.franchise_id", franchiseFilter)
      }

      const { data: employeesData, error: employeeError } = await employeeQuery

      if (employeeError) {
        console.error("[v0] Error fetching from employee_profiles:", employeeError)
      }

      console.log("[v0] Employee profiles loaded:", employeesData?.length || 0)

      let employees: any[] = []

      if (!employeesData || employeesData.length === 0) {
        console.log("[v0] No employee profiles found, fetching from users table...")

        let usersQuery = supabase
          .from("users")
          .select(`
          id,
          name,
          email,
          phone,
          role,
          franchise_id
        `)
          .neq("role", "super_admin") // Exclude super admin from payroll

        if (franchiseFilter) {
          usersQuery = usersQuery.eq("franchise_id", franchiseFilter)
        }

        const { data: usersData, error: usersError } = await usersQuery

        if (usersError) {
          console.error("[v0] Error fetching users:", usersError)
          toast.error("Failed to load employee data")
          return
        }

        console.log("[v0] Users loaded as employees:", usersData?.length || 0)

        // Transform users to employee format
  employees = (usersData || []).map((user: any) => ({
          id: user.id,
          user_id: user.id,
          employee_id: user.id.slice(0, 8), // Use first 8 chars of UUID as employee ID
          department: "General",
          designation: user.role === "franchise_admin" ? "Manager" : "Staff",
          basic_salary: user.role === "franchise_admin" ? 50000 : 25000, // Default salaries
          hra: user.role === "franchise_admin" ? 15000 : 7500,
          transport_allowance: 3000,
          medical_allowance: 2000,
          other_allowances: 1000,
          pf_deduction: user.role === "franchise_admin" ? 6000 : 3000,
          esi_deduction: 500,
          tax_deduction: user.role === "franchise_admin" ? 5000 : 2000,
          other_deductions: 0,
          users: {
            name: user.name,
            email: user.email,
            franchise_id: user.franchise_id,
          },
        }))
      } else {
        employees = employeesData
      }

      console.log("[v0] Final employees loaded:", employees?.length || 0)

      const attendanceMonth = selectedMonth + "-01"
      let attendanceQuery = supabase
        .from("attendance_records")
        .select(`
        id,
        user_id,
        date,
        check_in_time,
        check_out_time,
        total_hours,
        overtime_hours,
        status,
        users!user_id(name, email, franchise_id)
      `)
        .gte("date", attendanceMonth)
        .lt(
          "date",
          new Date(new Date(attendanceMonth).getFullYear(), new Date(attendanceMonth).getMonth() + 1, 1)
            .toISOString()
            .slice(0, 10),
        )

      if (franchiseFilter) {
        attendanceQuery = attendanceQuery.eq("franchise_id", franchiseFilter)
      }

      const { data: attendanceRecords, error: attendanceError } = await attendanceQuery
      if (attendanceError) {
        console.error("[v0] Error fetching attendance:", attendanceError)
      } else {
        setAttendanceData(attendanceRecords || [])
        console.log("[v0] Attendance records loaded:", attendanceRecords?.length || 0)
      }

      const payrollMonth = selectedMonth + "-01"

      let payrollQuery = supabase
        .from("payroll_records")
        .select(`
        id,
        user_id,
        payroll_month,
        basic_salary,
        hra,
        transport_allowance,
        medical_allowance,
        overtime_amount,
        bonus,
        other_allowances,
        gross_salary,
        pf_deduction,
        esi_deduction,
        tax_deduction,
        loan_deduction,
        other_deductions,
        total_deductions,
        net_salary,
        working_days,
        present_days,
        absent_days,
        leave_days,
        overtime_hours,
        status,
        payment_date,
        users!user_id(name, email, franchise_id)
      `)
        .eq("payroll_month", payrollMonth)

      if (franchiseFilter) {
        payrollQuery = payrollQuery.eq("franchise_id", franchiseFilter)
      }

      const { data: payrollRecords, error: payrollError } = await payrollQuery

      if (payrollError) {
        console.error("[v0] Error fetching payroll records:", payrollError)
        // Don't return here, continue with employee data
      }

      console.log("[v0] Payroll records loaded:", payrollRecords?.length || 0)

      // Transform data for display
      const transformedRecords: PayrollRecord[] = employees.map((emp: any) => {
        const payrollRecord = payrollRecords?.find((pr: any) => pr.user_id === emp.user_id)
        
        const basic_salary = payrollRecord ? payrollRecord.basic_salary : (emp.basic_salary || 0)
        const hra = payrollRecord ? payrollRecord.hra : (emp.hra || 0)
        const transport_allowance = payrollRecord ? payrollRecord.transport_allowance : (emp.transport_allowance || 0)
        const medical_allowance = payrollRecord ? payrollRecord.medical_allowance : (emp.medical_allowance || 0)
        const other_allowances = payrollRecord ? payrollRecord.other_allowances : (emp.other_allowances || 0)
        const overtime_amount = payrollRecord ? payrollRecord.overtime_amount : 0
        const bonus = payrollRecord ? payrollRecord.bonus : 0
        
        const pf_deduction = payrollRecord ? payrollRecord.pf_deduction : (emp.pf_deduction || 0)
        const esi_deduction = payrollRecord ? payrollRecord.esi_deduction : (emp.esi_deduction || 0)
        const tax_deduction = payrollRecord ? payrollRecord.tax_deduction : (emp.tax_deduction || 0)
        const loan_deduction = payrollRecord ? payrollRecord.loan_deduction : 0
        const other_deductions = payrollRecord ? payrollRecord.other_deductions : (emp.other_deductions || 0)
        
        const gross_salary = payrollRecord 
          ? payrollRecord.gross_salary 
          : (basic_salary + hra + transport_allowance + medical_allowance + other_allowances + overtime_amount + bonus)
          
        const total_deductions = payrollRecord 
          ? payrollRecord.total_deductions 
          : (pf_deduction + esi_deduction + tax_deduction + loan_deduction + other_deductions)
          
        const net_salary = payrollRecord ? payrollRecord.net_salary : (gross_salary - total_deductions)

        const currentMonth = selectedMonth + "-01"

        return {
          id: payrollRecord?.id || emp.id,
          user_id: emp.user_id,
          employee_name: emp.users?.name || "Unknown",
          employee_id: emp.employee_id || "N/A",
          position: emp.designation || emp.department || "N/A",
          basic_salary,
          hra,
          transport_allowance,
          medical_allowance,
          other_allowances,
          overtime_amount,
          bonus,
          pf_deduction,
          esi_deduction,
          tax_deduction,
          loan_deduction,
          other_deductions,
          gross_salary,
          total_deductions,
          net_salary,
          status: payrollRecord?.status || "pending",
          payroll_month: currentMonth,
          working_days: payrollRecord?.working_days || 30,
          present_days: payrollRecord?.present_days || 30,
          absent_days: payrollRecord?.absent_days || 0,
          leave_days: payrollRecord?.leave_days || 0,
          overtime_hours: payrollRecord?.overtime_hours || 0,
        }
      })

      setAllRecords(transformedRecords)
      setFilteredRecords(transformedRecords)

      // Calculate stats
      const totalEmployees = transformedRecords.length
      const totalPayroll = transformedRecords.reduce((sum, record) => sum + record.net_salary, 0)
      const pendingPayments = transformedRecords.filter((r) => r.status === "pending" || r.status === "draft").length
      const processedThisMonth = transformedRecords.filter(
        (r) => r.status === "processed" || r.status === "paid",
      ).length

      setStats({
        total_employees: totalEmployees,
        total_payroll: totalPayroll,
        pending_payments: pendingPayments,
        processed_this_month: processedThisMonth,
      })

      console.log("[v0] Payroll stats calculated:", {
        totalEmployees,
        totalPayroll,
        pendingPayments,
        processedThisMonth,
      })
    } catch (error) {
      console.error("[v0] Error loading payroll data:", error)
      toast.error("Failed to load payroll data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!allRecords.length) return

    let filtered = allRecords

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.position.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((record) => record.status.toLowerCase() === selectedStatus.toLowerCase())
    }

    setFilteredRecords(filtered)
  }, [searchTerm, selectedStatus, allRecords])

  const handleExportPayroll = async (format: 'csv' | 'pdf' = 'csv') => {
    if (filteredRecords.length === 0) {
      toast.error('No payroll data to export')
      return
    }
    if (format === 'csv') {
      const csvContent = [
        ['Employee Name','Employee ID','Position','Basic Salary','Allowances','Deductions','Net Salary','Status'],
        ...filteredRecords.map(record => {
          const totalAllowances = (record.hra || 0) + (record.transport_allowance || 0) + (record.medical_allowance || 0) + (record.other_allowances || 0) + (record.overtime_amount || 0) + (record.bonus || 0)
          const totalDeductions = (record.pf_deduction || 0) + (record.esi_deduction || 0) + (record.tax_deduction || 0) + (record.loan_deduction || 0) + (record.other_deductions || 0)
          return [
            record.employee_name,
            record.employee_id,
            record.position,
            record.basic_salary,
            totalAllowances,
            totalDeductions,
            record.net_salary,
            record.status
          ]
        })
      ].map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${new Date().toISOString().slice(0,7)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Payroll CSV exported')
    } else {
      // Fetch company settings for branding
      let companyName = 'Company'
      let companyPhone = ''
      let companyEmail = ''
      let logoUrl: string | null = null
      try {
        const res = await fetch('/api/company-settings')
        if (res.ok) {
          const json = await res.json()
          companyName = json?.company_name || companyName
          companyPhone = json?.phone || ''
          companyEmail = json?.email || ''
          logoUrl = json?.logo_url || null
        }
      } catch (e) { /* non-blocking */ }

      const doc = new jsPDF({ orientation: 'landscape' })
      // Optionally add logo if accessible (will require CORS or same-origin)
      if (logoUrl) {
        try {
          const imgResp = await fetch(logoUrl)
          const blob = await imgResp.blob()
          const reader = new FileReader()
          const dataUrl: string = await new Promise((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob) })
          doc.addImage(dataUrl, 'PNG', 14, 8, 22, 22)
        } catch { /* ignore logo errors */ }
      }
      doc.setFontSize(18)
      doc.text(`${companyName} - Payroll Summary`, logoUrl ? 40 : 14, 16)
      doc.setFontSize(10)
      doc.text(`Month: ${new Date().toISOString().slice(0,7)}`, logoUrl ? 40 : 14, 22)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true })}`, logoUrl ? 40 : 14, 28)
      if (companyPhone || companyEmail) {
        doc.text(`Contact: ${[companyPhone, companyEmail].filter(Boolean).join(' | ')}`, logoUrl ? 40 : 14, 34)
      }
      autoTable(doc, {
        startY: companyPhone || companyEmail ? 40 : 36,
        head: [['Employee','ID','Position','Basic','Allowances','Deductions','Net','Status']],
        body: filteredRecords.map(r => {
          const totalAllowances = (r.hra || 0) + (r.transport_allowance || 0) + (r.medical_allowance || 0) + (r.other_allowances || 0) + (r.overtime_amount || 0) + (r.bonus || 0)
          const totalDeductions = (r.pf_deduction || 0) + (r.esi_deduction || 0) + (r.tax_deduction || 0) + (r.loan_deduction || 0) + (r.other_deductions || 0)
          return [
            r.employee_name,
            r.employee_id,
            r.position,
            r.basic_salary,
            totalAllowances,
            totalDeductions,
            r.net_salary,
            r.status
          ]
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 60, 44] },
        alternateRowStyles: { fillColor: [250, 249, 246] },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.text(`Page ${data.pageNumber} / ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 5)
          // Signature placeholder
          const sigY = doc.internal.pageSize.height - 20
          doc.text('Authorised Signature: ________________________', data.settings.margin.left + 90, sigY)
        }
      })
      doc.save(`payroll-${new Date().toISOString().slice(0,7)}.pdf`)
      toast.success('Payroll PDF exported')
    }
  }

  const [processing, setProcessing] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
      case "draft":
        return "bg-amber-50 text-amber-800 border-amber-200"
      case "processed":
        return "bg-emerald-50 text-emerald-800 border-emerald-200"
      case "paid":
        return "bg-blue-50 text-blue-800 border-blue-200"
      default:
        return "bg-stone-50 text-stone-600 border-stone-200"
    }
  }

  const getOrCreatePayrollRecord = async (user_id: string) => {
    const payrollMonth = selectedMonth + "-01"
    const { data: existing } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("user_id", user_id)
      .eq("payroll_month", payrollMonth)
      .maybeSingle()

    if (existing) return existing

    const empRecord = allRecords.find(r => r.user_id === user_id)
    if (!empRecord) throw new Error("Employee not found")

    const user = await getCurrentUser()
    let franchiseId = user?.franchise_id
    if (!franchiseId) {
      const { data: userData } = await supabase.from("users").select("franchise_id").eq("id", user_id).single()
      franchiseId = userData?.franchise_id
      if (!franchiseId) {
        const { data: defaultFranchise } = await supabase.from("franchises").select("id").limit(1).single()
        franchiseId = defaultFranchise?.id
      }
    }

    if (!franchiseId) throw new Error("No franchise assigned to employee")

    const defaultData = {
      user_id,
      franchise_id: franchiseId,
      payroll_month: payrollMonth,
      basic_salary: empRecord.basic_salary,
      hra: empRecord.hra,
      transport_allowance: empRecord.transport_allowance,
      medical_allowance: empRecord.medical_allowance,
      other_allowances: empRecord.other_allowances,
      overtime_amount: empRecord.overtime_amount || 0,
      bonus: empRecord.bonus || 0,
      gross_salary: empRecord.gross_salary,
      pf_deduction: empRecord.pf_deduction,
      esi_deduction: empRecord.esi_deduction,
      tax_deduction: empRecord.tax_deduction,
      loan_deduction: empRecord.loan_deduction || 0,
      other_deductions: empRecord.other_deductions,
      total_deductions: empRecord.total_deductions,
      net_salary: empRecord.net_salary,
      working_days: empRecord.working_days,
      present_days: empRecord.present_days,
      absent_days: empRecord.absent_days || 0,
      leave_days: empRecord.leave_days || 0,
      overtime_hours: empRecord.overtime_hours || 0,
      status: "draft",
      payment_date: null,
      payment_method: "bank_transfer",
      generated_by: user?.id,
      processed_by: user?.id,
    }

    const { data: inserted, error } = await supabase
      .from("payroll_records")
      .insert([defaultData])
      .select()
      .single()

    if (error) throw error
    return inserted
  }

  const handleProcessSinglePayroll = async (record: PayrollRecord) => {
    try {
      setProcessing(true)
      console.log("[v0] Processing payroll for single employee:", record.employee_name)

      const user = await getCurrentUser()
      if (!user) {
        toast.error("User not authenticated")
        return
      }

      const payrollMonth = selectedMonth + "-01"

      // Get attendance data for this employee
      const employeeAttendance = attendanceData.filter((att) => att.user_id === record.user_id)
      const presentDays = employeeAttendance.filter((att) => att.status === "present").length
      const totalWorkingDays = new Date(
        new Date(payrollMonth).getFullYear(),
        new Date(payrollMonth).getMonth() + 1,
        0,
      ).getDate()
      const absentDays = totalWorkingDays - presentDays
      const totalOvertimeHours = employeeAttendance.reduce((sum, att) => sum + (att.overtime_hours || 0), 0)

      // Calculate base values
      const dailySalary = record.basic_salary / totalWorkingDays
      const attendanceBasedSalary = dailySalary * presentDays
      const overtimeRate = record.basic_salary / (totalWorkingDays * 8)
      const overtimeAmount = totalOvertimeHours * overtimeRate * 1.5

      const grossSalary =
        attendanceBasedSalary +
        record.hra +
        record.transport_allowance +
        record.medical_allowance +
        overtimeAmount +
        (record.bonus || 0) +
        record.other_allowances

      const totalDeductions =
        record.pf_deduction +
        record.esi_deduction +
        record.tax_deduction +
        (record.loan_deduction || 0) +
        record.other_deductions

      const netSalary = grossSalary - totalDeductions

      // Check if a record already exists in database
      const { data: existingRecord } = await supabase
        .from("payroll_records")
        .select("id, franchise_id")
        .eq("user_id", record.user_id)
        .eq("payroll_month", payrollMonth)
        .maybeSingle()

      let franchiseId = user.franchise_id
      if (!franchiseId) {
        franchiseId = existingRecord?.franchise_id
        if (!franchiseId) {
          const { data: userData } = await supabase
            .from("users")
            .select("franchise_id")
            .eq("id", record.user_id)
            .single()
          franchiseId = userData?.franchise_id
        }
        if (!franchiseId) {
          const { data: defaultFranchise } = await supabase.from("franchises").select("id").limit(1).single()
          franchiseId = defaultFranchise?.id
        }
      }

      if (!franchiseId) {
        toast.error(`Cannot process payroll: No franchise assigned for ${record.employee_name}`)
        return
      }

      const payrollData = {
        user_id: record.user_id,
        franchise_id: franchiseId,
        payroll_month: payrollMonth,
        basic_salary: attendanceBasedSalary,
        hra: record.hra,
        transport_allowance: record.transport_allowance,
        medical_allowance: record.medical_allowance,
        overtime_amount: overtimeAmount,
        bonus: record.bonus || 0,
        other_allowances: record.other_allowances,
        gross_salary: grossSalary,
        pf_deduction: record.pf_deduction,
        esi_deduction: record.esi_deduction,
        tax_deduction: record.tax_deduction,
        loan_deduction: record.loan_deduction || 0,
        other_deductions: record.other_deductions,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        working_days: totalWorkingDays,
        present_days: presentDays,
        absent_days: absentDays,
        leave_days: 0,
        overtime_hours: totalOvertimeHours,
        status: "processed",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "bank_transfer",
        generated_by: user.id,
        processed_by: user.id,
      }

      let error
      if (existingRecord?.id) {
        const result = await supabase
          .from("payroll_records")
          .update(payrollData)
          .eq("id", existingRecord.id)
        error = result.error
      } else {
        const result = await supabase.from("payroll_records").insert([payrollData])
        error = result.error
      }

      if (error) throw error
      toast.success(`Payroll processed for ${record.employee_name}`)
      await loadPayrollData()
    } catch (e: any) {
      console.error("[v0] Error processing single payroll:", e)
      toast.error(e.message || "Failed to process payroll")
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkPaid = async (record: PayrollRecord) => {
    try {
      const { error } = await supabase
        .from("payroll_records")
        .update({
          status: "paid",
          payment_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id)

      if (error) throw error
      toast.success(`Payroll marked as PAID for ${record.employee_name}`)
      await loadPayrollData()
    } catch (e: any) {
      console.error("[v0] Error marking paid:", e)
      toast.error(e.message || "Failed to mark paid")
    }
  }

  const handleViewPayslip = (record: any) => {
    setSelectedPayslip(record)
    setViewPayslipDialog(true)
  }

  const handleEditPayroll = async (record: any) => {
    try {
      console.log("[v0] Opening edit dialog for:", record.employee_name)
      const dbRecord = await getOrCreatePayrollRecord(record.user_id)
      setSelectedEditRecord({ ...record, id: dbRecord.id })
      setEditFormData({
        basic_salary: dbRecord.basic_salary || 0,
        hra: dbRecord.hra || 0,
        transport_allowance: dbRecord.transport_allowance || 0,
        medical_allowance: dbRecord.medical_allowance || 0,
        overtime_amount: dbRecord.overtime_amount || 0,
        bonus: dbRecord.bonus || 0,
        other_allowances: dbRecord.other_allowances || 0,
        pf_deduction: dbRecord.pf_deduction || 0,
        esi_deduction: dbRecord.esi_deduction || 0,
        tax_deduction: dbRecord.tax_deduction || 0,
        loan_deduction: dbRecord.loan_deduction || 0,
        other_deductions: dbRecord.other_deductions || 0,
        working_days: dbRecord.working_days || 30,
        present_days: dbRecord.present_days || 30,
        overtime_hours: dbRecord.overtime_hours || 0,
      })
      setEditPayrollDialog(true)
    } catch (e: any) {
      toast.error(e.message || "Failed to initialize edit dialog")
    }
  }

  const handleEditSubmit = async () => {
    if (!selectedEditRecord) return

    try {
      console.log("[v0] Updating payroll for:", selectedEditRecord.employee_name)

      const grossSalary =
        editFormData.basic_salary +
        editFormData.hra +
        editFormData.transport_allowance +
        editFormData.medical_allowance +
        editFormData.overtime_amount +
        editFormData.bonus +
        editFormData.other_allowances

      const totalDeductions =
        editFormData.pf_deduction +
        editFormData.esi_deduction +
        editFormData.tax_deduction +
        editFormData.loan_deduction +
        editFormData.other_deductions

      const netSalary = grossSalary - totalDeductions

      const updateData = {
        ...editFormData,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("payroll_records").update(updateData).eq("id", selectedEditRecord.id)

      if (error) {
        console.error("[v0] Error updating payroll:", error)
        toast.error("Failed to update payroll record")
        return
      }

      toast.success(`Payroll updated successfully for ${selectedEditRecord.employee_name}`)
      setEditPayrollDialog(false)
      setSelectedEditRecord(null)
      loadPayrollData()
    } catch (error) {
      console.error("[v0] Error updating payroll:", error)
      toast.error("Failed to update payroll record")
    }
  }

  useEffect(() => {
    loadPayrollData()
  }, [selectedMonth])

  const handlePayrollAdjustment = async (type: "extra_salary" | "overtime" | "salary_cut" | "advance") => {
    if (!selectedEmployee) return

    try {
      const amount = Number.parseFloat(adjustmentForm.amount)
      const hours = adjustmentForm.hours ? Number.parseFloat(adjustmentForm.hours) : 0

      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount")
        return
      }

      if (type === "overtime" && (isNaN(hours) || hours <= 0)) {
        toast.error("Please enter valid overtime hours")
        return
      }

      if (!adjustmentForm.reason.trim()) {
        toast.error("Please provide a reason for this adjustment")
        return
      }

      const dbRecord = await getOrCreatePayrollRecord(selectedEmployee.user_id)

      let finalAmount = amount
      if (type === "overtime") {
        const overtimeRate = dbRecord.basic_salary / (30 * 8)
        finalAmount = hours * overtimeRate * 1.5
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      switch (type) {
        case "extra_salary":
          updateData.bonus = (dbRecord.bonus || 0) + finalAmount
          break
        case "overtime":
          updateData.overtime_hours = (dbRecord.overtime_hours || 0) + hours
          updateData.overtime_amount = (dbRecord.overtime_amount || 0) + finalAmount
          break
        case "salary_cut":
          updateData.other_deductions = (dbRecord.other_deductions || 0) + finalAmount
          break
        case "advance":
          updateData.loan_deduction = (dbRecord.loan_deduction || 0) + finalAmount
          break
      }

      const basic_salary = dbRecord.basic_salary
      const hra = dbRecord.hra
      const transport_allowance = dbRecord.transport_allowance
      const medical_allowance = dbRecord.medical_allowance
      const other_allowances = dbRecord.other_allowances
      
      const newBonus = updateData.bonus !== undefined ? updateData.bonus : (dbRecord.bonus || 0)
      const newOvertimeAmount = updateData.overtime_amount !== undefined ? updateData.overtime_amount : (dbRecord.overtime_amount || 0)
      
      const newPF = dbRecord.pf_deduction
      const newESI = dbRecord.esi_deduction
      const newTax = dbRecord.tax_deduction
      const newLoan = updateData.loan_deduction !== undefined ? updateData.loan_deduction : (dbRecord.loan_deduction || 0)
      const newOtherDeductions = updateData.other_deductions !== undefined ? updateData.other_deductions : (dbRecord.other_deductions || 0)

      const grossSalary = basic_salary + hra + transport_allowance + medical_allowance + other_allowances + newOvertimeAmount + newBonus
      const totalDeductions = newPF + newESI + newTax + newLoan + newOtherDeductions
      const netSalary = grossSalary - totalDeductions

      updateData.gross_salary = grossSalary
      updateData.total_deductions = totalDeductions
      updateData.net_salary = netSalary

      const { error } = await supabase
        .from("payroll_records")
        .update(updateData)
        .eq("id", dbRecord.id)

      if (error) {
        console.error("[v0] Error updating payroll adjustment:", error)
        toast.error("Failed to update payroll")
        return
      }

      setAdjustmentForm({ amount: "", hours: "", reason: "", type: "" as any })
      setExtraSalaryDialog(false)
      setOvertimeDialog(false)
      setSalaryCutDialog(false)
      setAdvanceSalaryDialog(false)
      setSelectedEmployee(null)

      toast.success(`${type.replace("_", " ").toUpperCase()} added successfully`)
      loadPayrollData()
    } catch (error: any) {
      console.error("[v0] Error processing adjustment:", error)
      toast.error(error.message || "Failed to process adjustment")
    }
  }

  const openAdjustmentDialog = (
    employee: PayrollRecord,
    type: "extra_salary" | "overtime" | "salary_cut" | "advance",
  ) => {
    setSelectedEmployee(employee)
    setAdjustmentForm({ amount: "", hours: "", reason: "", type })

    switch (type) {
      case "extra_salary":
        setExtraSalaryDialog(true)
        break
      case "overtime":
        setOvertimeDialog(true)
        break
      case "salary_cut":
        setSalaryCutDialog(true)
        break
      case "advance":
        setAdvanceSalaryDialog(true)
        break
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading payroll data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const handleDownloadPayslip = (record: any) => {
    // Create HTML content for the payslip
    const payslipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${record.employee_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #333; }
          .payslip-title { font-size: 18px; margin-top: 5px; }
          .employee-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-section { flex: 1; }
          .info-title { font-weight: bold; color: #555; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info-row { margin: 5px 0; }
          .salary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .salary-table th, .salary-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .salary-table th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .net-salary { font-size: 18px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Safawala CRM</div>
          <div class="payslip-title">Salary Slip</div>
        </div>
        
        <div class="employee-info">
          <div class="info-section">
            <div class="info-title">Employee Information</div>
            <div class="info-row"><strong>Name:</strong> ${record.employee_name}</div>
            <div class="info-row"><strong>Employee ID:</strong> ${record.user_id}</div>
            <div class="info-row"><strong>Month:</strong> ${new Date(record.payroll_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          </div>
          <div class="info-section">
            <div class="info-title">Attendance Details</div>
            <div class="info-row"><strong>Working Days:</strong> ${record.working_days || 30}</div>
            <div class="info-row"><strong>Present Days:</strong> ${record.present_days || 30}</div>
            <div class="info-row"><strong>Overtime Hours:</strong> ${record.overtime_hours || 0}</div>
          </div>
        </div>

        <table class="salary-table">
          <thead>
            <tr>
              <th>Earnings</th>
              <th>Amount (₹)</th>
              <th>Deductions</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td>
              <td>${(record.basic_salary || 0).toLocaleString()}</td>
              <td>PF Deduction</td>
              <td>${(record.pf_deduction || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>HRA</td>
              <td>${(record.hra || 0).toLocaleString()}</td>
              <td>ESI Deduction</td>
              <td>${(record.esi_deduction || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Transport Allowance</td>
              <td>${(record.transport_allowance || 0).toLocaleString()}</td>
              <td>Tax Deduction</td>
              <td>${(record.tax_deduction || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Medical Allowance</td>
              <td>${(record.medical_allowance || 0).toLocaleString()}</td>
              <td>Loan Deduction</td>
              <td>${(record.loan_deduction || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Overtime Amount</td>
              <td>${(record.overtime_amount || 0).toLocaleString()}</td>
              <td>Other Deductions</td>
              <td>${(record.other_deductions || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Bonus</td>
              <td>${(record.bonus || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Other Allowances</td>
              <td>${(record.other_allowances || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td><strong>Gross Salary</strong></td>
              <td><strong>${(record.gross_salary || 0).toLocaleString()}</strong></td>
              <td><strong>Total Deductions</strong></td>
              <td><strong>${(record.total_deductions || 0).toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: center; margin: 20px 0;">
          <div class="net-salary">Net Salary: ₹${(record.net_salary || 0).toLocaleString()}</div>
        </div>

        <div class="footer">
          <p>This is a computer-generated payslip and does not require a signature.</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `

    // Create a new window and print
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(payslipHTML)
      printWindow.document.close()

      // Wait for content to load then trigger print
      printWindow.onload = () => {
        printWindow.print()
        // Close the window after printing (optional)
        setTimeout(() => {
          printWindow.close()
        }, 1000)
      }
    }

    toast.success("Payment slip download initiated!")
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6 bg-[#FAF9F6] p-6 rounded-2xl border border-stone-200">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200/60">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-[#113c2c] font-serif">Payroll</h1>
              <p className="text-xs text-stone-400 mt-1.5 font-sans font-light">Manage employee salaries, allowances, and payment slips</p>
            </div>
            <div className="flex gap-2.5 flex-wrap items-center">
              <Button variant="outline" onClick={() => handleExportPayroll('csv')} className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50/50 hover:border-stone-300 transition-all duration-200 h-9 px-4 text-xs rounded-lg font-medium shadow-sm">
                <Download className="h-3.5 w-3.5 mr-2 text-stone-400" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExportPayroll('pdf')} className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50/50 hover:border-stone-300 transition-all duration-200 h-9 px-4 text-xs rounded-lg font-medium shadow-sm">
                <Download className="h-3.5 w-3.5 mr-2 text-stone-400" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-5 md:grid-cols-4">
            {[
              { title: "Total Employees", value: stats.total_employees, sub: "Active staff", color: "text-stone-850", icon: <Users className="h-4 w-4 text-stone-300 stroke-[1.5]" /> },
              { title: "Total Payroll", value: `₹${stats.total_payroll.toLocaleString()}`, sub: "Salary expenses", color: "text-[#113c2c]", icon: <DollarSign className="h-4 w-4 text-[#113c2c] stroke-[1.5]" /> },
              { title: "Pending Processing", value: stats.pending_payments, sub: "Requires attention", color: "text-amber-600", icon: <Calendar className="h-4 w-4 text-amber-400 stroke-[1.5]" /> },
              { title: "Processed & Paid", value: stats.processed_this_month, sub: "Complete records", color: "text-emerald-700", icon: <Calculator className="h-4 w-4 text-emerald-500 stroke-[1.5]" /> },
            ].map((item, idx) => (
              <div key={idx} className="bg-white border border-stone-200/70 rounded-xl p-5 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)] hover:border-stone-300/80 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest">{item.title}</span>
                  {item.icon}
                </div>
                <div className={`text-3xl font-light font-serif ${item.color} mt-2.5`}>{item.value}</div>
                <div className="text-[10px] text-stone-400 font-light mt-1.5">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Filters and Period Selection */}
          <div className="bg-white border border-stone-200/70 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] p-6 space-y-6">
            <div className="flex flex-col gap-4 pb-2 border-b border-stone-100 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-xl font-light font-serif text-stone-900">Payroll Period & Records</h2>
                <p className="text-xs text-stone-400 font-sans font-light mt-1">Select billing month and search employee logs</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="month-select" className="text-xs font-semibold text-stone-450 uppercase tracking-wider">Payroll Month:</Label>
                <Input
                  id="month-select"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-36 bg-white border-stone-200 h-8 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex gap-4 items-center flex-wrap justify-between">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400 stroke-[1.5]" />
                <Input
                  placeholder="Search employees by name, ID or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-9 rounded-lg text-xs"
                />
              </div>
              <div className="w-[180px]">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-white border-stone-200 hover:border-stone-300 h-9 rounded-lg text-xs shadow-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="z-[1000] bg-white border border-stone-200/80 rounded-xl shadow-xl">
                    <SelectItem value="all" className="text-xs">All Status</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="processed" className="text-xs">Processed</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="border border-stone-200/60 rounded-xl overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-stone-50 hover:bg-stone-50">
                  <TableRow className="hover:bg-stone-50 border-b border-stone-200/60">
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3 pl-4">Employee</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Position</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Base Salary</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Allowances</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Deductions</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Net Salary</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3 pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-stone-400 font-sans font-light text-sm">
                        {loading ? "Loading payroll records..." : "No payroll records found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => {
                      const isExpanded = expandedRow === record.user_id
                      const totalAllowances = record.hra + record.transport_allowance + record.medical_allowance + record.other_allowances + record.overtime_amount + record.bonus
                      const totalDeductions = record.pf_deduction + record.esi_deduction + record.tax_deduction + record.loan_deduction + record.other_deductions
                      
                      return (
                        <>
                          <TableRow key={record.id} onClick={() => setExpandedRow(prev => prev === record.user_id ? null : record.user_id)} className="border-b border-stone-100 hover:bg-stone-50/20 transition-colors cursor-pointer">
                            <TableCell className="py-4 pl-4">
                              <div>
                                <div className="font-light text-stone-900 font-serif text-sm leading-tight">{record.employee_name}</div>
                                <div className="text-[10px] text-stone-400 font-mono tracking-wider mt-0.5">{record.employee_id}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-stone-600 font-sans text-xs">{record.position}</TableCell>
                            <TableCell className="font-mono text-stone-600 text-xs">₹{record.basic_salary.toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-stone-600 text-xs">₹{totalAllowances.toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-stone-600 text-xs">₹{totalDeductions.toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-stone-900 text-xs font-semibold">₹{record.net_salary.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(record.status)} text-[10px] border border-transparent font-sans py-0.5 px-2 rounded-full font-normal shadow-none`}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => handleViewPayslip(record)} className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 w-8 p-0 rounded-lg shadow-sm" title="View Payslip">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleEditPayroll(record)} className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 w-8 p-0 rounded-lg shadow-sm" title="Edit Breakdown">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-stone-50/40 hover:bg-stone-50/40" onClick={(e) => e.stopPropagation()}>
                              <TableCell colSpan={8} className="p-0 border-b border-stone-200/60">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                  {/* Earnings Breakdown */}
                                  <div className="bg-white border border-stone-200/60 rounded-xl p-5 space-y-3.5 shadow-sm">
                                    <h4 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest border-b pb-1.5">Earnings Breakdown</h4>
                                    <div className="space-y-1.5 text-xs text-stone-650">
                                      <div className="flex justify-between font-mono"><span>Basic Salary</span><span>₹{record.basic_salary.toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>HRA</span><span>₹{(record.hra || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>Transport Allowance</span><span>₹{(record.transport_allowance || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>Medical Allowance</span><span>₹{(record.medical_allowance || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>Overtime Amount</span><span>₹{(record.overtime_amount || 0).toLocaleString()} ({record.overtime_hours || 0}h)</span></div>
                                      <div className="flex justify-between font-mono"><span>Bonus</span><span>₹{(record.bonus || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>Other Allowances</span><span>₹{(record.other_allowances || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono font-medium text-stone-900 border-t pt-1.5 mt-1.5"><span>Gross Salary</span><span>₹{(record.gross_salary || 0).toLocaleString()}</span></div>
                                    </div>
                                  </div>

                                  {/* Deductions Breakdown */}
                                  <div className="bg-white border border-stone-200/60 rounded-xl p-5 space-y-3.5 shadow-sm">
                                    <h4 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest border-b pb-1.5">Deductions Breakdown</h4>
                                    <div className="space-y-1.5 text-xs text-stone-650">
                                      <div className="flex justify-between font-mono"><span>PF Deduction</span><span>₹{(record.pf_deduction || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>ESI Deduction</span><span>₹{(record.esi_deduction || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>Tax Deduction</span><span>₹{(record.tax_deduction || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono text-amber-700"><span>Loan/Advance</span><span>₹{(record.loan_deduction || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono"><span>Other Deductions</span><span>₹{(record.other_deductions || 0).toLocaleString()}</span></div>
                                      <div className="flex justify-between font-mono font-medium text-stone-900 border-t pt-1.5 mt-1.5"><span>Total Deductions</span><span>₹{(record.total_deductions || 0).toLocaleString()}</span></div>
                                    </div>
                                  </div>

                                  {/* Operations & Summary */}
                                  <div className="bg-white border border-stone-200/60 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest border-b pb-1.5">Payroll Operations</h4>
                                      <div className="text-xs text-stone-500 font-light space-y-1.5">
                                        <p><strong>Month:</strong> {new Date(record.payroll_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                                        <p><strong>Working Days:</strong> {record.working_days || 30}</p>
                                        <p><strong>Present Days:</strong> {record.present_days || 30}</p>
                                        <p className="text-base font-serif font-light text-stone-900 mt-3 pt-1 border-t">
                                          Net Take-home: <span className="font-semibold text-[#113c2c] font-mono">₹{record.net_salary.toLocaleString()}</span>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-3.5 pt-4 border-t mt-4">
                                      <div className="grid grid-cols-2 gap-2">
                                        {record.status === "pending" || record.status === "draft" ? (
                                          <Button disabled={processing} onClick={() => handleProcessSinglePayroll(record)} className="col-span-2 bg-[#113c2c] hover:bg-[#0c2e22] text-white text-xs h-8 rounded-lg">
                                            {processing ? "Processing..." : "Process Payroll"}
                                          </Button>
                                        ) : record.status === "processed" ? (
                                          <>
                                            <Button onClick={() => handleMarkPaid(record)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-lg shadow-sm">
                                              Mark Paid
                                            </Button>
                                            <Button disabled={processing} onClick={() => handleProcessSinglePayroll(record)} variant="outline" className="border-stone-200 text-stone-600 hover:bg-stone-50 text-xs h-8 rounded-lg">
                                              Recalculate
                                            </Button>
                                          </>
                                        ) : (
                                          <div className="col-span-2 text-center text-xs text-stone-400 font-medium py-1.5 bg-stone-50 border border-stone-100 rounded-lg">
                                            Payment Completed
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="space-y-1.5">
                                        <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest text-center">Quick Adjustments</div>
                                        <div className="grid grid-cols-4 gap-1">
                                          <Button variant="outline" size="sm" onClick={() => openAdjustmentDialog(record, "extra_salary")} className="border-stone-200 text-stone-600 hover:bg-stone-50 h-7 text-[10px] p-0 font-light rounded-md">Bonus</Button>
                                          <Button variant="outline" size="sm" onClick={() => openAdjustmentDialog(record, "overtime")} className="border-stone-200 text-stone-600 hover:bg-stone-50 h-7 text-[10px] p-0 font-light rounded-md">Overtime</Button>
                                          <Button variant="outline" size="sm" onClick={() => openAdjustmentDialog(record, "salary_cut")} className="border-stone-200 text-stone-650 hover:bg-rose-50/20 hover:border-rose-100 h-7 text-[10px] p-0 font-light rounded-md">Deduct</Button>
                                          <Button variant="outline" size="sm" onClick={() => openAdjustmentDialog(record, "advance")} className="border-stone-200 text-stone-600 hover:bg-stone-50 h-7 text-[10px] p-0 font-light rounded-md">Advance</Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Extra Salary Dialog */}
          <Dialog open={extraSalaryDialog} onOpenChange={setExtraSalaryDialog}>
            <DialogContent className="bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl max-w-sm">
              <DialogHeader className="border-b border-stone-100 pb-3">
                <DialogTitle className="font-serif font-light text-xl text-[#113c2c]">Add Extra Salary</DialogTitle>
                <DialogDescription className="text-xs text-stone-400 font-sans font-light mt-1">Add bonus or extra salary for {selectedEmployee?.employee_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="extra-amount" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Amount</Label>
                  <Input
                    id="extra-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="extra-reason" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Reason</Label>
                  <Textarea
                    id="extra-reason"
                    placeholder="Reason for extra salary"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all rounded-lg text-xs"
                  />
                </div>
              </div>
              <DialogFooter className="border-t border-stone-100 pt-3 gap-2">
                <Button variant="outline" onClick={() => setExtraSalaryDialog(false)} className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg">Cancel</Button>
                <Button onClick={() => handlePayrollAdjustment("extra_salary")} className="bg-[#113c2c] hover:bg-[#0c2e22] text-white rounded-lg px-4">Add Extra Salary</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Overtime Dialog */}
          <Dialog open={overtimeDialog} onOpenChange={setOvertimeDialog}>
            <DialogContent className="bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl max-w-sm">
              <DialogHeader className="border-b border-stone-100 pb-3">
                <DialogTitle className="font-serif font-light text-xl text-[#113c2c]">Add Overtime</DialogTitle>
                <DialogDescription className="text-xs text-stone-400 font-sans font-light mt-1">Add overtime hours for {selectedEmployee?.employee_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="overtime-hours" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Hours</Label>
                  <Input
                    id="overtime-hours"
                    type="number"
                    placeholder="Overtime hours"
                    value={adjustmentForm.hours}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, hours: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="overtime-reason" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Reason</Label>
                  <Textarea
                    id="overtime-reason"
                    placeholder="Reason for overtime"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all rounded-lg text-xs"
                  />
                </div>
                {adjustmentForm.hours && selectedEmployee && (
                  <div className="text-[11px] text-stone-500 font-mono mt-1 text-center bg-stone-50 p-2 border rounded-md">
                    Est. overtime pay: ₹{Math.round(Number.parseFloat(adjustmentForm.hours) * (selectedEmployee.basic_salary / (30 * 8)) * 1.5).toLocaleString()}
                  </div>
                )}
              </div>
              <DialogFooter className="border-t border-stone-100 pt-3 gap-2">
                <Button variant="outline" onClick={() => setOvertimeDialog(false)} className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg">Cancel</Button>
                <Button onClick={() => handlePayrollAdjustment("overtime")} className="bg-[#113c2c] hover:bg-[#0c2e22] text-white rounded-lg px-4">Add Overtime</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Salary Cut Dialog */}
          <Dialog open={salaryCutDialog} onOpenChange={setSalaryCutDialog}>
            <DialogContent className="bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl max-w-sm">
              <DialogHeader className="border-b border-stone-100 pb-3">
                <DialogTitle className="font-serif font-light text-xl text-[#113c2c]">Apply Salary Cut</DialogTitle>
                <DialogDescription className="text-xs text-stone-400 font-sans font-light mt-1">Apply salary deduction for {selectedEmployee?.employee_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cut-amount" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Amount</Label>
                  <Input
                    id="cut-amount"
                    type="number"
                    placeholder="Deduction amount"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cut-reason" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Reason</Label>
                  <Textarea
                    id="cut-reason"
                    placeholder="Reason for salary cut"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all rounded-lg text-xs"
                  />
                </div>
              </div>
              <DialogFooter className="border-t border-stone-100 pt-3 gap-2">
                <Button variant="outline" onClick={() => setSalaryCutDialog(false)} className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg">Cancel</Button>
                <Button variant="destructive" onClick={() => handlePayrollAdjustment("salary_cut")} className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4">Apply Salary Cut</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Advance Salary Dialog */}
          <Dialog open={advanceSalaryDialog} onOpenChange={setAdvanceSalaryDialog}>
            <DialogContent className="bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl max-w-sm">
              <DialogHeader className="border-b border-stone-100 pb-3">
                <DialogTitle className="font-serif font-light text-xl text-[#113c2c]">Advance Salary</DialogTitle>
                <DialogDescription className="text-xs text-stone-400 font-sans font-light mt-1">Provide advance salary to {selectedEmployee?.employee_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="advance-amount" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Amount</Label>
                  <Input
                    id="advance-amount"
                    type="number"
                    placeholder="Advance amount"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="advance-reason" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">Reason</Label>
                  <Textarea
                    id="advance-reason"
                    placeholder="Reason for advance salary"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all rounded-lg text-xs"
                  />
                </div>
                <div className="text-[10px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 font-light font-sans text-center">
                  Note: This advance will be deducted from future salary payments
                </div>
              </div>
              <DialogFooter className="border-t border-stone-100 pt-3 gap-2">
                <Button variant="outline" onClick={() => setAdvanceSalaryDialog(false)} className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg">Cancel</Button>
                <Button onClick={() => handlePayrollAdjustment("advance")} className="bg-[#113c2c] hover:bg-[#0c2e22] text-white rounded-lg px-4">Provide Advance</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Payslip View Dialog */}
          <Dialog open={viewPayslipDialog} onOpenChange={setViewPayslipDialog}>
            <DialogContent className="max-w-2xl bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl">
              <DialogHeader className="border-b border-stone-100 pb-3">
                <DialogTitle className="flex items-center justify-between font-serif font-light text-2xl text-[#113c2c]">
                  <span>Salary Slip</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedPayslip && handleDownloadPayslip(selectedPayslip)}
                    className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 rounded-lg text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-2 text-stone-400" />
                    Print Slip
                  </Button>
                </DialogTitle>
              </DialogHeader>
              {selectedPayslip && (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-6 text-xs text-stone-650 border-b border-stone-100 pb-4">
                    <div>
                      <h3 className="font-semibold text-[10px] text-stone-400 uppercase tracking-widest mb-2">Employee Details</h3>
                      <p className="mt-1"><strong>Name:</strong> {selectedPayslip.employee_name}</p>
                      <p className="mt-1"><strong>ID:</strong> {selectedPayslip.employee_id}</p>
                      <p className="mt-1">
                        <strong>Month:</strong>{" "}
                        {new Date(selectedPayslip.payroll_month).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[10px] text-stone-400 uppercase tracking-widest mb-2">Attendance Summary</h3>
                      <p className="mt-1"><strong>Working Days:</strong> {selectedPayslip.working_days}</p>
                      <p className="mt-1"><strong>Present Days:</strong> {selectedPayslip.present_days}</p>
                      <p className="mt-1"><strong>Overtime Hours:</strong> {selectedPayslip.overtime_hours || 0}h</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 text-xs">
                    <div>
                      <h3 className="font-semibold text-[10px] text-stone-400 uppercase tracking-widest mb-3 border-b pb-1">Earnings (₹)</h3>
                      <div className="space-y-1.5 font-mono text-stone-650">
                        <div className="flex justify-between"><span>Basic Salary</span><span>₹{(selectedPayslip.basic_salary || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>HRA</span><span>₹{(selectedPayslip.hra || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Transport</span><span>₹{(selectedPayslip.transport_allowance || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Medical</span><span>₹{(selectedPayslip.medical_allowance || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Overtime Pay</span><span>₹{(selectedPayslip.overtime_amount || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Bonus</span><span>₹{(selectedPayslip.bonus || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Other Allowances</span><span>₹{(selectedPayslip.other_allowances || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-stone-900 border-t pt-1.5 mt-2"><span>Gross Earnings</span><span>₹{(selectedPayslip.gross_salary || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[10px] text-stone-400 uppercase tracking-widest mb-3 border-b pb-1">Deductions (₹)</h3>
                      <div className="space-y-1.5 font-mono text-stone-650">
                        <div className="flex justify-between"><span>PF Deduction</span><span>₹{(selectedPayslip.pf_deduction || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>ESI Deduction</span><span>₹{(selectedPayslip.esi_deduction || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Tax Deduction</span><span>₹{(selectedPayslip.tax_deduction || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Loan / Advance</span><span>₹{(selectedPayslip.loan_deduction || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Other Deductions</span><span>₹{(selectedPayslip.other_deductions || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-stone-900 border-t pt-1.5 mt-2"><span>Total Deductions</span><span>₹{(selectedPayslip.total_deductions || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-150 p-4 rounded-xl flex items-center justify-between mt-6">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Net Take-Home Salary</span>
                      <div className="text-2xl font-light font-serif text-[#113c2c] mt-0.5">₹{(selectedPayslip.net_salary || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest block text-right">Payment Status</span>
                      <Badge className={`${getStatusColor(selectedPayslip.status)} mt-1`}>
                        {selectedPayslip.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Payroll Dialog */}
          <Dialog open={editPayrollDialog} onOpenChange={setEditPayrollDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl">
              <DialogHeader className="border-b border-stone-100 pb-3">
                <DialogTitle className="font-serif font-light text-2xl text-[#113c2c]">Edit Payroll Breakdown - {selectedEditRecord?.employee_name}</DialogTitle>
              </DialogHeader>
              {selectedEditRecord && (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-[#113c2c] uppercase tracking-widest border-b pb-1.5">Earnings Breakdown (₹)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="basic_salary" className="text-[10px] text-stone-500 font-medium">Basic Salary</Label>
                          <Input
                            id="basic_salary"
                            type="number"
                            value={editFormData.basic_salary}
                            onChange={(e) => setEditFormData({ ...editFormData, basic_salary: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hra" className="text-[10px] text-stone-500 font-medium">HRA</Label>
                          <Input
                            id="hra"
                            type="number"
                            value={editFormData.hra}
                            onChange={(e) => setEditFormData({ ...editFormData, hra: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="transport_allowance" className="text-[10px] text-stone-500 font-medium">Transport Allowance</Label>
                          <Input
                            id="transport_allowance"
                            type="number"
                            value={editFormData.transport_allowance}
                            onChange={(e) => setEditFormData({ ...editFormData, transport_allowance: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="medical_allowance" className="text-[10px] text-stone-500 font-medium">Medical Allowance</Label>
                          <Input
                            id="medical_allowance"
                            type="number"
                            value={editFormData.medical_allowance}
                            onChange={(e) => setEditFormData({ ...editFormData, medical_allowance: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="overtime_amount" className="text-[10px] text-stone-500 font-medium">Overtime Amount</Label>
                          <Input
                            id="overtime_amount"
                            type="number"
                            value={editFormData.overtime_amount}
                            onChange={(e) => setEditFormData({ ...editFormData, overtime_amount: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bonus" className="text-[10px] text-stone-500 font-medium">Bonus</Label>
                          <Input
                            id="bonus"
                            type="number"
                            value={editFormData.bonus}
                            onChange={(e) => setEditFormData({ ...editFormData, basic_salary: editFormData.basic_salary, bonus: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="other_allowances" className="text-[10px] text-stone-500 font-medium">Other Allowances</Label>
                          <Input
                            id="other_allowances"
                            type="number"
                            value={editFormData.other_allowances}
                            onChange={(e) => setEditFormData({ ...editFormData, other_allowances: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-rose-700 uppercase tracking-widest border-b pb-1.5">Deductions Breakdown (₹)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pf_deduction" className="text-[10px] text-stone-500 font-medium">PF Deduction</Label>
                          <Input
                            id="pf_deduction"
                            type="number"
                            value={editFormData.pf_deduction}
                            onChange={(e) => setEditFormData({ ...editFormData, pf_deduction: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="esi_deduction" className="text-[10px] text-stone-500 font-medium">ESI Deduction</Label>
                          <Input
                            id="esi_deduction"
                            type="number"
                            value={editFormData.esi_deduction}
                            onChange={(e) => setEditFormData({ ...editFormData, esi_deduction: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tax_deduction" className="text-[10px] text-stone-500 font-medium">Tax Deduction</Label>
                          <Input
                            id="tax_deduction"
                            type="number"
                            value={editFormData.tax_deduction}
                            onChange={(e) => setEditFormData({ ...editFormData, tax_deduction: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="loan_deduction" className="text-[10px] text-stone-500 font-medium">Loan / Advance</Label>
                          <Input
                            id="loan_deduction"
                            type="number"
                            value={editFormData.loan_deduction}
                            onChange={(e) => setEditFormData({ ...editFormData, loan_deduction: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="other_deductions" className="text-[10px] text-stone-500 font-medium">Other Deductions</Label>
                          <Input
                            id="other_deductions"
                            type="number"
                            value={editFormData.other_deductions}
                            onChange={(e) => setEditFormData({ ...editFormData, other_deductions: Number.parseFloat(e.target.value) || 0 })}
                            className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-100">
                    <div>
                      <Label htmlFor="working_days" className="text-[10px] text-stone-500 font-medium">Working Days</Label>
                      <Input
                        id="working_days"
                        type="number"
                        value={editFormData.working_days}
                        onChange={(e) => setEditFormData({ ...editFormData, working_days: Number.parseInt(e.target.value) || 0 })}
                        className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="present_days" className="text-[10px] text-stone-500 font-medium">Present Days</Label>
                      <Input
                        id="present_days"
                        type="number"
                        value={editFormData.present_days}
                        onChange={(e) => setEditFormData({ ...editFormData, present_days: Number.parseInt(e.target.value) || 0 })}
                        className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="overtime_hours" className="text-[10px] text-stone-500 font-medium">Overtime Hours</Label>
                      <Input
                        id="overtime_hours"
                        type="number"
                        value={editFormData.overtime_hours}
                        onChange={(e) => setEditFormData({ ...editFormData, overtime_hours: Number.parseFloat(e.target.value) || 0 })}
                        className="bg-white border-stone-200 h-9 text-xs rounded-lg mt-1"
                      />
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-150 p-5 rounded-xl mt-6">
                    <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Calculated Totals</h3>
                    <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-stone-500">Gross Earnings:</span>
                        <div className="text-sm font-semibold text-stone-900 mt-1">
                          ₹{(
                            editFormData.basic_salary +
                            editFormData.hra +
                            editFormData.transport_allowance +
                            editFormData.medical_allowance +
                            editFormData.overtime_amount +
                            editFormData.bonus +
                            editFormData.other_allowances
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-stone-500">Total Deductions:</span>
                        <div className="text-sm font-semibold text-rose-700 mt-1">
                          ₹{(
                            editFormData.pf_deduction +
                            editFormData.esi_deduction +
                            editFormData.tax_deduction +
                            editFormData.loan_deduction +
                            editFormData.other_deductions
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-stone-500">Net Take-Home:</span>
                        <div className="text-sm font-bold text-[#113c2c] mt-1">
                          ₹{(
                            editFormData.basic_salary +
                            editFormData.hra +
                            editFormData.transport_allowance +
                            editFormData.medical_allowance +
                            editFormData.overtime_amount +
                            editFormData.bonus +
                            editFormData.other_allowances -
                            (editFormData.pf_deduction +
                              editFormData.esi_deduction +
                              editFormData.tax_deduction +
                              editFormData.loan_deduction +
                              editFormData.other_deductions)
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
                    <Button variant="outline" onClick={() => setEditPayrollDialog(false)} className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg">
                      Cancel
                    </Button>
                    <Button onClick={handleEditSubmit} className="bg-[#113c2c] hover:bg-[#0c2e22] text-white rounded-lg px-5 shadow-sm">
                      Update Payroll
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}
