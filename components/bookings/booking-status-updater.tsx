"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface BookingStatusUpdaterProps {
  bookingId: string
  currentStatus: string
  onStatusUpdate: (newStatus: string) => void
}

export function BookingStatusUpdater({ bookingId, currentStatus, onStatusUpdate }: BookingStatusUpdaterProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)

  const statusOptions = [
    { value: "pending_payment", label: "Pending Payment", variant: "warning" as const },
    { value: "pending_selection", label: "Pending Selection", variant: "info" as const },
    { value: "confirmed", label: "Confirmed", variant: "default" as const },
    { value: "delivered", label: "Delivered", variant: "success" as const },
    { value: "returned", label: "Rental Completed", variant: "secondary" as const },
    { value: "order_complete", label: "Order Complete", variant: "success" as const },
    { value: "cancelled", label: "Cancelled", variant: "destructive" as const },
  ]

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)

      if (error) throw error

      onStatusUpdate(selectedStatus)
      toast({
        title: "Success",
        description: "Booking status updated successfully",
      })
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const currentStatusConfig = statusOptions.find((option) => option.value === currentStatus)

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        {currentStatusConfig && <Badge variant={currentStatusConfig.variant}>{currentStatusConfig.label}</Badge>}
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Update Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedStatus !== currentStatus && (
          <Button onClick={handleStatusUpdate} disabled={loading} size="sm">
            {loading ? "Updating..." : "Update"}
          </Button>
        )}
      </div>
    </div>
  )
}
