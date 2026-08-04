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
    throw new Error(`Sandbox authentication failed: ${response.statusText}`)
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

    const { phone, code: otp } = await request.json()

    if (!phone || !phone.trim() || !otp || !otp.trim()) {
      return NextResponse.json({ error: "Phone and OTP code are required" }, { status: 400 })
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

    const supabase = createClient()
    const nowStr = new Date().toISOString()

    // Query for a matching, unexpired verification record in database
    // The reference_id is stored in the 'code' column
    const { data: record, error: fetchError } = await supabase
      .from("verification_codes")
      .select("id, code, expires_at")
      .eq("phone", formattedPhone)
      .gt("expires_at", nowStr)
      .maybeSingle()

    if (fetchError) {
      console.error("[Verify Aadhaar OTP] Error fetching database record:", fetchError)
      return NextResponse.json({ error: "Failed to query verification session" }, { status: 500 })
    }

    if (!record) {
      return NextResponse.json({ success: false, error: "Verification session has expired or does not exist. Please request a new OTP." })
    }

    const referenceId = record.code

    console.log(`[Verify Aadhaar OTP] Authenticating with Sandbox.co.in...`)
    const accessToken = await getSandboxAccessToken()

    console.log(`[Verify Aadhaar OTP] Submitting OTP for verification (Reference ID: ${referenceId})...`)
    const verifyResponse = await fetch("https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify", {
      method: "POST",
      headers: {
        "Authorization": accessToken,
        "x-api-key": process.env.SANDBOX_API_KEY!,
        "x-api-version": "1.0.0",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
        "reference_id": referenceId,
        "otp": otp.trim()
      })
    })

    const result = await verifyResponse.json()
    if (!verifyResponse.ok) {
      console.error("[Sandbox Aadhaar OTP Verify Error]:", result)
      const errorMsg = result?.message || result?.error || `Aadhaar verification failed with status ${verifyResponse.status}`

      return NextResponse.json({ success: false, error: errorMsg })
    }

    // Success! Sandbox has verified the Aadhaar.
    console.log(`[Verify Aadhaar OTP] Verification successful! Demographic Name: ${result?.data?.name}`)

    // Consume/delete the database record so it cannot be reused
    await supabase
      .from("verification_codes")
      .delete()
      .eq("id", record.id)

    return NextResponse.json({
      success: true,
      message: "Aadhaar verified successfully via Sandbox",
      data: result.data // Contains details: name, date_of_birth, gender, address, photo
    })
  } catch (err: any) {
    console.error("[Verify Aadhaar OTP] Error:", err)
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 })
  }
}
