import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { UserPermissions } from "@/lib/types"
import bcrypt from "bcryptjs"
import { authenticateRequest } from "@/lib/auth-middleware"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { CRM_ADMIN_ROLES, CRM_USER_ROLES } from "@/lib/user-roles"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SAFE_STAFF_SELECT = `
  id,
  name,
  email,
  role,
  department,
  franchise_id,
  is_active,
  base_salary:salary,
  permissions,
  created_at,
  updated_at,
  franchise:franchises(name, code)
`

const ALLOWED_STAFF_ROLES = new Set<string>(CRM_USER_ROLES)

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Build default permissions by role
 */
function defaultPermissionsForRole(role: string): UserPermissions {
  const all: UserPermissions = {
    dashboard: true,
    bookings: true,
    customers: true,
    inventory: true,
    packages: true,
    vendors: true,
    quotes: true,
    invoices: true,
    invoice_payment_access: true,
    laundry: true,
    expenses: true,
    deliveries: true,
    productArchive: true,
    payroll: true,
    attendance: true,
    reports: true,
    financials: true,
    franchises: true,
    staff: true,
    integrations: true,
    settings: true,
  }
  const staff: UserPermissions = {
    dashboard: true,
    bookings: true,
    customers: true,
    inventory: true,
    packages: false,
    vendors: false,
    quotes: true,
    invoices: true,
    invoice_payment_access: true,
    laundry: true,
    expenses: false,
    deliveries: true,
    productArchive: false,
    payroll: false,
    attendance: true,
    reports: false,
    financials: false,
    franchises: false,
    staff: false,
    integrations: false,
    settings: false,
  }
  const readonly: UserPermissions = {
    dashboard: true,
    bookings: false,
    customers: true,
    inventory: false,
    packages: false,
    vendors: false,
    quotes: false,
    invoices: false,
    invoice_payment_access: false,
    laundry: false,
    expenses: false,
    deliveries: false,
    productArchive: false,
    payroll: false,
    attendance: true,
    reports: true,
    financials: false,
    franchises: false,
    staff: false,
    integrations: false,
    settings: false,
  }
  if (CRM_ADMIN_ROLES.includes(role as (typeof CRM_ADMIN_ROLES)[number])) return all
  if (role === 'readonly') return readonly
  return staff
}

/**
 * Sanitize incoming permissions against the known shape and coerce to booleans
 */
function sanitizePermissions(input: any, role: string): UserPermissions {
  const base = defaultPermissionsForRole(role)
  const out: any = { ...base }
  if (input && typeof input === 'object') {
    for (const key of Object.keys(base) as (keyof UserPermissions)[]) {
      const v = (input as any)[key]
      if (typeof v === 'boolean') out[key] = v
      else if (v !== undefined && v !== null) out[key] = Boolean(v)
    }
  }
  return out as UserPermissions
}

