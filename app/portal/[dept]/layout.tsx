import { redirect, notFound } from "next/navigation"
import { getPortalConfig } from "@/lib/portal-config"
import { authenticateRequest } from "@/lib/auth-middleware"
import { PortalMobileLayout } from "@/components/portal/portal-mobile-layout"

const DEPT_ALIASES: Record<string, string> = { bookings: "booking" }

/**
 * Server-side portal boundary. Client-side localStorage checks remain useful for
 * rendering, but this guard is the authoritative URL protection layer.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { dept: string }
}) {
  const rawDept = params.dept
  const dept = DEPT_ALIASES[rawDept] || rawDept
  if (rawDept !== dept) redirect(`/portal/${dept}`)

  const config = getPortalConfig(dept)
  if (!config) notFound()

  const request = new Request("http://localhost/portal/" + dept) as any
  // authenticateRequest reads the real Next cookies through next/headers.
  const auth = await authenticateRequest(request)
  if (!auth.authorized || !auth.user) redirect(`/auth/login?redirect=/portal/${dept}`)

  const user = auth.user
  // Every department staff account shares the generic "staff" role, distinguished
  // only by `department`. Checking `allowedRoles.includes("staff")` alone would let
  // ANY staff member into ANY portal that lists "staff" — the department must match too.
  const isGenericStaff = user.role === "staff"
  const departmentMatchesPortal = user.department ? (DEPT_ALIASES[user.department] || user.department) === dept : false
  const roleAllowed =
    user.is_super_admin ||
    (isGenericStaff ? departmentMatchesPortal : config.allowedRoles.includes(user.role))
  if (!roleAllowed) {
    if (user.role === "franchise_admin") {
      redirect("/dashboard")
    }
    const target = user.department ? (DEPT_ALIASES[user.department] || user.department) : "dashboard"
    redirect(target === "dashboard" ? "/dashboard" : `/portal/${target}`)
  }

  return <PortalMobileLayout config={config}>{children}</PortalMobileLayout>
}
