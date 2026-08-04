import { type NextRequest, NextResponse } from "next/server"
import { whatsappService } from "@/lib/whatsapp-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, attachment } = body

    // Use WATI service if configured, otherwise fallback to legacy
    const success = await whatsappService.sendMessage({
      to,
      type: attachment ? "media" : "text",
      text: { body: message },
      ...(attachment && {
        media: {
          type: "document",
          document: {
            filename: attachment.filename,
            link: `data:${attachment.mimetype};base64,${attachment.content}`,
          },
        },
      }),
    })

    if (success) {
      return NextResponse.json({ success: true, message: "Message sent successfully" })
    } else {
      return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 })
    }
  } catch (error) {
    console.error("WhatsApp API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
