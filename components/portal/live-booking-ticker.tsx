"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { PortalIcon } from "./portal-icons"

interface Activity {
  id: string
  customer_name: string | null
  customer_city: string | null
  summary: string
  order_number: string | null
}

const supabase = createClient()

/** Small "someone just booked X" toast, bottom-left, on every portal. */
export function LiveBookingTicker() {
  const [visible, setVisible] = useState<Activity | null>(null)
  const queueRef = useRef<Activity[]>([])
  const showingRef = useRef(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showNext() {
    if (showingRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    showingRef.current = true
    setVisible(next)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => {
      setVisible(null)
      showingRef.current = false
      setTimeout(showNext, 400)
    }, 6000)
  }

  useEffect(() => {
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const raw = typeof window !== "undefined" ? localStorage.getItem("safawala_user") : null
      const user = raw ? JSON.parse(raw) : null
      const franchiseId = user?.franchise_id
      if (!franchiseId || !mounted) return

      channel = supabase
        .channel(`booking-activity-${franchiseId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "booking_activity", filter: `franchise_id=eq.${franchiseId}` },
          (payload: any) => {
            queueRef.current.push(payload.new as Activity)
            showNext()
          }
        )
        .subscribe()
    })()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  const who = [visible.customer_name, visible.customer_city].filter(Boolean).join(" from ")

  return (
    <div
      className="fixed bottom-4 left-4 z-[95] max-w-[280px] flex items-start gap-2.5 rounded-2xl px-3.5 py-3 shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300"
      style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#dcfce7", color: "#15803d" }}>
        <PortalIcon name="check-circle" size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-800 leading-snug">
          {who || "New booking"} <span className="font-normal text-slate-500">booked {visible.summary}</span>
        </p>
        {visible.order_number && <p className="text-[10px] text-slate-400 mt-0.5">{visible.order_number}</p>}
      </div>
    </div>
  )
}
