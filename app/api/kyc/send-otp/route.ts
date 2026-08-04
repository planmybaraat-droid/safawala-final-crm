import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

async function getSandboxAccessToken() {
  const apiKey = process.env.SANDBOX_API_KEY
  const apiSecret = process.env.SANDBOX_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error("Sandbox API credentials missing in env.local")
  }

  const response = await fetch("https://api.sandbox.co.in/authenticate", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
      "x-api-version": "1.0.0",
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[Sandbox Auth] Failed to authenticate:", errorBody)
    throw new Error(`Sandbox authentication failed: ${response.statusText}. Details: ${errorBody}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const { phone, aadharNumber } = await request.json()

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Customer phone number is required" }, { status: 400 })
    }

    if (!aadharNumber || !/^\d{12}$/.test(aadharNumber.trim())) {
      return NextResponse.json({ error: "A valid 12-digit Aadhaar number is required" }, { status: 400 })
    }

    let formattedPhone = phone.trim()
    // Normalize phone format: if no country code, default to +91 (India)
    if (!formattedPhone.startsWith("+")) {
      const cleanPhone = formattedPhone.replace(/^0+/, "")
      if (cleanPhone.length === 10) {
        formattedPhone = `+91${cleanPhone}`
      } else {
        formattedPhone = `+${cleanPhone}`
      }
    }

    console.log(`[Send Aadhaar OTP] Authenticating with Sandbox.co.in...`)
    const accessToken = await getSandboxAccessToken()

    console.log(`[Send Aadhaar OTP] Requesting OTP for Aadhaar ending in ${aadharNumber.slice(-4)}...`)
    const otpResponse = await fetch("https://api.sandbox.co.in/kyc/aadhaar/okyc/otp", {
      method: "POST",
      headers: {
        "Authorization": accessToken,
        "x-api-key": process.env.SANDBOX_API_KEY!,
        "x-api-version": "1.0.0",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
        "aadhaar_number": aadharNumber.trim(),
        "consent": "Y",
        "reason": "KYC verification"
      })
    })

    const result = await otpResponse.json()
    if (!otpResponse.ok) {
      console.error("[Sandbox Aadhaar OTP Error]:", result)
      const errorMsg = result?.message || result?.error || `Sandbox API responded with status ${otpResponse.status}`
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    const referenceId = result?.data?.reference_id?.toString() || result?.reference_id?.toString()
    if (!referenceId) {
      console.error("[Sandbox Aadhaar OTP] Missing reference_id in response:", result)
      return NextResponse.json({ error: "Failed to generate verification reference from Sandbox" }, { status: 500 })
    }

    console.log(`[Send Aadhaar OTP] OTP triggered. Reference ID: ${referenceId}`)

    // Code expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const supabase = createClient()
    
    // Clean up any older codes for this phone (normalized)
    await supabase
      .from("verification_codes")
      .delete()
      .eq("phone", formattedPhone)

    // Save Sandbox reference_id as the 'code' in verification_codes table
    const { error: insertError } = await supabase
      .from("verification_codes")
      .insert({
        phone: formattedPhone,
        code: referenceId, // Save reference_id here so we can read it on verification
        expires_at: expiresAt
      })

    if (insertError) {
      console.error("[Send Aadhaar OTP] Database insert error:", insertError)
      return NextResponse.json({ error: "Failed to store verification reference" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Aadhaar OTP sent successfully" })
  } catch (err: any) {
    console.error("[Send Aadhaar OTP] Error:", err)
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 })
  }
}
