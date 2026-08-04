"use client"

import type { User } from "./types"
import { createClient } from "./supabase/client"

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server"
  let deviceId = localStorage.getItem("safawala_device_id")
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    localStorage.setItem("safawala_device_id", deviceId)
  }
  return deviceId
}

export async function signIn(email: string, password: string) {
  try {
    console.log("[v0] Attempting login with:", email)
    const deviceId = getOrCreateDeviceId()

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, deviceId }),
    })

    if (!response.ok) {
      let errorMessage = "Login failed"
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        errorMessage = `Server error: ${response.status}`
      }
      throw new Error(errorMessage)
    }

  const data = await response.json()

  // 2FA required — return signal to caller without storing session yet
  if (data.requires_2fa) {
    return { requires_2fa: true, temp_token: data.temp_token }
  }

  const { user, session } = data

    // Store user data securely and wait for it to complete
    try {
      localStorage.setItem("safawala_user", JSON.stringify(user))
      // Verify it was stored
      const stored = localStorage.getItem("safawala_user")
      if (!stored) {
        throw new Error("Failed to store session")
      }
    } catch (storageError) {
      console.error("[v0] localStorage error:", storageError)
      throw new Error("Failed to save session. Please try again.")
    }

    // Set Supabase session in the client
    if (session?.access_token && session?.refresh_token) {
      try {
        const supabase = createClient()
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
        console.log("[v0] Supabase session set successfully")
      } catch (sessionError) {
        console.error("[v0] Failed to set Supabase session:", sessionError)
      }
    }

    // Warm up server session so subsequent pages can read it
    try {
      await ensureServerSession()
    } catch {}

    return { user, userData: user }
  } catch (error) {
    console.error("[v0] Sign in error:", error)
    throw error
  }
}

export async function signOut() {
  try {
    localStorage.removeItem("safawala_user")
    
    // Clear server-side cookie
    await fetch("/api/auth/logout", { method: "POST" })
  } catch (error) {
    console.error("[v0] Sign out error:", error)
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    if (typeof window === "undefined") return null

    const storedUser = localStorage.getItem("safawala_user")
    if (storedUser) return JSON.parse(storedUser)

    // Real fallback: ask the server for the authenticated user tied to cookies/session.
    try {
      const response = await fetch("/api/auth/user", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      if (!response.ok) return null

      const user = await response.json()
      if (!user?.id || !user?.email) return null

      localStorage.setItem("safawala_user", JSON.stringify(user))
      return user
    } catch {
      return null
    }
  } catch (error) {
    console.error("[v0] Get current user error:", error)
    return null
  }
}

// Ensure the Supabase Auth session cookie is readable by API routes
export async function ensureServerSession(retries = 3, delayMs = 200): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('/api/auth/user', { method: 'GET', cache: 'no-store' })
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    super_admin: 4,
    franchise_admin: 3,
    staff: 2,
    readonly: 1,
  }

  return (
    roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  )
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("safawala_user") !== null
}

// Permission helper functions
export function canViewFinancials(userRole: string): boolean {
  return ["super_admin", "franchise_admin"].includes(userRole)
}

export function canManageStaff(userRole: string): boolean {
  return ["super_admin", "franchise_admin"].includes(userRole)
}

export function canManageFranchises(userRole: string): boolean {
  return userRole === "super_admin"
}

export function canDeleteData(userRole: string): boolean {
  return ["super_admin", "franchise_admin"].includes(userRole)
}

export function canEditPricing(userRole: string): boolean {
  return ["super_admin", "franchise_admin"].includes(userRole)
}

export function canViewReports(userRole: string): boolean {
  return ["super_admin", "franchise_admin", "readonly"].includes(userRole)
}
