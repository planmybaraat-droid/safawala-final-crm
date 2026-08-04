import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    console.log("[v0] WooCommerce config API called")
    const { storeUrl, consumerKey, consumerSecret, testConnection } = await request.json()
    console.log("[v0] Request data received:", {
      storeUrl,
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      testConnection,
    })

    if (!storeUrl || !consumerKey || !consumerSecret) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Store URL, Consumer Key, and Consumer Secret are required" }, { status: 400 })
    }

    // Test connection if requested
    if (testConnection) {
      console.log("[v0] Testing WooCommerce connection...")
      const testUrl = `${storeUrl}/wp-json/wc/v3/system_status`
      const credentials = btoa(`${consumerKey}:${consumerSecret}`)

      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Connection test response status:", response.status)
      if (!response.ok) {
        console.log("[v0] Connection test failed")
        return NextResponse.json(
          { error: "Failed to connect to WooCommerce store. Please check your credentials and store URL." },
          { status: 400 },
        )
      }
      console.log("[v0] Connection test successful")
    }

    // Save configuration to database
    console.log("[v0] Saving configuration to database...")
    const configData = {
      integration_name: "woocommerce",
      settings: {
        store_url: storeUrl,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    }
    console.log("[v0] Config data to save:", {
      ...configData,
      settings: { ...configData.settings, consumer_key: "***", consumer_secret: "***" },
    })

    const { data, error } = await supabase
      .from("integration_settings")
      .upsert(configData, { onConflict: "integration_name" })
      .select()

    console.log("[v0] Database operation result:", { data: data?.length, error: error?.message })

    if (error) {
      console.error("[v0] Error saving WooCommerce config:", error)
      return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
    }

    console.log("[v0] Configuration saved successfully")
    return NextResponse.json({
      success: true,
      message: "WooCommerce configuration saved successfully",
      data: data[0],
    })
  } catch (error) {
    console.error("[v0] Error configuring WooCommerce:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { data, error } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("integration_name", "woocommerce")
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching WooCommerce config:", error)
      return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || null,
    })
  } catch (error) {
    console.error("Error fetching WooCommerce config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