function normalizeRole(role: unknown): string | null {
  if (typeof role !== "string") return null
  const normalized = role.trim()
  return ALLOWED_STAFF_ROLES.has(normalized) ? normalized : null
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * GET /api/staff
 * Fetch all staff members with optional filtering (franchise-isolated)
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user and get franchise context
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const { user } = auth
    
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")
    const search = searchParams.get("search")
    
    const supabase = createClient()
    
    // Start building the query
    let query = supabase
      .from("users")
      .select(SAFE_STAFF_SELECT)
      .order("created_at", { ascending: false })
    
    // 🔒 FRANCHISE ISOLATION: Super admin sees all, others see only their franchise
    if (!user!.is_super_admin && user!.franchise_id) {
      query = query.eq("franchise_id", user!.franchise_id)
    }
    
    // Apply filters if they exist
    if (role && role !== "all") {
      query = query.eq("role", role)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching staff:", error)
      return NextResponse.json({ error: "Failed to fetch staff members" }, { status: 500 })
    }
    
    return NextResponse.json({ staff: data || [] })
  } catch (error) {
    console.error("Error in staff GET route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/staff
 * Create a new staff member (franchise-isolated)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const { user } = auth

  const body = await request.json()
    const { name, email, password, role, permissions, is_active = true, department, base_salary } = body
    const normalizedRole = normalizeRole(role)
    
    // 🔒 RBAC: Franchise admins cannot create super admins
    if (!user!.is_super_admin && normalizedRole === 'super_admin') {
      return NextResponse.json(
        { error: "Unauthorized: Franchise admins cannot create super admin accounts" }, 
        { status: 403 }
      )
    }
    
    // 🔒 FRANCHISE ISOLATION: Auto-assign franchise_id from session (super admin can override)
    const staffFranchiseId = user!.is_super_admin && body.franchise_id 
      ? body.franchise_id 
      : user!.franchise_id
    
    // 🔒 RBAC: Franchise admins can only create staff in their own franchise
    if (!user!.is_super_admin && body.franchise_id && body.franchise_id !== user!.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized: Can only create staff in your own franchise" }, 
        { status: 403 }
      )
    }
    
    // Basic validation
    if (!name || !email || !password || !normalizedRole) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single()
    
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }
    
    const safePermissions = sanitizePermissions(permissions, normalizedRole)
    const password_hash = await hashPassword(password)
    const parsedSalary = parseOptionalNumber(base_salary)

    // Create user in Supabase Auth first so DB and Auth share one stable id.
    let authUserId: string | null = null
    try {
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          role: normalizedRole,
          franchise_id: staffFranchiseId,
        },
        user_metadata: {
          name,
        },
      })

      if (authError || !authData.user?.id) {
        const message = authError?.message || "Failed to create auth user"
        const isDuplicate = /already exists/i.test(message)
        return NextResponse.json({ error: isDuplicate ? "Email already exists" : message }, { status: isDuplicate ? 409 : 500 })
      }
      authUserId = authData.user.id

      const insertData: any = {
        id: authUserId,
        name,
        email,
        password_hash,
        role: normalizedRole,
        franchise_id: staffFranchiseId,
        permissions: safePermissions,
        is_active,
      }
      if (department) insertData.department = department
      if (parsedSalary !== undefined) insertData.salary = parsedSalary

      const { data, error } = await supabase
        .from("users")
        .insert([insertData])
        .select(SAFE_STAFF_SELECT)
        .single()

      if (error) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.error("Error creating staff member:", error)
        return NextResponse.json({ error: "Failed to create staff member", details: error.message }, { status: 500 })
      }

      return NextResponse.json({
        message: "Staff member created successfully",
        user: data,
      }, { status: 201 })
    } catch (syncErr) {
      console.warn(`[Staff API] Failed to create synced staff account:`, syncErr)
      return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in staff POST route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/staff
 * Update multiple staff members (batch update)
 */
export async function PUT(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user and get franchise context
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const { user } = auth

    const body = await request.json()
    const { users } = body
    
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 400 })
    }
    
    const supabase = createClient()
    const results = []
    
    // Process each user update
    for (const userUpdate of users) {
      const { id, ...updateData } = userUpdate
      
      if (!id) {
        results.push({ success: false, error: "Missing user ID", user })
        continue
      }
      
      const { data: existingUser, error: existingError } = await supabase
        .from("users")
        .select("id, role, franchise_id")
        .eq("id", id)
        .single()

      if (existingError || !existingUser) {
        results.push({ success: false, error: "Staff member not found", id })
        continue
      }

      if (!user!.is_super_admin && existingUser.role === "super_admin") {
        results.push({ success: false, error: "Unauthorized to modify super admin account", id })
        continue
      }

      if (!user!.is_super_admin && existingUser.franchise_id !== user!.franchise_id) {
        results.push({ success: false, error: "Unauthorized: different franchise", id })
        continue
      }

      // Remove password if empty
      if (updateData.password === '') {
        delete updateData.password
      }
      
      // Hash password if provided
      if (updateData.password) {
        if (updateData.password.length < 8) {
          results.push({ success: false, error: "Password must be at least 8 characters", id })
          continue
        }
        updateData.password_hash = await hashPassword(updateData.password)
        delete updateData.password
      }
      
      const effectiveUpdate: Record<string, any> = {}

      if (typeof updateData.name === "string") effectiveUpdate.name = updateData.name
      if (typeof updateData.email === "string") effectiveUpdate.email = updateData.email
      if (typeof updateData.department === "string") effectiveUpdate.department = updateData.department
      if (typeof updateData.is_active === "boolean") effectiveUpdate.is_active = updateData.is_active

      if (updateData.base_salary !== undefined) {
        const parsedSalary = parseOptionalNumber(updateData.base_salary)
        if (parsedSalary === undefined && updateData.base_salary !== "" && updateData.base_salary !== null) {
          results.push({ success: false, error: "Invalid salary amount", id })
          continue
        }
        effectiveUpdate.salary = parsedSalary ?? null
      }

      if (updateData.role !== undefined) {
        const normalizedUpdateRole = normalizeRole(updateData.role)
        if (!normalizedUpdateRole) {
          results.push({ success: false, error: "Invalid role", id })
          continue
        }
        if (!user!.is_super_admin && normalizedUpdateRole === "super_admin") {
          results.push({ success: false, error: "Unauthorized to assign role super_admin", id })
          continue
        }
        effectiveUpdate.role = normalizedUpdateRole
      }

      if (updateData.franchise_id !== undefined) {
        if (!user!.is_super_admin && updateData.franchise_id !== user!.franchise_id) {
          results.push({ success: false, error: "Unauthorized: different franchise", id })
          continue
        }
        effectiveUpdate.franchise_id = updateData.franchise_id
      }

      if (Object.prototype.hasOwnProperty.call(updateData, "permissions")) {
        const roleForPermissions = effectiveUpdate.role || existingUser.role || "staff"
        effectiveUpdate.permissions = sanitizePermissions(updateData.permissions, roleForPermissions)
      }

      const { data, error } = await supabase
        .from("users")
        .update(effectiveUpdate)
        .eq("id", id)
        .select(SAFE_STAFF_SELECT)
        .single()
      
      if (error) {
        results.push({ success: false, error: error.message, id })
      } else {
        results.push({ success: true, user: data, id })
      }
    }
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error in staff PUT route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
