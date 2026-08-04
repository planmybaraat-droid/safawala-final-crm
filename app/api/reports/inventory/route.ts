import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/reports/inventory
 * Get inventory stats for reports page
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.is_super_admin ? undefined : auth.user!.franchise_id
    const supabase = createClient()

    // Build query
    let query = supabase
      .from("products")
      .select("id, name, stock_total, stock_available, stock_rented, stock_damaged, stock_in_laundry, reorder_level, usage_count, rental_price, sale_price, category_id, is_active, franchise_id")
    
    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data: products, error } = await query

    if (error) {
      console.error("[API] Error loading products:", error)
      return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
    }

    // Filter active products (is_active !== false)
    const activeProducts = (products || []).filter((p: any) => p.is_active !== false)

    // Calculate stats
    const totalValue = activeProducts.reduce((s: number, p: any) => {
      const price = Number(p.rental_price) || Number(p.sale_price) || 0
      return s + (price * (Number(p.stock_total) || 0))
    }, 0)

    const stats = {
      totalProducts: activeProducts.length,
      totalStock: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_total) || 0), 0),
      available: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_available) || 0), 0),
      rented: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_rented) || 0), 0),
      damaged: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_damaged) || 0), 0),
      lowStock: activeProducts.filter((p: any) => (Number(p.stock_available) || 0) <= (Number(p.reorder_level) || 5)).length,
      totalValue,
      inLaundry: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_in_laundry) || 0), 0),
    }

    // Get categories for enhanced data
    let catQuery = supabase.from("product_categories").select("id, name")
    if (franchiseId) catQuery = catQuery.eq("franchise_id", franchiseId)
    const { data: categories } = await catQuery
    const categoryMap: Record<string, string> = {}
    ;(categories || []).forEach((c: any) => { categoryMap[c.id] = c.name })

    // Top products by usage
    const topProducts = activeProducts
      .filter((p: any) => (Number(p.usage_count) || 0) > 0)
      .sort((a: any, b: any) => (Number(b.usage_count) || 0) - (Number(a.usage_count) || 0))
      .slice(0, 10)
      .map((p: any) => ({
        name: p.name,
        usage: Number(p.usage_count) || 0,
        stock: Number(p.stock_available) || 0,
        value: (Number(p.rental_price) || Number(p.sale_price) || 0) * (Number(p.stock_total) || 0),
      }))

    // Low stock products
    const lowStockProducts = activeProducts
      .filter((p: any) => {
        const available = Number(p.stock_available) || 0
        const reorderLevel = Number(p.reorder_level) || 5
        return available <= reorderLevel
      })
      .sort((a: any, b: any) => (Number(a.stock_available) || 0) - (Number(b.stock_available) || 0))
      .slice(0, 15)
      .map((p: any) => {
        const available = Number(p.stock_available) || 0
        const reorderLevel = Number(p.reorder_level) || 5
        let status = "Low"
        if (available === 0) status = "Out of Stock"
        else if (available <= reorderLevel / 2) status = "Critical"
        return {
          name: p.name,
          available,
          reorderLevel,
          status,
        }
      })

    // Category-wise stock distribution
    const categoryData: Record<string, { products: number; stock: number; value: number }> = {}
    activeProducts.forEach((p: any) => {
      const catName = categoryMap[p.category_id || ""] || "Uncategorized"
      if (!categoryData[catName]) categoryData[catName] = { products: 0, stock: 0, value: 0 }
      categoryData[catName].products += 1
      categoryData[catName].stock += Number(p.stock_total) || 0
      categoryData[catName].value += (Number(p.rental_price) || Number(p.sale_price) || 0) * (Number(p.stock_total) || 0)
    })

    const categoryStockData = Object.entries(categoryData)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value)

    return NextResponse.json({
      stats,
      topProducts,
      lowStockProducts,
      categoryStockData,
    })

  } catch (error) {
    console.error("[API] Inventory report error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
