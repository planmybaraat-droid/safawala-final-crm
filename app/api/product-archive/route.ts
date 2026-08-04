import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import supabaseServer from "@/lib/supabase-server"

// GET - Fetch archived products and active products
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin

    const supabase = supabaseServer()

    // Fetch archived products
    let archivedQuery = supabase
      .from("product_archive")
      .select("*")
      .order("archived_at", { ascending: false })

    if (!isSuperAdmin && franchiseId) {
      archivedQuery = archivedQuery.eq("franchise_id", franchiseId)
    }

    const { data: archived, error: archiveError } = await archivedQuery

    if (archiveError) {
      console.error("[Product Archive GET] Error fetching archived:", archiveError)
      return NextResponse.json({ error: archiveError.message }, { status: 500 })
    }

    // Fetch active products for archiving (products with stock > 0)
    let productsQuery = supabase
      .from("products")
      .select("id, name, product_code, barcode, category, rental_price, sale_price, stock_available, image_url")
      .gt("stock_available", 0)
      .order("name")

    if (!isSuperAdmin && franchiseId) {
      productsQuery = productsQuery.eq("franchise_id", franchiseId)
    }

    const { data: products, error: productsError } = await productsQuery

    if (productsError) {
      console.error("[Product Archive GET] Error fetching products:", productsError)
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    return NextResponse.json({
      archived: archived || [],
      products: products || [],
    })
  } catch (error: any) {
    console.error("[Product Archive GET] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 })
  }
}

// POST - Archive a product
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin
    const userId = user.id

    const supabase = supabaseServer()
    const body = await request.json()

    const { product_id, product_name, product_code, barcode, category, reason, notes, original_rental_price, original_sale_price, image_url, quantity } = body

    if (!product_id || !reason) {
      return NextResponse.json({ error: "Product ID and reason are required" }, { status: 400 })
    }

    // Verify product exists and get current stock
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, stock_available, franchise_id, category")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check franchise ownership
    if (!isSuperAdmin && franchiseId && product.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const archiveQuantity = quantity || 1
    if (archiveQuantity < 1 || archiveQuantity > product.stock_available) {
      return NextResponse.json({ error: `Invalid quantity. Available: ${product.stock_available}` }, { status: 400 })
    }

    // Use category from request body or from product, fallback to "Uncategorized"
    const finalCategory = category || product.category || "Uncategorized"

    // Insert into archive - INCLUDE QUANTITY!
    const { data: archiveData, error: archiveError } = await supabase
      .from("product_archive")
      .insert({
        product_id,
        product_name,
        product_code,
        barcode,
        category: finalCategory,
        reason,
        notes: notes || null,
        original_rental_price,
        original_sale_price,
        image_url,
        quantity: archiveQuantity, // FIX: Save the actual quantity being archived
        franchise_id: franchiseId,
      })
      .select()
      .single()

    if (archiveError) {
      console.error("[Product Archive POST] Insert error:", archiveError)
      return NextResponse.json({ error: archiveError.message }, { status: 500 })
    }

    // Reduce stock by the archived quantity
    const newStockAvailable = Math.max(0, product.stock_available - archiveQuantity)
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_available: newStockAvailable })
      .eq("id", product_id)
      .eq("franchise_id", product.franchise_id)

    if (updateError) {
      console.error("[Product Archive POST] Stock update error:", updateError)
      // Try to rollback the archive insert
      await supabase.from("product_archive").delete().eq("id", archiveData.id)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log("[Product Archive POST] Successfully archived product:", product_id)
    return NextResponse.json({
      success: true,
      archive: archiveData,
    })
  } catch (error: any) {
    console.error("[Product Archive POST] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to archive product" }, { status: 500 })
  }
}

// DELETE - Restore a product from archive
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin

    const supabase = supabaseServer()
    const { searchParams } = new URL(request.url)
    const archiveId = searchParams.get("id")

    if (!archiveId) {
      return NextResponse.json({ error: "Archive ID is required" }, { status: 400 })
    }

    // Get the archive record
    const { data: archiveRecord, error: findError } = await supabase
      .from("product_archive")
      .select("*")
      .eq("id", archiveId)
      .single()

    if (findError || !archiveRecord) {
      return NextResponse.json({ error: "Archive record not found" }, { status: 404 })
    }

    // Check franchise ownership
    if (!isSuperAdmin && franchiseId && archiveRecord.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete from archive
    const { error: deleteError } = await supabase
      .from("product_archive")
      .delete()
      .eq("id", archiveId)

    if (deleteError) {
      console.error("[Product Archive DELETE] Delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Get the quantity that was archived (default to 1 for old records)
    const restoredQuantity = archiveRecord.quantity || 1

    // Get current stock to add the restored quantity
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock_available")
      .eq("id", archiveRecord.product_id)
      .single()

    if (productError || !product) {
      console.error("[Product Archive DELETE] Product not found:", productError)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Restore stock by ADDING the archived quantity back (not setting to 1)
    const newStockAvailable = (product.stock_available || 0) + restoredQuantity
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_available: newStockAvailable })
      .eq("id", archiveRecord.product_id)
      .eq("franchise_id", archiveRecord.franchise_id)

    if (updateError) {
      console.error("[Product Archive DELETE] Stock restore error:", updateError)
      // The archive record is already deleted, just log the error
    }

    console.log("[Product Archive DELETE] Successfully restored product:", archiveRecord.product_id, "quantity:", restoredQuantity)
    return NextResponse.json({
      success: true,
      message: `Product restored successfully (${restoredQuantity} unit${restoredQuantity > 1 ? 's' : ''})`,
    })
  } catch (error: any) {
    console.error("[Product Archive DELETE] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to restore product" }, { status: 500 })
  }
}
