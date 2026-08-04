import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/auth-middleware'
import { v4 as uuidv4 } from 'uuid'
import { uploadToR2 } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/inventory/import
 * Imports products from exported JSON file
 * 
 * Request body:
 * {
 *   "importData": {...},  // The entire JSON export file content
 *   "targetFranchiseId": "optional-uuid",  // If provided, import to different franchise
 *   "options": {
 *     "overwriteExisting": false,  // Replace products with same code
 *     "resetStock": true,  // Use exported stock or reset to 0
 *     "importImages": true,  // Process base64 images
 *     "skipDuplicates": false  // Skip products with duplicate codes
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const userId = auth.user?.id
    const userFranchiseId = auth.user?.franchise_id
    const isSuperAdmin = auth.user?.role === 'super_admin'

    const body = await request.json()
    const { importData, targetFranchiseId, options = {} } = body

    if (!importData || !importData.products) {
      return NextResponse.json(
        { error: 'Invalid import data: missing products' },
        { status: 400 }
      )
    }

    // Determine target franchise
    let franchiseId = targetFranchiseId || userFranchiseId
    
    if (!franchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID not found' },
        { status: 400 }
      )
    }

    // Security: non-super-admins can only import to their own franchise
    if (!isSuperAdmin && targetFranchiseId && targetFranchiseId !== userFranchiseId) {
      return NextResponse.json(
        { error: 'Cannot import to other franchises' },
        { status: 403 }
      )
    }

    const {
      overwriteExisting = false,
      resetStock = true,
      importImages = true,
      skipDuplicates = false,
    } = options

    const supabase = createClient()
    const successfulImports = []
    const failedImports = []
    let imagesUploaded = 0

    // Process each product
    for (const sourceProduct of importData.products) {
      try {
        console.log('[Import] Processing product:', sourceProduct.product_code)
        
        const {
          id: sourceId,
          imageBase64,
          image_url: sourceImageUrl,
          ...productData
        } = sourceProduct

        // Ensure required fields exist
        if (!productData.name) {
          throw new Error('Product name is required')
        }
        if (!productData.product_code) {
          throw new Error('Product code is required')
        }

        // Set default values for missing fields
        const normalizedProduct = {
          ...productData,
          brand: productData.brand || 'N/A',
          size: productData.size || '',
          color: productData.color || '',
          material: productData.material || '',
          description: productData.description || '',
          price: productData.price ? Number(productData.price) : 0,
          rental_price: productData.rental_price ? Number(productData.rental_price) : 0,
          cost_price: productData.cost_price ? Number(productData.cost_price) : 0,
          security_deposit: productData.security_deposit ? Number(productData.security_deposit) : 0,
          stock_total: productData.stock_total ? Number(productData.stock_total) : 0,
          reorder_level: productData.reorder_level ? Number(productData.reorder_level) : 5,
          is_active: productData.is_active !== false,
        }

        // Check for duplicate product code
        if (normalizedProduct.product_code) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('product_code', normalizedProduct.product_code)
            .eq('franchise_id', franchiseId)
            .single()

          if (existing) {
            if (skipDuplicates) {
              failedImports.push({
                code: normalizedProduct.product_code,
                reason: 'Duplicate product code (skipped)',
              })
              continue
            }

            if (overwriteExisting) {
              // Update existing product
              const { error: updateError } = await supabase
                .from('products')
                .update({
                  ...normalizedProduct,
                  stock_available: resetStock ? 0 : normalizedProduct.stock_available,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .eq('franchise_id', franchiseId)

              if (updateError) {
                console.error('[Import] Update error for', normalizedProduct.product_code, updateError)
                throw updateError
              }

              // Handle image if provided
              if (importImages && imageBase64) {
                try {
                  const imageUrl = await uploadImage(imageBase64, normalizedProduct.product_code || 'product')
                  if (imageUrl) {
                    await supabase
                      .from('products')
                      .update({ image_url: imageUrl })
                      .eq('id', existing.id)
                      .eq('franchise_id', franchiseId)
                    imagesUploaded++
                  }
                } catch (imgErr) {
                  console.warn(`[Import] Image upload failed for ${normalizedProduct.product_code}:`, imgErr)
                }
              }

              successfulImports.push({
                code: normalizedProduct.product_code,
                action: 'updated',
              })
              continue
            } else {
              failedImports.push({
                code: normalizedProduct.product_code,
                reason: 'Duplicate product code (use overwriteExisting option)',
              })
              continue
            }
          }
        }

        // Create new product
        const newProduct = {
          ...normalizedProduct,
          id: uuidv4(),
          franchise_id: franchiseId,
          stock_available: resetStock ? 0 : normalizedProduct.stock_available,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        console.log('[Import] Creating new product:', newProduct.product_code, 'with fields:', Object.keys(newProduct))

        // Handle image upload
        if (importImages && imageBase64) {
          try {
            const imageUrl = await uploadImage(imageBase64, normalizedProduct.product_code || 'product')
            if (imageUrl) {
              newProduct.image_url = imageUrl
              imagesUploaded++
            }
          } catch (imgErr) {
            console.warn(`[Import] Image upload failed for ${normalizedProduct.product_code}:`, imgErr)
          }
        }

        const { error: insertError } = await supabase
          .from('products')
          .insert([newProduct])

        if (insertError) {
          console.error('[Import] Insert error for', newProduct.product_code, insertError)
          throw insertError
        }

        console.log('[Import] ✓ Successfully created product:', newProduct.product_code)

        successfulImports.push({
          code: normalizedProduct.product_code,
          action: 'created',
          id: newProduct.id,
        })
      } catch (productError: any) {
        console.error('[Import] Product error for', sourceProduct?.product_code, ':', productError)
        failedImports.push({
          code: sourceProduct?.product_code || 'unknown',
          reason: productError?.message || 'Unknown error',
        })
      }
    }

    const result = {
      success: true,
      summary: {
        total: importData.products.length,
        successful: successfulImports.length,
        failed: failedImports.length,
        imagesUploaded,
      },
      successfulImports,
      failedImports,
    }

    console.log(`[Import] Imported ${successfulImports.length}/${importData.products.length} products to franchise ${franchiseId}`)

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[Import] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to import inventory' },
      { status: 500 }
    )
  }
}

/**
 * Upload base64 image to Cloudflare R2
 */
async function uploadImage(base64Data: string, productCode: string): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    const filename = `${Date.now()}-${productCode}.jpg`
    const filepath = `inventory`

    const { publicUrl } = await uploadToR2(
      buffer,
      filename,
      'image/jpeg',
      filepath
    )

    return publicUrl
  } catch (error) {
    console.error('[Image Upload] Error:', error)
    return null
  }
}
