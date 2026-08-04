/**
 * PDF Token — lets the WhatsApp route generate a short-lived signed token
 * that allows Puppeteer to render the invoice page WITHOUT logging in.
 *
 * Token = base64(orderId:orderType:expiryTs) + HMAC signature
 * Valid for 10 minutes. Single domain only.
 */
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-32) || "safawala-pdf-secret-2026"

async function hmacHex(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function encodeBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
  return atob(padded)
}

export async function generatePdfToken(orderId: string, orderType: string): Promise<string> {
  const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes
  const payload = `${orderId}:${orderType}:${expiry}`
  const sig = (await hmacHex(payload)).slice(0, 16)
  return encodeBase64Url(`${payload}:${sig}`)
}

export async function verifyPdfToken(token: string): Promise<{ orderId: string; orderType: string } | null> {
  try {
    const decoded = decodeBase64Url(token)
    const parts = decoded.split(":")
    if (parts.length !== 4) return null
    const [orderId, orderType, expiry, sig] = parts
    if (Date.now() > Number(expiry)) return null // expired
    const payload = `${orderId}:${orderType}:${expiry}`
    const expected = (await hmacHex(payload)).slice(0, 16)
    if (sig !== expected) return null // tampered
    return { orderId, orderType }
  } catch {
    return null
  }
}
