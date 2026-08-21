"use client"

import Link from "next/link"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { PortalNotificationBellPanel } from "./portal-notification-bell-panel"
import { useState } from "react"
import { PortalIcon } from "./portal-icons"

export function PortalTopNav() {
  const { unreadCount, browserPermission, requestBrowserPermission } = useNotifications()
  const [open, setOpen] = useState(false)

  function handleOpen() {
    setOpen(true)
    if (browserPermission === "default") requestBrowserPermission()
  }

  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[#E7E2EA] bg-white/95 px-8 backdrop-blur portal-top-nav">
      <Link href="/dashboard" className="text-lg font-bold tracking-[-0.02em] text-[#1F1B24] no-underline">Safawala.com</Link>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          onClick={handleOpen}
          className="relative grid h-10 w-10 place-items-center rounded-xl text-[#6F6878] transition hover:bg-[#F1EAF5] hover:text-[#4A1F5E]"
        >
          <PortalIcon name="bell" size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: "#dc2626" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-full border border-[#E7E2EA] bg-[#F1EAF5] text-sm font-bold text-[#4A1F5E]">RD</div>
      </div>
      {open && <PortalNotificationBellPanel onClose={() => setOpen(false)} />}
    </header>
  )
}
