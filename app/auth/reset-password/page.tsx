"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void; placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "#64748b", marginBottom: 6,
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          placeholder={placeholder ?? "••••••••"}
          style={{
            width: "100%", height: 44, borderRadius: 10, border: "1.5px solid #e2e8f0",
            padding: "0 44px 0 14px", fontSize: 14, outline: "none", background: "#f8fafc",
            color: "#0f172a", boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
            display: "flex", alignItems: "center", padding: 0,
          }}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  const urlError = searchParams.get("error")
  const urlErrorDesc = searchParams.get("error_description")

  useEffect(() => {
    // Supabase puts the token in the URL hash after redirect
    // e.g. #access_token=xxx&refresh_token=yyy&type=recovery
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", ""))
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const type = params.get("type")

      if (accessToken && refreshToken && type === "recovery") {
        const supabase = createClient()
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) setError("Session expired. Please request a new reset link.")
            else setSessionReady(true)
            setChecking(false)
          })
        return
      }
    }
    setChecking(false)
  }, [])

  const validate = () => {
    if (password.length < 8) return "Password must be at least 8 characters."
    if (password !== confirm) return "Passwords do not match."
    return ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: sbError } = await supabase.auth.updateUser({ password })
      if (sbError) throw sbError

      // Also update password_hash in our custom users table
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, password }),
        }).catch(() => {})
      }

      setDone(true)
      setTimeout(() => router.push("/auth/login"), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const strength = (() => {
    if (!password) return null
    if (password.length < 6) return { label: "Too short", color: "#ef4444", width: "20%" }
    if (password.length < 8) return { label: "Weak", color: "#f97316", width: "40%" }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: "Fair", color: "#f59e0b", width: "60%" }
    if (password.length >= 10) return { label: "Strong", color: "#22c55e", width: "100%" }
    return { label: "Good", color: "#0891b2", width: "80%" }
  })()

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundImage: "url('/login-bg-mobile.png')",
      backgroundSize: "cover", backgroundPosition: "center top",
      backgroundColor: "#f5ebe0",
    }} className="login-auth-bg">
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <img src="/safawalalogo.svg" alt="Safawala" style={{ height: 60, width: "auto", display: "block", objectFit: "contain" }} />
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#92714a", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            CRM Portal
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderRadius: 20, border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 8px 40px rgba(120,80,20,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{ padding: "28px 28px 24px" }}>

            {/* Expired link error from Supabase */}
            {urlError && !done && (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#fef2f2",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Link Expired</h2>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  {urlErrorDesc?.replace(/\+/g, " ") || "This reset link has expired or already been used."}
                </p>
                <button
                  onClick={() => router.push("/auth/forgot-password")}
                  style={{
                    width: "100%", height: 46, borderRadius: 10, border: "none",
                    background: "#0f172a", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    marginBottom: 10,
                  }}
                >
                  Request New Link
                </button>
                <button
                  onClick={() => router.push("/auth/login")}
                  style={{
                    width: "100%", height: 44, borderRadius: 10, border: "1px solid #e2e8f0",
                    background: "white", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Success state */}
            {done && (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Password Updated!</h2>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
                  Redirecting you to sign in...
                </p>
                <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#22c55e", borderRadius: 4, animation: "progress 3s linear forwards" }} />
                </div>
              </div>
            )}

            {/* New password form */}
            {!urlError && !done && !checking && (
              <>
                <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Set New Password</h2>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
                  Choose a strong password for your account.
                </p>

                {error && (
                  <div style={{
                    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
                    padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626",
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <PasswordField
                    label="New Password"
                    value={password}
                    onChange={setPassword}
                    show={showPwd}
                    onToggle={() => setShowPwd(p => !p)}
                    placeholder="Min. 8 characters"
                  />

                  {/* Strength bar */}
                  {strength && (
                    <div style={{ marginTop: -10, marginBottom: 18 }}>
                      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: strength.width, background: strength.color, borderRadius: 4, transition: "all 0.3s" }} />
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</p>
                    </div>
                  )}

                  <PasswordField
                    label="Confirm Password"
                    value={confirm}
                    onChange={setConfirm}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(p => !p)}
                    placeholder="Re-enter password"
                  />

                  {/* Match indicator */}
                  {confirm && (
                    <p style={{
                      margin: "-10px 0 18px", fontSize: 11, fontWeight: 600,
                      color: password === confirm ? "#22c55e" : "#ef4444",
                    }}>
                      {password === confirm ? "✓ Passwords match" : "✗ Passwords don't match"}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%", height: 46, borderRadius: 10, border: "none",
                      background: loading ? "#94a3b8" : "#0f172a",
                      color: "white", fontSize: 14, fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
                          animation: "spin 0.8s linear infinite",
                        }} />
                        Updating...
                      </>
                    ) : "Update Password"}
                  </button>
                </form>
              </>
            )}

            {checking && !urlError && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "3px solid #e2e8f0", borderTopColor: "#0f172a",
                  animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
                }} />
                <p style={{ color: "#64748b", fontSize: 13 }}>Verifying reset link...</p>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progress { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordInner /></Suspense>
}
