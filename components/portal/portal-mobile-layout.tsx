"use client"

import { useEffect } from "react"
import type { PortalConfig } from "@/lib/portal-config"
import { PortalBottomNav } from "./portal-bottom-nav"
import { PortalSidebar } from "./portal-sidebar"
import { TeamChat } from "@/components/team-chat"
import { PortalTopNav } from "./portal-top-nav"
import { PortalNotificationBell } from "./portal-notification-bell"
import { LiveBookingTicker } from "./live-booking-ticker"
import { PortalUserProvider, type PortalUser } from "./portal-user-context"

interface PortalMobileLayoutProps {
  config: PortalConfig
  user: PortalUser
  children: React.ReactNode
}

export function PortalMobileLayout({ config, user, children }: PortalMobileLayoutProps) {
  const isWarehouse = config.slug === "warehouse"
  const isPolishedPortal = ["booking", "qc", "fulfillment", "styling", "accounts", "hr"].includes(config.slug)

  useEffect(() => {
    if (isWarehouse) document.body.classList.add("warehouse-portal-theme")
    if (isPolishedPortal) {
      document.body.classList.add("portal-polish-theme")
      document.body.dataset.activePortal = config.slug
    }

    return () => {
      if (isWarehouse) document.body.classList.remove("warehouse-portal-theme")
      if (isPolishedPortal) {
        document.body.classList.remove("portal-polish-theme")
        delete document.body.dataset.activePortal
      }
    }
  }, [config.slug, isPolishedPortal, isWarehouse])

  return (
    <PortalUserProvider user={user}>
      {/* ── DESKTOP layout (md+) ── */}
      <div
        className={`hidden md:flex min-h-screen portal-desktop-shell${isWarehouse ? " warehouse-portal-theme warehouse-portal-desktop" : ""}${isPolishedPortal ? " portal-polish-theme portal-polish-desktop" : ""}`}
        data-portal={config.slug}
        style={{ background: "#F7F6F9" }}
      >
        <PortalSidebar config={config} />
        <main className="flex-1 overflow-y-auto" style={{ marginLeft: 240 }}>
          <PortalTopNav />
          <div className="max-w-6xl mx-auto py-7 px-8 portal-desktop-content">
            {children}
          </div>
        </main>
      </div>

      {/* ── MOBILE layout (<md) ── */}
      <div
        className={`md:hidden min-h-screen portal-mobile-shell${isWarehouse ? " warehouse-portal-theme warehouse-portal-mobile" : ""}${isPolishedPortal ? " portal-polish-theme portal-polish-mobile" : ""}`}
        data-portal={config.slug}
        style={{
          background: "#F7F6F9",
          maxWidth: "480px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <div className="h-1" style={{ background: config.color }} />
        <div
          className="overflow-y-auto portal-mobile-content"
          style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
        <PortalBottomNav tabs={config.tabs} color={config.color} />

        {/* Floating notification bell — fixed to the phone-width column, not the viewport,
            so it stays correctly placed even when the browser is wider than 480px. */}
        <div
          className="fixed inset-x-0 top-0 z-50"
          style={{ maxWidth: 480, margin: "0 auto", pointerEvents: "none" }}
        >
          <div
            className="absolute"
            style={{ top: "calc(16px + env(safe-area-inset-top, 0px))", right: 16 }}
          >
            <PortalNotificationBell />
          </div>
        </div>
      </div>

      {/* Team Chat - desktop only (mobile has bottom nav so space is tight) */}
      <div className="hidden md:block">
        <TeamChat />
      </div>

      {/* Live "someone just booked X" ticker — every portal, mobile + desktop */}
      <LiveBookingTicker />
    </PortalUserProvider>
  )
}
