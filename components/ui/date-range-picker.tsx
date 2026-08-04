"use client"

import * as React from "react"
import { CalendarIcon } from 'lucide-react'
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  placeholder?: string
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  placeholder = "Pick a date range",
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    onDateChange(selectedDate)
    // Removed auto-close functionality - user must manually close
  }

  const handleClearDates = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateChange(undefined)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
            {date?.from && (
              <button
                onClick={handleClearDates}
                className="ml-auto h-4 w-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs"
                title="Clear dates"
              >
                ×
              </button>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <p className="text-sm text-muted-foreground">
              Select a date range for your report
            </p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            className="rounded-md"
          />
          <div className="p-3 border-t flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onDateChange(undefined)
                setIsOpen(false)
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={!date?.from}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
