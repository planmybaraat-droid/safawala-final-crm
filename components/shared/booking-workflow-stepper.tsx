"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, FileText, CalendarRange, Truck, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookingWorkflowStepperProps {
  currentStep: "customer" | "invoice" | "booking" | "delivery"
  accent?: "green" | "purple"
  customerId?: string
  bookingId?: string
  bookingNumber?: string
  deliveryId?: string
  customerData?: {
    name?: string
    phone?: string
    email?: string
    address?: string
    city?: string
  }
}

export function BookingWorkflowStepper({
  currentStep,
  accent = "green",
  customerId,
  bookingId,
  bookingNumber,
  deliveryId,
  customerData,
}: BookingWorkflowStepperProps) {
  const router = useRouter()
  const accentStrong = accent === "purple" ? "#5B2A86" : "#113c2c"

  // Define the steps
  const steps = [
    {
      key: "customer" as const,
      label: "Customer Profile",
      description: "View details & history",
      icon: User,
      getPath: () => (customerId ? `/customers/${customerId}` : null),
    },
    {
      key: "invoice" as const,
      label: "Booking Invoice",
      description: bookingId ? "Edit draft/invoice" : "Create new booking",
      icon: FileText,
      getPath: () => {
        if (bookingId) {
          return `/create-invoice?mode=edit&id=${bookingId}`
        }
        if (customerId && customerData) {
          const params = new URLSearchParams()
          if (customerData.name) params.append("customerName", customerData.name)
          if (customerData.phone) params.append("customerPhone", customerData.phone)
          if (customerData.email) params.append("customerEmail", customerData.email)
          return `/create-invoice?${params.toString()}`
        }
        return "/create-invoice"
      },
    },
    {
      key: "booking" as const,
      label: "Booking Details",
      description: bookingNumber ? `#${bookingNumber}` : "Track fulfillment",
      icon: CalendarRange,
      getPath: () => (bookingId ? `/bookings/${bookingId}` : null),
    },
    {
      key: "delivery" as const,
      label: "Delivery & Returns",
      description: "Dispatches & returns",
      icon: Truck,
      getPath: () => {
        if (deliveryId) {
          return `/deliveries?search=${deliveryId}`
        }
        if (bookingNumber) {
          return `/deliveries?search=${bookingNumber}`
        }
        return "/deliveries"
      },
    },
  ]

  // Determine the index of the current step
  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="w-full bg-white/70 backdrop-blur-md border border-slate-100 rounded-2xl p-5 mb-6 shadow-sm print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const path = step.getPath()
          const isCompleted = idx < currentStepIndex
          const isActive = idx === currentStepIndex
          const isUpcoming = idx > currentStepIndex
          const isClickable = !!path && !isActive

          const content = (
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 w-full text-left",
                isActive && "border shadow-sm",
                isClickable && "hover:bg-slate-50 cursor-pointer"
              )}
              style={isActive ? { backgroundColor: `${accentStrong}0D`, borderColor: `${accentStrong}26` } : undefined}
            >
              {/* Icon / Status badge */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "text-white",
                  isActive && "text-white shadow-md scale-105 animate-pulse-slow",
                  isUpcoming && "bg-slate-100 text-slate-400 border border-slate-200"
                )}
                style={isCompleted || isActive ? { backgroundColor: accentStrong } : undefined}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                )}
              </div>

              {/* Text metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isCompleted && "font-bold",
                      isActive && "font-bold",
                      isUpcoming && "text-slate-400"
                    )}
                    style={isCompleted || isActive ? { color: accentStrong } : undefined}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accentStrong }}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: accentStrong }}></span>
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs text-slate-500 truncate mt-0.5",
                    isActive && "font-medium"
                  )}
                  style={isActive ? { color: `${accentStrong}CC` } : undefined}
                >
                  {step.description}
                </p>
              </div>
            </div>
          )

          return (
            <div key={step.key} className="flex-1 flex items-center">
              {path && isClickable ? (
                <Link href={path} className="w-full">
                  {content}
                </Link>
              ) : (
                <div className="w-full">{content}</div>
              )}

              {idx < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center px-1 text-slate-300">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
