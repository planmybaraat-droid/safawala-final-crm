import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { ApiResponseBuilder } from "@/lib/api-response"
import AuditLogger from "@/lib/audit-logger"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"
import type { UserPermissions } from "@/lib/types"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

// Copilot, optimize this Next.js API route like Lee Robinson from Vercel would.
// Focus areas:
// - Enforce explicit permissions (module-level) and franchise isolation (field-level access)
// - Keep payloads lean (select only needed columns) to reduce TTFB
// - Strong, consistent error responses (401/403/404)
// - Cache-aware responses with ETag and appropriate Vary headers

// Utility: Build a weak ETag from id + updated_at (falls back to created_at)
function buildEtag(record: { id?: string; updated_at?: string; created_at?: string }) {
  const stamp = record?.updated_at || record?.created_at || ''
  const id = record?.id || ''
  // Simple, deterministic weak etag; sufficient for client-side revalidation
  return `W/"${id}:${stamp}"`
}

// Lightweight permission fetcher (service-key client → enforce app-side rules here)
async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const { data, error } = await supabaseServer
      .from('users')
      .select('permissions')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[permissions] fetch failed:', error)
      return null
    }
    return (data?.permissions as UserPermissions) || null
  } catch (e) {
    console.error('[permissions] unexpected error:', e)
    return null
  }
}

