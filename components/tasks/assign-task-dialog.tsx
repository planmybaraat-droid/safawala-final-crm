"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Clock, Eye } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/lib/types"
import { createClient } from "@/lib/supabase"
import { TaskListDialog } from "./task-list-dialog"
import { NotificationSystem } from "@/lib/notification-system"

interface AssignTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: User
  onSuccess?: () => void
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  franchise_id: string | null
}

export function AssignTaskDialog({ open, onOpenChange, currentUser, onSuccess }: AssignTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showTaskList, setShowTaskList] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (open) {
      fetchStaffMembers()
      resetForm()
    }
  }, [open, currentUser])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setAssignedTo("")
    setDueDate("")
    setDueTime("")
    setPriority("medium")
  }

  const fetchStaffMembers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from("users")
        .select("id, name, email, role, franchise_id")
        .eq("is_active", true)

      if (currentUser.role === "staff" || currentUser.role === "franchise_admin") {
        if (currentUser.franchise_id) {
          query = query.or(`franchise_id.eq.${currentUser.franchise_id},role.eq.super_admin`)
        } else {
          query = query.eq("role", "super_admin")
        }
      }

      const { data, error } = await query.order("name")

      if (error) {
        console.error("Error fetching staff:", error)
        toast.error("Failed to load staff members")
        return
      }

      // Filter out current user from assignees list to make it cleaner,
      // but still let them select themselves if needed. Actually, let's keep all.
      setStaffMembers(data || [])
    } catch (error) {
      console.error("Error fetching staff:", error)
      toast.error("Failed to load staff members")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !assignedTo || !dueDate) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setSubmitting(true)
      console.log("[v0] Starting task creation process...")

      const dueDatetime = new Date(dueDate)
      if (dueTime) {
        const [hours, minutes] = dueTime.split(":")
        dueDatetime.setHours(Number.parseInt(hours), Number.parseInt(minutes))
      } else {
        // Set default time to 9 AM if no time specified
        dueDatetime.setHours(9, 0, 0, 0)
      }

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        assigned_by: currentUser.id,
        due_date: dueDatetime.toISOString(),
        priority,
        status: "pending",
        franchise_id: currentUser.franchise_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Task data being sent:", taskData)

      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      })

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error creating task:", errorData)
        toast.error("Failed to assign task")
        return
      }

      const result = await response.json()
      console.log("[v0] Task created successfully:", result)

      try {
        console.log("[v0] Creating task assignment notification...")
        await NotificationSystem.notifyTaskAssigned({
          id: result.task?.id || result.id,
          title: title.trim(),
          assigned_to: assignedTo,
          assigned_by: currentUser.id,
          due_date: dueDatetime.toISOString(),
          priority,
          franchise_id: currentUser.franchise_id,
        })
        console.log("[v0] Task assignment notification created successfully")
      } catch (notificationError) {
        console.error("[v0] Error creating task notification:", notificationError)
        // Don't fail the task creation if notification fails
      }

      toast.success("Task assigned successfully!")
      resetForm()
      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error assigning task:", error)
      toast.error("Failed to assign task")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Assign Task
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTaskList(true)} className="ml-2">
                <Eye className="h-4 w-4 mr-1" />
                View Tasks
              </Button>
            </DialogTitle>
            <DialogDescription>Create and assign a new task to a staff member</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Task Description / Notes</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description or notes"
                rows={3}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} required>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {loading ? (
                    <SelectItem value="loading" disabled>
                      Loading staff...
                    </SelectItem>
                  ) : staffMembers.length > 0 ? (
                    staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role.replace("_", " ")})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-staff" disabled>
                      No staff members found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      console.log("[v0] Date selected:", e.target.value)
                      setDueDate(e.target.value)
                    }}
                    min={today}
                    required
                    className="pl-10 bg-white border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueTime">Due Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dueTime"
                    type="time"
                    value={dueTime}
                    onChange={(e) => {
                      console.log("[v0] Time selected:", e.target.value)
                      setDueTime(e.target.value)
                    }}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? "Assigning..." : "Assign Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TaskListDialog open={showTaskList} onOpenChange={setShowTaskList} currentUser={currentUser} />
    </>
  )
}
