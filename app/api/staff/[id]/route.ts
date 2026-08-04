import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import type { UserPermissions } from "@/lib/types"
import bcrypt from "bcryptjs"
import { CRM_ADMIN_ROLES, CRM_USER_ROLES } from "@/lib/user-roles"

// Ensure dynamic rendering for Vercel edge caching behavior
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

function defaultPermissionsForRole(role: string): UserPermissions {
  const all: UserPermissions = {
    dashboard: true, bookings: true, customers: true, inventory: true, packages: true, vendors: true,
    quotes: true, invoices: true, invoice_payment_access: true, laundry: true, expenses: true,
    deliveries: true, productArchive: true, payroll: true, attendance: true, reports: true,
    financials: true, franchises: true, staff: true, integrations: true, settings: true,
  }
  const staff: UserPermissions = {
    dashboard: true, bookings: true, customers: true, inventory: true, packages: false, vendors: false,
    quotes: true, invoices: true, invoice_payment_access: true, laundry: true, expenses: false,
    deliveries: true, productArchive: false, payroll: false, attendance: true, reports: false,
    financials: false, franchises: false, staff: false, integrations: false, settings: false,
  }
  const readonly: UserPermissions = {
    dashboard: true, bookings: false, customers: true, inventory: false, packages: false, vendors: false,
    quotes: false, invoices: false, invoice_payment_access: false, laundry: false, expenses: false,
    deliveries: false, productArchive: false, payroll: false, attendance: true, reports: true,
    financials: false, franchises: false, staff: false, integrations: false, settings: false,
  }
  if (CRM_ADMIN_ROLES.includes(role as (typeof CRM_ADMIN_ROLES)[number])) return all
  if (role === 'readonly') return readonly
  return staff
}

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
 * GET /api/staff/[id]
 * Fetch a specific staff member by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request, {
      minRole: 'franchise_admin',
      requirePermission: 'staff'
    })

    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { user } = auth
    const id = params.id
    
    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }
    
    const { data, error } = await supabaseServer
      .from("users")
      .select(SAFE_STAFF_SELECT)
      .eq("id", id)
      .single()
    
    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 })
    }
    
    if (!user!.is_super_admin && data?.franchise_id !== user!.franchise_id) {
      return NextResponse.json({ error: "Unauthorized: Can only access staff in your own franchise" }, { status: 403 })
    }
    
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error("Error in staff GET[id] route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/staff/[id]
 * Update a specific staff member
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 SECURITY: Authenticate user with franchise_admin role + staff permission
    const auth = await authenticateRequest(request, {
      minRole: 'franchise_admin',
      requirePermission: 'staff'
    })
    
    if (!auth.authorized) {
      console.error("[Staff API] Unauthorized")
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    
    const { user } = auth
    // user is guaranteed to exist here since auth.authorized is true
    
    const id = params.id
    
    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }
    
    const body = await request.json()
    const { name, email, password, role, franchise_id, permissions, is_active, department, base_salary } = body
    const normalizedRole = role !== undefined ? normalizeRole(role) : undefined
    
    // 🔒 RBAC: Franchise admins cannot set role to super_admin
    if (role !== undefined && !normalizedRole) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (user!.role !== 'super_admin' && normalizedRole === 'super_admin') {
      return NextResponse.json(
        { error: "Unauthorized: Franchise admins cannot create or modify super admin accounts" }, 
        { status: 403 }
      )
    }

    const { data: existingUser, error: existingError } = await supabaseServer
      .from("users")
      .select("id, role, franchise_id")
      .eq("id", id)
      .single()

    if (existingError || !existingUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    if (user!.role !== 'super_admin' && existingUser.role === 'super_admin') {
      return NextResponse.json(
        { error: "Unauthorized: Cannot modify super admin accounts" },
        { status: 403 }
      )
    }

    if (user!.role !== 'super_admin' && existingUser.franchise_id !== user!.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized: Can only modify staff in your own franchise" },
        { status: 403 }
      )
    }

    if (user!.role !== 'super_admin' && franchise_id && franchise_id !== user!.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized: Can only modify staff in your own franchise" }, 
        { status: 403 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (normalizedRole !== undefined) updateData.role = normalizedRole
    if (franchise_id !== undefined) updateData.franchise_id = franchise_id
    if (department !== undefined) updateData.department = department
    if (permissions !== undefined) {
      const roleForPerms = normalizedRole || existingUser.role || 'staff'
      updateData.permissions = sanitizePermissions(permissions, roleForPerms)
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (base_salary !== undefined) {
      const parsedSalary = parseOptionalNumber(base_salary)
      if (parsedSalary === undefined && base_salary !== "" && base_salary !== null) {
        return NextResponse.json({ error: "Invalid salary amount" }, { status: 400 })
      }
      updateData.salary = parsedSalary ?? null
    }
    
    // Hash password if provided (with validation)
    if (password && password.length > 0) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long" }, 
          { status: 400 }
        )
      }
      updateData.password_hash = await hashPassword(password)
    }
    
    // Check if email is unique if it's being changed
    if (email) {
      const { data: existingUser } = await supabaseServer
        .from("users")
        .select("id")
        .eq("email", email)
        .neq("id", id)
        .single()
      
      if (existingUser) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 })
      }
    }
    
    // Update user
    const { data, error } = await supabaseServer
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select(SAFE_STAFF_SELECT)
      .single()
    
    if (error) {
      console.error("Error updating staff member:", error)
      return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: "Staff member updated successfully", 
      user: data 
    })
  } catch (error) {
    console.error("Error in staff PATCH[id] route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/staff/[id]
 * Delete a specific staff member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 SECURITY: Authenticate user with franchise_admin role + staff permission
    const auth = await authenticateRequest(request, {
      minRole: 'franchise_admin',
      requirePermission: 'staff'
    })
    
    if (!auth.authorized) {
      console.error("[Staff API] Unauthorized")
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    
    const { user } = auth
    // user is guaranteed to exist here since auth.authorized is true
    
    const id = params.id
    
    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }
    
    // 🔒 PREVENT SELF-DELETION
    if (id === user!.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account. Please ask another admin to remove your account." }, 
        { status: 403 }
      )
    }
    
    // Check if user exists and get their details
    const { data: existingUser, error: fetchError } = await supabaseServer
      .from("users")
      .select("id, franchise_id, role, is_active")
      .eq("id", id)
      .single()
    
    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }
    
    // 🔒 PREVENT DELETING LAST ACTIVE ADMIN IN FRANCHISE
    if (CRM_ADMIN_ROLES.includes(existingUser.role as (typeof CRM_ADMIN_ROLES)[number]) && existingUser.role !== 'super_admin' && existingUser.is_active) {
      const { data: adminCount } = await supabaseServer
        .from("users")
        .select("id")
        .eq("franchise_id", existingUser.franchise_id)
        .in("role", ["franchise_admin", "franchise_owner", "manager"])
        .eq("is_active", true)
      
      if (adminCount && adminCount.length <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last active admin. Assign another admin first." }, 
          { status: 403 }
        )
      }
    }
    
    // 🔒 FRANCHISE ISOLATION: Non-super-admins can only delete staff in their franchise
    if (user!.role !== 'super_admin' && existingUser.franchise_id !== user!.franchise_id) {
      return NextResponse.json(
        { error: "Unauthorized: Can only delete staff in your own franchise" }, 
        { status: 403 }
      )
    }

    if (user!.role !== 'super_admin' && existingUser.role === 'super_admin') {
      return NextResponse.json(
        { error: "Unauthorized: Cannot delete super admin accounts" },
        { status: 403 }
      )
    }
    
    // Delete user
    const { error } = await supabaseServer
      .from("users")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting staff member:", error)
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "This staff member has existing bookings, tasks, or other records linked to their account and can't be permanently deleted. Deactivate them instead to preserve that history, or reassign their records first." },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message || "Failed to delete staff member" }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: "Staff member deleted successfully" 
    })
  } catch (error) {
    console.error("Error in staff DELETE[id] route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
