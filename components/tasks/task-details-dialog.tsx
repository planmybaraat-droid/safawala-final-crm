"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon, Clock, User, MessageSquare, Send, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
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
}

interface Comment {
  id: string
  comment: string
  created_at: string
  user_id: string
  commenter?: {
    name: string
    email: string
    role: string
  }
}

interface TaskDetailsDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: UserType
  onTaskUpdated: (updatedTask: Task) => void
}

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  currentUser,
  onTaskUpdated,
}: TaskDetailsDialogProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)

  useEffect(() => {
    if (open && task) {
      fetchComments()
    }
  }, [open, task?.id])

  const fetchComments = async () => {
    if (!task) return
    try {
      setLoadingComments(true)
      const response = await fetch(`/api/tasks/comments?taskId=${task.id}`)
      if (!response.ok) {
        throw new Error("Failed to load comments")
      }
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("Error loading task comments:", error)
      toast.error("Failed to load comments")
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !newComment.trim() || submittingComment) return

    try {
      setSubmittingComment(true)
      const response = await fetch("/api/tasks/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          comment: newComment.trim(),
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to post comment")
      }

      const data = await response.json()
      setComments((prev) => [...prev, data.comment])
      setNewComment("")
      
      // Propagate comment count update to parent
      const updatedCommentsList = [...(task.task_comments || []), { id: data.comment.id }]
      onTaskUpdated({
        ...task,
        task_comments: updatedCommentsList
      })

      toast.success("Comment posted successfully")
    } catch (error: any) {
      console.error("Error adding comment:", error)
      toast.error(error.message || "Failed to post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleUpdateTaskField = async (field: "status" | "priority", value: string) => {
    if (!task || updatingTask) return

    try {
      setUpdatingTask(true)
      const response = await fetch("/api/tasks/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          [field]: value,
          updatedBy: currentUser.id,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to update task")
      }

      const data = await response.json()
      onTaskUpdated(data.task)
      toast.success(`Task ${field} updated to ${value.replace("_", " ")}`)
    } catch (error: any) {
      console.error(`Error updating task ${field}:`, error)
      toast.error(error.message || "Failed to update task")
    } finally {
      setUpdatingTask(false)
    }
  }

  if (!task) return null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white hover:bg-red-600"
      case "high":
        return "bg-orange-500 text-white hover:bg-orange-600"
      case "medium":
        return "bg-blue-500 text-white hover:bg-blue-600"
      case "low":
        return "bg-slate-500 text-white hover:bg-slate-600"
      default:
        return "bg-slate-500 text-white"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  // Check if current user is allowed to make updates
  const canUpdate = 
    currentUser.role === "super_admin" || 
    (currentUser.role === "franchise_admin" && task.franchise_id === currentUser.franchise_id) ||
    task.assigned_to === currentUser.id ||
    task.assigned_by === currentUser.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-white overflow-hidden p-6 rounded-xl shadow-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className={`capitalize font-semibold border ${getStatusColor(task.status)}`}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={`capitalize font-semibold ${getPriorityColor(task.priority)}`}>
              {task.priority} Priority
            </Badge>
            {task.franchise_id && (
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-800">
                Franchise Task
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-800 break-words">{task.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Created on {format(new Date(task.created_at), "MMM dd, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4 flex-1 overflow-hidden">
          {/* Left Column: Details & Edit */}
          <div className="md:col-span-3 space-y-4 flex flex-col justify-between overflow-y-auto pr-2 max-h-[50vh] md:max-h-full">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap min-h-[80px] border border-slate-100">
                  {task.description || <span className="text-slate-400 italic">No description provided.</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Assigned To</span>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 uppercase">
                      {task.assigned_to_user?.name?.slice(0, 2) || "ST"}
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-slate-700">{task.assigned_to_user?.name || "Staff"}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">{task.assigned_to_user?.email || ""}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Assigned By</span>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 uppercase">
                      {task.assigned_by_user?.name?.slice(0, 2) || "AD"}
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-slate-700">{task.assigned_by_user?.name || "Admin"}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">{task.assigned_by_user?.email || ""}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                  <div className="leading-tight">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Due Date</p>
                    <p className="text-xs font-semibold">{format(new Date(task.due_date), "MMM dd, yyyy")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <div className="leading-tight">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Due Time</p>
                    <p className="text-xs font-semibold">{format(new Date(task.due_date), "h:mm a")}</p>
                  </div>
                </div>
              </div>
            </div>

            {canUpdate && (
              <div className="space-y-3 border-t pt-4 bg-white sticky bottom-0">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Update Status & Priority</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="detail-status" className="text-xs text-slate-500">Status</Label>
                    <Select
                      value={task.status}
                      onValueChange={(val) => handleUpdateTaskField("status", val)}
                      disabled={updatingTask}
                    >
                      <SelectTrigger id="detail-status" className="h-9 bg-white border border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="detail-priority" className="text-xs text-slate-500">Priority</Label>
                    <Select
                      value={task.priority}
                      onValueChange={(val) => handleUpdateTaskField("priority", val)}
                      disabled={updatingTask}
                    >
                      <SelectTrigger id="detail-priority" className="h-9 bg-white border border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Activity / Comments */}
          <div className="md:col-span-2 flex flex-col h-full border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                onClick={fetchComments}
                disabled={loadingComments}
              >
                <RefreshCw className={`h-3 w-3 ${loadingComments ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Comments scroll list */}
            <ScrollArea className="flex-1 bg-slate-50/50 rounded-xl p-3 border border-slate-100 mb-3 h-[250px] md:h-auto">
              {loadingComments && comments.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <span className="text-xs text-slate-400 flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Loading comments...
                  </span>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-center p-4">
                  <MessageSquare className="h-8 w-8 stroke-1 text-slate-300 mb-1" />
                  <p className="text-xs font-medium">No comments yet</p>
                  <p className="text-[10px]">Add a comment below to start the conversation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">{comment.commenter?.name || "User"}</span>
                          <span className="text-[9px] uppercase px-1 bg-slate-100 text-slate-600 rounded">
                            {comment.commenter?.role?.replace("_", " ") || "Staff"}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {format(new Date(comment.created_at), "MMM dd, hh:mm a")}
                        </span>
                      </div>
                      <p className="text-slate-600 whitespace-pre-wrap leading-normal">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Post comment input */}
            <form onSubmit={handleAddComment} className="flex gap-1.5 mt-auto pt-2 bg-white border-t">
              <Textarea
                placeholder="Type a comment or status update..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submittingComment}
                className="min-h-[38px] h-9 resize-none bg-white py-2 px-3 text-xs flex-1 rounded-lg border border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment(e)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim() || submittingComment}
                className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shadow"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-5">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
