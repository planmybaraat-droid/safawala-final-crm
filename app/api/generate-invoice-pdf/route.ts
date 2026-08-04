import { NextRequest, NextResponse } from "next/server"
import { generateAndSaveInvoicePDF } from "@/lib/services/invoice-pdf-service"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60 // Allow up to 60 seconds for Puppeteer PDF rendering

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success || !auth.authContext?.user) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext.user
    const body = await request.json()
    const { orderId, orderType } = body

    if (!orderId || !orderType) {
      return NextResponse.json(
        { error: "orderId and orderType are required" },
        { status: 400 }
      )
    }

    const validTypes = ["product_order", "package_booking", "direct_sale", "booking", "product_orders", "package_bookings", "direct_sales_orders", "bookings"]
    if (!validTypes.includes(orderType)) {
      return NextResponse.json(
        { error: `Invalid orderType. Valid: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const tableName = getTableName(orderType)
    if (!tableName) {
      return NextResponse.json(
        { error: `Unable to resolve table for orderType ${orderType}` },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabaseServer
      .from(tableName)
      .select("id, franchise_id")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, order.franchise_id)) {
      return NextResponse.json(
        { error: "Access denied to this order" },
        { status: 403 }
      )
    }

    console.log(`[PDF API] Generating PDF for ${orderType} ${orderId}...`)
    const publicUrl = await generateAndSaveInvoicePDF(orderId, orderType, supabaseServer)
    console.log(`[PDF API] Generation succeeded. URL: ${publicUrl}`)

    return NextResponse.json(
      { success: true, message: "Invoice PDF generated successfully", pdfUrl: publicUrl },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[PDF API] Route error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

function getTableName(orderType: string): string | null {
  switch (orderType) {
    case "product_order":
    case "product_orders":
      return "product_orders"
    case "package_booking":
    case "package_bookings":
      return "package_bookings"
    case "direct_sale":
    case "direct_sales_orders":
      return "direct_sales_orders"
    case "booking":
    case "bookings":
      return "bookings"
    default:
      return null
  }
}
