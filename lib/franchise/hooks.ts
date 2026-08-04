'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

// ─── useSafeData ────────────────────────────────────────────────────────────
// Universal data-fetching hook with abort, retry, loading & error states.
// Every component in the franchise CRM uses this — no raw fetch() in pages.

export interface SafeDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSafeData<T>(
  url: string | null,
  defaultValue: T | null = null
): SafeDataState<T> {
  const [data, setData] = useState<T | null>(defaultValue)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        signal: abortRef.current.signal,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Request failed (${res.status})`)
      }
      const json = await res.json()
      // Support both { data: [...] } and raw array/object responses
      setData(json?.data !== undefined ? json.data : json)
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'Something went wrong')
        setData(defaultValue)
      }
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    return () => abortRef.current?.abort()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ─── useDebounce ─────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── useSafePost ─────────────────────────────────────────────────────────────
// For mutations (POST/PUT/DELETE) with loading + error
export function useSafePost<TBody = any, TResult = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const post = useCallback(
    async (url: string, body: TBody, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<TResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Request failed (${res.status})`)
        }
        return await res.json()
      } catch (e: any) {
        setError(e?.message || 'Something went wrong')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { post, loading, error }
}
