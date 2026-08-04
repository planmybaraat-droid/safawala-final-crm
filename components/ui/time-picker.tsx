"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  order?: "AM_FIRST" | "PM_FIRST"
}

// value format expected: HH:MM (24h) or empty string
export function TimePicker({ value, onChange, className, placeholder = "--:-- --", disabled, order = "AM_FIRST" }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const parse = (val: string) => {
    if (!val) return { hour: "", minute: "", meridiem: "" }
    const [h, m] = val.split(":")
    let hourNum = parseInt(h, 10)
    const meridiem = hourNum >= 12 ? "PM" : "AM"
    if (hourNum === 0) hourNum = 12
    else if (hourNum > 12) hourNum = hourNum - 12
    return { hour: hourNum.toString().padStart(2, "0"), minute: m, meridiem }
  }

  const to24 = (hour: string, minute: string, meridiem: string) => {
    if (!hour || !minute || !meridiem) return ""
    let h = parseInt(hour, 10)
    if (meridiem === "AM") {
      if (h === 12) h = 0
    } else {
      if (h !== 12) h = h + 12
    }
    return `${h.toString().padStart(2, "0")}:${minute}`
  }

  const state = parse(value)

  // Generate hours & minutes
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i).filter((m) => m % 1 === 0).map((m) => m.toString().padStart(2, "0"))
  const meridiems = order === "AM_FIRST" ? ["AM", "PM"] : ["PM", "AM"]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [])

  const update = (data: Partial<{ hour: string; minute: string; meridiem: string }>) => {
    const hour = data.hour ?? state.hour
    const minute = data.minute ?? state.minute
    const meridiem = data.meridiem ?? state.meridiem
    const newVal = to24(hour, minute, meridiem)
    onChange(newVal)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full h-10 rounded-md border border-input bg-background px-3 text-left text-sm flex items-center justify-between",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn(!value && "text-muted-foreground")}>{
          value
            ? `${state.hour}:${state.minute} ${state.meridiem}`
            : placeholder
        }</span>
        <span className="text-xs text-muted-foreground">⏷</span>
      </button>
      {open && (
        <div
          className="absolute z-[1200] mt-1 w-full min-w-[260px] md:min-w-[320px] rounded-md border bg-popover shadow-lg p-2 grid grid-cols-3 gap-2"
          role="listbox"
          aria-label="Select time (hours, minutes, AM/PM)"
        >
          <div className="max-h-56 overflow-y-auto pr-1 border-r">
            {hours.map((h) => (
              <div
                key={h}
                className={cn(
                  "px-2 py-1 rounded cursor-pointer text-sm",
                  h === state.hour ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                onClick={() => update({ hour: h })}
              >
                {h}
              </div>
            ))}
          </div>
          <div className="max-h-56 overflow-y-auto pr-1 border-r">
            {minutes.map((m) => (
              <div
                key={m}
                className={cn(
                  "px-2 py-1 rounded cursor-pointer text-sm",
                  m === state.minute ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                onClick={() => update({ minute: m })}
              >
                {m}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 items-stretch">
            {meridiems.map((md) => (
              <button
                type="button"
                key={md}
                className={cn(
                  "px-2 py-2 rounded text-sm border",
                  md === state.meridiem ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                )}
                onClick={() => update({ meridiem: md })}
                aria-pressed={md === state.meridiem}
                aria-label={`Select ${md}`}
              >
                {md}
              </button>
            ))}
            <button
              type="button"
              className="mt-auto px-2 py-1 text-xs rounded border hover:bg-accent"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
              aria-label="Clear time"
            >
              Clear
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs rounded border hover:bg-accent"
              onClick={() => setOpen(false)}
              aria-label="Close time picker"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
