import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { sendMessage, sendTemplateMessage, sendMedia, sendTestMessage } from "@/lib/services/wati-service"

export const dynamic = 'force-dynamic'

/**
 * POST /api/wati/send
 * Send WhatsApp message (text, template, or media)
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const body = await req.json()
    const { type, phone, message, templateName, parameters, mediaUrl, mediaType, caption } = body

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    let result

    switch (type) {
      case 'test':
        // Special test message that tries multiple methods
        result = await sendTestMessage(phone)
        break

      case 'text':
        if (!message) {
          return NextResponse.json({ error: "Message is required for text type" }, { status: 400 })
        }
        result = await sendMessage({ phone, message })
        break

      case 'template':
        if (!templateName) {
          return NextResponse.json({ error: "Template name is required" }, { status: 400 })
        }
        result = await sendTemplateMessage({
          phone,
          templateName,
          parameters: parameters || [],
        })
        break

      case 'media':
        if (!mediaUrl || !mediaType) {
          return NextResponse.json({ error: "Media URL and type are required" }, { status: 400 })
        }
        result = await sendMedia({
          phone,
          mediaUrl,
          mediaType,
          caption,
        })
        break

      default:
        return NextResponse.json({ error: "Invalid message type. Use: test, text, template, or media" }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "Message sent successfully",
    })
  } catch (error: any) {
    console.error("[API] /api/wati/send error:", error)
    return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 })
  }
}
