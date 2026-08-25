"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  UserCheck,
  Warehouse,
} from "lucide-react"

type WorkOrderTask = {
  id: string
  department: string
  task_number?: string
  title?: string
  status: string
  instructions?: string | null
  checklist?: Array<{ text: string; checked: boolean }>
  assignee_name?: string | null
  assignee_phone?: string | null
  due_date?: string | null
  completed_at?: string | null
  updated_at?: string | null
  created_at?: string | null
  metadata?: Record<string, any> | null
}

type WorkOrder = {
  id: string
  work_order_number: string
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
  items?: any[]
}

const FLOW_STAGES = [
  { key: "warehouse", label: "Warehouse Picking", portal: "Warehouse", icon: Warehouse, helper: "Inventory items are picked and prepared." },
  { key: "packing", label: "QC & Packing", portal: "QC", icon: Package, helper: "Items are quality checked, packed, and proofed." },
  { key: "dispatch", label: "Fulfillment", portal: "Fulfillment", icon: Truck, helper: "Dispatch, delivery or transit movement is handled." },
  { key: "event_team", label: "On-Ground Team (Stylist)", portal: "Styling", icon: MapPin, helper: "Event-side styling, handover, and on-ground work." },
  { key: "styling", label: "Styling Assignment", portal: "Styling", icon: UserCheck, helper: "Stylist assignment and styling task updates from the styling portal." },
  { key: "travels", label: "Travel Coordination", portal: "Fulfillment", icon: Truck, helper: "Travel, transit, hotels, and logistics coordination for the job." },
  { key: "returns", label: "Return Collection", portal: "Fulfillment", icon: RotateCcw, helper: "Rental items are collected after the event." },
  { key: "return_qc", label: "Return Quality Check", portal: "QC", icon: ShieldCheck, helper: "Returned items are checked for damage or missing quantity." },
  { key: "return_receiving", label: "Warehouse Receiving & Storage", portal: "Warehouse", icon: Warehouse, helper: "Items are received back and stored in warehouse." },
  { key: "accounts", label: "Accounts & Billing", portal: "Accounts", icon: DollarSign, helper: "Final billing, settlements, and pending amounts are closed." },
] as const

const isRentalSource = (source: string) => source === "product_orders" || source === "package_bookings"
const normalizeStatus = (value?: string) => value?.replace(/_/g, " ") || "Waiting"
const isDone = (task?: WorkOrderTask) => task?.status === "completed" || task?.status === "picked"

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const getStatusClass = (status?: string) => {
  switch (status) {
    case "completed":
    case "picked":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "active":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "shortage":
      return "border-rose-200 bg-rose-50 text-rose-700"
    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-500"
    default:
      return "border-slate-200 bg-slate-50 text-slate-600"
  }
}

