"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth"
import { toast } from "sonner"

/**
 * Periodically verifies that the current browser session still matches
 * the latest server-side session token for this user.
 */
export function useSessionGuard() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const verifySession = async (silent = false) => {
      try {
        const response = await fetch("/api/auth/verify-session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })

        const payload = await response.json().catch(() => ({ valid: false, reason: "invalid_response" }))
        if (cancelled || payload?.valid) {
          return
        }

        await signOut()

        if (!silent) {
          toast.error(
            payload?.message ||
              "Your session is no longer valid. Please sign in again."
          )
        }

        router.replace("/")
      } catch (error) {
        console.error("[useSessionGuard] Failed to verify session:", error)
      }
    }

    verifySession(true)
    const intervalId = window.setInterval(() => {
      verifySession(true)
    }, 60_000)

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifySession(true)
      }
    }

    const onWindowFocus = () => {
      verifySession(true)
    }

    window.addEventListener("focus", onWindowFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", onWindowFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [router])
}
