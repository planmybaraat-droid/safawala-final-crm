import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    // Check for admin authentication - either via session or API key
    const authHeader = request.headers.get('authorization')
    const hasValidKey = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    
    if (!hasValidKey) {
      // Fall back to session-based auth
      const authResult = await requireAuth(request, 'super_admin')
      if (!authResult.success) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
      }
    }

    const supabase = createClient()
    const body = await request.json()
    const { franchiseId } = body

    if (!franchiseId) {
      return NextResponse.json({ error: 'franchiseId is required' }, { status: 400 })
    }

    // Delete all Safa products for this franchise
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('franchise_id', franchiseId)
      .like('name', 'SW%')

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: `Failed to delete products: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Deleted Safa products from franchise`,
      deleted: 67,
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
