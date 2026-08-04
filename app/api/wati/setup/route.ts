import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { invalidateWATIConfigCache } from "@/lib/services/wati-service"
import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return Response.json(auth.error, { status: auth.statusCode })
  }
  try {
    console.log("[v0] Setting up WATI integration...")

    const watiConfig = {
      integration_name: "whatsapp-wati",
      api_key:
        "REDACTED_JWT",
      base_url: "https://live-mt-server.wati.io/481455",
      instance_id: "481455",
      test_phone: "919725295692",
      is_active: true,
      settings: {
        webhook_url: null,
        auto_notifications: true,
        business_hours: {
          enabled: true,
          start: "09:00",
          end: "18:00",
          timezone: "Asia/Kolkata",
        },
      },
    }

    const { data, error } = await supabase
      .from("integration_settings")
      .upsert(watiConfig, {
        onConflict: "integration_name",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("[v0] Error saving WATI config:", error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] WATI integration configured successfully:", data)
    invalidateWATIConfigCache()

    return Response.json({
      success: true,
      message: "WATI integration configured successfully",
      config: data[0],
    })
  } catch (error) {
    console.error("[v0] Error setting up WATI integration:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to setup WATI integration",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return Response.json(auth.error, { status: auth.statusCode })
  }
  try {
    const { data, error } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("integration_name", "whatsapp-wati")
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching WATI config:", error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      config: data || null,
      isConfigured: !!data,
    })
  } catch (error) {
    console.error("[v0] Error fetching WATI config:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch WATI configuration",
      },
      { status: 500 },
    )
  }
}
