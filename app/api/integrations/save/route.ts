import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "franchise_admin", requirePermission: "integrations" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    const { integrationName, config } = body

    if (!integrationName) {
      return NextResponse.json({ success: false, error: "Integration name is required" }, { status: 400 })
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json({ success: false, error: "Configuration object is required" }, { status: 400 })
    }

    console.log("[v0] Saving integration config:", { integrationName, config })

    // Upsert integration settings
    const { data, error } = await supabase
      .from("integration_settings")
      .upsert(
        {
          integration_name: integrationName,
          api_key: config.apiKey || null,
          secret: config.secret || null,
          webhook: config.webhook || null,
          base_url: config.baseUrl || null,
          instance_id: config.instanceId || null,
          test_phone: config.testPhone || null,
          settings:
            integrationName === "woocommerce"
              ? {
                  store_url: config.storeUrl || config.baseUrl,
                  consumer_key: config.consumerKey || config.apiKey,
                  consumer_secret: config.consumerSecret || config.secret,
                  webhook_secret: config.webhookSecret || config.webhook,
                }
              : null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "integration_name",
        },
      )
      .select()

    if (error) {
      console.error("[v0] Error saving integration config:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] Integration config saved successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error in save integration API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
