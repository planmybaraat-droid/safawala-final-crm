"use client"

import { useState } from "react"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { PortalIcon } from "./portal-icons"
import { PortalNotificationBellPanel } from "./portal-notification-bell-panel"

/** Floating notification bell — fixed top-right, used by the mobile portal layout. */
export function PortalNotificationBell() {
  const { unreadCount, browserPermission, requestBrowserPermission } = useNotifications()
  const [open, setOpen] = useState(false)

  function handleOpen() {
    setOpen(true)
    if (browserPermission === "default") requestBrowserPermission()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg pointer-events-auto"
        style={{ background: "rgba(255,255,255,0.92)", color: "#4A1F5E" }}
      >
        <PortalIcon name="bell" size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: "#dc2626" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <PortalNotificationBellPanel onClose={() => setOpen(false)} />}
    </>
  )
}
