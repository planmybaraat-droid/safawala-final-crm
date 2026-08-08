"use client"

import type { PortalConfig } from "@/lib/portal-config"
import { PortalBottomNav } from "./portal-bottom-nav"
import { PortalSidebar } from "./portal-sidebar"
import { TeamChat } from "@/components/team-chat"
import { PortalTopNav } from "./portal-top-nav"

interface PortalMobileLayoutProps {
  config: PortalConfig
  children: React.ReactNode
}

export function PortalMobileLayout({ config, children }: PortalMobileLayoutProps) {
  return (
    <>
      {/* ── DESKTOP layout (md+) ── */}
      <div className="hidden md:flex min-h-screen" style={{ background: "#F7F6F9" }}>
        <PortalSidebar config={config} />
        <main className="flex-1 overflow-y-auto" style={{ marginLeft: 240 }}>
          <PortalTopNav color={config.color} />
          <div className="max-w-6xl mx-auto py-7 px-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── MOBILE layout (<md) ── */}
      <div
        className="md:hidden min-h-screen"
        style={{
          background: "#F7F6F9",
          maxWidth: "480px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <div className="h-1" style={{ background: config.color }} />
        <div
          className="overflow-y-auto"
          style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
        <PortalBottomNav tabs={config.tabs} color={config.color} />
      </div>

      {/* Team Chat - desktop only (mobile has bottom nav so space is tight) */}
      <div className="hidden md:block">
        <TeamChat />
      </div>
    </>
  )
}
