import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Customer Management API - v1
 * Unified API for customer CRUD operations without foreign key constraints
 * 
 * Endpoints:
 * GET  /api/v1/customers - List all customers
 * POST /api/v1/customers - Create new customer
 * PUT  /api/v1/customers/:id - Update customer
 * DELETE /api/v1/customers/:id - Delete customer (cascade handles related records)
 */

interface Customer {
  id?: string
  name: string
  phone: string
  email?: string
  whatsapp?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  franchise_id?: string
  created_by?: string
  updated_by?: string
  is_active?: boolean
}

// GET: List customers
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.role === 'super_admin'
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    // Franchise isolation
    if (!isSuperAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId)
    }

    // Only active customers by default
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Customers v1] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
    })
  } catch (error: any) {
    console.error('[Customers v1] GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create customer
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const userId = auth.user!.id
    const supabase = createClient()
    const body: Customer = await request.json()

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!body.phone?.trim() || body.phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number (min 10 digits) is required' }, { status: 400 })
    }

    // Create customer
    const customerData: any = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      whatsapp: body.whatsapp?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      pincode: body.pincode?.trim() || null,
      franchise_id: franchiseId,
      created_by: userId,
      is_active: true,
    }

    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (insertError) {
      console.error('[Customers v1] INSERT error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`[Customers v1] Created customer: ${newCustomer.id}`)
    return NextResponse.json(
      { success: true, data: newCustomer },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Customers v1] POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update customer
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.role === 'super_admin'
    const userId = auth.user!.id
    const supabase = createClient()
    const body: Customer = await request.json()

    const customerId = body.id
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!body.phone?.trim() || body.phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number (min 10 digits) is required' }, { status: 400 })
    }

    // Fetch existing customer
    const { data: existing } = await supabase
      .from('customers')
      .select('id, franchise_id')
      .eq('id', customerId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Franchise isolation
    if (!isSuperAdmin && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update customer
    const updateData: any = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      whatsapp: body.whatsapp?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      pincode: body.pincode?.trim() || null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single()

    if (updateError) {
      console.error('[Customers v1] UPDATE error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[Customers v1] Updated customer: ${customerId}`)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[Customers v1] PUT error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete customer (soft delete by default, hard delete if forced)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const franchiseId = auth.user!.franchise_id
    const isSuperAdmin = auth.user!.role === 'super_admin'
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('id')
    const hardDelete = searchParams.get('hard') === 'true'

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Fetch existing customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id, franchise_id')
      .eq('id', customerId)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Franchise isolation
    if (!isSuperAdmin && customer.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If hard delete, cascade delete related records
    if (hardDelete) {
      // Delete returns
      const { error: delReturnsError } = await supabase
        .from('returns')
        .delete()
        .eq('customer_id', customerId)

      if (delReturnsError) {
        console.error('[Customers v1] Error deleting returns:', delReturnsError)
        // Don't fail - might not have returns
      }

      // Delete orders (product_orders)
      const { error: delOrdersError } = await supabase
        .from('product_orders')
        .delete()
        .eq('customer_id', customerId)

      if (delOrdersError) {
        console.error('[Customers v1] Error deleting orders:', delOrdersError)
        // Don't fail - might not have orders
      }

      // Delete package bookings
      const { error: delBookingsError } = await supabase
        .from('package_bookings')
        .delete()
        .eq('customer_id', customerId)

      if (delBookingsError) {
        console.error('[Customers v1] Error deleting bookings:', delBookingsError)
        // Don't fail - might not have bookings
      }

      // Now delete customer
      const { error: delError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (delError) {
        console.error('[Customers v1] DELETE error:', delError)
        return NextResponse.json({ error: delError.message }, { status: 500 })
      }

      console.log(`[Customers v1] Hard deleted customer: ${customerId}`)
      return NextResponse.json({
        success: true,
        message: 'Customer and all related records deleted',
        hard: true,
      })
    } else {
      // Soft delete: mark as inactive
      const { error: softDelError } = await supabase
        .from('customers')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)

      if (softDelError) {
        console.error('[Customers v1] Soft delete error:', softDelError)
        return NextResponse.json({ error: softDelError.message }, { status: 500 })
      }

      console.log(`[Customers v1] Soft deleted customer: ${customerId}`)
      return NextResponse.json({
        success: true,
        message: 'Customer deactivated',
      })
    }
  } catch (error: any) {
    console.error('[Customers v1] DELETE error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
