"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { PortalConfig } from "@/lib/portal-config"
import { PortalIcon } from "./portal-icons"
import { signOut } from "@/lib/auth"
import { useEffect, useState } from "react"

interface PortalSidebarProps {
  config: PortalConfig
}

export function PortalSidebar({ config }: PortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }
  }, [])

  async function handleLogout() {
    try { await signOut() } catch {}
    localStorage.removeItem("safawala_user")
    router.push(`/login/${config.slug}`)
  }

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        background: "#18181b",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "4px 0 32px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Accent bar */}
        <div style={{ height: 3, borderRadius: 2, background: config.color, marginBottom: 16 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -30)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "white",
            }}
          >
            <PortalIcon name={config.icon as any} size={18} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#ffffff", lineHeight: 1.2 }}>
              {config.portalName}
            </p>
            {user?.franchise_name && (
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {user.franchise_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
        <p style={{ margin: "0 0 8px 8px", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
          Navigation
        </p>
        {config.tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" &&
              pathname.startsWith(tab.href) &&
              tab.href.split("/").length > 2)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 2,
                background: isActive ? `${config.color}20` : "transparent",
                color: isActive ? config.color : "rgba(255,255,255,0.5)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              {isActive && (
                <div style={{ width: 3, height: 18, borderRadius: 2, background: config.color, flexShrink: 0 }} />
              )}
              <span style={{ color: isActive ? config.color : "rgba(255,255,255,0.35)", flexShrink: 0, display: "flex" }}>
                <PortalIcon name={tab.icon as any} size={18} />
              </span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -30)})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 12, fontWeight: 800,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.role?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: "100%", height: 36, borderRadius: 10,
            background: "rgba(239,68,68,0.12)", color: "#f87171",
            border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", fontFamily: "inherit",
            fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
