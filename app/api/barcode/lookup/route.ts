/**
 * Barcode Lookup API
 * 
 * Handles barcode scanning and lookup
 * Primary lookup is products.barcode (11-digit unique code)
 * No dependency on the legacy barcodes table for scanning
 * 
 * Usage:
 * POST /api/barcode/lookup
 * {
 *   "barcode": "PROD-1761634543481-66-001",
 *   "franchiseId": "optional-franchise-id"
 * }
 */

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { barcode, franchiseId } = await request.json()

    if (!barcode || !barcode.trim()) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      )
    }

    const searchBarcode = barcode.trim()
    console.log('[API] Barcode lookup request:', { searchBarcode, franchiseId })

    const supabase = createServerComponentClient({ cookies })

    // ===== PRIMARY LOOKUP: Search in products table by barcode =====
    console.log('[API] Step 1: Searching products.barcode...')

    let productsQuery = supabase
      .from('products')
      .select('*')
      .eq('barcode', searchBarcode)
      .limit(1)

    if (franchiseId) {
      productsQuery = productsQuery.eq('franchise_id', franchiseId)
    }

    const { data: products } = await productsQuery

    if (products && products.length > 0) {
      const product = products[0] as any
      console.log('[API] ✅ Found in products table (barcode):', {
        barcode: searchBarcode,
        product: product.name
      })

      return NextResponse.json({
        success: true,
        source: 'barcode',
        barcode: searchBarcode,
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          image_url: product.image_url,
          price: product.price,
          rental_price: product.rental_price,
          sale_price: product.price, // Use price field (no separate sale_price in schema)
          security_deposit: product.security_deposit,
          stock_available: product.stock_available,
          franchise_id: product.franchise_id
        },
        barcode_type: 'primary'
      })
    }

    // ===== STEP 2: Search in barcodes table =====
    console.log('[API] Step 2: Searching barcodes table...')
    
    const { data: barcodeRecord } = await supabase
      .from('barcodes')
      .select('*, products(*)')
      .eq('barcode_number', searchBarcode)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barcodeRecord?.products) {
      const product = barcodeRecord.products as any
      console.log('[API] ✅ Found in barcodes table:', {
        barcode: searchBarcode,
        product: product.name
      })

      return NextResponse.json({
        success: true,
        source: 'barcodes_table',
        barcode: searchBarcode,
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          image_url: product.image_url,
          price: product.price,
          rental_price: product.rental_price,
          sale_price: product.price,
          security_deposit: product.security_deposit,
          stock_available: product.stock_available,
          franchise_id: product.franchise_id
        },
        barcode_type: barcodeRecord.barcode_type || 'secondary'
      })
    }

    // ===== STEP 3: Search by product_code =====
    console.log('[API] Step 3: Searching products.product_code...')
    
    let productCodeQuery = supabase
      .from('products')
      .select('*')
      .eq('product_code', searchBarcode)
      .limit(1)

    if (franchiseId) {
      productCodeQuery = productCodeQuery.eq('franchise_id', franchiseId)
    }

    const { data: productsByCode } = await productCodeQuery

    if (productsByCode && productsByCode.length > 0) {
      const product = productsByCode[0] as any
      console.log('[API] ✅ Found in products table (product_code):', {
        barcode: searchBarcode,
        product: product.name
      })

      return NextResponse.json({
        success: true,
        source: 'product_code',
        barcode: searchBarcode,
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          image_url: product.image_url,
          price: product.price,
          rental_price: product.rental_price,
          sale_price: product.price,
          security_deposit: product.security_deposit,
          stock_available: product.stock_available,
          franchise_id: product.franchise_id
        },
        barcode_type: 'product_code'
      })
    }

    // ===== STEP 4: Search in product_variations table =====
    console.log('[API] Step 4: Searching product_variations...')
    const { data: variationData, error: varError } = await supabase
      .from('product_variations')
      .select('*, products(*)')
      .eq('barcode', searchBarcode)
      .eq('is_active', true)
      .limit(1)

    if (variationData && variationData.length > 0) {
      const variation = variationData[0] as any
      const parentProduct = variation.products as any
      if (parentProduct) {
        console.log('[API] ✅ Found in product_variations table:', {
          barcode: searchBarcode,
          product: parentProduct.name,
          variation: variation.variation_name
        })

        return NextResponse.json({
          success: true,
          source: 'product_variations',
          barcode: searchBarcode,
          product: {
            id: parentProduct.id,
            name: `${parentProduct.name} - ${variation.variation_name}`,
            barcode: variation.barcode,
            category: parentProduct.category,
            category_id: parentProduct.category_id,
            subcategory_id: parentProduct.subcategory_id,
            image_url: variation.image_url || parentProduct.image_url,
            price: (parentProduct.price || 0) + (variation.price_adjustment || 0),
            rental_price: (parentProduct.rental_price || 0) + (variation.rental_price_adjustment || 0),
            sale_price: (parentProduct.price || 0) + (variation.price_adjustment || 0),
            security_deposit: parentProduct.security_deposit,
            stock_available: variation.stock_available,
            franchise_id: parentProduct.franchise_id,
            variation_id: variation.id,
            is_variation: true
          },
          barcode_type: 'variation'
        })
      }
    }

    // ===== NOT FOUND =====
    console.log('[API] ❌ Barcode not found in any source:', searchBarcode)

    return NextResponse.json(
      {
        success: false,
        error: "Product not found",
        details: `No product found with barcode: ${searchBarcode}`,
        barcode: searchBarcode
      },
      { status: 404 }
    )

  } catch (error: any) {
    console.error('[API] Barcode lookup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Barcode lookup failed",
        details: error?.message || "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to get all barcodes for a product
 * Usage: GET /api/barcode/lookup?productId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    const supabase = createServerComponentClient({ cookies })

    // Get all barcodes for this product
    const { data: barcodes, error } = await supabase
      .from('barcodes')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('barcode_type', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[API] Error fetching barcodes:', error)
      return NextResponse.json(
        { error: "Failed to fetch barcodes", details: error.message },
        { status: 500 }
      )
    }

    console.log('[API] ✅ Retrieved barcodes for product:', {
      productId,
      count: barcodes?.length || 0
    })

    return NextResponse.json({
      success: true,
      productId,
      barcodes: barcodes || [],
      count: barcodes?.length || 0
    })

  } catch (error: any) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get barcodes",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}
