import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, AuthMiddleware } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const user = authResult.authContext!.user
    if (!user.permissions.inventory && !user.permissions.productArchive) {
      return NextResponse.json({ error: 'Inventory access required' }, { status: 403 })
    }

    const supabase = createClient()
    const body = await request.json()
    const { products, franchiseEmail, categoryName, franchiseId } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }

    let franchise_id = user.is_super_admin ? (franchiseId || null) : (user.franchise_id || null)
    if (!franchise_id && franchiseEmail) {
      const { data: franchise, error: franchiseError } = await supabase
        .from('franchises')
        .select('id')
        .eq('email', franchiseEmail)
        .single()

      if (franchiseError || !franchise) {
        return NextResponse.json(
          { error: `Franchise not found: ${franchiseEmail}` },
          { status: 400 }
        )
      }
      franchise_id = franchise.id
    }

    if (!franchise_id) {
      return NextResponse.json(
        { error: 'Franchise context is required for product import' },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchise_id)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }

    // Get category_id
    const { data: category, error: categoryError } = await supabase
      .from('product_categories')
      .select('id')
      .eq('name', categoryName)
      .is('parent_id', null)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: `Category not found: ${categoryName}` },
        { status: 400 }
      )
    }

    // Insert products
    const productsToInsert = products.map((p: any, idx: number) => ({
      name: p.name,
      product_code: `PROD-${Date.now()}-${idx}`,
      category_id: category.id,
      franchise_id,
      category: 'other',
      rental_price: p.rental_price || 100,
      price: p.price || p.sale_price || 100,
      security_deposit: p.security_deposit || 50,
      stock_available: p.stock_available || 100,
      stock_total: p.stock_available || 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json(
        { error: `Failed to insert products: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Inserted ${data?.length || 0} products`,
      count: data?.length,
    })
  } catch (error) {
    console.error('Bulk insert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
