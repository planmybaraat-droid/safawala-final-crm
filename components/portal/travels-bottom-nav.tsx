"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PortalIcon } from "./portal-icons"

const COLOR = "#0891b2"

const TABS = [
  { href: "/portal/travels",             icon: "home",    label: "Home" },
  { href: "/portal/travels/assignments", icon: "calendar",label: "Events" },
  { href: "/portal/travels/tickets",     icon: "map-pin", label: "Tickets" },
  { href: "/portal/travels/stylists",    icon: "team",    label: "Stylists" },
  { href: "/portal/travels/profile",     icon: "user",    label: "Me" },
]

export function TravelsBottomNav() {
  const pathname = usePathname()
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "white", borderTop: "1px solid rgba(0,0,0,0.08)",
      display: "flex", paddingBottom: "env(safe-area-inset-bottom, 0px)",
      zIndex: 40,
    }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.href || (tab.href !== "/portal/travels" && pathname.startsWith(tab.href))
        return (
          <Link key={tab.href} href={tab.href} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            padding: "10px 4px 8px", textDecoration: "none", gap: 3,
            color: isActive ? COLOR : "rgba(30,18,8,0.35)",
          }}>
            <PortalIcon name={tab.icon} size={22} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{tab.label.toUpperCase()}</span>
          </Link>
        )
      })}
    </div>
  )
}
