import { useEffect, useRef } from "react"

/**
 * Re-runs `callback` on an interval so HR data edited elsewhere (the Main
 * CRM's admin views, or another HR staff member) shows up without a manual
 * page refresh.
 *
 * Deliberately polling through the existing authenticated REST endpoints
 * rather than a raw Supabase Realtime `postgres_changes` subscription:
 * these HR tables (users, attendance_records, leave_requests,
 * employee_kyc, recruitment_candidates) have RLS disabled, so a client-side
 * Realtime channel using the public anon key would broadcast every row
 * change to any subscriber, bypassing the franchise/role checks the API
 * routes enforce. Polling keeps every read going through those same route
 * guards.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 15000) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
