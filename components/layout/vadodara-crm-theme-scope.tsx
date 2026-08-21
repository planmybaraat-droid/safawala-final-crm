"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getCachedAuthUser } from "@/lib/client-read-cache"

const TARGET_EMAIL = "vadodara@safawala.com"
const THEME_CLASS = "vadodara-crm-theme"
let latestSyncRun = 0

function getStoredUserEmail() {
  try {
    const rawUser = window.localStorage.getItem("safawala_user")
    if (!rawUser) return ""

    const user = JSON.parse(rawUser)
    return String(user?.email || "").trim().toLowerCase()
  } catch {
    return ""
  }
}

function applyVadodaraThemeScope(email: string) {
  if (typeof document === "undefined") return

  const pathname = window.location.pathname
  const isPortalRoute = pathname.startsWith("/portal")
  const shouldUseTheme = email === TARGET_EMAIL && !isPortalRoute
  document.body.classList.toggle(THEME_CLASS, shouldUseTheme)

  if (shouldUseTheme) {
    document.body.dataset.crmVisualAccount = "vadodara"
    document.body.dataset.crmVisualScope = "main"
    const financeRoutePrefixes = [
      "/accounts",
      "/admin/billing",
      "/admin/finance",
      "/billing",
      "/create-invoice",
      "/expenses",
      "/financials",
      "/invoices",
      "/payroll",
      "/product-rental-invoices",
      "/vouchers",
    ]
    document.body.dataset.crmRouteGroup = financeRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
      ? "finance"
      : "standard"
  } else {
    delete document.body.dataset.crmVisualAccount
    delete document.body.dataset.crmVisualScope
    delete document.body.dataset.crmRouteGroup
  }
}

async function getAuthenticatedUserEmail() {
  try {
    const user = await getCachedAuthUser()
    return String(user?.email || "").trim().toLowerCase()
  } catch {
    return ""
  }
}

function syncVadodaraThemeScope() {
  if (typeof document === "undefined") return

  const syncRun = ++latestSyncRun
  const storedEmail = getStoredUserEmail()

  // Fast local paint if the browser already has the expected user.
  applyVadodaraThemeScope(storedEmail)

  // Authoritative check from the active authenticated session/cookie.
  getAuthenticatedUserEmail().then((authenticatedEmail) => {
    if (syncRun !== latestSyncRun) return
    applyVadodaraThemeScope(authenticatedEmail || storedEmail)
  })
}

export function VadodaraCrmThemeScope() {
  const pathname = usePathname()

  useEffect(() => {
    syncVadodaraThemeScope()

    window.addEventListener("storage", syncVadodaraThemeScope)
    window.addEventListener("focus", syncVadodaraThemeScope)

    return () => {
      window.removeEventListener("storage", syncVadodaraThemeScope)
      window.removeEventListener("focus", syncVadodaraThemeScope)
      document.body.classList.remove(THEME_CLASS)
      delete document.body.dataset.crmVisualAccount
      delete document.body.dataset.crmVisualScope
      delete document.body.dataset.crmRouteGroup
    }
  }, [pathname])

  return null
}
