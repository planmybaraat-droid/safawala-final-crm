import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // Get all barcodes
    const { data: allBarcodes, error } = await supabase
      .from('barcodes')
      .select('id, product_id, barcode_number, created_at')
      .order('product_id', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Find duplicates
    const byProduct: { [key: number]: any[] } = {}
    const toDelete: number[] = []

    allBarcodes.forEach((b: any) => {
      if (!byProduct[b.product_id]) {
        byProduct[b.product_id] = []
      }
      byProduct[b.product_id].push(b)
    })

    Object.entries(byProduct).forEach(([_, barcodes]) => {
      if (barcodes.length > 1) {
        toDelete.push(...barcodes.slice(1).map((b: any) => b.id))
      }
    })

    // Delete duplicates
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('barcodes')
        .delete()
        .in('id', toDelete)

      if (deleteError) throw deleteError
    }

    // Get final count
    const { data: finalBarcodes } = await supabase
      .from('barcodes')
      .select('id, product_id, barcode_number')

    return NextResponse.json({
      totalBefore: allBarcodes.length,
      deleted: toDelete.length,
      totalAfter: finalBarcodes?.length || 0,
      sample: finalBarcodes?.slice(0, 5) || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
