"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/reset-password`

      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

      if (sbError) throw sbError
      setSent(true)
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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
          boxShadow: "0 8px 40px rgba(120,80,20,0.12), 0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{ padding: "28px 28px 24px" }}>

            {sent ? (
              /* Success state */
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Check your email</h2>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  We sent a password reset link to
                </p>
                <p style={{ margin: "0 0 24px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{email}</p>
                <p style={{ margin: "0 0 24px", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                  Click the link in the email to set a new password. The link expires in 1 hour.
                </p>
                <button
                  onClick={() => router.push("/auth/login")}
                  style={{
                    width: "100%", height: 44, borderRadius: 10, border: "1px solid #e2e8f0",
                    background: "white", color: "#374151", fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              /* Email form */
              <>
                <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Reset Password</h2>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
                  Enter your email and we'll send you a reset link.
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
                  <label style={{
                    display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#64748b", marginBottom: 6,
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="yourname@safawala.com"
                    disabled={loading}
                    style={{
                      width: "100%", height: 44, borderRadius: 10, border: "1.5px solid #e2e8f0",
                      padding: "0 14px", fontSize: 14, outline: "none", background: "#f8fafc",
                      color: "#0f172a", boxSizing: "border-box", marginBottom: 20,
                    }}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%", height: 46, borderRadius: 10, border: "none",
                      background: loading ? "#94a3b8" : "#0f172a",
                      color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
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
                        Sending...
                      </>
                    ) : "Send Reset Link"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button
                    onClick={() => router.push("/auth/login")}
                    style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
