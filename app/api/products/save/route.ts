import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/products/save
 * Create a new product + images using service role (bypasses RLS)
 * Body: { productData, images, franchiseId? }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, "staff")
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const authUser = authResult.authContext!.user
    if (!authUser.permissions.inventory && !authUser.permissions.productArchive) {
      return NextResponse.json({ error: "You do not have permission to create products" }, { status: 403 })
    }

    const body = await req.json()
    const { images, variants, _variation_count, category_name, product_code, franchiseId: bodyFranchiseId, ...productData } = body

    // Strip undefined / empty strings to null for UUID fields
    const cleanData: Record<string, any> = {}
    for (const [k, v] of Object.entries(productData)) {
      if (v !== undefined) cleanData[k] = v === "" ? null : v
    }
    // Make sure we never send id on insert
    delete cleanData.id

    const supabase = getServiceClient()

    let franchise_id = bodyFranchiseId || cleanData.franchise_id || authUser.franchise_id

    if (!franchise_id) {
      return NextResponse.json({ error: "Franchise ID is required to create a product" }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(authUser, franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    cleanData.franchise_id = franchise_id
    delete cleanData.franchiseId
    cleanData.created_at = new Date().toISOString()
    cleanData.updated_at = new Date().toISOString()

    const { data: newProduct, error } = await supabase
      .from("products")
      .insert([cleanData])
      .select()
      .single()

    if (error) {
      console.error("[POST /api/products/save] insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const productId = newProduct.id

    // Insert images
    if (images && Array.isArray(images) && images.length > 0) {
      const imagesToInsert = images.map((img: any, idx: number) => ({
        product_id: productId,
        url: img.url,
        is_main: img.is_main,
        order: idx,
      }))
      const { error: imgErr } = await supabase.from("product_images").insert(imagesToInsert)
      if (imgErr) console.error("[POST /api/products/save] image insert error:", imgErr)
    }

    return NextResponse.json({ success: true, id: productId, product: newProduct }, { status: 201 })
  } catch (err: any) {
    console.error("[POST /api/products/save] unexpected error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
