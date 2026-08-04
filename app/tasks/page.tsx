"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarIcon,
  AlertCircle,
  Plus,
  ArrowLeft,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  MessageSquare,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  ClipboardList
} from "lucide-react"
import { format, isPast } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { AssignTaskDialog } from "@/components/tasks/assign-task-dialog"
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog"
import type { User as UserType } from "@/lib/types"

interface Task {
  id: string
  title: string
  description: string | null
  assigned_to: string
  assigned_by: string
  due_date: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  franchise_id: string | null
  created_at: string
  updated_at: string
  assigned_to_user?: {
    name: string
    email: string
  }
  assigned_by_user?: {
    name: string
    email: string
  }
  task_comments?: { id: string }[]
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
  // Dialog controls
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Filters state
  const [viewType, setViewType] = useState<"board" | "list">("board")
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [scopeFilter, setScopeFilter] = useState<string>("all") // all, assigned_to_me, created_by_me

  const router = useRouter()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchTasks()
    }
  }, [currentUser, scopeFilter]) // Re-fetch when scope changes

  const fetchCurrentUser = async () => {
    try {
      setAuthError(null)

      // 1. Try to load from localStorage first
      const userStr = localStorage.getItem("safawala_user")
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          if (user && user.id) {
            console.log("Loaded user from localStorage:", user)
            setCurrentUser(user)
            setAuthResolved(true)
            return
          }
        } catch (e) {
          console.error("Failed to parse safawala_user from localStorage:", e)
          localStorage.removeItem("safawala_user")
        }
      }

      // 2. Try Supabase Auth
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single()

        if (!error && userData) {
          console.log("Loaded user from Supabase auth:", userData)
          setCurrentUser(userData)
          localStorage.setItem("safawala_user", JSON.stringify(userData))
          setAuthResolved(true)
          return
        }
      }

      console.warn("Tasks page: no authenticated session found")
      setCurrentUser(null)
      setAuthError("Please log in to access Tasks Center.")
    } catch (error) {
      console.error("Error fetching current user:", error)
      setCurrentUser(null)
      setAuthError("Failed to load your session. Please sign in again.")
      toast.error("Failed to load user session")
    } finally {
      setAuthResolved(true)
    }
  }

  const fetchTasks = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("assignmentType", scopeFilter)

      const response = await fetch(`/api/tasks?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error fetching tasks:", errorData)
        toast.error("Failed to load tasks")
        return
      }

      const result = await response.json()
      setTasks(result.tasks || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    try {
      setUpdatingTasks((prev) => new Set(prev).add(taskId))

      const response = await fetch("/api/tasks/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: newStatus,
          updatedBy: currentUser?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error updating task status:", errorData)
        toast.error("Failed to update task status")
        return
      }

      const data = await response.json()
      
      // Update local state
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? data.task : task))
      )

      // If active details dialog is open for this task, update it
      if (selectedTask?.id === taskId) {
        setSelectedTask(data.task)
      }

      toast.success("Task status updated successfully!")
    } catch (error) {
      console.error("Error updating task status:", error)
      toast.error("Failed to update task status")
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleTaskCheck = (task: Task, checked: boolean) => {
    const newStatus = checked ? "completed" : "pending"
    updateTaskStatus(task.id, newStatus)
  }

  // Handle updates from Details Dialog
  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
    setSelectedTask(updatedTask)
  }

  // Filter tasks locally based on search, status, and priority filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      const matchesStatus = statusFilter === "all" || task.status === statusFilter

      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [tasks, searchQuery, priorityFilter, statusFilter])

  // Split tasks into statuses for Kanban board
  const boardTasks = useMemo(() => {
    const groups = {
      pending: [] as Task[],
      in_progress: [] as Task[],
      completed: [] as Task[],
      cancelled: [] as Task[],
    }

    filteredTasks.forEach((task) => {
      if (task.status in groups) {
        groups[task.status].push(task)
      } else {
        groups.pending.push(task)
      }
    })

    return groups
  }, [filteredTasks])

  // Compute metrics stats
  const stats = useMemo(() => {
    const total = tasks.length
    const pendingOrProgress = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length
    const completed = tasks.filter((t) => t.status === "completed").length
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled" && isPast(new Date(t.due_date))
    ).length

    return { total, pendingOrProgress, completed, overdue }
  }, [tasks])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "low":
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500"
      case "high":
        return "border-l-orange-500"
      case "medium":
        return "border-l-blue-500"
      case "low":
      default:
        return "border-l-slate-400"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const handleCardClick = (task: Task) => {
    setSelectedTask(task)
    setShowDetailsDialog(true)
  }

  if (!authResolved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground animate-pulse">Loading Tasks Center...</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication required</CardTitle>
            <CardDescription>{authError || "Please sign in to continue."}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
            <Button variant="outline" onClick={fetchCurrentUser}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-blue-600" /> Tasks & Tickets
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Assign tasks, track status, and coordinate with staff members.
            </p>
          </div>
        </div>

        <Button onClick={() => setShowAssignDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md self-start md:self-auto px-5 py-2.5">
          <Plus className="h-4 w-4 mr-2" />
          Assign New Task
        </Button>
      </div>

      {/* Metrics panel */}
      {loading && tasks.length === 0 ? null : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tickets</p>
                <p className="text-3xl font-black text-slate-800">{stats.total}</p>
              </div>
              <div className="h-10 w-10 bg-slate-50 border rounded-lg flex items-center justify-center text-slate-600">
                <ClipboardList className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open (Pending / Active)</p>
                <p className="text-3xl font-black text-blue-600">{stats.pendingOrProgress}</p>
              </div>
              <div className="h-10 w-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
                <p className="text-3xl font-black text-green-600">{stats.completed}</p>
              </div>
              <div className="h-10 w-10 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</p>
                <p className="text-3xl font-black text-red-600">{stats.overdue}</p>
              </div>
              <div className="h-10 w-10 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and View toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search bar */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white text-xs"
            />
          </div>

          {/* Scope selection */}
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-[150px] h-9 bg-white text-xs border-slate-200">
              <SlidersHorizontal className="h-3 w-3 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all" className="text-xs">All Tasks</SelectItem>
              <SelectItem value="assigned_to_me" className="text-xs">Assigned to Me</SelectItem>
              <SelectItem value="created_by_me" className="text-xs">Created by Me</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-white text-xs border-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
              <SelectItem value="low" className="text-xs">Low</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="high" className="text-xs">High</SelectItem>
              <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter (Only visible in List view) */}
          {viewType === "list" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-white text-xs border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <Button
            variant={viewType === "board" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setViewType("board")
              // Reset status filter for board view
              setStatusFilter("all")
            }}
            className={`h-7 px-3 text-xs gap-1.5 rounded-md ${viewType === "board" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </Button>
          <Button
            variant={viewType === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewType("list")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-md ${viewType === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </Button>
        </div>
      </div>

      {/* Main tasks contents */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-sm font-semibold text-slate-600">Retrieving tickets...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm text-center">
          <ClipboardList className="h-16 w-16 text-slate-300 stroke-1 mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-700">No Tickets Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1 px-4">
            Try adjusting your search query, priority filters, or change your scope view.
          </p>
        </div>
      ) : viewType === "board" ? (
        /* Kanban Board view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {/* Column definitions */}
          {(["pending", "in_progress", "completed", "cancelled"] as const).map((statusKey) => {
            const columnTasks = boardTasks[statusKey]
            const headingMap = {
              pending: { label: "Pending", color: "bg-yellow-500 text-yellow-50", badge: "bg-yellow-50 text-yellow-800 border-yellow-100" },
              in_progress: { label: "In Progress", color: "bg-blue-600 text-blue-50", badge: "bg-blue-50 text-blue-800 border-blue-100" },
              completed: { label: "Completed", color: "bg-green-600 text-green-50", badge: "bg-green-50 text-green-800 border-green-100" },
              cancelled: { label: "Cancelled", color: "bg-red-500 text-red-50", badge: "bg-red-50 text-red-800 border-red-100" },
            }
            const config = headingMap[statusKey]

            return (
              <div key={statusKey} className="flex flex-col bg-slate-50/70 border border-slate-100 rounded-xl p-3 h-full max-h-[70vh] shadow-inner">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3.5 px-1 pb-2 border-b border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusKey === "pending" ? "bg-yellow-400" : statusKey === "in_progress" ? "bg-blue-500" : statusKey === "completed" ? "bg-green-500" : "bg-red-500"}`} />
                    <h3 className="font-bold text-sm text-slate-700">{config.label}</h3>
                  </div>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded border font-semibold ${config.badge}`}>
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Column cards container */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1 max-h-[55vh]">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 font-medium">Empty column</span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isOverdue = task.status !== "completed" && task.status !== "cancelled" && isPast(new Date(task.due_date))
                      const commentCount = task.task_comments?.length || 0

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleCardClick(task)}
                          className={`bg-white border rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 ${getPriorityBorderColor(task.priority)}`}
                        >
                          <div className="space-y-2">
                            {/* Card badge indicators */}
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className={`text-[10px] font-semibold border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                              {commentCount > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 font-semibold">
                                  <MessageSquare className="h-3 w-3" />
                                  {commentCount}
                                </div>
                              )}
                            </div>

                            {/* Card title and description snippet */}
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 leading-snug line-clamp-2">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Card footer details */}
                            <div className="flex items-center justify-between gap-2 border-t pt-2 mt-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1 font-medium text-slate-500">
                                <User className="h-3 w-3 text-slate-400" />
                                {task.assigned_to_user?.name?.split(" ")[0] || "Staff"}
                              </span>
                              <span className={`flex items-center gap-1 font-medium ${isOverdue ? "text-red-600 font-bold" : "text-slate-400"}`}>
                                {isOverdue ? (
                                  <>
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                    Overdue
                                  </>
                                ) : (
                                  <>
                                    <CalendarIcon className="h-3 w-3 text-slate-400" />
                                    {format(new Date(task.due_date), "MMM dd")}
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List Table view */
        <Card className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 w-20 text-center">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const isOverdue = task.status !== "completed" && task.status !== "cancelled" && isPast(new Date(task.due_date))
                  const commentCount = task.task_comments?.length || 0

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/50 cursor-pointer group transition-colors"
                      onClick={() => handleCardClick(task)}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={task.status === "completed"}
                          onCheckedChange={(checked) => handleTaskCheck(task, checked as boolean)}
                          disabled={updatingTasks.has(task.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="leading-tight">
                          <span className={`font-semibold text-sm ${task.status === "completed" ? "line-through text-slate-400 font-medium" : "text-slate-800 group-hover:text-blue-600"}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className={`text-[10px] capitalize font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <div className="h-5 w-5 bg-slate-100 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-700 uppercase border border-slate-200">
                            {task.assigned_to_user?.name?.slice(0, 2) || "ST"}
                          </div>
                          {task.assigned_to_user?.name || "Staff"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <div className="h-5 w-5 bg-slate-100 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-700 uppercase border border-slate-200">
                            {task.assigned_by_user?.name?.slice(0, 2) || "AD"}
                          </div>
                          {task.assigned_by_user?.name || "Admin"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="leading-tight">
                          <p className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                            {format(new Date(task.due_date), "MMM dd, yyyy")}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {format(new Date(task.due_date), "hh:mm a")}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {commentCount > 0 ? (
                          <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 font-semibold">
                            <MessageSquare className="h-3 w-3 text-slate-400" />
                            {commentCount}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assign Task modal */}
      {currentUser && (
        <AssignTaskDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          currentUser={currentUser}
          onSuccess={fetchTasks}
        />
      )}

      {/* Task Details modal */}
      {currentUser && (
        <TaskDetailsDialog
          task={selectedTask}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          currentUser={currentUser}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  )
}
