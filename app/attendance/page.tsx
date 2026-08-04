"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Users, Plus, Search, Download, CheckCircle, XCircle, AlertCircle, LogIn, LogOut, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import { TimePicker } from "@/components/ui/time-picker"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface AttendanceRecord {
  id: string
  employee_name: string
  employee_id: string
  date: string
  check_in: string
  check_out?: string
  raw_check_in?: string
  raw_check_out?: string
  total_hours?: number
  status: "present" | "absent" | "late" | "half_day" | "on_leave"
  overtime_hours?: number
  user_id: string
  franchise_id: string
}

interface AttendanceStats {
  total_employees: number
  present_today: number
  absent_today: number
  late_today: number
  average_hours: number
}

interface Employee {
  id: string
  name: string
  email: string
  employee_id: string
  role: string
  franchise_id: string
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    total_employees: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    average_hours: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [showMarkDialog, setShowMarkDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent" | "late" | "half_day" | "on_leave">(
    "present",
  )
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rangeMode, setRangeMode] = useState<'single' | 'range'>('single')
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [recordPendingDelete, setRecordPendingDelete] = useState<AttendanceRecord | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [historyMode, setHistoryMode] = useState(false)
  const [historyMonth, setHistoryMonth] = useState(() => new Date().toISOString().slice(0,7)) // YYYY-MM
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dialogDate, setDialogDate] = useState("")

  useEffect(() => {
    loadAttendanceData()
  }, [selectedDate, rangeMode, startDate, endDate, historyMode, historyMonth, employeeFilter, statusFilter])

  const loadAttendanceData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading attendance data...")

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        toast.error("Please login to view attendance data")
        return
      }

      console.log(
        "[v0] Current user:",
        currentUser.name,
        "role:",
        currentUser.role,
        "franchise:",
        currentUser.franchise_id,
      )

      // Determine franchise filter based on user role
      const franchiseFilter = currentUser.role === "super_admin" ? null : currentUser.franchise_id

      // Load employees for the franchise
      await loadEmployees(franchiseFilter as string | null)

      // Load attendance records for selected date
      let attendanceQuery = supabase
        .from("attendance_records")
        .select(`
          id,
          user_id,
          franchise_id,
          date,
          check_in_time,
          check_out_time,
          total_hours,
          overtime_hours,
          status,
          users!user_id(name, email)
        `)

      if (historyMode) {
        const start = historyMonth + '-01'
        const startDateObj = new Date(start)
        const endDateObj = new Date(startDateObj.getFullYear(), startDateObj.getMonth()+1, 0)
        const end = endDateObj.toISOString().slice(0,10)
        attendanceQuery = attendanceQuery.gte('date', start).lte('date', end)
      } else if (rangeMode === 'single') {
        attendanceQuery = attendanceQuery.eq("date", selectedDate)
      } else if (rangeMode === 'range' && startDate && endDate) {
        attendanceQuery = attendanceQuery.gte('date', startDate).lte('date', endDate)
      } else {
        attendanceQuery = attendanceQuery.eq('date', selectedDate)
      }

      if (franchiseFilter) {
        attendanceQuery = attendanceQuery.eq("franchise_id", franchiseFilter)
      }

      const { data: attendanceData, error: attendanceError } = await attendanceQuery

      if (attendanceError) {
        console.error("[v0] Error fetching attendance:", attendanceError)
        toast.error("Failed to load attendance data")
        return
      }

      console.log("[v0] Attendance records fetched:", attendanceData?.length || 0)

      // Helper function to extract HH:MM string from ISO string in local timezone
      const getRawTime = (isoString?: string) => {
        if (!isoString) return ""
        const date = new Date(isoString)
        const h = date.getHours().toString().padStart(2, "0")
        const m = date.getMinutes().toString().padStart(2, "0")
        return `${h}:${m}`
      }

      // Transform data to match interface
      const transformedRecords: AttendanceRecord[] = (attendanceData || []).map((record: any) => ({
        id: record.id,
        employee_name: record.users?.name || "Unknown",
        employee_id: record.user_id.slice(-6).toUpperCase(), // Use last 6 chars of user_id as employee_id
        date: record.date,
        check_in: record.check_in_time
          ? new Date(record.check_in_time).toLocaleTimeString("en-IN", {
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        check_out: record.check_out_time
          ? new Date(record.check_out_time).toLocaleTimeString("en-IN", {
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined,
        raw_check_in: getRawTime(record.check_in_time),
        raw_check_out: getRawTime(record.check_out_time),
        total_hours: record.total_hours || 0,
        status: record.status as "present" | "absent" | "late" | "half_day" | "on_leave",
        overtime_hours: record.overtime_hours || 0,
        user_id: record.user_id,
        franchise_id: record.franchise_id,
      }))

      setAttendanceRecords(transformedRecords)

      // Calculate stats
      const totalEmployees = employees.length
      const presentToday = transformedRecords.filter((r) => r.status === "present").length
      const absentToday = transformedRecords.filter((r) => r.status === "absent").length
      const lateToday = transformedRecords.filter((r) => r.status === "late").length
      const avgHours =
        transformedRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0) / (transformedRecords.length || 1)

      setStats({
        total_employees: totalEmployees,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
        average_hours: Math.round(avgHours * 10) / 10,
      })

      console.log("[v0] Attendance stats calculated:", {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        avgHours,
      })
      toast.success("Attendance data loaded successfully")
    } catch (error) {
      console.error("[v0] Error loading attendance data:", error)
      toast.error("Failed to load attendance data")
    } finally {
      setLoading(false)
    }
  }

  const loadEmployees = async (franchiseId: string | null) => {
    try {
      let employeeQuery = supabase
        .from("users")
        .select("id, name, email, role, franchise_id")
        .in("role", ["staff", "franchise_admin"])

      if (franchiseId) {
        employeeQuery = employeeQuery.eq("franchise_id", franchiseId)
      }

      const { data: employeeData, error: employeeError } = await employeeQuery

      if (employeeError) {
        console.error("[v0] Error fetching employees:", employeeError)
        return
      }

      const transformedEmployees: Employee[] = (employeeData || []).map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        employee_id: emp.id.slice(-6).toUpperCase(),
        role: emp.role,
        franchise_id: emp.franchise_id,
      }))

      setEmployees(transformedEmployees)
      console.log("[v0] Employees loaded:", transformedEmployees.length)
    } catch (error) {
      console.error("[v0] Error loading employees:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800"
      case "late":
        return "bg-yellow-100 text-yellow-800"
      case "absent":
        return "bg-red-100 text-red-800"
      case "half_day":
        return "bg-blue-100 text-blue-800"
      case "on_leave":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "late":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "half_day":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "on_leave":
        return <Clock className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const monthLabel = (ym: string) => {
    const [y,m] = ym.split('-').map(Number)
    return new Date(y, m-1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }
  const changeMonth = (delta:number) => {
    const [y,m] = historyMonth.split('-').map(Number)
    const d = new Date(y, m-1+delta, 1)
    // Avoid timezone shift by constructing string manually instead of toISOString()
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    setHistoryMonth(ym)
  }

  const filteredRecords = attendanceRecords.filter(
    (record) =>
      (record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (employeeFilter === 'all' || record.user_id === employeeFilter) &&
      (statusFilter.length === 0 || statusFilter.includes(record.status))
  )

  const handleMarkAttendance = async () => {
    try {
      if (submitting) return
      setSubmitting(true)
      if (!selectedEmployee || !attendanceStatus) {
        toast.error("Please select employee and status")
        return
      }

      // Prevent future date entries
      const todayISO = new Date().toISOString().split("T")[0]
      if (dialogDate > todayISO) {
        toast.error("Cannot mark attendance for a future date")
        return
      }

      // Time validation (if both provided)
      if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
        toast.error("Check-out time must be after check-in time")
        return
      }

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        toast.error("Please login to mark attendance")
        return
      }

      const selectedEmployeeData = employees.find((emp) => emp.id === selectedEmployee)
      if (!selectedEmployeeData) {
        toast.error("Selected employee not found")
        return
      }

      const franchiseId =
        currentUser.role === "super_admin" ? selectedEmployeeData.franchise_id : currentUser.franchise_id

      if (!franchiseId) {
        toast.error("Unable to determine franchise for attendance record")
        return
      }

      // Helper function to build ISO string with correct local timezone offset
      const getLocalDateTimeISOString = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return null
        const [year, month, day] = dateStr.split("-").map(Number)
        const [hours, minutes] = timeStr.split(":").map(Number)
        const localDate = new Date(year, month - 1, day, hours, minutes, 0)
        return localDate.toISOString()
      }

      const checkInISO = getLocalDateTimeISOString(dialogDate, checkInTime)
      const checkOutISO = getLocalDateTimeISOString(dialogDate, checkOutTime)

      const attendanceData = {
        user_id: selectedEmployee,
        franchise_id: franchiseId,
        date: dialogDate,
        status: attendanceStatus,
        check_in_time: checkInISO,
        check_out_time: checkOutISO,
        updated_at: new Date().toISOString(),
      }

      if (editingRecord?.id) {
        const { error } = await supabase
          .from("attendance_records")
          .update(attendanceData)
          .eq("id", editingRecord.id)
        if (error) throw error
        toast.success("Attendance updated successfully")
      } else {
        // Check if attendance already exists for this date and employee
        const { data: existingRecord } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("user_id", selectedEmployee)
          .eq("date", dialogDate)
          .maybeSingle()

        if (existingRecord?.id) {
          const { error } = await supabase
            .from("attendance_records")
            .update(attendanceData)
            .eq("id", existingRecord.id)
          if (error) throw error
          toast.success("Attendance updated successfully")
        } else {
          const { error } = await supabase
            .from("attendance_records")
            .insert([attendanceData])
          if (error) throw error
          toast.success("Attendance marked successfully")
        }
      }

      setShowMarkDialog(false)
      setEditingRecord(null)
      setSelectedEmployee("")
      setAttendanceStatus("present")
      setCheckInTime("")
      setCheckOutTime("")
      setDialogDate("")
      await loadAttendanceData()
    } catch (error: any) {
      console.error("[v0] Error marking attendance:", error)
      toast.error(error?.message || "Failed to mark attendance")
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportReport = () => {
    try {
      const csvContent = [
        ["Employee Name", "Employee ID", "Date", "Check In", "Check Out", "Total Hours", "Status", "Overtime"],
        ...filteredRecords.map((record) => [
          record.employee_name,
          record.employee_id,
          record.date,
          record.check_in || "-",
          record.check_out || "-",
          record.total_hours ? `${record.total_hours}h` : "-",
            record.status.replace("_", " "),
          record.overtime_hours ? `${record.overtime_hours}h` : "-",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `attendance-report-${selectedDate}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("CSV exported", { description: "Attendance CSV downloaded" })
    } catch (error) {
      console.error("[v0] Error exporting report:", error)
      toast.error("Failed to export report")
    }
  }

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(16)
      doc.text('Attendance Report', 14, 14)
      doc.setFontSize(10)
      doc.text(`Date: ${selectedDate}`, 14, 22)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true })}`, 14, 28)
      doc.text(`Total Records: ${filteredRecords.length}`, 14, 34)

      const tableBody = filteredRecords.map(r => [
        r.employee_name,
        r.employee_id,
        r.check_in || '-',
        r.check_out || '-',
        r.total_hours ? `${r.total_hours}h` : '-',
        r.status.replace('_',' '),
        r.overtime_hours ? `${r.overtime_hours}h` : '-',
      ])

      autoTable(doc, {
        startY: 40,
        head: [["Employee", "ID", "In", "Out", "Hours", "Status", "Overtime"]],
        body: tableBody,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] }, // Tailwind green-600
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 5)
        },
      })

      doc.save(`attendance-${selectedDate}.pdf`)
      toast.success('PDF exported', { description: 'Styled PDF downloaded' })
    } catch (e) {
      console.error('[v0] PDF export error', e)
      toast.error('Failed to export PDF')
    }
  }

  const handleQuickCheckIn = async (employeeId: string, employeeName: string) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return

      const employeeData = employees.find((emp) => emp.id === employeeId)
      if (!employeeData) {
        toast.error("Employee not found")
        return
      }

      const franchiseId = currentUser.role === "super_admin" ? employeeData.franchise_id : currentUser.franchise_id

      if (!franchiseId) {
        toast.error("Unable to determine franchise for attendance record")
        return
      }

      const now = new Date()
      const { error } = await supabase.from("attendance_records").upsert({
        user_id: employeeId,
        franchise_id: franchiseId, // Use the determined franchise_id
        date: selectedDate,
        check_in_time: now.toISOString(),
        status: "present",
      })

      if (error) throw error

      toast.success(`Check-in recorded for ${employeeName}`, {
        description: `Time: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      })

      await loadAttendanceData()
    } catch (error) {
      console.error("[v0] Error recording check-in:", error)
      toast.error("Failed to record check-in")
    }
  }

  const handleQuickCheckOut = async (employeeId: string, employeeName: string) => {
    try {
      const now = new Date()
      const { error } = await supabase
        .from("attendance_records")
        .update({
          check_out_time: now.toISOString(),
        })
        .eq("user_id", employeeId)
        .eq("date", selectedDate)

      if (error) throw error

      toast.success(`Check-out recorded for ${employeeName}`, {
        description: `Time: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      })

      await loadAttendanceData()
    } catch (error) {
      console.error("[v0] Error recording check-out:", error)
      toast.error("Failed to record check-out")
    }
  }

  const applyPreset = (preset: string) => {
    const today = new Date()
    const format = (d: Date) => d.toISOString().split('T')[0]
    if (preset === 'today') {
      setRangeMode('single')
      setStartDate(null)
      setEndDate(null)
      setSelectedDate(format(today))
    } else if (preset === '7d') {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      setRangeMode('range')
      setStartDate(format(start))
      setEndDate(format(today))
    } else if (preset === '30d') {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      setRangeMode('range')
      setStartDate(format(start))
      setEndDate(format(today))
    }
  }

  const handleDeleteRecord = async (record: AttendanceRecord) => {
    setRecordPendingDelete(record)
    setShowDeleteDialog(true)
  }

  const confirmDeleteRecord = async () => {
    if (!recordPendingDelete) return
    try {
      const { error } = await supabase.from('attendance_records').delete().eq('id', recordPendingDelete.id)
      if (error) throw error
      toast.success('Attendance deleted')
      setShowDeleteDialog(false)
      setRecordPendingDelete(null)
      await loadAttendanceData()
    } catch (e:any) {
      toast.error(e.message || 'Delete failed')
    }
  }

  const startEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setSelectedEmployee(record.user_id)
    setAttendanceStatus(record.status)
    setCheckInTime(record.raw_check_in || "")
    setCheckOutTime(record.raw_check_out || "")
    setDialogDate(record.date)
    setShowMarkDialog(true)
  }

  const handleNewAttendance = () => {
    setEditingRecord(null)
    setSelectedEmployee("")
    setAttendanceStatus("present")
    setCheckInTime("")
    setCheckOutTime("")
    setDialogDate(selectedDate || new Date().toISOString().split("T")[0])
    setShowMarkDialog(true)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-[#FAF9F6] p-6 rounded-2xl border border-stone-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200/60">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-[#113c2c] font-serif">Attendance</h1>
            <p className="text-xs text-stone-400 mt-1.5 font-sans font-light">Track employee attendance, working hours, and time management</p>
          </div>
          <div className="flex gap-2.5 flex-wrap items-center">
            <Button variant="outline" onClick={handleExportReport} className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50/50 hover:border-stone-300 transition-all duration-200 h-9 px-4 text-xs rounded-lg font-medium shadow-sm">
              <Download className="h-3.5 w-3.5 mr-2 text-stone-400" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50/50 hover:border-stone-300 transition-all duration-200 h-9 px-4 text-xs rounded-lg font-medium shadow-sm">
              <Download className="h-3.5 w-3.5 mr-2 text-stone-400" />
              PDF
            </Button>
            <Dialog open={showMarkDialog} onOpenChange={(open) => {
              setShowMarkDialog(open)
              if (!open) {
                setEditingRecord(null)
                setSelectedEmployee("")
                setAttendanceStatus("present")
                setCheckInTime("")
                setCheckOutTime("")
                setDialogDate("")
              }
            }}>
              <Button onClick={handleNewAttendance} className="bg-[#113c2c] hover:bg-[#0c2e22] text-white hover:shadow-md transition-all duration-200 h-9 px-4 text-xs rounded-lg font-medium">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Mark Attendance
              </Button>
              <DialogContent className="bg-white border border-stone-200/80 rounded-2xl p-7 shadow-2xl max-w-md">
                <DialogHeader className="border-b border-stone-100 pb-4">
                  <DialogTitle className="flex items-center gap-2.5 text-[#113c2c] text-2xl font-light font-serif">
                    <Clock className="h-5 w-5 text-[#113c2c] stroke-[1.5]" />
                    {editingRecord ? 'Edit Attendance' : 'Mark Attendance'}
                  </DialogTitle>
                  <DialogDescription className="text-stone-400 font-sans font-light text-xs mt-1.5">
                    Confirm employee details, dates, and check-in/out times.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5 py-5">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="employee" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">
                      Employee *
                    </Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!!editingRecord}>
                      <SelectTrigger className="col-span-3 bg-white border-stone-200 hover:border-stone-300 transition-colors h-10 rounded-lg text-sm shadow-sm">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="z-[1000] bg-white border border-stone-200/80 rounded-xl shadow-xl">
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id} className="text-sm">
                            {employee.name} ({employee.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={dialogDate}
                      onChange={(e) => setDialogDate(e.target.value)}
                      className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-10 rounded-lg text-sm shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">
                      Status *
                    </Label>
                    <Select value={attendanceStatus} onValueChange={(value: any) => setAttendanceStatus(value)}>
                      <SelectTrigger className="col-span-3 bg-white border-stone-200 hover:border-stone-300 transition-colors h-10 rounded-lg text-sm shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[1000] bg-white border border-stone-200/80 rounded-xl shadow-xl">
                        <SelectItem value="present" className="text-sm">Present</SelectItem>
                        <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                        <SelectItem value="late" className="text-sm">Late</SelectItem>
                        <SelectItem value="half_day" className="text-sm">Half Day</SelectItem>
                        <SelectItem value="on_leave" className="text-sm">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="checkin" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">
                      Check In
                    </Label>
                    <Input
                      id="checkin"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-10 rounded-lg px-3 text-sm font-mono shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="checkout" className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest text-right">
                      Check Out
                    </Label>
                    <Input
                      id="checkout"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      className="col-span-3 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-10 rounded-lg px-3 text-sm font-mono shadow-sm"
                    />
                  </div>
                </div>
                <DialogFooter className="border-t border-stone-100 pt-4 gap-2">
                  <Button variant="outline" onClick={() => setShowMarkDialog(false)} className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg">
                    Cancel
                  </Button>
                  <Button disabled={submitting} onClick={handleMarkAttendance} className="bg-[#113c2c] hover:bg-[#0c2e22] text-white rounded-lg px-5 shadow-sm">
                    {submitting ? 'Saving...' : (editingRecord ? 'Save Changes' : 'Mark Attendance')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-5 md:grid-cols-5">
          {[
            { title: "Total Employees", value: stats.total_employees, sub: "Active staff", color: "text-stone-850", icon: <Users className="h-4 w-4 text-stone-300 stroke-[1.5]" /> },
            { title: "Present Today", value: stats.present_today, sub: "On time & working", color: "text-[#113c2c]", icon: <CheckCircle className="h-4 w-4 text-green-500 stroke-[1.5]" /> },
            { title: "Absent Today", value: stats.absent_today, sub: "Not present", color: "text-rose-600", icon: <XCircle className="h-4 w-4 text-rose-400 stroke-[1.5]" /> },
            { title: "Late Today", value: stats.late_today, sub: "Late arrivals", color: "text-amber-600", icon: <AlertCircle className="h-4 w-4 text-amber-400 stroke-[1.5]" /> },
            { title: "Avg Hours", value: `${stats.average_hours}h`, sub: "Daily average", color: "text-stone-850", icon: <Clock className="h-4 w-4 text-stone-300 stroke-[1.5]" /> },
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

        {/* Attendance Records */}
        <div className="bg-white border border-stone-200/70 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] p-6 space-y-6">
          <div className="flex flex-col gap-4 pb-2 border-b border-stone-100">
            <h2 className="text-xl font-light font-serif text-stone-900">Daily Records</h2>
            <p className="text-xs text-stone-400 font-sans font-light">Filter, search, and manage daily employee logs</p>
          </div>

          <div className="flex gap-4 items-center flex-wrap justify-between">
            {/* Search and filters block */}
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400 stroke-[1.5]" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-stone-200 hover:border-stone-300 focus:border-[#113c2c] transition-all h-9 rounded-lg text-xs"
                />
              </div>
              <div className="w-[180px]">
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="bg-white border-stone-200 hover:border-stone-300 h-9 rounded-lg text-xs shadow-sm">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent className="z-[1000] bg-white border border-stone-200/80 rounded-xl shadow-xl max-h-72">
                    <SelectItem value="all" className="text-xs">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date range controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center border border-stone-200 rounded-lg p-0.5 bg-stone-50/50 shadow-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={()=>setHistoryMode(h=>!h)}
                  className={`h-7 px-3 text-xs rounded-md transition-all font-medium ${historyMode ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  {historyMode ? 'Monthly View' : 'Daily View'}
                </Button>
                {!historyMode && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setRangeMode(r => r === 'range' ? 'single':'range')}
                    className={`h-7 px-3 text-xs rounded-md transition-all font-medium ${rangeMode === 'range' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    {rangeMode === 'range' ? 'Date Range' : 'Single Date'}
                  </Button>
                )}
              </div>

              {historyMode ? (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={()=>changeMonth(-1)} className="border-stone-200 h-8 w-8 rounded-lg">
                    <ChevronLeft className="h-3.5 w-3.5 text-stone-500" />
                  </Button>
                  <span className="text-xs font-medium w-36 text-center font-sans text-stone-700">{monthLabel(historyMonth)}</span>
                  <Button variant="outline" size="icon" onClick={()=>changeMonth(1)} className="border-stone-200 h-8 w-8 rounded-lg">
                    <ChevronRight className="h-3.5 w-3.5 text-stone-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {rangeMode === 'single' ? (
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-36 bg-white border-stone-200 h-8 rounded-lg text-xs"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input type="date" value={startDate || ''} onChange={(e)=>setStartDate(e.target.value)} className="w-32 bg-white border-stone-200 h-8 rounded-lg text-xs" />
                      <span className="text-stone-400 text-xs">-</span>
                      <Input type="date" value={endDate || ''} onChange={(e)=>setEndDate(e.target.value)} className="w-32 bg-white border-stone-200 h-8 rounded-lg text-xs" />
                    </div>
                  )}
                  <div className="flex items-center gap-0.5 border border-stone-200 rounded-lg p-0.5 bg-stone-50/50 shadow-sm ml-1">
                    <button type="button" onClick={() => applyPreset('today')} className="text-[10px] font-medium text-stone-500 hover:text-stone-800 px-2 py-1 rounded hover:bg-white transition-colors">Today</button>
                    <button type="button" onClick={() => applyPreset('7d')} className="text-[10px] font-medium text-stone-500 hover:text-stone-800 px-2 py-1 rounded hover:bg-white transition-colors">7d</button>
                    <button type="button" onClick={() => applyPreset('30d')} className="text-[10px] font-medium text-stone-500 hover:text-stone-800 px-2 py-1 rounded hover:bg-white transition-colors">30d</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status buttons row */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mr-1.5">Filter Status:</span>
            {['present','late','absent','half_day','on_leave'].map(st => (
              <button
                key={st}
                type="button"
                onClick={()=> setStatusFilter(prev => prev.includes(st) ? prev.filter(x=>x!==st) : [...prev, st])}
                className={`px-3 py-1 rounded-full border text-[11px] font-sans transition-all duration-250 ${
                  statusFilter.includes(st) 
                    ? 'bg-[#113c2c] text-white border-transparent shadow-sm' 
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                {st.replace('_',' ')}
              </button>
            ))}
            {statusFilter.length > 0 && (
              <button 
                type="button" 
                className="px-3 py-1 rounded-full border border-stone-200 text-[11px] font-sans bg-stone-50 text-stone-500 hover:bg-stone-100 hover:border-stone-300 transition-all ml-1" 
                onClick={()=>setStatusFilter([])}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Attendance Table */}
          <div className="border border-stone-200/60 rounded-xl overflow-hidden shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-stone-50 hover:bg-stone-50">
                <TableRow className="hover:bg-stone-50 border-b border-stone-200/60">
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3 pl-4">Employee</TableHead>
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Check In</TableHead>
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Check Out</TableHead>
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Hours</TableHead>
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3">Overtime</TableHead>
                  <TableHead className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest py-3 pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-stone-400 font-sans font-light text-sm">
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="border-b border-stone-100 hover:bg-stone-50/30 transition-colors">
                      <TableCell className="py-4 pl-4">
                        <div className="flex items-center gap-3.5">
                          <div className="shrink-0">{getStatusIcon(record.status)}</div>
                          <div>
                            <div className="font-light text-stone-900 font-serif text-sm leading-tight">{record.employee_name}</div>
                            <div className="text-[10px] text-stone-400 font-mono tracking-wider mt-0.5">{record.employee_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-stone-600 text-xs">{record.check_in || "-"}</TableCell>
                      <TableCell className="font-mono text-stone-600 text-xs">{record.check_out || "-"}</TableCell>
                      <TableCell className="font-mono text-stone-650 text-xs font-medium">{record.total_hours ? `${record.total_hours}h` : "-"}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(record.status)} text-[10px] border border-transparent font-sans py-0.5 px-2 rounded-full font-normal shadow-none`}>{record.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-stone-600 text-xs">{record.overtime_hours ? `${record.overtime_hours}h` : "-"}</TableCell>
                      <TableCell className="py-4 pr-4">
                        <div className="flex gap-2 justify-end">
                          {!record.check_in && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickCheckIn(record.user_id, record.employee_name)}
                              className="border-stone-200 text-stone-600 hover:bg-emerald-50/10 hover:border-emerald-200 h-8 w-8 p-0 rounded-lg shadow-sm"
                              title="Quick Check-in"
                            >
                              <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                          {record.check_in && !record.check_out && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickCheckOut(record.user_id, record.employee_name)}
                              className="border-stone-200 text-stone-600 hover:bg-rose-50/50 hover:border-rose-200 h-8 w-8 p-0 rounded-lg shadow-sm"
                              title="Quick Check-out"
                            >
                              <LogOut className="h-3.5 w-3.5 text-rose-500" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => startEditRecord(record)}
                            className="border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 h-8 w-8 p-0 rounded-lg shadow-sm"
                            title="Edit Record"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteRecord(record)}
                            className="border-stone-200 text-stone-600 hover:bg-rose-50/30 hover:border-rose-100 hover:text-rose-600 h-8 w-8 p-0 rounded-lg shadow-sm"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={(o)=>{ if(!o){ setShowDeleteDialog(false); setRecordPendingDelete(null);} }}>
        <AlertDialogContent className="bg-white border border-stone-250 rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif font-light text-xl text-[#113c2c]">Delete Attendance</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-stone-500 font-sans font-light mt-1">
              {recordPendingDelete ? `Delete attendance for ${recordPendingDelete.employee_name} on ${recordPendingDelete.date}? This action cannot be undone.` : 'No record selected.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="border-stone-200 text-stone-600 rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRecord} className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 shadow-sm">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
