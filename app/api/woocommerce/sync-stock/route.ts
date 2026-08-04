import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { wooCommerceService } from "@/lib/woocommerce-service"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  let requestData: any = {}

  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    requestData = await request.json()
    const { productCode, quantity } = requestData

    if (!productCode || quantity === undefined) {
      return NextResponse.json({ error: "Product code and quantity are required" }, { status: 400 })
    }

    // Get WooCommerce configuration
    const { data: config, error: configError } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("integration_name", "woocommerce")
      .eq("is_active", true)
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: "WooCommerce integration not configured" }, { status: 400 })
    }

    let wooConfig
    if (config.settings) {
      wooConfig = {
        storeUrl: config.settings.store_url,
        consumerKey: config.settings.consumer_key,
        consumerSecret: config.settings.consumer_secret,
      }
    } else {
      // Fallback to individual columns
      wooConfig = {
        storeUrl: config.base_url,
        consumerKey: config.api_key,
        consumerSecret: config.secret,
      }
    }

    if (!wooConfig.storeUrl || !wooConfig.consumerKey || !wooConfig.consumerSecret) {
      return NextResponse.json(
        {
          error: "WooCommerce configuration incomplete. Please configure store URL, consumer key, and consumer secret.",
        },
        { status: 400 },
      )
    }

    // Configure WooCommerce service
    wooCommerceService.setConfig(wooConfig)

    const connectionTest = await wooCommerceService.testConnection()
    if (!connectionTest) {
      return NextResponse.json(
        {
          error: "Failed to connect to WooCommerce store. Please check your configuration.",
        },
        { status: 400 },
      )
    }

    // Update stock in WooCommerce
    await wooCommerceService.updateStockQuantity(productCode, quantity)

    // Log the stock update
    await supabase.from("integration_logs").insert({
      integration_name: "woocommerce",
      action: "stock_update",
      success_count: 1,
      error_count: 0,
      details: {
        product_code: productCode,
        new_quantity: quantity,
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Stock updated successfully for product ${productCode}`,
    })
  } catch (error) {
    console.error("Error updating stock in WooCommerce:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    try {
      await supabase.from("integration_logs").insert({
        integration_name: "woocommerce",
        action: "stock_update",
        success_count: 0,
        error_count: 1,
        details: {
          product_code: requestData.productCode || "unknown",
          error: errorMessage,
        },
        created_at: new Date().toISOString(),
      })
    } catch (logError) {
      console.error("Failed to log error:", logError)
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
