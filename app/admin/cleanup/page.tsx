"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Database, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function CleanupPage() {
  const [isCleaningChats, setIsCleaningChats] = useState(false)
  const [isCleaningLogs, setIsCleaningLogs] = useState(false)

  const handleCleanupChats = async () => {
    if (!window.confirm("Delete team chat messages older than 30 days? This cannot be undone.")) return
    setIsCleaningChats(true)
    try {
      const response = await fetch("/api/admin/cleanup-chats", {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Chat Cleanup Completed",
          description: `Cleaned up old chat data. ${result.message}`,
        })
      } else {
        throw new Error("Cleanup failed")
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up chat data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCleaningChats(false)
    }
  }

  const handleCleanupLogs = async () => {
    if (!window.confirm("Delete expired activity and integration logs? This cannot be undone.")) return
    setIsCleaningLogs(true)
    try {
      const response = await fetch("/api/admin/cleanup-logs", {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Logs Cleanup Completed",
          description: `Cleaned up old log data. ${result.message}`,
        })
      } else {
        throw new Error("Cleanup failed")
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up log data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCleaningLogs(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Database Cleanup</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Chat Data Cleanup
            </CardTitle>
            <CardDescription>Remove old chat messages and rooms to improve performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                This will delete chat messages older than 30 days and empty chat rooms. CRM data will not be affected.
              </div>
            </div>
            <Button onClick={handleCleanupChats} disabled={isCleaningChats} className="w-full">
              {isCleaningChats ? "Cleaning..." : "Clean Up Chat Data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Activity Logs Cleanup
            </CardTitle>
            <CardDescription>Remove old activity and integration logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                This will delete activity logs older than 90 days and integration logs older than 30 days. Recent audit
                trails will be preserved.
              </div>
            </div>
            <Button onClick={handleCleanupLogs} disabled={isCleaningLogs} className="w-full">
              {isCleaningLogs ? "Cleaning..." : "Clean Up Log Data"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
