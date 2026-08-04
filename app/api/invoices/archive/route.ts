import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return handleArchiveRequest(request)
}

export async function PATCH(request: NextRequest) {
  return handleArchiveRequest(request)
}

async function handleArchiveRequest(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin

    const supabase = createClient()
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    console.log('[Invoices ARCHIVE] Archiving invoice:', id)

    // Check if invoice exists and belongs to user's franchise
    const { data: existing, error: findError } = await supabase
      .from('product_orders')
      .select('id, franchise_id')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('[Invoices ARCHIVE] Find error:', findError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Franchise ownership check
    if (!isSuperAdmin && existing.franchise_id && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Archive the invoice
    const { error: archiveError } = await supabase
      .from('product_orders')
      .update({ is_archived: true })
      .eq('id', id)

    if (archiveError) {
      console.error('[Invoices ARCHIVE] Archive error:', archiveError)

      // Check if column doesn't exist
      if (archiveError.message?.includes('is_archived') || archiveError.code === '42703') {
        return NextResponse.json({
          error: 'Archive functionality not available',
          message: 'Database needs update. Please contact admin.',
          details: 'Run ADD_ARCHIVE_TO_PRODUCT_ORDERS.sql migration'
        }, { status: 400 })
      }

      return NextResponse.json({ error: archiveError.message }, { status: 400 })
    }

    console.log('[Invoices ARCHIVE] Successfully archived invoice:', id)
    return NextResponse.json({
      success: true,
      message: 'Invoice archived successfully',
      invoiceId: id
    })

  } catch (error: any) {
    console.error('[Invoices ARCHIVE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to archive invoice"
    }, { status: 500 })
  }
}
