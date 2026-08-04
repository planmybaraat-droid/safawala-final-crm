import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"
import { authenticateRequest } from "@/lib/auth-middleware"
import type { UserPermissions } from "@/lib/types"
import { CRM_ADMIN_ROLES, CRM_USER_ROLES } from "@/lib/user-roles"

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

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

function defaultPermissionsForRole(role: string): UserPermissions {
  if (CRM_ADMIN_ROLES.includes(role as (typeof CRM_ADMIN_ROLES)[number])) {
    return {
      dashboard: true, bookings: true, customers: true, inventory: true, packages: true, vendors: true,
      quotes: true, invoices: true, invoice_payment_access: true, laundry: true, expenses: true,
      deliveries: true, productArchive: true, payroll: true, attendance: true, reports: true,
      financials: true, franchises: role === "super_admin", staff: true, integrations: role === "super_admin", settings: true,
    }
  }
  if (role === "readonly") {
    return {
      dashboard: true, bookings: false, customers: true, inventory: false, packages: false, vendors: false,
      quotes: false, invoices: false, invoice_payment_access: false, laundry: false, expenses: false,
      deliveries: false, productArchive: false, payroll: false, attendance: true, reports: true,
      financials: false, franchises: false, staff: false, integrations: false, settings: false,
    }
  }
  return {
    dashboard: true, bookings: true, customers: true, inventory: true, packages: false, vendors: false,
    quotes: true, invoices: true, invoice_payment_access: true, laundry: true, expenses: false,
    deliveries: true, productArchive: false, payroll: false, attendance: true, reports: false,
    financials: false, franchises: false, staff: false, integrations: false, settings: false,
  }
}

function sanitizePermissions(input: any, role: string): UserPermissions {
  const base = defaultPermissionsForRole(role)
  const out: any = { ...base }
  if (input && typeof input === "object") {
    for (const key of Object.keys(base) as (keyof UserPermissions)[]) {
      const value = input[key]
      if (typeof value === "boolean") out[key] = value
      else if (value !== undefined && value !== null) out[key] = Boolean(value)
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

// POST /api/staff/update  Body: { id, name?, email?, password?, role?, franchise_id?, permissions?, is_active? }
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'staff' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const { user } = auth

    const body = await request.json()
    const { id, name, email, password, role, franchise_id, permissions, is_active, department, base_salary } = body
    if (!id) return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 })
    const normalizedRole = role !== undefined ? normalizeRole(role) : undefined

    if (role !== undefined && !normalizedRole) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (!user!.is_super_admin && normalizedRole === 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Franchise admins cannot modify super admins' }, { status: 403 })
    }

    const supabase = createClient()
    const { data: existingTarget, error: targetError } = await supabase
      .from('users')
      .select('id, role, franchise_id')
      .eq('id', id)
      .single()

    if (targetError || !existingTarget) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    if (!user!.is_super_admin && existingTarget.role === 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Cannot modify super admins' }, { status: 403 })
    }
    if (!user!.is_super_admin && existingTarget.franchise_id !== user!.franchise_id) {
      return NextResponse.json({ error: 'Unauthorized: Can only modify staff in your own franchise' }, { status: 403 })
    }
    if (!user!.is_super_admin && franchise_id && franchise_id !== user!.franchise_id) {
      return NextResponse.json({ error: 'Unauthorized: Can only modify staff in your own franchise' }, { status: 403 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (normalizedRole !== undefined) updateData.role = normalizedRole
    if (franchise_id !== undefined) updateData.franchise_id = franchise_id
    if (department !== undefined) updateData.department = department
    if (permissions !== undefined) updateData.permissions = sanitizePermissions(permissions, normalizedRole || existingTarget.role || 'staff')
    if (is_active !== undefined) updateData.is_active = is_active
    if (base_salary !== undefined) {
      const parsedSalary = parseOptionalNumber(base_salary)
      if (parsedSalary === undefined && base_salary !== "" && base_salary !== null) {
        return NextResponse.json({ error: 'Invalid salary amount' }, { status: 400 })
      }
      updateData.salary = parsedSalary ?? null
    }

    if (password && password.length > 0) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
      }
      updateData.password_hash = await hashPassword(password)
    }

    if (email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single()
      if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(SAFE_STAFF_SELECT)
      .single()

    if (error) {
      console.error('[Staff Update Fallback] Update error:', error)
      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Staff member updated successfully', user: data }, { headers: { 'x-route': 'fallback-update' } })
  } catch (error) {
    console.error('[Staff Update Fallback] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
