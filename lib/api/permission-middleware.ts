/**
 * Permission Middleware
 * Reusable middleware for checking permissions in API routes
 */

import { hasPermission } from './authorization'
import type { UserPermissions } from '@/lib/types'
import type { AuthenticatedUser } from '@/lib/auth-middleware'

export interface PermissionCheckResult {
  success: boolean
  code?: string
  message?: string
}

/**
 * Check if user has required permission
 * 
 * Usage in API route:
 * const result = await requirePermission(user, 'customers')
 * if (!result.success) return NextResponse.json(result, { status: 403 })
 */
export async function requirePermission(
  user: AuthenticatedUser | null,
  permission: keyof UserPermissions
): Promise<PermissionCheckResult> {
  // Must be authenticated
  if (!user) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    }
  }

  // Must have permission
  if (!hasPermission(user, permission)) {
    return {
      success: false,
      code: 'PERMISSION_DENIED',
      message: `You do not have permission to access ${permission}`,
    }
  }

  return { success: true }
}

/**
 * Check if user has any of multiple permissions
 */
export async function requireAnyPermission(
  user: AuthenticatedUser | null,
  permissions: Array<keyof UserPermissions>
): Promise<PermissionCheckResult> {
  if (!user) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    }
  }

  const hasAny = permissions.some((perm) => user.permissions[perm] === true)
  if (!hasAny) {
    return {
      success: false,
      code: 'PERMISSION_DENIED',
      message: `You do not have permission to access any of: ${permissions.join(', ')}`,
    }
  }

  return { success: true }
}

/**
 * Check if user has all of multiple permissions
 */
export async function requireAllPermissions(
  user: AuthenticatedUser | null,
  permissions: Array<keyof UserPermissions>
): Promise<PermissionCheckResult> {
  if (!user) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    }
  }

  const hasAll = permissions.every((perm) => user.permissions[perm] === true)
  if (!hasAll) {
    return {
      success: false,
      code: 'PERMISSION_DENIED',
      message: `You require all of: ${permissions.join(', ')}`,
    }
  }

  return { success: true }
}

/**
 * Check if user has minimum role
 */
export async function requireMinRole(
  user: AuthenticatedUser | null,
  minRole: 'super_admin' | 'franchise_admin' | 'staff' | 'readonly'
): Promise<PermissionCheckResult> {
  if (!user) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    }
  }

  const roleHierarchy: Record<string, number> = {
    super_admin: 4,
    franchise_admin: 3,
    staff: 2,
    readonly: 1,
  }

  const userLevel = roleHierarchy[user.role] || 0
  const requiredLevel = roleHierarchy[minRole] || 0

  if (userLevel < requiredLevel) {
    return {
      success: false,
      code: 'ROLE_DENIED',
      message: `This action requires ${minRole} role or higher`,
    }
  }

  return { success: true }
}

/**
 * Check if user is super admin
 */
export async function requireSuperAdmin(user: AuthenticatedUser | null): Promise<PermissionCheckResult> {
  if (!user) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    }
  }

  if (user.role !== 'super_admin') {
    return {
      success: false,
      code: 'SUPER_ADMIN_REQUIRED',
      message: 'This action requires super admin role',
    }
  }

  return { success: true }
}

/**
 * Check if user can access franchise
 */
export async function requireFranchiseAccess(
  user: AuthenticatedUser | null,
  franchiseId: string | null
): Promise<PermissionCheckResult> {
  if (!user) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    }
  }

  // Super admin can access any franchise
  if (user.role === 'super_admin') {
    return { success: true }
  }

  // Non-super-admin must have matching franchise
  if (!user.franchise_id || user.franchise_id !== franchiseId) {
    return {
      success: false,
      code: 'FRANCHISE_ACCESS_DENIED',
      message: 'You do not have access to this franchise',
    }
  }

  return { success: true }
}

/**
 * Standard error response formatter
 */
export function permissionErrorResponse(result: PermissionCheckResult) {
  return {
    error: result.message || 'Permission denied',
    code: result.code || 'PERMISSION_DENIED',
  }
}
