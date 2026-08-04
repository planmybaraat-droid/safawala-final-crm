"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { PortalTab } from "@/lib/portal-config"
import { PortalIcon } from "./portal-icons"

interface PortalBottomNavProps {
  tabs: PortalTab[]
  color: string
}

export function PortalBottomNav({ tabs, color }: PortalBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "rgba(24,24,27,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(62px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/" &&
            pathname.startsWith(tab.href) &&
            tab.href.split("/").length > 2)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all duration-200"
          >
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full"
                style={{ background: color }}
              />
            )}
            <span
              style={{
                color: isActive ? color : "rgba(255,255,255,0.35)",
                transition: "color 0.2s",
              }}
            >
              <PortalIcon name={tab.icon} size={22} />
            </span>
            <span
              className="text-[10px] font-semibold leading-none"
              style={{ color: isActive ? color : "rgba(255,255,255,0.35)" }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
