import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/products/[id]/variations
 * Fetch all variations for a product
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const productId = params.id
    const supabase = createClient()

    let query = supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    // Franchise isolation
    if (!auth.user!.is_super_admin && auth.user!.franchise_id) {
      query = query.eq("franchise_id", auth.user!.franchise_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error fetching variations:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/[id]/variations
 * Create a new variation for a product
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff', requirePermission: 'inventory' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const productId = params.id
    const body = await req.json()

    const {
      variation_name,
      color,
      design,
      material,
      size,
      sku,
      price_adjustment = 0,
      regular_price_adjustment = 0,
      rental_price_adjustment = 0,
      stock_total = 0,
      stock_available,
      stock_booked = 0,
      stock_damaged = 0,
      image_url,
    } = body

    if (!variation_name || !variation_name.trim()) {
      return NextResponse.json({ error: "Variation name is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Verify product exists and get its franchise_id
    let productQuery = supabase
      .from("products")
      .select("id, franchise_id")
      .eq("id", productId)

    if (!auth.user!.is_super_admin && auth.user!.franchise_id) {
      productQuery = productQuery.eq("franchise_id", auth.user!.franchise_id)
    }

    const { data: product, error: prodError } = await productQuery.single()

    if (prodError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, product.franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const franchiseId = auth.user!.franchise_id || product.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ error: "No franchise assigned" }, { status: 403 })
    }

    // Auto-generate unique 11-digit barcode for every new variant
    const autoBarcode = body.barcode || `${Math.floor(10000000000 + Math.random() * 90000000000)}`

    const { data: variation, error } = await supabase
      .from("product_variations")
      .insert([{
        product_id: productId,
        franchise_id: franchiseId,
        variation_name: variation_name.trim().substring(0, 255),
        color: color?.trim().substring(0, 100) || null,
        design: design?.trim().substring(0, 100) || null,
        material: material?.trim().substring(0, 100) || null,
        size: size?.trim().substring(0, 50) || null,
        sku: sku?.trim().substring(0, 100) || null,
        price_adjustment: Number(price_adjustment) || 0,
        regular_price_adjustment: Number(regular_price_adjustment) || 0,
        rental_price_adjustment: Number(rental_price_adjustment) || 0,
        stock_total: Math.max(0, Number(stock_total) || 0),
        stock_available: Math.max(0, Number(stock_available ?? stock_total) || 0),
        stock_booked: Math.max(0, Number(stock_booked) || 0),
        stock_damaged: Math.max(0, Number(stock_damaged) || 0),
        image_url: image_url || null,
        barcode: autoBarcode,
        is_active: true,
      }])
      .select()
      .single()

    if (error) {
      console.error("Failed to create variation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(variation, { status: 201 })
  } catch (error) {
    console.error("Error creating variation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/products/[id]/variations
 * Update a variation (pass variation id in body)
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff', requirePermission: 'inventory' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const { variation_id, ...updateFields } = body

    if (!variation_id) {
      return NextResponse.json({ error: "variation_id is required" }, { status: 400 })
    }

    const supabase = createClient()

    const { data: existingVariation, error: existingVariationError } = await supabase
      .from("product_variations")
      .select("id, franchise_id")
      .eq("id", variation_id)
      .eq("product_id", params.id)
      .single()

    if (existingVariationError || !existingVariation) {
      return NextResponse.json({ error: "Variation not found" }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, existingVariation.franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    // Build safe update object
    const updateData: Record<string, unknown> = {}
    if (updateFields.variation_name !== undefined) updateData.variation_name = updateFields.variation_name.trim().substring(0, 255)
    if (updateFields.color !== undefined) updateData.color = updateFields.color?.trim().substring(0, 100) || null
    if (updateFields.design !== undefined) updateData.design = updateFields.design?.trim().substring(0, 100) || null
    if (updateFields.material !== undefined) updateData.material = updateFields.material?.trim().substring(0, 100) || null
    if (updateFields.size !== undefined) updateData.size = updateFields.size?.trim().substring(0, 50) || null
    if (updateFields.sku !== undefined) updateData.sku = updateFields.sku?.trim().substring(0, 100) || null
    if (updateFields.price_adjustment !== undefined) updateData.price_adjustment = Number(updateFields.price_adjustment) || 0
    if (updateFields.regular_price_adjustment !== undefined) updateData.regular_price_adjustment = Number(updateFields.regular_price_adjustment) || 0
    if (updateFields.rental_price_adjustment !== undefined) updateData.rental_price_adjustment = Number(updateFields.rental_price_adjustment) || 0
    if (updateFields.stock_total !== undefined) {
      updateData.stock_total = Math.max(0, Number(updateFields.stock_total) || 0)
    }
    if (updateFields.stock_available !== undefined) {
      updateData.stock_available = Math.max(0, Number(updateFields.stock_available) || 0)
    }
    if (updateFields.stock_booked !== undefined) {
      updateData.stock_booked = Math.max(0, Number(updateFields.stock_booked) || 0)
    }
    if (updateFields.stock_damaged !== undefined) {
      updateData.stock_damaged = Math.max(0, Number(updateFields.stock_damaged) || 0)
    }
    if (updateFields.image_url !== undefined) updateData.image_url = updateFields.image_url || null

    const { data: variation, error } = await supabase
      .from("product_variations")
      .update(updateData)
      .eq("id", variation_id)
      .eq("product_id", params.id)
      .eq("franchise_id", existingVariation.franchise_id)
      .select()
      .single()

    if (error) {
      console.error("Failed to update variation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(variation)
  } catch (error) {
    console.error("Error updating variation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]/variations
 * Soft-delete a variation (pass variation_id in body)
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'staff', requirePermission: 'inventory' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { searchParams } = new URL(req.url)
    const variationId = searchParams.get("variation_id")

    if (!variationId) {
      return NextResponse.json({ error: "variation_id query param is required" }, { status: 400 })
    }

    const supabase = createClient()

    const { data: existingVariation, error: existingVariationError } = await supabase
      .from("product_variations")
      .select("id, franchise_id")
      .eq("id", variationId)
      .eq("product_id", params.id)
      .single()

    if (existingVariationError || !existingVariation) {
      return NextResponse.json({ error: "Variation not found" }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, existingVariation.franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const { error } = await supabase
      .from("product_variations")
      .update({ is_active: false })
      .eq("id", variationId)
      .eq("product_id", params.id)
      .eq("franchise_id", existingVariation.franchise_id)

    if (error) {
      console.error("Failed to delete variation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting variation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
