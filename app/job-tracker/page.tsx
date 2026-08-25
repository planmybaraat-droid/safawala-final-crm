"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { toast } from "sonner"
import {
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Calendar,
  ClipboardList,
  DollarSign,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  UserCheck,
  Warehouse,
} from "lucide-react"

type TaskStatus = "pending" | "active" | "picked" | "shortage" | "completed" | "cancelled"

type WorkOrderTask = {
  id: string
  department: string
  task_number?: string
  title?: string
  status: TaskStatus | string
  checklist?: Array<{ text: string; checked: boolean }>
  assignee_name?: string | null
  due_date?: string | null
  completed_at?: string | null
  created_at?: string | null
}

type WorkOrder = {
  id: string
  work_order_number: string
  booking_id?: string
  booking_source: string
  booking_number: string
  event_date: string | null
  customer_name: string
  customer_phone?: string
  venue_address?: string | null
  status: string
  created_at: string
  is_rental?: boolean
  work_order_tasks: WorkOrderTask[]
}

const FLOW_STAGES = [
  { key: "bookings", label: "Bookings", short: "Booked", icon: Calendar },
  { key: "warehouse", label: "Warehouse", short: "Picking", icon: Warehouse },
  { key: "packing", label: "QC & Packing", short: "QC Pack", icon: Package },
  { key: "dispatch", label: "Fulfillment", short: "Dispatch", icon: Truck },
  { key: "event_team", label: "On-Ground Team", short: "Team", icon: MapPin },
  { key: "styling", label: "Styling", short: "Styling", icon: UserCheck },
  { key: "travels", label: "Travels", short: "Travel", icon: Truck },
  { key: "returns", label: "Returns", short: "Return", icon: RotateCcw },
  { key: "return_qc", label: "Return QC", short: "Return QC", icon: ShieldCheck },
  { key: "return_receiving", label: "Warehouse Storage", short: "Storage", icon: Warehouse },
  { key: "accounts", label: "Accounts", short: "Billing", icon: DollarSign },
] as const

const TASK_ORDER = FLOW_STAGES.map((stage) => stage.key).filter((key) => key !== "bookings")
const JOBS_PER_PAGE = 10

const isRentalSource = (source: string) => source === "product_orders" || source === "package_bookings"
const normalizeStatus = (value: string) => value?.replace(/_/g, " ") || "Waiting"

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const getPriority = (dateStr?: string | null) => {
  if (!dateStr) return { label: "Low", className: "border-slate-200 bg-slate-50 text-slate-600" }
  const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return { label: "Critical", className: "border-rose-200 bg-rose-50 text-rose-700" }
  if (diffDays <= 3) return { label: "High", className: "border-orange-200 bg-orange-50 text-orange-700" }
  if (diffDays <= 7) return { label: "Medium", className: "border-amber-200 bg-amber-50 text-amber-700" }
  return { label: "Low", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
}

const getStageTask = (workOrder: WorkOrder, stageKey: string) =>
  (workOrder.work_order_tasks || []).find((task) => task.department === stageKey)

const getActiveTask = (workOrder: WorkOrder) => {
  const sorted = [...(workOrder.work_order_tasks || [])].sort(
    (a, b) => TASK_ORDER.indexOf(a.department) - TASK_ORDER.indexOf(b.department),
  )
  return sorted.find((task) => task.status !== "completed" && task.status !== "cancelled") || sorted[sorted.length - 1]
}

const getCurrentStage = (workOrder: WorkOrder) => {
  const activeTask = getActiveTask(workOrder)
  if (!activeTask) return FLOW_STAGES[0]
  return FLOW_STAGES.find((stage) => stage.key === activeTask.department) || FLOW_STAGES[0]
}

const statusClasses: Record<string, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-blue-200 bg-blue-50 text-blue-700",
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  picked: "border-emerald-200 bg-emerald-50 text-emerald-700",
  shortage: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
}

