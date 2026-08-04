import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return handleRestoreRequest(request)
}

export async function PATCH(request: NextRequest) {
  return handleRestoreRequest(request)
}

async function handleRestoreRequest(request: NextRequest) {
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

    console.log('[Invoices RESTORE] Restoring invoice:', id)

    // Check if invoice exists and belongs to user's franchise
    const { data: existing, error: findError } = await supabase
      .from('product_orders')
      .select('id, franchise_id')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('[Invoices RESTORE] Find error:', findError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Franchise ownership check
    if (!isSuperAdmin && existing.franchise_id && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Restore the invoice
    const { error: restoreError } = await supabase
      .from('product_orders')
      .update({ is_archived: false })
      .eq('id', id)

    if (restoreError) {
      console.error('[Invoices RESTORE] Restore error:', restoreError)
      return NextResponse.json({ error: restoreError.message }, { status: 400 })
    }

    console.log('[Invoices RESTORE] Successfully restored invoice:', id)
    return NextResponse.json({
      success: true,
      message: 'Invoice restored successfully',
      invoiceId: id
    })

  } catch (error: any) {
    console.error('[Invoices RESTORE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to restore invoice"
    }, { status: 500 })
  }
}
