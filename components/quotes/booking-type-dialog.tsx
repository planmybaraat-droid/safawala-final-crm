"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Package, ShoppingBag } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BookingTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  mode?: "quote" | "order"
}

export function BookingTypeDialog({
  open,
  onOpenChange,
  title = "Select Booking Type",
  description = "Choose the type of booking you want to create",
  mode = "quote",
}: BookingTypeDialogProps) {
  const router = useRouter()

  const handleSelectType = (type: "product" | "package") => {
    onOpenChange(false)
    
    if (mode === "quote") {
      router.push(`/quotes/new?type=${type}`)
    } else {
      // All bookings now use the unified create-invoice page
      router.push(`/create-invoice`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectType("product")}
          >
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Product Booking</CardTitle>
                  <CardDescription className="mt-1.5">
                    Select individual products for sale or rental. Perfect for customers who want
                    to choose specific items.
                  </CardDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs bg-muted px-2 py-1 rounded">Individual Items</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">Sale or Rent</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">Custom Selection</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectType("package")}
          >
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Package Booking</CardTitle>
                  <CardDescription className="mt-1.5">
                    Choose from pre-configured packages with bundled products. Great for
                    events with complete setups.
                  </CardDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs bg-muted px-2 py-1 rounded">Bundle Deals</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">Rental Only</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">Event Ready</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
