"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

interface PortalTopNavProps {
  color?: string
}

export function PortalTopNav({ color = "#4A1F5E" }: PortalTopNavProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[#E7E2EA] bg-white/95 px-8 backdrop-blur">
      <Link href="/dashboard" className="text-lg font-bold tracking-[-0.02em] text-[#1F1B24] no-underline">Safawala.com</Link>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="grid h-10 w-10 place-items-center rounded-xl text-[#6F6878] transition"
          style={{ ["--hover-bg" as any]: hexToRgba(color, 0.12) }}
          onMouseEnter={(e) => { e.currentTarget.style.background = hexToRgba(color, 0.12); e.currentTarget.style.color = color }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "" }}
        >
          <Bell size={18} />
        </button>
        <div
          className="grid h-10 w-10 place-items-center rounded-full border text-sm font-bold"
          style={{ borderColor: "#E7E2EA", background: hexToRgba(color, 0.12), color }}
        >
          RD
        </div>
      </div>
    </header>
  )
}
