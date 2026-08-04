import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function generateBarcode(): string {
  // Generate barcode: timestamp + random digits
  // Example: "164945203512345" (14 digits - parseable by CODE128)
  const timestamp = Date.now().toString().slice(-10) // Last 10 digits of timestamp
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0') // 4 random digits
  return timestamp + random
}

/**
 * POST /api/products/generate-barcode
 * Generate and save a unique barcode for a product
 * Body: { productId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin', requirePermission: 'inventory' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Fetch product to verify ownership (franchise isolation)
    let productQuery = supabase
      .from("products")
      .select("id, franchise_id, barcode")
      .eq("id", productId)

    if (!auth.user!.is_super_admin && auth.user!.franchise_id) {
      productQuery = productQuery.eq("franchise_id", auth.user!.franchise_id)
    }

    const { data: product, error: fetchError } = await productQuery.single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Verify franchise access
    if (!auth.user!.is_super_admin && product.franchise_id !== auth.user!.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized access to this product" },
        { status: 403 }
      )
    }

    // If barcode already exists, return it
    if (product.barcode) {
      return NextResponse.json({ barcode: product.barcode })
    }

    // Generate unique barcode (with retry logic for uniqueness)
    let barcode = generateBarcode()
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      let existingQuery = supabase
        .from("products")
        .select("id")
        .eq("barcode", barcode)
        .limit(1)

      if (!auth.user!.is_super_admin && auth.user!.franchise_id) {
        existingQuery = existingQuery.eq("franchise_id", auth.user!.franchise_id)
      }

      const { data: existing } = await existingQuery

      if (!existing || existing.length === 0) {
        // Barcode is unique
        break
      }

      barcode = generateBarcode()
      attempts++
    }

    if (attempts === maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique barcode" },
        { status: 500 }
      )
    }

    // Save barcode to product
    const { error: updateError } = await supabase
      .from("products")
      .update({ barcode })
      .eq("id", productId)
      .eq("franchise_id", product.franchise_id)

    if (updateError) {
      console.error("Failed to update barcode:", updateError)
      return NextResponse.json(
        { error: "Failed to save barcode: " + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ barcode }, { status: 200 })
  } catch (error) {
    console.error("Error generating barcode:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
