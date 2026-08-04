"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        console.error("[v0] Error fetching user:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch user")
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const refreshUser = async () => {
    try {
      setError(null)
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error("[v0] Error refreshing user:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh user")
    }
  }

  return {
    user,
    loading,
    error,
    refreshUser,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === "super_admin",
    isManager: user?.role === "manager",
    isStaff: user?.role === "staff",
  }
}
