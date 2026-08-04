import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get the session to verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the invoice to verify ownership and get franchise_id
    const { data: invoice, error: fetchError } = await supabase
      .from("product_orders")
      .select("id, franchise_id")
      .eq("id", id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Verify franchise access
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("franchise_id")
      .eq("id", session.user.id)
      .single()

    if (userError || !user || user.franchise_id !== invoice.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // First, delete associated items
    const { error: itemsError } = await supabase
      .from("product_order_items")
      .delete()
      .eq("product_order_id", id)

    if (itemsError) {
      console.error("Error deleting invoice items:", itemsError)
      return NextResponse.json(
        { error: "Failed to delete invoice items" },
        { status: 500 }
      )
    }

    // Then delete the invoice
    const { error: deleteError } = await supabase
      .from("product_orders")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting invoice:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete invoice" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: "Invoice deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in DELETE /api/invoices/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
