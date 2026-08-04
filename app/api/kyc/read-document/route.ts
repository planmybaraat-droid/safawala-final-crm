import { NextRequest, NextResponse } from "next/server"
import Tesseract from "tesseract.js"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

// Verhoeff checksum lookup tables
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

function validateVerhoeff(numStr: string): boolean {
  if (numStr.length !== 12 || !/^\d{12}$/.test(numStr)) return false
  if (numStr[0] === "0" || numStr[0] === "1") return false
  
  let c = 0
  const reversed = numStr.split("").reverse().map(Number)
  for (let i = 0; i < 12; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]]
  }
  return c === 0
}

function cleanLookalikes(str: string): string {
  return str
    .replace(/[oO]/g, "0")
    .replace(/[iIl|!\/]/g, "1")
    .replace(/[zZ]/g, "2")
    .replace(/[sS]/g, "5")
    .replace(/[bB]/g, "8")
    .replace(/[gG]/g, "9")
    .replace(/[^0-9]/g, "")
}

function extractAadhaarNumber(text: string): { number: string; isVerified: boolean } | null {
  const lines = text.split('\n')
  const highConfidenceCandidates: string[] = []
  const lowConfidenceCandidates: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const cleanedLine = trimmedLine.replace(/[^A-Za-z0-9\s-]/g, "")

    const patternMatch = cleanedLine.match(/[0-9oOiIl|!zZsSbBgG]{4}[\s-][0-9oOiIl|!zZsSbBgG]{4}[\s-][0-9oOiIl|!zZsSbBgG]{4}/)
    if (patternMatch) {
      const digits = cleanLookalikes(patternMatch[0])
      if (digits.length === 12) {
        if (validateVerhoeff(digits)) {
          highConfidenceCandidates.push(digits)
        } else {
          lowConfidenceCandidates.push(digits)
        }
      }
    }

    const consecutiveMatch = cleanedLine.match(/[0-9oOiIl|!zZsSbBgG]{12}/)
    if (consecutiveMatch) {
      const digits = cleanLookalikes(consecutiveMatch[0])
      if (digits.length === 12) {
        if (validateVerhoeff(digits)) {
          highConfidenceCandidates.push(digits)
        } else {
          lowConfidenceCandidates.push(digits)
        }
      }
    }

    const lineDigits = cleanLookalikes(trimmedLine)
    if (lineDigits.length === 12) {
      if (validateVerhoeff(lineDigits)) {
        highConfidenceCandidates.push(lineDigits)
      } else {
        lowConfidenceCandidates.push(lineDigits)
      }
    } else if (lineDigits.length > 12) {
      for (let i = 0; i <= lineDigits.length - 12; i++) {
        const windowDigits = lineDigits.substring(i, i + 12)
        if (validateVerhoeff(windowDigits)) {
          highConfidenceCandidates.push(windowDigits)
        } else {
          lowConfidenceCandidates.push(windowDigits)
        }
      }
    }
  }

  if (highConfidenceCandidates.length > 0) {
    return { number: highConfidenceCandidates[0], isVerified: true }
  }
  if (lowConfidenceCandidates.length > 0) {
    return { number: lowConfidenceCandidates[0], isVerified: false }
  }
  return null
}

function extractPassportDetails(text: string) {
  const lines = text.split('\n').map(line => line.trim().toUpperCase())
  let passportNum: string | null = null
  let country: string | null = null
  let expiry: string | null = null

  const labelRegex = /(?:PASSPORT|DOC|DOCUMENT)\s*(?:NO|NUMBER|NUM)?\s*[:\-\s]+([A-Z0-9]{8,12})/i
  const labelMatch = text.match(labelRegex)
  if (labelMatch) {
    passportNum = labelMatch[1].replace(/</g, "").trim()
  }

  const mrzLines = lines.filter(l => l.includes('<') && l.length >= 30)
  let mrzLine1 = mrzLines.find(l => l.startsWith('P<') || l.startsWith('P1') || l.startsWith('PO') || l.startsWith('P0'))
  let mrzLine2 = mrzLines.find(l => {
    return !l.startsWith('P<') && !l.startsWith('P1') && l.match(/[A-Z0-9<]{9}\d[A-Z<]{3}\d{6}/)
  })

  if (mrzLine1) {
    const countryCode = mrzLine1.substring(2, 5).replace(/</g, "").trim()
    if (countryCode && countryCode.length === 3) {
      country = countryCode
    }
  }

  if (mrzLine2) {
    if (!passportNum) {
      passportNum = mrzLine2.substring(0, 9).replace(/</g, "").trim()
    }
    const expiryRaw = mrzLine2.substring(21, 27)
    if (/^\d{6}$/.test(expiryRaw)) {
      const yy = expiryRaw.substring(0, 2)
      const mm = expiryRaw.substring(2, 4)
      const dd = expiryRaw.substring(4, 6)
      expiry = `20${yy}-${mm}-${dd}`
    }
    if (!country) {
      const natCode = mrzLine2.substring(10, 13).replace(/</g, "").trim()
      if (natCode && natCode.length === 3) {
        country = natCode
      }
    }
  }

  if (!passportNum) {
    const genericMatch = text.match(/\b([A-Z][0-9]{7,8})\b/i)
    if (genericMatch) {
      passportNum = genericMatch[1].toUpperCase()
    }
  }

  if (!expiry) {
    const expiryRegex = /(?:EXPIRY|EXP|VAL|VALID)\s*(?:DATE|UNTIL)?\s*[:\-\s]+(\d{2}[/\-.]\d{2}[/\-.]\d{4})/i
    const expiryMatch = text.match(expiryRegex)
    if (expiryMatch) {
      const dateStr = expiryMatch[1].replace(/[./]/g, "-")
      const parts = dateStr.split("-")
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          expiry = `${parts[2]}-${parts[1]}-${parts[0]}`
        } else if (parts[0].length === 4) {
          expiry = `${parts[0]}-${parts[1]}-${parts[2]}`
        }
      }
    }
  }

  return { passportNum, country, expiry }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const { url, docType } = await request.json()
    if (!url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    try {
      const parsedUrl = new URL(url)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "Invalid document URL" }, { status: 400 })
    }

    console.log(`[Backend OCR API] Fetching image from URL: ${url}`)
    const imgResponse = await fetch(url)
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch document image from URL: ${imgResponse.statusText}`)
    }
    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`[Backend OCR API] Initializing server-side Tesseract for type: ${docType}`)
    const ocrResult = await Tesseract.recognize(
      buffer,
      'eng',
      {
        logger: m => console.log(`[Backend OCR Progress]`, m.status, `${Math.round(m.progress * 100)}%`)
      }
    )

    const text = ocrResult?.data?.text || ""
    console.log(`[Backend OCR Raw Text]:`, text)

    if (docType === "aadhaar") {
      const parsed = extractAadhaarNumber(text)
      return NextResponse.json({
        success: true,
        method: "backend_tesseract",
        text,
        data: parsed ? {
          aadharNumber: parsed.number,
          isVerified: parsed.isVerified
        } : null
      })
    } else {
      const parsed = extractPassportDetails(text)
      return NextResponse.json({
        success: true,
        method: "backend_tesseract",
        text,
        data: parsed ? {
          passportNumber: parsed.passportNum,
          country: parsed.country,
          expiry: parsed.expiry
        } : null
      })
    }

  } catch (error: any) {
    console.error("[Backend OCR API Error]:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process server-side OCR on backend"
    }, { status: 500 })
  }
}