function hasModuleAccess(perms: UserPermissions | null, key: keyof UserPermissions) {
  if (!perms) return false
  return Boolean(perms[key])
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const authResult = await requireAuth(request, 'readonly');
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 });
    }
    const { authContext } = authResult;
    // Module permission: require "customers" access even for readers
    const permissions = authContext!.user.permissions
    if (!permissions.customers) {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('You do not have permission to view customers'),
        { status: 403 }
      )
    }

    const { id } = params
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Valid customer ID is required", "id"),
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Invalid customer ID format", "id"),
        { status: 400 }
      )
    }

    // Fetch by ID only (no franchise filter). Keep payload lean.
    const { data: customer, error } = await supabaseServer
      .from("customers")
      .select("id, customer_code, name, phone, whatsapp, email, address, city, state, pincode, franchise_id, status, kyc_status, aadhar_number, pan_number, kyc_document_url, kyc_notes, lead_id, created_at, updated_at")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          ApiResponseBuilder.notFoundError("Customer not found"),
          { status: 404 }
        )
      }
      console.error("[v0] Customer GET error:", error)
      return NextResponse.json(
        ApiResponseBuilder.serverError("Failed to fetch customer", error.message),
        { status: 500 }
      )
    }

    // Franchise isolation: ensure requester can access this customer's franchise
    if (customer?.franchise_id) {
      const allowed = AuthMiddleware.canAccessFranchise(authContext!.user, customer.franchise_id)
      if (!allowed) {
        return NextResponse.json(
          ApiResponseBuilder.forbiddenError('Access denied to this franchise'),
          { status: 403 }
        )
      }
    }

    // Log customer access for audit trail
    try {
      const auditContext = AuthMiddleware.extractAuditContext(authContext || null, request);
      await AuditLogger.logRead(
        'customers',
        customer.id,
        {
          userId: auditContext.userId,
          userEmail: auditContext.userEmail,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
          sessionId: auditContext.sessionId || undefined
        }
      );
    } catch (auditError) {
      console.error('Audit logging failed for customer read:', auditError);
      // Don't fail the main operation due to audit logging issues
    }

    // Conditional ETag handling
    const etag = buildEtag(customer)
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, must-revalidate, max-age=0',
          // Authenticated responses vary by cookie/session and our custom auth headers
          Vary: 'Cookie, X-User-ID, X-User-Email'
        }
      })
    }

    // Success with cache-aware headers
    return NextResponse.json(
      ApiResponseBuilder.success(customer, "Customer retrieved successfully"),
      {
        headers: {
          ETag: etag,
          'Cache-Control': 'private, must-revalidate, max-age=0',
          Vary: 'Cookie, X-User-ID, X-User-Email'
        }
      }
    )
  } catch (error) {
    console.error("[v0] Customer GET error:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const authResult = await requireAuth(request, 'staff');
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 });
    }
    const { authContext } = authResult;
    // Module permission: require "customers" access for update
    const permissions = authContext!.user.permissions
    if (!permissions.customers) {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('You do not have permission to update customers'),
        { status: 403 }
      )
    }

    const { id } = params
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Valid customer ID is required", "id"),
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Invalid customer ID format", "id"),
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, email, phone, whatsapp, address, city, state, pincode, notes, is_active, kyc_status, aadhar_number, pan_number, kyc_document_url, kyc_notes } = body

    // Validation
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Name must be a non-empty string", "name"),
        { status: 400 }
      )
    }

    if (phone !== undefined && (typeof phone !== "string" || phone.trim().length < 10)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Phone number must be at least 10 digits", "phone"),
        { status: 400 }
      )
    }

    if (pincode !== undefined && (typeof pincode !== "string" || !/^\d{6}$/.test(pincode.trim()))) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Valid 6-digit pincode is required", "pincode"),
        { status: 400 }
      )
    }

    if (email !== undefined && email && (typeof email !== "string" || !email.includes("@") || email.length < 5)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Invalid email format", "email"),
        { status: 400 }
      )
    }

    // 1) Fetch by ID first to check existence and franchise access
    const { data: existingCustomer, error: existingError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()

    if (existingError) {
      if (existingError.code === "PGRST116") {
        return NextResponse.json(
          ApiResponseBuilder.notFoundError("Customer not found"),
          { status: 404 }
        )
      }
      return NextResponse.json(
        ApiResponseBuilder.serverError("Failed to fetch customer for update", existingError.message),
        { status: 500 }
      )
    }

    // 2) Authorization: ensure requester can access the customer's franchise
    if (existingCustomer?.franchise_id) {
      const allowed = AuthMiddleware.canAccessFranchise(authContext!.user, existingCustomer.franchise_id)
      if (!allowed) {
        return NextResponse.json(
          ApiResponseBuilder.forbiddenError("Access denied to this franchise"),
          { status: 403 }
        )
      }
    }

    // 3) Block updates to inactive customers  
    if (existingCustomer.is_active === false) {
      return NextResponse.json(
        ApiResponseBuilder.conflictError("Cannot update an inactive customer. Activate it first."),
        { status: 409 }
      )
    }

    // Check for duplicate email (excluding current customer)
    if (email && email !== existingCustomer.email) {
      let duplicateQuery = supabaseServer
        .from("customers")
        .select("id, name, franchise_id")
        .eq("email", email.trim())
        .neq("id", id)

      if (existingCustomer.franchise_id) {
        duplicateQuery = duplicateQuery.eq("franchise_id", existingCustomer.franchise_id)
      }

      const { data: existingByEmail } = await duplicateQuery.single()

      if (existingByEmail) {
        return NextResponse.json(
          ApiResponseBuilder.conflictError(`Email ${email} is already used by another customer: ${existingByEmail.name}`),
          { status: 409 }
        )
      }
    }

    // XSS Protection
    const fieldsToCheck = [name, email, address, city, state, notes].filter(Boolean)
    const xssPatterns = [/<script/i, /javascript:/i, /onerror/i, /onload/i, /onclick/i]

    if (
      fieldsToCheck.some(
        (field) =>
          xssPatterns.some((pattern) => pattern.test(field)) ||
          field.includes(";") ||
          field.includes("|") ||
          field.includes("&")
      )
    ) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Invalid characters detected in input"),
        { status: 400 }
      )
    }

    // Prepare update data (only include fields that were provided)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name.replace(/<[^>]*>/g, "").trim()
    if (email !== undefined) updateData.email = email ? email.replace(/<[^>]*>/g, "").trim() : null
    if (phone !== undefined) updateData.phone = phone.replace(/<[^>]*>/g, "").trim()
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? whatsapp.replace(/<[^>]*>/g, "").trim() : null
    if (address !== undefined) updateData.address = address ? address.replace(/<[^>]*>/g, "").trim() : null
    if (city !== undefined) updateData.city = city ? city.replace(/<[^>]*>/g, "").trim() : null
    if (state !== undefined) updateData.state = state ? state.replace(/<[^>]*>/g, "").trim() : null
    if (pincode !== undefined) updateData.pincode = pincode.replace(/<[^>]*>/g, "").trim()
    if (notes !== undefined) updateData.notes = notes ? notes.replace(/<[^>]*>/g, "").trim() : null
    if (is_active !== undefined) updateData.is_active = Boolean(is_active)
    if (kyc_status !== undefined) updateData.kyc_status = kyc_status
    if (aadhar_number !== undefined) updateData.aadhar_number = aadhar_number
    if (pan_number !== undefined) updateData.pan_number = pan_number
    if (kyc_document_url !== undefined) updateData.kyc_document_url = kyc_document_url
    if (kyc_notes !== undefined) updateData.kyc_notes = kyc_notes

    // Update the customer
    const { data: updatedCustomer, error: updateError } = await supabaseServer
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .eq("franchise_id", existingCustomer.franchise_id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Customer UPDATE error:", updateError)
      return NextResponse.json(
        ApiResponseBuilder.serverError("Failed to update customer", updateError.message),
        { status: 500 }
      )
    }

    // Log customer update for audit trail
    try {
      const auditContext = AuthMiddleware.extractAuditContext(authContext || null, request);
      await AuditLogger.logUpdate(
        'customers',
        id,
        existingCustomer,
        updatedCustomer,
        {
          userId: auditContext.userId,
          userEmail: auditContext.userEmail,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
          sessionId: auditContext.sessionId || undefined
        }
      );
    } catch (auditError) {
      console.error('Audit logging failed for customer update:', auditError);
      // Don't fail the main operation due to audit logging issues
    }

    return NextResponse.json(
      ApiResponseBuilder.success(updatedCustomer, "Customer updated successfully")
    )
  } catch (error) {
    console.error("[v0] Customer UPDATE error:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  console.log('[DELETE] Customer delete endpoint called with params:', params);
  
  try {
    // Authentication check
    const authResult = await requireAuth(request, 'staff');
    if (!authResult.success) {
      console.log('[DELETE] Auth failed:', authResult.response);
      return NextResponse.json(authResult.response, { status: 401 });
    }
    const { authContext } = authResult;
    // Module permission: require "customers" access for delete
    const permissions = authContext!.user.permissions
    if (!permissions.customers) {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('You do not have permission to delete customers'),
        { status: 403 }
      )
    }

    const { id } = params
    console.log('[DELETE] Processing delete for customer ID:', id);

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Valid customer ID is required", "id"),
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Invalid customer ID format", "id"),
        { status: 400 }
      )
    }

    // 1) Fetch by ID only (no franchise filter) to avoid false 404s
    const { data: existingCustomer, error: existingError } = await supabaseServer
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()

    if (existingError) {
      if ((existingError as any).code === "PGRST116") {
        return NextResponse.json(
          ApiResponseBuilder.notFoundError("Customer not found"),
          { status: 404 }
        )
      }
      console.error('[DELETE] Error fetching customer:', existingError)
      return NextResponse.json(
        ApiResponseBuilder.serverError("Failed to fetch customer for deletion", (existingError as any).message),
        { status: 500 }
      )
    }

    // 2) Authorization: ensure requester can access the customer's franchise
    if (existingCustomer?.franchise_id) {
      const allowed = AuthMiddleware.canAccessFranchise(authContext!.user, existingCustomer.franchise_id)
      if (!allowed) {
        return NextResponse.json(
          ApiResponseBuilder.forbiddenError("Access denied to this franchise"),
          { status: 403 }
        )
      }
    }

    // Check for related records (bookings, orders, etc.) before deletion
    const { data: relatedBookings } = await supabaseServer
      .from("bookings")
      .select("id")
      .eq("customer_id", id)
      .eq("franchise_id", existingCustomer.franchise_id)
      .limit(1)

    if (relatedBookings && relatedBookings.length > 0) {
      return NextResponse.json(
        ApiResponseBuilder.conflictError("Cannot delete customer with existing bookings. Please remove all related records first."),
        { status: 409 }
      )
    }

    // Perform soft delete by setting is_active = false
    let { error: deleteError } = await supabaseServer
      .from("customers")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("franchise_id", existingCustomer.franchise_id)

    if (deleteError) {
      // Fallback: if is_active column not migrated yet, perform hard delete
      if (/is_active|column .* does not exist/i.test(String(deleteError.message))) {
        console.warn('[Customer DELETE] is_active column missing. Performing hard delete fallback.')
        const hard = await supabaseServer
          .from('customers')
          .delete()
          .eq('id', id)
        if (hard.error) {
          console.error("[Customer DELETE] Hard delete fallback error:", hard.error)
          return NextResponse.json(
            ApiResponseBuilder.serverError("Failed to delete customer", hard.error.message),
            { status: 500 }
          )
        }
      } else {
        console.error("[Customer DELETE] Soft delete error:", deleteError)
        return NextResponse.json(
          ApiResponseBuilder.serverError("Failed to delete customer", deleteError.message),
          { status: 500 }
        )
      }
    }

    // Log customer deletion for audit trail
    try {
      const auditContext = AuthMiddleware.extractAuditContext(authContext || null, request);
      await AuditLogger.logDelete(
        'customers',
        id,
        existingCustomer,
        {
          userId: auditContext.userId,
          userEmail: auditContext.userEmail,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
          sessionId: auditContext.sessionId || undefined
        }
      );
    } catch (auditError) {
      console.error('Audit logging failed for customer deletion:', auditError);
      // Don't fail the main operation due to audit logging issues
    }

    return NextResponse.json(
      ApiResponseBuilder.success(
        { id, name: existingCustomer.name, is_active: false },
        `Customer "${existingCustomer.name}" deactivated successfully`
      )
    )
  } catch (error) {
    console.error("[v0] Customer DELETE error:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const authResult = await requireAuth(request, 'staff');
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 });
    }
    const { authContext } = authResult;
    // Module permission: require "customers" access for patch
    const permissions = authContext!.user.permissions
    if (!permissions.customers) {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('You do not have permission to update customers'),
        { status: 403 }
      )
    }

    const { id } = params

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Valid customer ID is required", "id"),
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Invalid customer ID format", "id"),
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, phone, whatsapp, email, address, city, state, pincode, is_active, kyc_status, aadhar_number, pan_number, kyc_document_url, kyc_notes } = body

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Name is required", "name"),
        { status: 400 }
      )
    }

    if (!phone || phone.trim().length < 10) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Valid phone number is required", "phone"),
        { status: 400 }
      )
    }

    // Fetch existing customer to verify it exists
    const { data: existingCustomer, error: fetchError } = await supabaseServer
      .from("customers")
      .select("id, franchise_id")
      .eq("id", id)
      .single()

    if (fetchError || !existingCustomer) {
      return NextResponse.json(
        ApiResponseBuilder.validationError("Customer not found", "id"),
        { status: 404 }
      )
    }

    // Franchise isolation for PATCH
    if (existingCustomer?.franchise_id) {
      const allowed = AuthMiddleware.canAccessFranchise(authContext!.user, existingCustomer.franchise_id)
      if (!allowed) {
        return NextResponse.json(
          ApiResponseBuilder.forbiddenError('Access denied to this franchise'),
          { status: 403 }
        )
      }
    }

    // Update customer
    const updateData: any = {
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    // Only include is_active if provided
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active
    }

    if (kyc_status !== undefined) updateData.kyc_status = kyc_status
    if (aadhar_number !== undefined) updateData.aadhar_number = aadhar_number
    if (pan_number !== undefined) updateData.pan_number = pan_number
    if (kyc_document_url !== undefined) updateData.kyc_document_url = kyc_document_url
    if (kyc_notes !== undefined) updateData.kyc_notes = kyc_notes

    const { data: updatedCustomer, error: updateError } = await supabaseServer
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select("id, customer_code, name, phone, whatsapp, email, address, city, state, pincode, franchise_id, status, kyc_status, aadhar_number, pan_number, kyc_document_url, kyc_notes, lead_id, created_at, updated_at")
      .single()

    if (updateError) {
      console.error("[v0] Customer update error:", updateError)
      return NextResponse.json(
        ApiResponseBuilder.serverError(`Failed to update customer: ${updateError.message}`),
        { status: 500 }
      )
    }

    console.log("[v0] Customer updated successfully:", updatedCustomer)

    return NextResponse.json(
      ApiResponseBuilder.success(
        updatedCustomer,
        `Customer "${updatedCustomer.name}" updated successfully`
      )
    )
  } catch (error) {
    console.error("[v0] Customer PATCH error:", error)
    return NextResponse.json(ApiResponseBuilder.serverError(), { status: 500 })
  }
}
