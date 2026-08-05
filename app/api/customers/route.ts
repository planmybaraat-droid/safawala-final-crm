import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import type { UserPermissions } from "@/lib/types"
import { validateEmail, validatePhoneWithCountry, validatePincode } from "@/lib/form-validation"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const { data, error } = await supabaseServer
      .from('users')
      .select('permissions')
      .eq('id', userId)
      .single()
    if (error) return null
    return (data?.permissions as UserPermissions) || null
  } catch {
    return null
  }
}

function hasModuleAccess(perms: UserPermissions | null, key: keyof UserPermissions) {
  if (!perms) return false
  return Boolean(perms[key])
}

function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s\-()]/g, "")
  if (/^\d{10}$/.test(compact)) return `+91${compact}`
  if (/^91\d{10}$/.test(compact)) return `+${compact}`
  return compact
}

function sanitizeSearch(value: string) {
  return value.replace(/[,%()"'\\]/g, " ").trim()
}

export async function GET(request: NextRequest) {
  try {
  const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const { searchParams } = new URL(request.url)
    const basic = (searchParams.get('basic') ?? '0') === '1'

    // Permissions: In basic mode (used by booking wizard), allow read for authenticated roles
    // while still enforcing franchise isolation. Otherwise require explicit module permission.
    if (!basic) {
      const permissions = authContext!.user.permissions
      if (!permissions.customers) {
        return NextResponse.json(
          { error: 'You do not have permission to view customers' },
          { status: 403 }
        )
      }
    }

    const franchiseId = authContext!.user.franchise_id
    const isSuperAdmin = authContext!.user.role === 'super_admin'
    const role = authContext!.user.role

    if (!isSuperAdmin && !franchiseId) {
      return NextResponse.json(
        { error: "Your account isn't linked to a franchise. Contact an admin to fix your account setup." },
        { status: 403 }
      )
    }
    
    // Use service role client but manually enforce franchise filtering
    const supabase = createClient()

    console.log(`[Customers API] User: role=${role}, franchiseId=${franchiseId}, isSuperAdmin=${isSuperAdmin}`)

  const search = searchParams.get("search")

    // Build query - manually apply franchise filter for non-super-admins
    let query = supabase
      .from("customers")
      .select(
        basic
          ? 'id,name,phone,email,pincode,franchise_id,created_at,updated_at'
          : `*,franchise:franchises(id, name, code)`
      )
      .order("created_at", { ascending: false })

    // CRITICAL: Apply franchise filter for non-super-admins
    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
      console.log(`[Customers API] ✅ Applied franchise filter: ${franchiseId}`)
    } else if (isSuperAdmin) {
      console.log(`[Customers API] ⚠️  Super admin mode - no franchise filter`)
    } else {
      console.log(`[Customers API] ❌ WARNING: No franchise_id for non-super-admin user!`)
    }

    // Apply search filter if provided
    const safeSearch = search ? sanitizeSearch(search) : ""
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
    }

    let { data, error } = await query

    if (error) {
      console.error("[Customers API] Query Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Customers API] Query returned ${data?.length || 0} customers for franchise ${franchiseId || 'none'}`)

    // If no data and we have a franchise filter, try to check if there are any customers at all
    if ((!data || data.length === 0) && !isSuperAdmin) {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
      console.log(`[Customers API] Total customers in DB (all franchises): ${count}`)
    }

    // Build a simple ETag for the list response based on the latest updated_at, count, franchise and search
    const latestUpdatedAt = (data || [])
      .map((c: any) => c.updated_at || c.created_at)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || ''
    const variant = `${franchiseId}|${isSuperAdmin ? 'super' : 'fr'}|${search || ''}`
    const etag = `W/"list:${variant}:${data?.length || 0}:${latestUpdatedAt}"`
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, must-revalidate, max-age=0',
          Vary: 'Cookie'
        }
      })
    }

    console.log(`[Customers API] Returning ${data?.length || 0} customers`)
    return NextResponse.json({ success: true, data: data || [] }, {
      headers: {
        ETag: etag,
        'Cache-Control': 'private, must-revalidate, max-age=0',
        Vary: 'Cookie'
      }
    })
  } catch (error) {
    console.error("[Customers API] Error:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const userId = authContext!.user.id
    if (!authContext!.user.permissions.customers) {
      return NextResponse.json(
        { error: 'You do not have permission to create customers' },
        { status: 403 }
      )
    }

    const isSuperAdmin = authContext!.user.role === 'super_admin'
    const supabase = createClient()

  const body = await request.json()
  const { name, phone, whatsapp, email, address, city, state, pincode, notes } = body

    // Super admins aren't tied to one franchise — trust an explicit franchise_id from the
    // client (e.g. a franchise picker) when provided, since their own account has none.
    const franchiseId = isSuperAdmin && body.franchise_id ? body.franchise_id : authContext!.user.franchise_id

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!phone || !validatePhoneWithCountry(phone).isValid) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 })
    }

    if (email && !validateEmail(email.trim())) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    if (pincode && !validatePincode(pincode.trim())) {
      return NextResponse.json({ error: "Pincode must contain exactly 6 digits" }, { status: 400 })
    }

    if (!franchiseId) {
      return NextResponse.json(
        { error: isSuperAdmin
          ? "Your account isn't linked to a franchise. Select a franchise before creating a customer."
          : "Your account isn't linked to a franchise. Contact an admin to fix your account setup." },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)
    const { data: phoneMatches, error: duplicateError } = await supabase
      .from("customers")
      .select("id, phone")
      .eq("franchise_id", franchiseId)

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 500 })
    }
    if (phoneMatches?.some((customer) => normalizePhone(customer.phone || "") === normalizedPhone)) {
      return NextResponse.json(
        { error: "A customer with this phone number already exists in this franchise" },
        { status: 409 }
      )
    }

    // Insert new customer with franchise_id
    // Build insert payload conditionally to avoid referencing dropped columns (e.g., notes)
    const insertPayload: any = {
      name: name.trim(),
      phone: normalizedPhone,
      whatsapp: whatsapp?.trim() ? normalizePhone(whatsapp) : null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      franchise_id: franchiseId,
  created_by: userId,
    }
    if (typeof notes !== 'undefined') {
      insertPayload.notes = typeof notes === 'string' ? notes.trim() : notes ?? null
    }

    const { data: newCustomer, error: insertError } = await supabase
      .from("customers")
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) {
      console.error("[Customers API] Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`[Customers API] Created customer ${newCustomer.id} for franchise ${franchiseId}`)
    return NextResponse.json({ success: true, data: newCustomer }, { status: 201 })
  } catch (error) {
    console.error("[Customers API] Error:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const userId = authContext!.user.id
    const franchiseId = authContext!.user.franchise_id
    const isSuperAdmin = authContext!.user.role === 'super_admin'
    const supabase = createClient()

    const body = await request.json()
    const { 
      id, name, phone, whatsapp, email, address, city, state, pincode, notes,
      kyc_status, aadhar_number, pan_number, kyc_document_url, kyc_notes
    } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "Valid customer ID is required" }, { status: 400 })
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!phone || !validatePhoneWithCountry(phone).isValid) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 })
    }


    if (email && !validateEmail(email.trim())) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    if (pincode && !validatePincode(pincode.trim())) {
      return NextResponse.json({ error: "Pincode must contain exactly 6 digits" }, { status: 400 })
    }

    // Fetch existing to verify and enforce franchise isolation
    const { data: existing, error: fetchError } = await supabase
      .from('customers')
      .select('id, franchise_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!isSuperAdmin && existing.franchise_id !== franchiseId) {
      return NextResponse.json({ error: 'Access denied to this franchise' }, { status: 403 })
    }

    const normalizedPhone = normalizePhone(phone)
    const { data: phoneMatches, error: duplicateError } = await supabase
      .from('customers')
      .select('id, phone')
      .eq('franchise_id', existing.franchise_id)
      .neq('id', id)

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 500 })
    }
    if (phoneMatches?.some((customer) => normalizePhone(customer.phone || '') === normalizedPhone)) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists in this franchise' },
        { status: 409 }
      )
    }

    const updateData: any = {
      name: name.trim(),
      phone: normalizedPhone,
      whatsapp: whatsapp?.trim() ? normalizePhone(whatsapp) : null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }
    // Only include notes if explicitly provided to avoid column-not-found errors
    if (typeof notes !== 'undefined') {
      updateData.notes = typeof notes === 'string' ? notes.trim() : notes ?? null
    }

    // Include KYC fields if provided
    if (kyc_status !== undefined) updateData.kyc_status = kyc_status
    if (aadhar_number !== undefined) updateData.aadhar_number = aadhar_number
    if (pan_number !== undefined) updateData.pan_number = pan_number
    if (kyc_document_url !== undefined) updateData.kyc_document_url = kyc_document_url
    if (kyc_notes !== undefined) updateData.kyc_notes = kyc_notes

    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('[Customers API] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[Customers API] PUT Error:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
