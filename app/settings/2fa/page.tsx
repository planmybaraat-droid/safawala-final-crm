"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { ShieldCheck, ShieldOff, Smartphone, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function TwoFactorPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"idle" | "setup" | "enabled">("idle")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [disabling, setDisabling] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u) { router.push("/"); return }
      if (!['super_admin', 'franchise_admin'].includes(u.role)) {
        router.push("/settings")
        return
      }
      setUser(u)
      checkStatus()
    })
  }, [router])

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/setup")
      const data = await res.json()
      if (data.already_enabled) {
        setStatus("enabled")
      } else if (data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl)
        setSecret(data.secret)
        setStatus("setup")
      } else {
        setStatus("idle")
      }
    } catch {
      setStatus("idle")
    } finally {
      setLoading(false)
    }
  }

  const startSetup = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/2fa/setup")
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.already_enabled) { setStatus("enabled"); return }
      setQrDataUrl(data.qrDataUrl)
      setSecret(data.secret)
      setStatus("setup")
    } catch {
      setError("Failed to start setup")
    } finally {
      setLoading(false)
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
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (text.length === 6) { setOtp(text.split("")); otpRefs.current[5]?.focus() }
    e.preventDefault()
  }

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join("")
    if (code.length < 6) { setError("Enter all 6 digits"); return }
    setVerifying(true)
    setError("")
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Invalid code"); return }
      toast.success("2FA enabled successfully!")
      setStatus("enabled")
    } catch {
      setError("Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  const handleDisable = async () => {
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return
    setDisabling(true)
    try {
      const res = await fetch("/api/auth/2fa/enable", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Failed to disable 2FA"); return }
      toast.success("2FA disabled")
      setStatus("idle")
      setOtp(["", "", "", "", "", ""])
    } catch {
      toast.error("Failed to disable 2FA")
    } finally {
      setDisabling(false)
    }
  }

  if (!user) return null

  return (
    <DashboardErrorBoundary>
      <DashboardLayout userRole={user.role}>
        <div className="max-w-lg mx-auto space-y-6 py-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Two-Factor Authentication</h1>
            <p className="text-sm text-slate-500 mt-1">
              Secure your account with an authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          {/* Status card */}
          <Card className={status === "enabled" ? "border-green-200 bg-green-50/50" : "border-slate-200"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {status === "enabled" ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <ShieldOff className="h-5 w-5 text-slate-400" />
                  )}
                  Authenticator App
                </CardTitle>
                <Badge className={status === "enabled"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"} variant="outline">
                  {status === "enabled" ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {status === "enabled"
                  ? "Your account is protected with 2FA. You'll be asked for a code on every login."
                  : "Add an extra layer of security to your admin account."}
              </CardDescription>
            </CardHeader>
            {status !== "setup" && (
              <CardContent>
                {status === "enabled" ? (
                  <Button variant="destructive" size="sm" onClick={handleDisable} disabled={disabling}>
                    {disabling ? "Disabling..." : "Disable 2FA"}
                  </Button>
                ) : (
                  <Button onClick={startSetup} disabled={loading} size="sm"
                    className="bg-gradient-to-r from-stone-800 to-stone-700 text-white hover:opacity-90">
                    <Smartphone className="h-4 w-4 mr-2" />
                    {loading ? "Loading..." : "Set Up 2FA"}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>

          {/* Setup flow */}
          {status === "setup" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scan QR Code</CardTitle>
                <CardDescription className="text-xs">
                  Open your authenticator app and scan this QR code, then enter the 6-digit code to confirm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-100 bg-red-50 rounded-xl p-3">
                    <AlertDescription className="text-xs flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* QR Code */}
                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                      Can't scan? Enter this key manually:
                    </p>
                    <code className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-mono text-slate-700 tracking-widest select-all">
                      {secret}
                    </code>
                  </div>
                )}

                {/* OTP Input */}
                <form onSubmit={handleEnable} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                      Enter verification code
                    </p>
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
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
                          disabled={verifying}
                          className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none focus:border-stone-600"
                          style={{ borderColor: digit ? "#5c3520" : "#e2e8f0", background: "white", color: "#2c1810" }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={verifying || otp.join("").length < 6}
                      className="flex-1 bg-gradient-to-r from-stone-800 to-stone-700 text-white hover:opacity-90">
                      {verifying ? "Verifying..." : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" /> Enable 2FA</>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setStatus("idle"); setError("") }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {status === "enabled" && (
            <Alert className="border-green-200 bg-green-50 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs text-green-800 ml-2">
                Every login to this account will require a 6-digit code from your authenticator app.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DashboardLayout>
    </DashboardErrorBoundary>
  )
}
