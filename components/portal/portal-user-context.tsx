"use client"

import { createContext, useContext } from "react"
import type { UserPermissions } from "@/lib/types"

export interface PortalUser {
  id: string
  email: string
  name: string
  role: string
  department?: string
  franchise_id?: string
  franchise_name?: string
  franchise_code?: string
  permissions: UserPermissions
  is_super_admin: boolean
}

const PortalUserContext = createContext<PortalUser | null>(null)

export function PortalUserProvider({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  return <PortalUserContext.Provider value={user}>{children}</PortalUserContext.Provider>
}

export function usePortalUser(): PortalUser {
  const user = useContext(PortalUserContext)
  if (!user) throw new Error("usePortalUser must be used inside PortalUserProvider")
  return user
}
