"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getPortalConfig, getDefaultPortalForRole } from "@/lib/portal-config"
import { PortalMobileLayout } from "@/components/portal/portal-mobile-layout"
import type { User } from "@/lib/types"

const DEPT_ALIASES: Record<string, string> = {
  bookings: "booking",
}

const DASHBOARD_ROLES = ["franchise_admin", "franchise_owner", "manager"]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const rawDept = params.dept as string
  const dept = DEPT_ALIASES[rawDept] || rawDept
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState(getPortalConfig(dept))

  useEffect(() => {
    if (rawDept !== dept) {
      router.replace(`/portal/${dept}`)
      return
    }

    const raw = localStorage.getItem("safawala_user")
    if (!raw) {
      router.replace(`/login/${dept}`)
      return
    }

    let user: User
    try {
      user = JSON.parse(raw)
    } catch {
      router.replace(`/login/${dept}`)
      return
    }

    // franchise_admin / franchise_owner / manager → always go to /dashboard
    if (DASHBOARD_ROLES.includes(user.role)) {
      window.location.href = "/dashboard"
      return
    }

    const resolvedConfig = getPortalConfig(dept)
    if (!resolvedConfig) {
      const rawCorrect = user.department || getDefaultPortalForRole(user.role)
      if (rawCorrect === "__dashboard__") {
        window.location.href = "/dashboard"
        return
      }
      const correctDept = DEPT_ALIASES[rawCorrect] || rawCorrect
      router.replace(`/portal/${correctDept}`)
      return
    }

    // Role guard: super_admin can visit any portal
    if (user.role !== "super_admin") {
      const rawUserDept = user.department || getDefaultPortalForRole(user.role)
      if (rawUserDept === "__dashboard__") {
        window.location.href = "/dashboard"
        return
      }
      const userDept = DEPT_ALIASES[rawUserDept] || rawUserDept
      if (userDept !== dept) {
        router.replace(`/portal/${userDept}`)
        return
      }
    }

    setConfig(resolvedConfig)
    setReady(true)
  }, [dept, rawDept, router])

  if (!ready || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fafafa" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#a855f7", borderTopColor: "transparent" }} />
          <p className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>Loading portal...</p>
        </div>
      </div>
    )
  }

  return <PortalMobileLayout config={config}>{children}</PortalMobileLayout>
}
