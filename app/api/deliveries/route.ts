import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    // Require authentication and derive franchise context
    const auth = await requireAuth(request, 'readonly')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
  const user = auth.authContext!.user
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
  const scope = searchParams.get('scope') // super_admin can pass scope=all to view all franchises

  // Determine effective franchise filter
  const isSuper = !!user.is_super_admin
  const effectiveFranchiseId = isSuper && scope === 'all' ? null : (user.franchise_id || null)

  console.log('[Deliveries API] Fetching deliveries for franchise:', effectiveFranchiseId || (isSuper ? 'ALL (super_admin)' : 'NONE'))

    // Use service role client (bypasses RLS) but add manual franchise filter
    const supabase = await createClient()

    let query = supabase
      .from("deliveries")
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .order("created_at", { ascending: false })

    // CRITICAL: Add franchise filter for non super_admin users
    if (effectiveFranchiseId) {
      query = query.eq('franchise_id', effectiveFranchiseId)
      console.log('[Deliveries API] Filtering by franchise_id:', effectiveFranchiseId)
    } else {
      // super_admin scope=all – allow viewing all
      if (isSuper && scope === 'all') {
        console.log('[Deliveries API] Super admin mode (scope=all): no franchise filter applied')
      } else {
        console.warn('[Deliveries API] No franchise_id available; returning all deliveries')
      }
    }

    // Staff role filter: restrict to assigned deliveries only
    if (user.role === 'staff') {
      query = query.eq('assigned_staff_id', user.id)
      console.log('[Deliveries API] Staff user: filtering by assigned_staff_id:', user.id)
    }

    // Optional status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Deliveries API] Error fetching deliveries:", error)
      
      // Check if the deliveries table doesn't exist (42P01 or explicit relation-not-found for deliveries)
      const msg = (error.message || "").toLowerCase()
      if (error.code === '42P01' || msg.includes('relation "deliveries" does not exist') || msg.includes('relation \"deliveries\" does not exist')) {
        return NextResponse.json({ 
          error: "Deliveries table not found. Please run MIGRATION_DELIVERIES_TABLE.sql",
          hint: "Run the migration to create the deliveries table",
          data: []
        }, { status: 404 })
      }
      
      // If the error is due to an optional join (e.g., staff) or missing relationship, fall back to a simpler select
      try {
        let fallbackQuery = supabase
          .from('deliveries')
          .select('*')
          .order('created_at', { ascending: false })
        
        // CRITICAL: Apply franchise filter even in fallback
        if (effectiveFranchiseId) {
          fallbackQuery = fallbackQuery.eq('franchise_id', effectiveFranchiseId)
        }
        
        // Staff filter in fallback
        if (user.role === 'staff') {
          fallbackQuery = fallbackQuery.eq('assigned_staff_id', user.id)
        }

        if (status && status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', status)
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery

        if (!fallbackError) {
          console.log(`[Deliveries API] Fallback: Found ${fallbackData?.length || 0} deliveries`)
          return NextResponse.json({ success: true, data: fallbackData || [] })
        }
      } catch (e) {
        // ignore and return original error below
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Deliveries API] Found ${data?.length || 0} deliveries`)
    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error("[Deliveries API] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication and derive franchise context
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }
    const user = auth.authContext!.user
    const franchiseId = user.is_super_admin ? (undefined as unknown as string | undefined) : (user.franchise_id as string | undefined)
    const userId = user.id
    
    const body = await request.json()

    // Validation
    if (!body.customer_id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 })
    }

    if (!body.delivery_address || body.delivery_address.trim() === "") {
      return NextResponse.json({ error: "Delivery address is required" }, { status: 400 })
    }

    if (!body.delivery_date) {
      return NextResponse.json({ error: "Delivery date is required" }, { status: 400 })
    }

  // Generate delivery number (with fallback if RPC doesn't exist)
    let deliveryNumber: string
    
    try {
      const { data, error: numberError } = await supabaseServer.rpc('generate_delivery_number')
      
      if (numberError) {
        console.warn("[Deliveries API] RPC not available, using fallback numbering:", numberError.message)
        // Fallback: use timestamp-based number
        deliveryNumber = `DEL-${Date.now().toString().slice(-8)}`
      } else {
        deliveryNumber = data
      }
    } catch (e) {
      console.warn("[Deliveries API] Using fallback delivery numbering")
      deliveryNumber = `DEL-${Date.now().toString().slice(-8)}`
    }

    // Calculate total
    const deliveryCharge = parseFloat(body.delivery_charge || 0)
    const fuelCost = parseFloat(body.fuel_cost || 0)

    // Sanitize IDs (accept only valid UUIDs)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    let assignedStaffId =
      typeof body.assigned_staff_id === 'string' && uuidRegex.test(body.assigned_staff_id)
        ? body.assigned_staff_id
        : null
    // Handle assigned_staff_ids array (prefer first element over assigned_staff_id)
    if (Array.isArray(body.assigned_staff_ids) && body.assigned_staff_ids.length > 0) {
      const firstId = body.assigned_staff_ids[0]
      if (typeof firstId === 'string' && uuidRegex.test(firstId)) {
        assignedStaffId = firstId
      }
    }
    // Determine franchise assignment
    let computedFranchiseId: string | null = null
    if (user.is_super_admin) {
      // Allow super admin to optionally pass a franchise_id in request body
      const candidate = typeof body.franchise_id === 'string' ? body.franchise_id : undefined
      computedFranchiseId = candidate && uuidRegex.test(candidate) ? candidate : null
    } else {
      computedFranchiseId = franchiseId && uuidRegex.test(franchiseId) ? franchiseId : null
    }

    const safeFranchiseId = computedFranchiseId
    const safeCreatedBy = uuidRegex.test(userId) ? userId : null

    // Get staff IDs array for junction table
    const staffIds = Array.isArray(body.assigned_staff_ids) ? body.assigned_staff_ids.filter((id: string) => uuidRegex.test(id)) : []

    // Create delivery
    const deliveryData = {
      delivery_number: deliveryNumber,
      customer_id: body.customer_id,
      booking_id: body.booking_id || null,
      booking_source: body.booking_source || null,
      delivery_type: body.delivery_type || 'standard',
      status: body.status || 'pending',
      pickup_address: body.pickup_address || null,
      delivery_address: body.delivery_address.trim(),
      delivery_date: body.delivery_date,
      delivery_time: body.delivery_time || null,
      driver_name: body.driver_name || null,
      vehicle_number: body.vehicle_number || null,
      assigned_staff_id: assignedStaffId,
      delivery_charge: deliveryCharge,
      fuel_cost: fuelCost,
      special_instructions: body.special_instructions || null,
      franchise_id: safeFranchiseId,
      created_by: safeCreatedBy,
    }

    const { data: delivery, error } = await supabaseServer
      .from("deliveries")
      .insert(deliveryData)
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .single()

    if (error) {
      console.error("[Deliveries API] Error creating delivery:", error)
      
      // Check if deliveries table doesn't exist
      const msg = (error.message || "").toLowerCase()
      if (error.code === '42P01' || msg.includes('relation "deliveries" does not exist') || msg.includes('relation \"deliveries\" does not exist')) {
        return NextResponse.json({ 
          error: "Deliveries table not found. Please run MIGRATION_DELIVERIES_TABLE.sql to create the table.",
          hint: "Check DELIVERIES_BACKEND_COMPLETE.md for instructions"
        }, { status: 404 })
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Insert staff assignments into junction table if we have staff IDs
    if (delivery && staffIds.length > 0) {
      try {
        const assignments = staffIds.map((staffId: string) => ({
          delivery_id: delivery.id,
          staff_id: staffId,
          role: 'assigned',
          assigned_by: safeCreatedBy,
        }))
        await supabaseServer
          .from("delivery_staff")
          .insert(assignments)
      } catch (staffError) {
        // delivery_staff table might not exist yet - that's ok
        console.warn("[Deliveries API] Could not create staff assignments:", staffError)
      }
    }

    return NextResponse.json({ success: true, data: delivery }, { status: 201 })
  } catch (error: any) {
    console.error("[Deliveries API] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
