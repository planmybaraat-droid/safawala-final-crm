import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/inventory/export
 * Exports all products for current franchise with:
 * - All product data
 * - Images as base64 (embedded in JSON)
 * - Categories
 * Returns: JSON file download
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user?.franchise_id
    if (!franchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID not found' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Fetch all products for this franchise
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('franchise_id', franchiseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('[Export] Products fetch error:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        {
          version: '1.0',
          exportDate: new Date().toISOString(),
          franchiseId,
          productCount: 0,
          products: [],
          categories: [],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="inventory-export.json"',
          },
        }
      )
    }

    // Fetch images for all products (if image_url exists, fetch the data)
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let imageBase64 = null

        if (product.image_url) {
          try {
            const imageResponse = await fetch(product.image_url)
            if (imageResponse.ok) {
              const buffer = await imageResponse.arrayBuffer()
              imageBase64 = Buffer.from(buffer).toString('base64')
            }
          } catch (err) {
            console.warn(`[Export] Failed to fetch image for ${product.id}:`, err)
          }
        }

        return {
          ...product,
          imageBase64,
        }
      })
    )

    // Get unique categories
    const categories = Array.from(
      new Set(products.filter(p => p.category).map(p => p.category))
    )

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      franchiseId,
      productCount: products.length,
      products: productsWithImages,
      categories,
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error('[Export] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to export inventory' },
      { status: 500 }
    )
  }
}
