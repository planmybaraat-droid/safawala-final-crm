"use client"

import { useEffect, useMemo, useState } from "react"

type SuiteKey = "auth" | "customers" | "all"

type TestStatus = "pass" | "fail" | "skip"

interface TestResult {
  id: string
  name: string
  status: TestStatus
  durationMs: number
  error?: string
  details?: any
}

interface SuiteResult {
  suite: string
  results: TestResult[]
  summary: { pass: number; fail: number; skip: number; durationMs: number }
}

interface RunResponse {
  suites: SuiteResult[]
  meta: { startedAt: string; finishedAt: string; totalDurationMs: number }
}

export default function TestsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [suites, setSuites] = useState<Set<SuiteKey>>(new Set(["auth"]))
  const [customerId, setCustomerId] = useState("")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/user", { cache: "no-store" })
        if (!res.ok) throw new Error("Not authenticated")
        const user = await res.json()
        if (isMounted) setCurrentUser(user)
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load user")
      } finally {
        if (isMounted) setLoadingUser(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const suiteQuery = useMemo(() => {
    const keys = Array.from(suites)
    if (!keys.length) return "suite=auth"
    return keys.map((k) => `suite=${encodeURIComponent(k)}`).join("&")
  }, [suites])

  async function runTests() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const qs = `${suiteQuery}${customerId ? `&customerId=${encodeURIComponent(customerId)}` : ""}`
      const res = await fetch(`/api/tests?${qs}`, { cache: "no-store" })
      const data = (await res.json()) as RunResponse
      setResult(data)
    } catch (e: any) {
      setError(e?.message || "Failed to run tests")
    } finally {
      setRunning(false)
    }
  }

  function toggleSuite(key: SuiteKey) {
    setSuites((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Internal Test Runner</h1>
      <p className="text-sm text-gray-500 mt-1">Runs /api/tests using your current session cookies.</p>

      <div className="mt-4 p-3 rounded border bg-gray-50">
        {loadingUser ? (
          <span>Loading user…</span>
        ) : currentUser ? (
          <div className="text-sm">
            <span className="font-medium">User:</span> {currentUser.email} · role: {currentUser.role}
          </div>
        ) : (
          <div className="text-sm text-red-600">No user/session detected.</div>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <div className="font-medium">Suites</div>
          <div className="flex gap-3 mt-2">
            {(["auth", "customers", "all"] as SuiteKey[]).map((s) => (
              <label key={s} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={suites.has(s)}
                  onChange={() => toggleSuite(s)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium" htmlFor="customerId">customerId (for customers suite)</label>
          <input
            id="customerId"
            className="mt-1 w-full max-w-md border rounded px-2 py-1"
            placeholder="uuid"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runTests}
            disabled={running}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {running ? "Running…" : "Run tests"}
          </button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </div>

      {result && (
        <div className="mt-8">
          <div className="text-sm text-gray-600">
            Started {new Date(result.meta.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true })} · Duration {result.meta.totalDurationMs} ms
          </div>
          <div className="mt-4 space-y-6">
            {result.suites.map((s) => (
              <div key={s.suite} className="border rounded p-4">
                <div className="font-semibold mb-2">Suite: {s.suite}</div>
                <div className="text-sm text-gray-600 mb-2">
                  pass: {s.summary.pass} · fail: {s.summary.fail} · skip: {s.summary.skip} · {s.summary.durationMs} ms
                </div>
                <div className="divide-y">
                  {s.results.map((r) => (
                    <div key={r.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.name}</div>
                        <span className={`text-xs px-2 py-1 rounded ${r.status === "pass" ? "bg-green-100 text-green-800" : r.status === "fail" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{r.durationMs} ms</div>
                      {r.error && (
                        <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">{r.error}</pre>
                      )}
                      {r.details && !r.error && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(r.details, null, 2)}</pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
