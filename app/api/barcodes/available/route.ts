import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

/**
 * GET /api/barcodes/available?franchise_id=xxx
 * Get all available barcodes for a franchise
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const user = authResult.authContext!.user
    const { searchParams } = new URL(request.url)
    const requestedFranchiseId = searchParams.get('franchise_id')
    const franchiseId = user.is_super_admin ? requestedFranchiseId : (user.franchise_id || null)
    
    if (!franchiseId) {
      return NextResponse.json(
        { error: 'franchise_id is required' },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json(
        { error: 'Access denied to this franchise' },
        { status: 403 }
      )
    }
    
    const supabase = createClient()
    
    // Get available barcodes with product details
    const { data: barcodes, error } = await supabase
      .from('product_barcodes')
      .select(`
        id,
        barcode_number,
        sequence_number,
        product_id,
        products!inner (
          id,
          name,
          product_code,
          category
        )
      `)
      .eq('franchise_id', franchiseId)
      .eq('status', 'available')
      .is('booking_id', null)
      .order('product_id')
      .order('sequence_number')
    
    if (error) {
      console.error('[Available Barcodes API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Format response
    const formattedBarcodes = (barcodes || []).map((b: any) => ({
      id: b.id,
      barcode_number: b.barcode_number,
      sequence_number: b.sequence_number,
      product_id: b.product_id,
      product_name: b.products?.name,
      product_code: b.products?.product_code,
      product_category: b.products?.category
    }))
    
    return NextResponse.json({
      success: true,
      count: formattedBarcodes.length,
      barcodes: formattedBarcodes
    })
    
  } catch (error: any) {
    console.error('[Available Barcodes API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