export default function JobTrackerPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [remindingIds, setRemindingIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)
    }
    loadUser()
  }, [router])

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/work-orders")
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to fetch jobs")
      setWorkOrders(result.data || [])
    } catch (error: any) {
      console.error("[Job Tracker] Failed to load jobs", error)
      toast.error(error.message || "Error loading job tracker")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchWorkOrders()
  }, [user])

  const activeJobs = useMemo(
    () => workOrders.filter((job) => job.status !== "cancelled"),
    [workOrders],
  )

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { bookings: activeJobs.length }
    FLOW_STAGES.forEach((stage) => {
      if (stage.key !== "bookings") counts[stage.key] = 0
    })
    activeJobs.forEach((job) => {
      ;(job.work_order_tasks || []).forEach((task) => {
        if (task.status !== "completed" && task.status !== "cancelled" && counts[task.department] !== undefined) {
          counts[task.department] += 1
        }
      })
    })
    return counts
  }, [activeJobs])

  const filteredJobs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    return activeJobs.filter((job) => {
      const isRental = job.is_rental ?? isRentalSource(job.booking_source)
      const currentStage = getCurrentStage(job)
      const matchesSearch = !term || [
        job.work_order_number,
        job.booking_number,
        job.customer_name,
        job.customer_phone,
        job.venue_address,
      ].some((value) => String(value || "").toLowerCase().includes(term))
      const matchesStage = stageFilter === "all" || currentStage.key === stageFilter || !!getStageTask(job, stageFilter)
      const matchesStatus = statusFilter === "all" || job.status === statusFilter
      const matchesType = typeFilter === "all" || (typeFilter === "rental" ? isRental : !isRental)
      return matchesSearch && matchesStage && matchesStatus && matchesType
    })
  }, [activeJobs, searchQuery, stageFilter, statusFilter, typeFilter])


  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, stageFilter, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * JOBS_PER_PAGE
  const paginatedJobs = filteredJobs.slice(pageStart, pageStart + JOBS_PER_PAGE)
  const handleRemind = async (taskId?: string) => {
    if (!taskId || remindingIds.has(taskId)) return
    setRemindingIds((prev) => new Set(prev).add(taskId))
    try {
      const res = await fetch(`/api/work-orders/tasks/${taskId}/remind`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send reminder")
      toast.success(`Reminded ${data.notified?.join(", ") || "the team"}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to send reminder")
    } finally {
      setTimeout(() => {
        setRemindingIds((prev) => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
      }, 8000)
    }
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">
          Loading Job Tracker...
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardErrorBoundary>
      <DashboardLayout userRole={user.role}>
        <div className="job-tracker-page mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-7">
          <section className="overflow-hidden rounded-[28px] border border-[#d9cdf5] bg-white shadow-[0_18px_60px_rgba(86,55,160,0.10)]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2a1557_0%,#3b1a82_58%,#6d28d9_100%)] px-5 py-6 text-white sm:px-7">
              <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-violet-300/15 blur-3xl" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/95 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#5b21b6] shadow-sm">
                    <ClipboardList className="h-3.5 w-3.5" /> Connected operations workflow
                  </div>
                  <h1 className="job-tracker-hero-title text-3xl font-extrabold tracking-tight sm:text-4xl">Job Tracker</h1>
                  <p className="job-tracker-hero-copy mt-2 max-w-2xl text-sm leading-6">
                    Follow each active booking across warehouse, QC & packing, fulfillment, on-ground team, returns, storage, and accounts with the same connected job data used by every portal.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={fetchWorkOrders} disabled={loading} className="h-10 rounded-full border border-white/20 bg-white/95 px-4 text-[#3b177d] shadow-sm hover:bg-violet-50">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh Jobs
                  </Button>
                  <div className="rounded-full border border-white/20 bg-white px-4 py-2 text-sm font-extrabold text-[#2f155f] shadow-sm">
                    {activeJobs.length} Active Jobs
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-[linear-gradient(180deg,#fbf9ff_0%,#ffffff_58%)] p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search job, booking, customer, phone, venue..."
                    className="h-11 rounded-2xl border-[#ddd3f2] bg-white pl-11 text-sm shadow-sm focus-visible:ring-[#7c3aed]"
                  />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="h-11 rounded-2xl border-[#ddd3f2] bg-white shadow-sm">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {FLOW_STAGES.map((stage) => <SelectItem key={stage.key} value={stage.key}>{stage.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 rounded-2xl border-[#ddd3f2] bg-white shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11 rounded-2xl border-[#ddd3f2] bg-white shadow-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Rental & Sale</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11">
                {FLOW_STAGES.map((stage) => {
                  const Icon = stage.icon
                  const isActive = stageFilter === stage.key
                  return (
                    <button
                      key={stage.key}
                      onClick={() => setStageFilter(isActive ? "all" : stage.key)}
                      className={`group rounded-2xl border p-3 text-left transition-all ${
                        isActive
                          ? "border-[#7c3aed] bg-[#f4efff] shadow-[0_12px_30px_rgba(124,58,237,0.16)]"
                          : "border-[#e5def2] bg-white shadow-sm hover:border-[#c8b5ef] hover:bg-[#fbf8ff]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-[#6d28d9] text-white" : "bg-[#f4efff] text-[#5b21b6]"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="rounded-full border border-[#dfd2f6] bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#5b21b6]">{stageCounts[stage.key] || 0}</span>
                      </div>
                      <p className="mt-2 truncate text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-700">{stage.short}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
          {loading ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[26px] border border-[#e5def2] bg-white shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7c3aed] border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-slate-500">Loading connected jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[26px] border border-dashed border-[#d8c9f2] bg-white text-center shadow-sm">
              <ClipboardList className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-lg font-bold text-slate-800">No jobs found</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">Try changing the search or filters. No data has been changed.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {paginatedJobs.map((job) => {
                const isRental = job.is_rental ?? isRentalSource(job.booking_source)
                const activeTask = getActiveTask(job)
                const currentStage = getCurrentStage(job)
                const totalTasks = job.work_order_tasks?.length || 0
                const completedTasks = job.work_order_tasks?.filter((task) => task.status === "completed" || task.status === "picked").length || 0
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                const priority = getPriority(job.event_date)
                const CurrentIcon = currentStage.icon
                const isReminding = !!activeTask?.id && remindingIds.has(activeTask.id)

                return (
                  <Card key={job.id} className="overflow-hidden rounded-[24px] border-[#e1d7f4] bg-white shadow-[0_18px_55px_rgba(91,33,182,0.08)]">
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-extrabold tracking-wide text-[#5b21b6]">{job.work_order_number}</span>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="truncate text-xs font-bold text-slate-500">{job.booking_number}</span>
                              <Badge variant="outline" className={isRental ? "border-[#c4b5fd] bg-[#f5f3ff] text-[#5b21b6]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                                {isRental ? <ArrowRightLeft className="mr-1 h-3 w-3" /> : null}{isRental ? "Rental" : "Sale"}
                              </Badge>
                            </div>
                            <h2 className="mt-2 truncate text-xl font-extrabold tracking-tight text-slate-950">{job.customer_name || "N/A"}</h2>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(job.event_date)}</span>
                              {job.venue_address ? <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5" /> <span className="max-w-[280px] truncate">{job.venue_address}</span></span> : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Badge variant="outline" className={`${priority.className} rounded-full px-3 py-1 text-[11px] font-bold`}>{priority.label}</Badge>
                            <Badge variant="outline" className={`${statusClasses[job.status] || statusClasses.pending} rounded-full px-3 py-1 text-[11px] font-bold capitalize`}>{normalizeStatus(job.status)}</Badge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#e7def5] bg-white p-3 shadow-[0_10px_28px_rgba(91,33,182,0.05)]">
                          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                            <span>Operations Progress</span>
                            <span className="font-extrabold text-[#4c1d95]">{completedTasks}/{totalTasks} • {progress}%</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[#f1edf8]">
                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#2f1c6a,#7c3aed)] transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {FLOW_STAGES.filter((stage) => stage.key !== "bookings").map((stage) => {
                              const StageIcon = stage.icon
                              const task = getStageTask(job, stage.key)
                              const done = task?.status === "completed" || task?.status === "picked"
                              const active = activeTask?.department === stage.key
                              return (
                                <span
                                  key={stage.key}
                                  title={`${stage.label}: ${task ? normalizeStatus(task.status) : "Not created"}`}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                    done
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : active
                                        ? "border-[#c4b5fd] bg-[#f4efff] text-[#5b21b6]"
                                        : task
                                          ? "border-[#e2d8f5] bg-[#fbf9ff] text-slate-600"
                                          : "border-slate-200 bg-slate-50 text-slate-400"
                                  }`}
                                >
                                  <StageIcon className="h-3 w-3" /> {stage.short}
                                </span>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-[#e7def5] bg-[#fcfbff] p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efff] text-[#5b21b6]">
                              <CurrentIcon className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Current Stage</p>
                              <p className="truncate text-sm font-extrabold text-slate-900">{currentStage.label}</p>
                              <p className="truncate text-xs text-slate-500">{activeTask?.title || "All workflow stages completed"}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!activeTask?.id || isReminding}
                              onClick={() => handleRemind(activeTask?.id)}
                              className="rounded-full border-[#d6c8f4] bg-white text-[#4c1d95] hover:bg-[#f5f0ff]"
                            >
                              <Bell className="mr-1.5 h-3.5 w-3.5" /> {isReminding ? "Reminded" : "Remind"}
                            </Button>
                            <Button asChild size="sm" className="rounded-full bg-[#2f155f] !text-white shadow-[0_10px_24px_rgba(47,21,95,0.28)] hover:bg-[#1f0f43] [&_*]:!text-white">
                              <Link className="job-tracker-track-button inline-flex items-center" href={`/job-tracker/${job.id}`}>Track This Job <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </DashboardErrorBoundary>
  )
}












