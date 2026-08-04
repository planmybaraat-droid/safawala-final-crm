import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Service-role client — bypasses RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * PATCH /api/products/[id]
 * Update product fields + sync product_images
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req, "staff")
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const authUser = authResult.authContext!.user
    if (!authUser.permissions.inventory && !authUser.permissions.productArchive) {
      return NextResponse.json({ error: "You do not have permission to update products" }, { status: 403 })
    }

    const productId = params.id
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const body = await req.json()
    const { images, variants, _variation_count, category_name, product_code, ...productData } = body

    // Strip undefined / null-string values that could cause type errors
    const cleanData: Record<string, any> = {}
    for (const [k, v] of Object.entries(productData)) {
      if (v !== undefined) cleanData[k] = v === "" ? null : v
    }
    // Remove id — cannot be updated
    delete cleanData.id
    cleanData.updated_at = new Date().toISOString()

    const supabase = getServiceClient()

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("id, franchise_id")
      .eq("id", productId)
      .single()

    if (existingProductError || !existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (!AuthMiddleware.canAccessFranchise(authUser, existingProduct.franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    if (cleanData.franchise_id && !AuthMiddleware.canAccessFranchise(authUser, cleanData.franchise_id)) {
      return NextResponse.json({ error: "Access denied to the requested franchise" }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(cleanData)
      .eq("id", productId)

    if (updateError) {
      console.error("[PATCH /api/products/[id]] update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Sync images
    if (images && Array.isArray(images) && images.length > 0) {
      await supabase.from("product_images").delete().eq("product_id", productId)
      const imagesToInsert = images.map((img: any, idx: number) => ({
        product_id: productId,
        url: img.url,
        is_main: img.is_main,
        order: idx,
      }))
      const { error: imgErr } = await supabase.from("product_images").insert(imagesToInsert)
      if (imgErr) console.error("[PATCH /api/products/[id]] image insert error:", imgErr)
    }

    return NextResponse.json({ success: true, id: productId })
  } catch (err: any) {
    console.error("[PATCH /api/products/[id]] unexpected error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
