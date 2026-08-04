import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { sendTestMessage } from "@/lib/services/wati-service"

export const dynamic = "force-dynamic"

/**
 * POST /api/whatsapp/test
 * Validates WATI connection and sends a test message to the configured test phone number.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, "staff")
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    // Retrieve active WATI setup parameters from integration settings
    const { data: config, error: configErr } = await supabase
      .from("integration_settings")
      .select("test_phone, is_active")
      .eq("integration_name", "whatsapp-wati")
      .single()

    if (configErr || !config) {
      return NextResponse.json(
        { success: false, error: "WATI settings are not configured. Please enter settings first." },
        { status: 400 }
      )
    }

    if (!config.test_phone) {
      return NextResponse.json(
        { success: false, error: "Test phone number is not configured." },
        { status: 400 }
      )
    }

    if (!config.is_active) {
      return NextResponse.json(
        { success: false, error: "WhatsApp WATI integration is set to Inactive." },
        { status: 400 }
      )
    }

    console.log(`[WATI Test] Triggering test message to ${config.test_phone}`)
    const result = await sendTestMessage(config.test_phone)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to dispatch test message." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test message sent successfully to ${config.test_phone}`,
      messageId: result.messageId,
    })
  } catch (error: any) {
    console.error("[WATI Test] Endpoint error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process test request." },
      { status: 500 }
    )
  }
}
