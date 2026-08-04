'use client'
import { cn } from '@/lib/utils'

type BookingStatus = 'quote' | 'confirmed' | 'delivered' | 'returned' | 'cancelled' | 'overdue' | 'completed'
type DeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'returned' | 'overdue'

const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  quote:     { label: 'Quote',     className: 'bg-blue-50 text-blue-600 border-blue-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-50 text-green-700 border-green-200' },
  delivered: { label: 'Delivered', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  returned:  { label: 'Returned',  className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600 border-red-200' },
  overdue:   { label: 'Overdue',   className: 'bg-red-50 text-red-700 border-red-300' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = BOOKING_STATUS[status?.toLowerCase()] ?? {
    label: status || 'Unknown',
    className: 'bg-gray-50 text-gray-500 border-gray-200'
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}

export function PriorityDot({ urgent }: { urgent: boolean }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full',
      urgent ? 'bg-red-500' : 'bg-green-500'
    )} />
  )
}
