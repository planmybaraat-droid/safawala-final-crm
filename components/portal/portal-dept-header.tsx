"use client"

import type { PortalConfig } from "@/lib/portal-config"
import { PortalIcon } from "./portal-icons"

interface PortalDeptHeaderProps {
  config: PortalConfig
  userName?: string
  subtitle?: string
}

export function PortalDeptHeader({ config, userName, subtitle }: PortalDeptHeaderProps) {
  const greeting = getGreeting()
  const displayName = userName?.split(" ")[0] || "there"

  return (
    <div
      className="px-4 pt-4 pb-5 text-white"
      style={{ background: `linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -20)})` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 mb-0.5">
            {greeting}, {displayName}
          </p>
          <h1 className="text-lg font-bold leading-tight">{config.portalName}</h1>
          {subtitle && <p className="text-xs opacity-70 mt-0.5">{subtitle}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
        >
          <PortalIcon name={config.icon} size={22} />
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
