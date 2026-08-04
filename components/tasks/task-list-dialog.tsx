"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { User as UserType } from "@/lib/types"

interface TaskListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: UserType
}

interface Task {
  id: string
  title: string
  description: string | null
  assigned_to: string
  assigned_by: string
  due_date: string
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "completed"
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
}

export function TaskListDialog({ open, onOpenChange, currentUser }: TaskListDialogProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      fetchTasks()
    }
  }, [open, currentUser])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      console.log("[v0] Starting task fetch for user:", {
        id: currentUser.id,
        role: currentUser.role,
        franchise_id: currentUser.franchise_id,
      })

      const params = new URLSearchParams({
        userId: currentUser.id,
        userRole: currentUser.role,
        franchiseId: currentUser.franchise_id || "null",
      })

      const response = await fetch(`/api/tasks?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error fetching tasks:", errorData)
        toast.error("Failed to load tasks")
        return
      }

      const result = await response.json()
      console.log("[v0] Tasks fetched successfully:", result.tasks?.length || 0, "tasks")
      console.log("[v0] Task data:", result.tasks)
      setTasks(result.tasks || [])
    } catch (error) {
      console.error("[v0] Error fetching tasks:", error)
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: "pending" | "in_progress" | "completed") => {
    try {
      setUpdatingTasks((prev) => new Set(prev).add(taskId))
      console.log("[v0] Updating task status:", { taskId, newStatus, updatedBy: currentUser.id })

      const response = await fetch("/api/tasks/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          status: newStatus,
          updatedBy: currentUser.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error updating task status:", errorData)
        toast.error("Failed to update task status")
        return
      }

      console.log("[v0] Task status updated successfully")
      // Update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus, updated_at: new Date().toISOString() } : task,
        ),
      )

      toast.success("Task status updated successfully!")
    } catch (error) {
      console.error("[v0] Error updating task status:", error)
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Task Management</DialogTitle>
          <DialogDescription>View and manage assigned tasks. Staff can mark tasks as completed.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading tasks...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No tasks found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={(checked) => handleTaskCheck(task, checked as boolean)}
                        disabled={
                          updatingTasks.has(task.id) ||
                          (currentUser.role === "staff" && task.assigned_to !== currentUser.id)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4
                            className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                          >
                            {task.title}
                          </h4>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>

                        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <span>Assigned to: {task.assigned_to_user?.name || "Unknown"}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Due: {format(new Date(task.due_date), "MMM dd, yyyy")}</span>
                          </div>
                          {new Date(task.due_date) < new Date() && task.status !== "completed" && (
                            <div className="flex items-center space-x-1 text-red-600">
                              <AlertCircle className="h-3 w-3" />
                              <span>Overdue</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
