/**
 * Enhanced product fetching with all associated barcodes
 * This ensures products are loaded with complete barcode data for scanning
 */

import { supabase } from "@/lib/supabase"

export interface ProductWithBarcodes {
  id: string
  name: string
  category_id?: string
  franchise_id?: string
  rental_price?: number
  sale_price?: number
  security_deposit?: number
  stock_available?: number
  product_code?: string
  barcode_number?: string
  alternate_barcode_1?: string
  alternate_barcode_2?: string
  sku?: string
  code?: string
  image_url?: string
  // Extended fields with barcodes
  barcodes?: Array<{
    id: string
    barcode_number: string
    barcode_type: string
    is_active: boolean
  }>
  // Flattened all barcode numbers for easy searching
  all_barcode_numbers?: string[]
}

/**
 * Fetch products with all their associated barcodes
 * Supports franchise isolation
 */
export async function fetchProductsWithBarcodes(
  franchiseId?: string
): Promise<ProductWithBarcodes[]> {
  try {
    // Step 1: Fetch all products (with franchise filter if provided)
    let productsQuery = supabase
      .from("products")
      .select("*")
      .order("name")

    if (franchiseId) {
      productsQuery = productsQuery.eq('franchise_id', franchiseId)
    }

    const { data: products, error: productsError } = await productsQuery

    if (productsError) throw productsError
    if (!products) return []

    // Step 2: Fetch all active barcodes from the barcodes table
    let barcodesQuery = supabase
      .from("barcodes")
      .select("id, product_id, barcode_number, barcode_type, is_active")
      .eq("is_active", true)

    const { data: allBarcodes, error: barcodesError } = await barcodesQuery

    if (barcodesError) {
      console.warn('Warning: Could not fetch barcodes table:', barcodesError)
      // Continue without barcodes if table doesn't exist yet
      return products as ProductWithBarcodes[]
    }

    // Step 3: Map barcodes to products
    const barcodesMap = new Map<string, any[]>()
    
    if (allBarcodes) {
      allBarcodes.forEach((barcode: any) => {
        if (!barcodesMap.has(barcode.product_id)) {
          barcodesMap.set(barcode.product_id, [])
        }
        barcodesMap.get(barcode.product_id)!.push(barcode)
      })
    }

    // Step 4: Enhance products with barcode data
    const productsWithBarcodes: ProductWithBarcodes[] = products.map(
      (product: any) => {
        const productBarcodes = barcodesMap.get(product.id) || []
        
        // Flatten all barcode numbers for easy searching
        const allBarcodeNumbers = [
          product.product_code,
          product.barcode_number,
          product.alternate_barcode_1,
          product.alternate_barcode_2,
          product.sku,
          product.code,
          product.barcode,
          ...productBarcodes.map((b: any) => b.barcode_number)
        ].filter((b: any) => b && typeof b === 'string' && b.trim().length > 0)

        return {
          ...product,
          barcodes: productBarcodes,
          all_barcode_numbers: [...new Set(allBarcodeNumbers)] // Remove duplicates
        }
      }
    )

    console.log('✅ Loaded products with barcodes:', productsWithBarcodes.length, {
      total_products: productsWithBarcodes.length,
      products_with_dedicated_barcodes: productsWithBarcodes.filter(p => p.barcodes && p.barcodes.length > 0).length,
      total_dedicated_barcodes: allBarcodes?.length || 0
    })

    return productsWithBarcodes
  } catch (error) {
    console.error('Error fetching products with barcodes:', error)
    throw error
  }
}

/**
 * Find product by any barcode number
 * Searches through all possible barcode sources
 */
export function findProductByAnyBarcode(
  products: ProductWithBarcodes[],
  barcodeNumber: string
): ProductWithBarcodes | undefined {
  if (!barcodeNumber) return undefined

  const searchCode = barcodeNumber.trim().toLowerCase()

  for (const product of products) {
    // Check all flattened barcode numbers
    if (product.all_barcode_numbers?.some(
      b => b.toLowerCase() === searchCode
    )) {
      return product
    }
  }

  return undefined
}

/**
 * Get all barcodes for a product in a readable format
 */
export function getProductBarcodesSummary(
  product: ProductWithBarcodes
): string {
  const barcodes = [
    product.product_code && `Code: ${product.product_code}`,
    product.barcode_number && `Primary: ${product.barcode_number}`,
    product.alternate_barcode_1 && `Alt-1: ${product.alternate_barcode_1}`,
    product.alternate_barcode_2 && `Alt-2: ${product.alternate_barcode_2}`,
    product.sku && `SKU: ${product.sku}`,
    ...((product.barcodes || []).map(b => `${b.barcode_type}: ${b.barcode_number}`))
  ].filter(Boolean)

  return barcodes.join(" | ")
}
