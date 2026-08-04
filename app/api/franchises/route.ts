import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FRANCHISE_FIELDS = [
  "code", "name", "owner_name", "manager_name", "phone", "email", "address", "city", "state",
  "pincode", "gst_number", "pan_number", "license_number", "bank_account_number", "bank_name",
  "bank_ifsc", "opening_date", "monthly_target", "security_deposit", "agreement_start_date",
  "agreement_end_date", "notes", "commission_rate", "is_active",
] as const

function normalizeFranchise(body: Record<string, any>, partial = false) {
  const data: Record<string, any> = {}
  for (const field of FRANCHISE_FIELDS) {
    if (!(field in body)) continue
    const value = body[field]
    if (["monthly_target", "security_deposit", "commission_rate"].includes(field)) {
      data[field] = value === "" || value === null ? null : Number(value)
    } else if (field === "is_active") {
      data[field] = Boolean(value)
    } else {
      data[field] = typeof value === "string" ? value.trim() || null : value
    }
  }

  if (typeof data.code === "string") data.code = data.code.toUpperCase()
  if (typeof data.email === "string") data.email = data.email.toLowerCase()
  if (typeof data.pan_number === "string") data.pan_number = data.pan_number.toUpperCase()
  if (typeof data.gst_number === "string") data.gst_number = data.gst_number.toUpperCase()
  if (typeof data.bank_ifsc === "string") data.bank_ifsc = data.bank_ifsc.toUpperCase()

  const errors: string[] = []
  if (!partial) {
    if (!data.code) errors.push("code is required")
    if (!data.name) errors.push("name is required")
    if (!data.city) errors.push("city is required")
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("email is invalid")
  if (data.pincode && !/^\d{6}$/.test(data.pincode)) errors.push("pincode must contain 6 digits")
  if (data.commission_rate != null && (!Number.isFinite(data.commission_rate) || data.commission_rate < 0 || data.commission_rate > 100)) {
    errors.push("commission_rate must be between 0 and 100")
  }
  for (const field of ["monthly_target", "security_deposit"] as const) {
    if (data[field] != null && (!Number.isFinite(data[field]) || data[field] < 0)) errors.push(`${field} cannot be negative`)
  }
  if (data.agreement_start_date && data.agreement_end_date && data.agreement_end_date < data.agreement_start_date) {
    errors.push("agreement_end_date cannot be before agreement_start_date")
  }

  return { data, errors }
}

/**
 * GET /api/franchises
 * Fetch all franchises (super admin sees all, franchise admin sees only theirs)
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Franchises API] GET request received")
    
    // 🔒 SECURITY: Authenticate user and get franchise context
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      console.error("[Franchises API] Unauthorized")
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const { user } = auth

    console.log(`[Franchises API] User: ${user!.id}, Super Admin: ${user!.is_super_admin}, Franchise: ${user!.franchise_id}`)

    let query = supabase
      .from("franchises")
      .select("*")
      .order("created_at", { ascending: false })

    // 🔒 FRANCHISE ISOLATION: Super admin sees all, others see only their franchise
    if (!user!.is_super_admin && user!.franchise_id) {
      console.log(`[Franchises API] Filtering by franchise: ${user!.franchise_id}`)
      query = query.eq("id", user!.franchise_id)
    } else {
      console.log("[Franchises API] Super admin - returning all franchises")
    }

    const { data, error } = await query

    if (error) {
      console.error("[Franchises API] Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Franchises API] Successfully fetched ${data?.length || 0} franchises`)
    return NextResponse.json({ data: data || [] })

  } catch (error: any) {
    console.error("[Franchises API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/franchises
 * Create a new franchise (super admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    const normalized = normalizeFranchise({ ...body, is_active: body.is_active ?? true })
    if (normalized.errors.length > 0) {
      return NextResponse.json({ error: normalized.errors.join(". "), fields: normalized.errors }, { status: 400 })
    }

    // Check if franchise code already exists
    const { data: existing } = await supabase
      .from("franchises")
      .select("code")
      .eq("code", normalized.data.code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        error: "Franchise code already exists" 
      }, { status: 409 })
    }

    // Create franchise
    const { data, error } = await supabase
      .from("franchises")
      .insert(normalized.data)
      .select()
      .single()

    if (error) {
      console.error("[Franchises API] Error creating franchise:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (error: any) {
    console.error("[Franchises API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}

/**
 * PUT /api/franchises
 * Update a franchise (super admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Missing franchise ID" }, { status: 400 })
    }

    const normalized = normalizeFranchise(body, true)
    if (normalized.errors.length > 0) {
      return NextResponse.json({ error: normalized.errors.join(". "), fields: normalized.errors }, { status: 400 })
    }
    if (Object.keys(normalized.data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Update franchise
    const { data, error } = await supabase
      .from("franchises")
      .update(normalized.data)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Franchises API] Error updating franchise:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error("[Franchises API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}
