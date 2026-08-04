import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseServer } from "@/lib/supabase-server-simple"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Supabase Auth admin client (service role for user management)
function getAuthAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * POST /api/ecommerce/auth
 * Handles both signup and login for ecommerce customers
 * Body: { action: 'signup' | 'login', email, password, name?, phone?, franchise_id }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'signup') {
      return handleSignup(body)
    } else if (action === 'login') {
      return handleLogin(body)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[Ecommerce Auth] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSignup(body: any) {
  const { email, password, name, phone, franchise_id } = body

  // Validate required fields
  if (!email?.trim() || !password || !name?.trim() || !phone?.trim() || !franchise_id) {
    return NextResponse.json(
      { error: 'Name, email, password, phone, and franchise_id are required' },
      { status: 400 }
    )
  }

  if (phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'Phone number must be at least 10 digits' }, { status: 400 })
  }

  // Verify franchise exists
  const { data: franchise, error: franchiseErr } = await supabaseServer
    .from('franchises')
    .select('id')
    .eq('id', franchise_id)
    .single()

  if (franchiseErr || !franchise) {
    return NextResponse.json({ error: 'Invalid franchise' }, { status: 400 })
  }

  // Check if customer already exists (by email or phone within the franchise)
  const { data: existing } = await supabaseServer
    .from('customers')
    .select('id, email, phone')
    .eq('franchise_id', franchise_id)
    .or(`email.eq.${email.trim().toLowerCase()},phone.eq.${phone.trim()}`)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'An account with this email or phone already exists' },
      { status: 409 }
    )
  }

  // Create Supabase Auth user
  const admin = getAuthAdmin()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), phone: phone.trim(), role: 'ecom_customer' },
  })

  if (authError) {
    if (authError.message?.includes('already been registered')) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    throw authError
  }

  // Create customer record in CRM customers table
  const { data: customer, error: customerError } = await supabaseServer
    .from('customers')
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      franchise_id,
      status: 'active',
      is_active: true,
      notes: 'Registered via ecommerce app',
    })
    .select()
    .single()

  if (customerError) {
    // Rollback: delete the auth user if customer creation fails
    await admin.auth.admin.deleteUser(authData.user.id)
    throw customerError
  }

  // Sign in to get session tokens
  const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (signInError) {
    return NextResponse.json(
      { error: 'Account created but login failed. Please sign in.' },
      { status: 201 }
    )
  }

  return NextResponse.json({
    success: true,
    customer,
    session: {
      access_token: signInData.session?.access_token,
      refresh_token: signInData.session?.refresh_token,
      expires_at: signInData.session?.expires_at,
    },
  }, { status: 201 })
}

async function handleLogin(body: any) {
  const { email, password, franchise_id } = body

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const admin = getAuthAdmin()

  // Authenticate with Supabase
  const { data: authData, error: authError } = await admin.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (authError) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // Fetch customer profile from CRM
  let query = supabaseServer
    .from('customers')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .eq('is_active', true)

  if (franchise_id) {
    query = query.eq('franchise_id', franchise_id)
  }

  const { data: customer, error: profileError } = await query.limit(1).single()

  if (profileError || !customer) {
    return NextResponse.json(
      { error: 'No customer profile found. Please sign up first.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    customer,
    session: {
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      expires_at: authData.session?.expires_at,
    },
  })
}

/**
 * GET /api/ecommerce/auth
 * Get customer profile using bearer token
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const admin = getAuthAdmin()

    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { data: customer, error: profileError } = await supabaseServer
      .from('customers')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (profileError || !customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, customer })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/ecommerce/auth
 * Update customer profile using bearer token
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const admin = getAuthAdmin()

    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const body = await request.json()
    const allowedFields = ['name', 'phone', 'whatsapp', 'address', 'city', 'state', 'pincode']
    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()

    const { data: customer, error: updateErr } = await supabaseServer
      .from('customers')
      .update(updateData)
      .eq('email', user.email)
      .eq('is_active', true)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, customer })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
