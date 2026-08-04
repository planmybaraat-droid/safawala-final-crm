import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { wooCommerceService } from "@/lib/woocommerce-service"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }
    const franchiseId = auth.user?.franchise_id || ""
    const isSuperAdmin = auth.user?.is_super_admin || false

    const { productIds, syncAll } = await request.json()

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

    // Get products to sync
    let query = supabase.from("products").select("*").eq("is_active", true)
    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    if (!syncAll && productIds && productIds.length > 0) {
      query = query.in("id", productIds)
    }

    const { data: products, error: productsError } = await query

    if (productsError) {
      console.error("Error fetching products:", productsError)
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "No products found to sync" }, { status: 400 })
    }

    // Sync products to WooCommerce
    const result = await wooCommerceService.syncMultipleProducts(products)

    // Log sync results
    const syncLog = {
      integration_name: "woocommerce",
      action: "product_sync",
      success_count: result.success.length,
      error_count: result.errors.length,
      details: {
        synced_products: result.success.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
        errors: result.errors.map((e) => ({ product_name: e.product.name, error: e.error })),
      },
      created_at: new Date().toISOString(),
    }

    await supabase.from("integration_logs").insert(syncLog)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.success.length} products to WooCommerce`,
      data: {
        synced: result.success.length,
        errors: result.errors.length,
        details: result,
      },
    })
  } catch (error) {
    console.error("Error syncing products to WooCommerce:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to sync products"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
