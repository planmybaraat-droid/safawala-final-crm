import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const { to, phone, message, attachment, type } = await request.json()

    // Use phone parameter if provided, otherwise fall back to 'to'
    const recipient = phone || to

    if (!recipient) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // In a real implementation, you would integrate with WhatsApp Business API
    // For demo purposes, we'll simulate the API call
    console.log("WhatsApp Message:", {
      recipient,
      message,
      attachment,
      type: type || "general",
      timestamp: new Date().toISOString(),
    })

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // For demo, we'll always return success
    // In production, you would make actual API calls to WhatsApp Business API
    const response = {
      success: true,
      messageId: `msg_${Date.now()}`,
      status: "sent",
      recipient,
      type: type || "general",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("WhatsApp API Error:", error)
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 500 })
  }
}
