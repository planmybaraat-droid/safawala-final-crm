"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signIn } from "@/lib/auth"
import { getDefaultPortalForRole } from "@/lib/portal-config"
import { toast } from "@/hooks/use-toast"

const inputStyle = {
  height: 44, borderRadius: 12,
  background: "rgba(255,255,255,0.7)",
  border: "1.5px solid rgba(180,140,80,0.25)",
  fontSize: 14, color: "#2c1810",
}

const btnStyle = (loading: boolean) => ({
  height: 48, borderRadius: 14, fontSize: 14, fontWeight: 700,
  background: loading ? "#c4a882" : "linear-gradient(135deg, #2c1810, #5c3520)",
  border: "none", letterSpacing: "0.02em", cursor: loading ? "not-allowed" : "pointer",
  color: "#fff", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
})

function Spinner() {
  return <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
}

export default function AuthLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // 2FA state
  const [step, setStep] = useState<"login" | "otp">("login")
  const [tempToken, setTempToken] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const router = useRouter()

  const navigateAfterLogin = (user: any) => {
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get("redirect")
    if (redirect) return router.push(redirect)
    if (user?.role === "super_admin") return (window.location.href = "/admin")
    if (["franchise_admin", "franchise_owner", "manager"].includes(user?.role || ""))
      return (window.location.href = "/dashboard")
    if (user?.department) return router.push(`/portal/${user.department}`)
    router.push(`/portal/${getDefaultPortalForRole(user?.role || "staff")}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const data = await signIn(email, password) as any
      if (data?.requires_2fa) {
        setTempToken(data.temp_token)
        setStep("otp")
        toast({ title: "2FA Required", description: "Enter the code from your authenticator app" })
        return
      }
      toast({ title: "Success", description: "Logged in successfully" })
      navigateAfterLogin(data?.user)
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(""))
      otpRefs.current[5]?.focus()
    }
    e.preventDefault()
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join("")
    if (code.length < 6) { setError("Enter all 6 digits"); return }
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, temp_token: tempToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Invalid code"); return }

      // Store user in localStorage
      localStorage.setItem("safawala_user", JSON.stringify(data.user))
      toast({ title: "Success", description: "Logged in with 2FA" })
      navigateAfterLogin(data.user)
    } catch {
      setError("Verification failed — please try again")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-auth-bg" style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <img src="/safawalalogo.svg" alt="Safawala Logo"
            style={{ height: 70, width: "auto", display: "block", objectFit: "contain" }} />
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#92714a", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            CRM Portal
          </p>
        </div>

        {/* Card */}
        <div style={{
          borderRadius: 20, overflow: "hidden",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 8px 40px rgba(120,80,20,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        }}>
          {step === "login" ? (
            <>
              <div style={{ padding: "28px 28px 8px", textAlign: "center" }}>
                <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#2c1810", letterSpacing: "-0.3px" }}>
                  Welcome Back
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "#92714a", fontStyle: "italic" }}>
                  "Manage your traditional business with world class tech."
                </p>
              </div>

              <div style={{ padding: "20px 28px 28px" }}>
                {error && (
                  <Alert variant="destructive" className="border-red-100 bg-red-50 text-red-900 rounded-xl p-3 mb-4">
                    <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <Label htmlFor="email" style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#92714a", marginBottom: 6 }}>
                      Email Address
                    </Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      required placeholder="yourname@safawala.com" disabled={isLoading}
                      style={inputStyle} className="focus-visible:ring-1 focus-visible:ring-amber-400" />
                  </div>

                  <div>
                    <Label htmlFor="password" style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#92714a", marginBottom: 6 }}>
                      Password
                    </Label>
                    <div style={{ position: "relative" }}>
                      <Input id="password" type={showPassword ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)} required placeholder="Enter your password"
                        disabled={isLoading} style={{ ...inputStyle, paddingRight: 44 }}
                        className="focus-visible:ring-1 focus-visible:ring-amber-400" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#b89a6a", display: "flex", alignItems: "center", padding: 0 }}>
                        {showPassword ? (
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
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginTop: -8 }}>
                    <a href="/auth/forgot-password" style={{ fontSize: 12, color: "#92714a", textDecoration: "none", fontWeight: 500 }}>
                      Forgot password?
                    </a>
                  </div>

                  <button type="submit" disabled={isLoading} style={btnStyle(isLoading)}>
                    {isLoading ? <><Spinner />Signing in...</> : "Sign In"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* ── 2FA OTP Step ── */
            <>
              <div style={{ padding: "28px 28px 8px", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #2c1810, #5c3520)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  </svg>
                </div>
                <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#2c1810" }}>
                  Two-Factor Authentication
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "#92714a" }}>
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div style={{ padding: "20px 28px 28px" }}>
                {error && (
                  <Alert variant="destructive" className="border-red-100 bg-red-50 text-red-900 rounded-xl p-3 mb-4">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* OTP boxes */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }} onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        disabled={isLoading}
                        style={{
                          width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700,
                          borderRadius: 12, border: `2px solid ${digit ? "#5c3520" : "rgba(180,140,80,0.3)"}`,
                          background: "rgba(255,255,255,0.8)", color: "#2c1810",
                          outline: "none", transition: "border-color 0.15s",
                        }}
                      />
                    ))}
                  </div>

                  <button type="submit" disabled={isLoading || otp.join("").length < 6} style={btnStyle(isLoading || otp.join("").length < 6)}>
                    {isLoading ? <><Spinner />Verifying...</> : "Verify & Sign In"}
                  </button>

                  <button type="button" onClick={() => { setStep("login"); setOtp(["","","","","",""]); setError("") }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#92714a", fontWeight: 600 }}>
                    ← Back to login
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
