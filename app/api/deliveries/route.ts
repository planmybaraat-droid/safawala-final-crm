import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Require authentication and derive franchise context
    const auth = await requireAuth(request, 'readonly', 'delivery.view')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const scope = searchParams.get('scope')

    const isSuper = !!user.is_super_admin
    const effectiveFranchiseId = isSuper && scope === 'all' ? null : (user.franchise_id || null)

    const supabase = await createClient()

    let query = supabase
      .from("deliveries")
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .order("created_at", { ascending: false })

    if (effectiveFranchiseId) {
      query = query.eq('franchise_id', effectiveFranchiseId)
    }

    if (user.role === 'staff') {
      query = query.eq('assigned_staff_id', user.id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    let { data, error } = await query

    if (error || !data) {
      data = []
    }

    // Dynamic CRM Order Auto-Sync: Fetch confirmed product_orders to ensure all Main CRM bookings flow into Delivery Portal
    try {
      let poQuery = supabase
        .from("product_orders")
        .select(`
          id, order_number, booking_type, status, delivery_date, delivery_time, return_date, return_time,
          venue_address, groom_name, groom_whatsapp, groom_address, customer_id, franchise_id,
          customer:customers(id, name, phone, email)
        `)
        .in("status", ["confirmed", "in_progress", "delivered", "picked_up"])
        .order("created_at", { ascending: false })
        .limit(100)

      if (effectiveFranchiseId) {
        poQuery = poQuery.eq("franchise_id", effectiveFranchiseId)
      }

      const { data: poList } = await poQuery

      if (poList && poList.length > 0) {
        const existingOrderIds = new Set((data || []).map((d: any) => d.booking_id || d.id))

        for (const po of poList) {
          if (!existingOrderIds.has(po.id)) {
            const mappedStatus = po.status === "delivered" 
              ? "delivered" 
              : po.status === "in_progress" 
                ? "in_transit" 
                : "pending"

            if (!status || status === "all" || status === mappedStatus) {
              data.push({
                id: po.id,
                delivery_number: `DEL-${po.order_number}`,
                customer_id: po.customer_id,
                customer: po.customer || { id: po.customer_id, name: po.groom_name || "Customer", phone: po.groom_whatsapp || "" },
                delivery_address: po.venue_address || po.groom_address || "Venue Address",
                pickup_address: "Safawala Main Warehouse",
                delivery_date: po.delivery_date || new Date().toISOString(),
                delivery_time: po.delivery_time || "10:00 AM",
                return_date: po.return_date,
                status: mappedStatus,
                booking_id: po.id,
                order_number: po.order_number,
                booking_type: po.booking_type,
                special_instructions: `Main CRM Order #${po.order_number} (${(po.booking_type || 'rental').toUpperCase()})`,
                created_at: new Date().toISOString(),
                is_auto_synced: true
              })
            }
          }
        }
      }
    } catch (poErr) {
      console.warn("[Deliveries API] Dynamic CRM order sync notice:", poErr)
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error("[Deliveries API] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff', 'delivery.update')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const franchiseId = user.is_super_admin ? undefined : (user.franchise_id as string | undefined)

    const body = await request.json()

    if (!body.customer_id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 })
    }

    if (!body.delivery_address || body.delivery_address.trim() === "") {
      return NextResponse.json({ error: "Delivery address is required" }, { status: 400 })
    }

    if (!body.delivery_date) {
      return NextResponse.json({ error: "Delivery date is required" }, { status: 400 })
    }

    let deliveryNumber: string
    try {
      const { data, error: numberError } = await supabaseServer.rpc('generate_delivery_number')
      if (numberError) {
        deliveryNumber = `DEL-${Date.now().toString().slice(-8)}`
      } else {
        deliveryNumber = data
      }
    } catch (e) {
      deliveryNumber = `DEL-${Date.now().toString().slice(-8)}`
    }

    const deliveryCharge = parseFloat(body.delivery_charge || 0)
    const fuelCost = parseFloat(body.fuel_cost || 0)

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    let assignedStaffId =
      typeof body.assigned_staff_id === 'string' && uuidRegex.test(body.assigned_staff_id)
        ? body.assigned_staff_id
        : null

    if (Array.isArray(body.assigned_staff_ids) && body.assigned_staff_ids.length > 0) {
      const firstId = body.assigned_staff_ids[0]
      if (typeof firstId === 'string' && uuidRegex.test(firstId)) {
        assignedStaffId = firstId
      }
    }

    const payload = {
      delivery_number: deliveryNumber,
      customer_id: body.customer_id,
      booking_id: body.booking_id || null,
      delivery_type: body.delivery_type || 'regular',
      pickup_address: body.pickup_address || '',
      delivery_address: body.delivery_address,
      delivery_date: body.delivery_date,
      delivery_time: body.delivery_time || '10:00 AM',
      status: body.status || 'pending',
      driver_name: body.driver_name || null,
      vehicle_number: body.vehicle_number || null,
      assigned_staff_id: assignedStaffId,
      delivery_charge: deliveryCharge,
      fuel_cost: fuelCost,
      special_instructions: body.special_instructions || null,
      franchise_id: franchiseId || body.franchise_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: newDelivery, error: insertError } = await supabaseServer
      .from('deliveries')
      .insert([payload])
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .single()

    if (insertError) {
      console.error('[Deliveries API] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: newDelivery }, { status: 201 })
  } catch (error: any) {
    console.error('[Deliveries API] Error in POST:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
