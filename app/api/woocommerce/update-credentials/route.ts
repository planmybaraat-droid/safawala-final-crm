import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    console.log("[v0] Updating WooCommerce credentials...")

    const { data, error } = await supabase.from("integration_settings").upsert(
      {
        integration_name: "woocommerce",
        is_active: true,
        settings: {
          store_url: "https://safawala.com",
          consumer_key: "REDACTED_WOOCOMMERCE_CONSUMER_KEY",
          consumer_secret: "REDACTED_WOOCOMMERCE_CONSUMER_SECRET",
          webhook_secret: "",
        },
      },
      {
        onConflict: "integration_name",
      },
    )

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ success: false, error: error.message })
    }

    console.log("[v0] WooCommerce credentials updated successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error updating WooCommerce credentials:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
