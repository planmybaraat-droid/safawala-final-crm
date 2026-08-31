import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { urlToPdfBuffer } from "@/lib/puppeteer-pdf"
import { generatePdfToken } from "@/lib/pdf-token"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60 // headless Chrome render can take a few seconds

/**
 * POST /api/invoices/print-pdf
 *
 * Renders the invoice as a clean PDF server-side (headless Chrome) and streams it
 * back, instead of letting the browser print the live webpage directly. The
 * browser's own "Print" action always stamps its own header/footer (date, URL,
 * page number) onto the page — that cannot be turned off from app code, only from
 * the browser's print dialog. Printing an actual PDF file sidesteps that entirely:
 * a PDF is WYSIWYG, so nothing extra gets added.
 *
 * This reuses the same headless-render pipeline already used for WhatsApp invoice
 * sending (lib/services/invoice-pdf-service.ts) but does NOT save anything to
 * Supabase Storage or touch any order record — it's a pure render-and-return for
 * the on-screen "Print" button.
 *
 * Body: { orderId: string, orderType?: string, customerName?, customerPhone?, customerEmail? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "readonly" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { orderId, orderType, customerName, customerPhone, customerEmail } = body || {}

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const token = generatePdfToken(orderId, orderType || "product_order")

    // Build the same-origin URL so this works in dev (any port) and in production alike.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const params = new URLSearchParams({ mode: "edit", id: orderId, print: "true", pdfToken: token })
    if (customerName) params.set("customerName", customerName)
    if (customerPhone) params.set("customerPhone", customerPhone)
    if (customerEmail) params.set("customerEmail", customerEmail)

    const invoicePageUrl = `${appUrl}/create-invoice?${params.toString()}`

    const pdfBuffer = await urlToPdfBuffer(invoicePageUrl)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${orderId}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("[Print PDF] Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate invoice PDF" }, { status: 500 })
  }
}
