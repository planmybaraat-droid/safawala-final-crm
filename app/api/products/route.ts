import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/products
 * Create a new product (franchise-specific)
 * Body: {
 *   name: string
 *   category: string
 *   description?: string
 *   rental_price?: number
 *   sale_price?: number
 *   security_deposit?: number
 *   stock_available?: number
 *   franchise_id: string
 *   is_custom?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin', requirePermission: 'inventory' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await req.json()
    const {
      name,
      category,
      description,
      rental_price = 0,
      sale_price = 0,
      security_deposit = 0,
      stock_available = 999,
      franchise_id: bodyFranchiseId,
      is_custom = true,
      image_url,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Use franchise from session (super admin can override)
    const franchiseId = auth.user!.is_super_admin && bodyFranchiseId ? bodyFranchiseId : auth.user!.franchise_id
    if (!franchiseId) {
      return NextResponse.json(
        { error: "User has no franchise assigned" },
        { status: 403 }
      )
    }

    // Normalize values and provide safe defaults expected by inventory UI
    const normalizedRental = Number.isFinite(Number(rental_price)) ? Number(rental_price) : 0
    const normalizedSale = Number.isFinite(Number(sale_price)) ? Number(sale_price) : 0
    const normalizedStock = Number.isFinite(Number(stock_available)) ? Number(stock_available) : 0

    // Create product in database
    const supabase = createClient()
    const { data: product, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          category,
          description,
          rental_price: normalizedRental,
          sale_price: normalizedSale,
          // Inventory table expects `price` (sale price) and `stock_total`
          price: normalizedSale,
          security_deposit,
          stock_available: normalizedStock,
          stock_total: normalizedStock,
          reorder_level: 0,
          franchise_id: franchiseId,
          is_custom,
          is_active: true,
          image_url,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Failed to create product:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create product" },
        { status: 500 }
      )
    }

    console.log("✅ Custom product created:", product)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/products
 * Fetch products (with optional franchise filter)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.is_super_admin

    const { searchParams } = new URL(req.url)
    const barcodeParam = searchParams.get("barcode")
    const searchParam = searchParams.get("search")
    const limitParam = parseInt(searchParams.get("limit") || "500", 10)
    const idParam = searchParams.get("id")
    const categoryIdParam = searchParams.get("category_id")
    const activeOnlyParam = searchParams.get("active_only")
    const franchiseIdParam = searchParams.get("franchise_id")

    const supabase = createClient()
    let query = supabase.from("products").select("*").order("name").limit(limitParam)

    // Franchise isolation
    if (franchiseIdParam) {
      if (!isSuperAdmin && franchiseIdParam !== franchiseId) {
        return NextResponse.json(
          { error: "Access denied to the requested franchise" },
          { status: 403 }
        )
      }
      query = query.eq("franchise_id", franchiseIdParam)
    } else if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    // Category filter (server-side, bypasses client-side matching issues)
    if (categoryIdParam && categoryIdParam !== "all") {
      query = query.eq("category_id", categoryIdParam)
    }

    // Active only filter
    if (activeOnlyParam === "true") {
      query = query.eq("is_active", true)
    }

    // Barcode lookup
    if (barcodeParam) {
      query = query.ilike("barcode", barcodeParam.trim())
    }

    // Text search
    if (searchParam) {
      query = query.or(`name.ilike.%${searchParam}%,barcode.ilike.%${searchParam}%,product_code.ilike.%${searchParam}%`)
    }

    // Single product by id
    if (idParam) {
      query = query.eq("id", idParam)
    }

    const { data: products, error } = await query

    if (error) {
      console.error("Failed to fetch products:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch products" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
