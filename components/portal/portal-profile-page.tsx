"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PortalPageHeader, PortalInfoRow, PortalSectionLabel } from "./portal-shared"
import { PortalIcon } from "./portal-icons"
import { signOut } from "@/lib/auth"
import type { User } from "@/lib/types"

export function PortalProfilePage({ dept, color, backHref }: { dept: string; color: string; backHref: string }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { setUser(JSON.parse(raw)) } catch {} }
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut()
      localStorage.removeItem("safawala_user")
      router.push(`/login/${dept}`)
    } catch {
      localStorage.removeItem("safawala_user")
      router.push(`/login/${dept}`)
    }
  }

  if (!user) return null

  const initials = user.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"

  return (
    <div>
      <PortalPageHeader title="My Profile" color={color} backHref={backHref} />

      {/* Avatar */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-lg mb-3"
          style={{ background: `linear-gradient(135deg, ${color}, ${adjustColor(color, -30)})` }}>
          {initials}
        </div>
        <h2 className="text-[18px] font-black" style={{ color: "#18181b" }}>{user.name}</h2>
        <p className="text-[12px] mt-1" style={{ color: "#71717a" }}>{user.email}</p>
        <div className="mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `${color}18`, color }}>
          {user.role?.replace(/_/g, " ")} · {user.department ?? dept}
        </div>
      </div>

      {/* Info */}
      <PortalSectionLabel label="Account Details" />
      <div className="mx-4 rounded-2xl overflow-hidden px-4" style={{ background: "#ffffff", border: "1px solid #e4e4e7" }}>
        <PortalInfoRow label="Name" value={user.name} />
        <PortalInfoRow label="Email" value={user.email} />
        <PortalInfoRow label="Role" value={user.role?.replace(/_/g, " ")} />
        <PortalInfoRow label="Department" value={user.department ?? dept} />
        {user.franchise_name && <PortalInfoRow label="Franchise" value={user.franchise_name} />}
        {user.franchise_code && <PortalInfoRow label="Branch Code" value={user.franchise_code} />}
      </div>

      {/* Logout */}
      <div className="mx-4 mt-4 mb-6">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-3.5 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {loggingOut ? "Signing out..." : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