export default function JobTrackerDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<string>("warehouse")

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

  useEffect(() => {
    async function fetchDetail() {
      if (!user || !params?.id) return
      try {
        setLoading(true)
        const response = await fetch(`/api/work-orders/${params.id}`)
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to fetch job")
        setWorkOrder(result.data)
        const firstOpen = (result.data?.work_order_tasks || []).find((task: WorkOrderTask) => !isDone(task) && task.status !== "cancelled")
        setSelectedStage(firstOpen?.department || result.data?.work_order_tasks?.[0]?.department || "warehouse")
      } catch (error: any) {
        console.error("[Job Tracker Detail] Failed to load job", error)
        toast.error(error.message || "Error loading job")
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params?.id, user])

  const stageRows = useMemo(() => {
    if (!workOrder) return []
    return FLOW_STAGES.map((stage) => ({
      ...stage,
      task: (workOrder.work_order_tasks || []).find((task) => task.department === stage.key),
    }))
  }, [workOrder])

  const selected = stageRows.find((stage) => stage.key === selectedStage) || stageRows[0]
  const totalTasks = workOrder?.work_order_tasks?.length || 0
  const completedTasks = workOrder?.work_order_tasks?.filter((task) => isDone(task)).length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const isRental = workOrder ? (workOrder.is_rental ?? isRentalSource(workOrder.booking_source)) : true

  if (!user) {
    return <DashboardLayout><div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">Loading Job Tracker...</div></DashboardLayout>
  }

  return (
    <DashboardErrorBoundary>
      <DashboardLayout userRole={user.role}>
        <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-7">
          <Button variant="ghost" onClick={() => router.push("/job-tracker")} className="gap-2 rounded-full text-slate-600 hover:bg-[#f4efff] hover:text-[#4c1d95]">
            <ArrowLeft className="h-4 w-4" /> Back to Job Tracker
          </Button>

          {loading ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-[#e5def2] bg-white shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7c3aed] border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-slate-500">Loading job details...</p>
            </div>
          ) : !workOrder ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-[#e5def2] bg-white text-center shadow-sm">
              <ClipboardList className="h-12 w-12 text-slate-300" />
              <h2 className="mt-3 text-xl font-bold text-slate-900">Job not found</h2>
              <p className="mt-1 text-sm text-slate-500">This job may be unavailable for your account.</p>
            </div>
          ) : (
            <section className="overflow-hidden rounded-[30px] border border-[#d9cdf5] bg-white shadow-[0_24px_75px_rgba(86,55,160,0.12)]">
              <div className="relative overflow-hidden border-b border-[#eadff8] bg-[linear-gradient(135deg,#ffffff_0%,#fbf8ff_52%,#efe7ff_100%)] px-5 py-7 sm:px-7">
                <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#7c3aed]/10 blur-3xl" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#e2d6f7] bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#5b21b6] shadow-sm">
                      <ClipboardList className="h-3.5 w-3.5" /> Job Tracker • {workOrder.work_order_number}
                    </div>
                    <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{workOrder.customer_name}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {workOrder.booking_number} • {isRental ? "Rental workflow" : "Sale workflow"} • Connected from booking, warehouse, QC, fulfillment, returns and accounts portals.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#e8ddf8] bg-white px-3 py-2"><Calendar className="h-4 w-4 text-[#6d28d9]" /> Event: {formatDate(workOrder.event_date)}</span>
                      {workOrder.venue_address ? <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#e8ddf8] bg-white px-3 py-2"><MapPin className="h-4 w-4 text-[#6d28d9]" /> <span className="max-w-[520px] truncate">{workOrder.venue_address}</span></span> : null}
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#e8ddf8] bg-white px-3 py-2"><UserCheck className="h-4 w-4 text-[#6d28d9]" /> {workOrder.customer_phone || "Phone N/A"}</span>
                    </div>
                  </div>
                  <div className="w-full rounded-3xl border border-[#e2d6f7] bg-white p-4 shadow-[0_16px_45px_rgba(91,33,182,0.10)] sm:w-auto sm:min-w-[220px]">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className="rounded-full border-[#d8c9f2] bg-[#f7f2ff] px-3 py-1 text-xs font-bold capitalize text-[#5b21b6]">{normalizeStatus(workOrder.status)}</Badge>
                      <span className="text-xs font-bold text-slate-400">Progress</span>
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-slate-950">{progress}%</div>
                    <p className="text-xs font-semibold text-slate-500">{completedTasks}/{totalTasks} stages completed</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1edf8]">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#32146c,#7c3aed)]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-h-[620px] lg:grid-cols-[430px_1fr]">                <aside className="border-r border-[#eee7fb] bg-[linear-gradient(180deg,#fbf9ff,#ffffff)] p-4 sm:p-6">
                  <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Booking → Return → Accounts Workflow</p>
                  <div className="space-y-2">
                    {stageRows.map((stage, index) => {
                      const Icon = stage.icon
                      const done = isDone(stage.task)
                      const active = selectedStage === stage.key
                      const missing = !stage.task
                      return (
                        <button
                          key={stage.key}
                          onClick={() => setSelectedStage(stage.key)}
                          className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                            active ? "border-[#8b5cf6] bg-white shadow-[0_14px_35px_rgba(124,58,237,0.14)]" : "border-transparent hover:border-[#e2d7f7] hover:bg-white"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${done ? "border-emerald-200 bg-emerald-50 text-emerald-600" : active ? "border-[#c4b5fd] bg-[#6d28d9] text-white" : "border-[#e3daf5] bg-white text-[#5b21b6]"}`}>
                              {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                            </span>
                            {index < stageRows.length - 1 ? <span className="mt-2 h-6 w-px bg-[#ded3f4]" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold text-slate-900">{stage.label}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{stage.task?.assignee_name ? `Assigned to ${stage.task.assignee_name}` : `${stage.portal} portal`}</p>
                            <Badge variant="outline" className={`mt-2 rounded-full px-2 py-0 text-[10px] font-bold capitalize ${getStatusClass(stage.task?.status)}`}>
                              {missing ? "Not created" : normalizeStatus(stage.task?.status)}
                            </Badge>
                          </div>
                          <ChevronRight className={`h-4 w-4 text-slate-300 ${active ? "text-[#6d28d9]" : ""}`} />
                        </button>
                      )
                    })}
                  </div>
                </aside>

                <main className="bg-white p-4 sm:p-6">
                  {selected ? (
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 rounded-[24px] border border-[#e4d9f6] bg-[linear-gradient(135deg,#ffffff,#fbf8ff)] p-5 shadow-[0_14px_40px_rgba(91,33,182,0.06)] sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7c3aed]">{selected.portal} Portal Stage</p>
                          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{selected.label}</h2>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{selected.helper}</p>
                        </div>
                        <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(selected.task?.status)}`}>
                          {selected.task ? normalizeStatus(selected.task.status) : "Not created"}
                        </Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="rounded-2xl border-[#eee7fb]">
                          <CardContent className="p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Task Number</p>
                            <p className="mt-2 text-sm font-extrabold text-slate-900">{selected.task?.task_number || "N/A"}</p>
                          </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-[#eee7fb]">
                          <CardContent className="p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Assigned To</p>
                            <p className="mt-2 text-sm font-extrabold text-slate-900">{selected.task?.assignee_name || "Portal team"}</p>
                            {selected.task?.assignee_phone ? <p className="text-xs text-slate-500">{selected.task.assignee_phone}</p> : null}
                          </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-[#eee7fb]">
                          <CardContent className="p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Updated</p>
                            <p className="mt-2 text-sm font-extrabold text-slate-900">{formatDate(selected.task?.completed_at || selected.task?.updated_at || selected.task?.created_at)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="rounded-[24px] border-[#eee7fb] shadow-sm">
                        <CardContent className="space-y-4 p-5">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Task Details</p>
                            <h3 className="mt-2 text-lg font-extrabold text-slate-900">{selected.task?.title || selected.label}</h3>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                              {selected.task?.instructions?.replace(/•/g, "").trim() || "No additional instructions are available for this stage."}
                            </p>
                          </div>

                          <div className="border-t border-[#eee7fb] pt-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Checklist</p>
                            {selected.task?.checklist?.length ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {selected.task.checklist.map((item, index) => (
                                  <div key={`${item.text}-${index}`} className="flex items-start gap-3 rounded-2xl border border-[#eee7fb] bg-[#fbf9ff] p-3">
                                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${item.checked ? "border-emerald-200 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-300"}`}>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-sm font-medium leading-5 text-slate-700">{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-[#ddd3f2] bg-[#fbf9ff] p-5 text-sm text-slate-500">
                                No checklist items found for this stage.
                              </div>
                            )}
                          </div>

                          {selected.task?.metadata && Object.keys(selected.task.metadata).length > 0 ? (
                            <div className="border-t border-[#eee7fb] pt-4">
                              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Portal Notes / Metadata</p>
                              <div className="grid gap-2 md:grid-cols-2">
                                {Object.entries(selected.task.metadata)
                                  .filter(([, value]) => value !== null && value !== "" && typeof value !== "object")
                                  .slice(0, 12)
                                  .map(([key, value]) => (
                                    <div key={key} className="rounded-2xl border border-[#eee7fb] bg-white p-3">
                                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{key.replace(/_/g, " ")}</p>
                                      <p className="mt-1 text-sm font-semibold text-slate-800">{String(value)}</p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
                      <ClipboardCheck className="h-12 w-12 text-slate-300" />
                      <h2 className="mt-3 text-xl font-bold text-slate-900">Choose a workflow stage</h2>
                      <p className="mt-1 max-w-md text-sm text-slate-500">Select any stage from the left timeline to view connected portal details.</p>
                    </div>
                  )}
                </main>
              </div>
            </section>
          )}
        </div>
      </DashboardLayout>
    </DashboardErrorBoundary>
  )
}


