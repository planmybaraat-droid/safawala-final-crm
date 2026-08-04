"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BookingForm } from "./booking-form"
import { useData } from "@/hooks/use-data"
import { useToast } from "@/hooks/use-toast"
import type { Customer, Product } from "@/lib/types"

interface BookingFormDialogProps {
  onSuccess?: () => void
}

export function BookingFormDialog({ onSuccess }: BookingFormDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  const { data: customers = [] } = useData<Customer[]>("customers")
  const { data: products = [] } = useData<Product[]>("products")

  const handleSubmit = async (bookingData: any) => {
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        throw new Error("Failed to create booking")
      }

      toast({
        title: "Success",
        description: "Booking created successfully",
      })

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Quick Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[80vh] pr-6">
          <BookingForm
            customers={customers || []}
            products={products || []}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}