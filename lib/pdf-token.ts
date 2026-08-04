/**
 * PDF Token — lets the WhatsApp route generate a short-lived signed token
 * that allows Puppeteer to render the invoice page WITHOUT logging in.
 *
 * Token = base64(orderId:orderType:expiryTs) + HMAC signature
 * Valid for 10 minutes. Single domain only.
 */
import { createHmac } from "crypto"

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-32) || "safawala-pdf-secret-2026"

export function generatePdfToken(orderId: string, orderType: string): string {
  const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes
  const payload = `${orderId}:${orderType}:${expiry}`
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16)
  return Buffer.from(`${payload}:${sig}`).toString("base64url")
}

export function verifyPdfToken(token: string): { orderId: string; orderType: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString()
    const parts = decoded.split(":")
    if (parts.length !== 4) return null
    const [orderId, orderType, expiry, sig] = parts
    if (Date.now() > Number(expiry)) return null // expired
    const payload = `${orderId}:${orderType}:${expiry}`
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16)
    if (sig !== expected) return null // tampered
    return { orderId, orderType }
  } catch {
    return null
  }
}
