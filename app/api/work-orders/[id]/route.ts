import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    const { id } = params

    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const user = authResult.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.role === 'super_admin'

    const supabase = createClient()

    // Fetch the work order with its sub-tasks
    const { data: workOrder, error: woError } = await supabase
      .from("work_orders")
      .select(`
        *,
        work_order_tasks(*)
      `)
      .eq("id", id)
      .single()

    if (woError || !workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    // Franchise isolation check
    if (!isSuperAdmin && workOrder.franchise_id && workOrder.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch booking details, customer details, and booking items
    let bookingDetails: any = null
    let bookingNumber = ""
    let eventDate = ""
    let customerDetails: any = null
    let itemsList: any[] = []

    if (workOrder.booking_source === "product_orders") {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("product_orders").select("*, customer:customers(*)").eq("id", workOrder.booking_id).single(),
        supabase.from("product_order_items").select("*, product:products(*)").eq("order_id", workOrder.booking_id)
      ])
      bookingDetails = orderRes.data
      itemsList = itemsRes.data || []
      if (orderRes.data) {
        bookingNumber = orderRes.data.order_number
        eventDate = orderRes.data.event_date
        customerDetails = orderRes.data.customer
      }
    } else if (workOrder.booking_source === "package_bookings") {
      const [pkgRes, itemsRes] = await Promise.all([
        supabase.from("package_bookings").select("*, customer:customers(*)").eq("id", workOrder.booking_id).single(),
        supabase.from("package_booking_product_items").select("*, product:products(*)").eq("package_booking_id", workOrder.booking_id)
      ])
      bookingDetails = pkgRes.data
      itemsList = itemsRes.data || []
      if (pkgRes.data) {
        bookingNumber = pkgRes.data.package_number
        eventDate = pkgRes.data.event_date
        customerDetails = pkgRes.data.customer
      }
    } else if (workOrder.booking_source === "direct_sales_orders") {
      const [saleRes, itemsRes] = await Promise.all([
        supabase.from("direct_sales_orders").select("*, customer:customers(*)").eq("id", workOrder.booking_id).single(),
        supabase.from("direct_sales_items").select("*, product:products(*)").eq("sale_id", workOrder.booking_id)
      ])
      bookingDetails = saleRes.data
      itemsList = itemsRes.data || []
      if (saleRes.data) {
        bookingNumber = saleRes.data.sale_number
        eventDate = saleRes.data.sale_date
        customerDetails = saleRes.data.customer
      }
    }

    // Sort sub-tasks sequentially by department
    const deptOrder = ['warehouse', 'packing', 'dispatch', 'event_team', 'returns', 'accounts']
    if (workOrder.work_order_tasks) {
      workOrder.work_order_tasks.sort((a: any, b: any) => {
        return deptOrder.indexOf(a.department) - deptOrder.indexOf(b.department)
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...workOrder,
        booking_number: bookingNumber || workOrder.work_order_number.replace('WO-', 'BKG-'),
        event_date: eventDate || null,
        customer: customerDetails || { name: "N/A", phone: "N/A" },
        booking: bookingDetails,
        items: itemsList,
      }
    })
  } catch (error: any) {
    console.error("[Work Order Detail GET] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    const { id } = params

    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const user = authResult.authContext!.user
    const franchiseId = user.franchise_id
    const isSuperAdmin = user.role === 'super_admin'

    const body = await request.json()
    const allowedFields = ['notes', 'status', 'priority', 'due_date']
    const updates: Record<string, any> = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch to check franchise ownership
    const { data: existing } = await supabase.from("work_orders").select("franchise_id").eq("id", id).single()
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!isSuperAdmin && existing.franchise_id && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase.from("work_orders").update(updates).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[Work Order PATCH] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
