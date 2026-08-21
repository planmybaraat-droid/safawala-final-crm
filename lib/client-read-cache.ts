"use client"

type CacheEntry<T> = {
  value?: T
  promise?: Promise<T | null>
  expiresAt: number
}

const jsonCache = new Map<string, CacheEntry<any>>()
let authUserCache: CacheEntry<any> | null = null

function now() {
  return Date.now()
}

function readStoredUser() {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem("safawala_user")
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id && user?.email ? user : null
  } catch {
    return null
  }
}

function storeUser(user: any) {
  if (typeof window === "undefined" || !user?.id || !user?.email) return

  try {
    window.localStorage.setItem("safawala_user", JSON.stringify(user))
  } catch {
    // Storage is an optimization only.
  }
}

export async function getCachedAuthUser(options: { force?: boolean; maxAgeMs?: number } = {}) {
  const maxAgeMs = options.maxAgeMs ?? 30_000
  const cached = authUserCache

  if (!options.force) {
    if (cached?.value && cached.expiresAt > now()) return cached.value
    if (cached?.promise) return cached.promise

    const storedUser = readStoredUser()
    if (storedUser) {
      authUserCache = {
        value: storedUser,
        expiresAt: now() + maxAgeMs,
      }
      return storedUser
    }
  }

  const promise = fetch("/api/auth/user", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null
      const user = await response.json()
      if (!user?.id || !user?.email) return null
      storeUser(user)
      authUserCache = {
        value: user,
        expiresAt: now() + maxAgeMs,
      }
      return user
    })
    .catch(() => null)
    .finally(() => {
      if (authUserCache?.promise === promise) {
        authUserCache.promise = undefined
      }
    })

  authUserCache = {
    value: cached?.value,
    promise,
    expiresAt: now() + maxAgeMs,
  }

  return promise
}

export async function getCachedJson<T = any>(url: string, options: { maxAgeMs?: number; force?: boolean } = {}) {
  const maxAgeMs = options.maxAgeMs ?? 20_000
  const existing = jsonCache.get(url)

  if (!options.force) {
    if (existing?.value !== undefined && existing.expiresAt > now()) return existing.value as T
    if (existing?.promise) return existing.promise as Promise<T | null>
  }

  const promise = fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null
      const value = await response.json()
      jsonCache.set(url, {
        value,
        expiresAt: now() + maxAgeMs,
      })
      return value as T
    })
    .catch(() => null)
    .finally(() => {
      const latest = jsonCache.get(url)
      if (latest?.promise === promise) {
        latest.promise = undefined
      }
    })

  jsonCache.set(url, {
    value: existing?.value,
    promise,
    expiresAt: now() + maxAgeMs,
  })

  return promise
}

type CachedFetchJsonResult<T> = {
  ok: boolean
  status: number
  statusText: string
  data: T | null
  text: string
}

export async function getCachedFetchJson<T = any>(
  url: string,
  options: { maxAgeMs?: number; force?: boolean } = {},
): Promise<CachedFetchJsonResult<T>> {
  const maxAgeMs = options.maxAgeMs ?? 20_000
  const cacheKey = `response:${url}`
  const existing = jsonCache.get(cacheKey)

  if (!options.force) {
    if (existing?.value !== undefined && existing.expiresAt > now()) return existing.value as CachedFetchJsonResult<T>
    if (existing?.promise) return existing.promise as Promise<CachedFetchJsonResult<T>>
  }

  const promise = fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })
    .then(async (response) => {
      const text = await response.text()
      let data: T | null = null

      if (text) {
        try {
          data = JSON.parse(text) as T
        } catch {
          data = null
        }
      }

      const value: CachedFetchJsonResult<T> = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        text,
      }

      jsonCache.set(cacheKey, {
        value,
        expiresAt: now() + maxAgeMs,
      })

      return value
    })
    .finally(() => {
      const latest = jsonCache.get(cacheKey)
      if (latest?.promise === promise) {
        latest.promise = undefined
      }
    })

  jsonCache.set(cacheKey, {
    value: existing?.value,
    promise,
    expiresAt: now() + maxAgeMs,
  })

  return promise
}

export function clearClientReadCache(url?: string) {
  if (url) {
    jsonCache.delete(url)
    jsonCache.delete(`response:${url}`)
    return
  }

  jsonCache.clear()
  authUserCache = null
}
