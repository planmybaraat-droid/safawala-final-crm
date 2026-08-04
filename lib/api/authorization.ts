/**
 * API Authorization Layer
 * Replaces RLS policies with explicit API-level authorization
 * 
 * This module provides all necessary functions for:
 * - Permission checking
 * - Franchise isolation
 * - Resource access validation
 * - Role-based access control
 */

import type { UserPermissions } from '@/lib/types'
import type { AuthenticatedUser } from '@/lib/auth-middleware'

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: keyof UserPermissions): boolean {
  const hasIt = user.permissions[permission] === true
  console.log(`[Authorization] User ${user.id} permission check - ${permission}: ${hasIt}`)
  return hasIt
}

/**
 * Check if user can access resource based on franchise
 */
export function canAccessResource(
  user: AuthenticatedUser,
  resourceFranchiseId: string | null
): boolean {
  // Super admin can access anything
  if (user.is_super_admin) {
    return true
  }

  // Non-super-admin must have matching franchise
  if (!user.franchise_id) {
    console.warn(`[Authorization] Non-super-admin user ${user.id} has no franchise_id`)
    return false
  }

  const canAccess = user.franchise_id === resourceFranchiseId
  console.log(
    `[Authorization] User ${user.id} franchise check - user franchise: ${user.franchise_id}, resource franchise: ${resourceFranchiseId}, result: ${canAccess}`
  )
  return canAccess
}

/**
 * Check if user can edit another user
 */
export function canEditUser(editor: AuthenticatedUser, targetUserId: string, targetFranchiseId: string | null): boolean {
  // Cannot edit yourself
  if (editor.id === targetUserId) {
    console.log(`[Authorization] User ${editor.id} cannot edit themselves`)
    return false
  }

  // Super admin can edit anyone
  if (editor.is_super_admin) {
    return true
  }

  // Franchise admin can edit own franchise staff
  if (editor.role === 'franchise_admin') {
    const canEdit = editor.franchise_id === targetFranchiseId
    console.log(
      `[Authorization] Franchise admin ${editor.id} edit check - target franchise: ${targetFranchiseId}, result: ${canEdit}`
    )
    return canEdit
  }

  // Staff cannot edit anyone
  console.log(`[Authorization] User ${editor.id} (role: ${editor.role}) cannot edit`)
  return false
}

/**
 * Apply franchise filter to query for non-super-admins
 * 
 * Example usage:
 * let query = supabase.from('customers').select('*')
 * query = applyFranchiseFilter(query, user, 'franchise_id')
 */
export function applyFranchiseFilter<T extends Record<string, any>>(
  query: any,
  user: AuthenticatedUser,
  franchiseColumn: string = 'franchise_id'
): any {
  // Super admin sees everything
  if (user.is_super_admin) {
    console.log(`[Authorization] Super admin - no franchise filter applied`)
    return query
  }

  // Non-super-admin sees only their franchise
  if (user.franchise_id) {
    console.log(`[Authorization] Applying franchise filter: ${franchiseColumn} = ${user.franchise_id}`)
    return query.eq(franchiseColumn, user.franchise_id)
  }

  console.warn(`[Authorization] Non-super-admin ${user.id} has no franchise_id!`)
  return query
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: string): number {
  switch (role) {
    case 'super_admin':
      return 4
    case 'franchise_admin':
      return 3
    case 'staff':
      return 2
    case 'readonly':
      return 1
    default:
      return 0
  }
}

/**
 * Check if user can perform role-based action
 */
export function canPerformRoleAction(editor: AuthenticatedUser, minRequiredRole: string): boolean {
  const editorLevel = getRoleLevel(editor.role)
  const requiredLevel = getRoleLevel(minRequiredRole)

  const canPerform = editorLevel >= requiredLevel
  console.log(
    `[Authorization] Role action check - editor: ${editor.role}(${editorLevel}), required: ${minRequiredRole}(${requiredLevel}), result: ${canPerform}`
  )
  return canPerform
}

/**
 * Validate user can perform specific action on resource
 */
export function authorizeAction(
  user: AuthenticatedUser,
  action: 'read' | 'create' | 'update' | 'delete',
  permission: keyof UserPermissions,
  resourceFranchiseId?: string | null
): { authorized: boolean; reason?: string } {
  // Check permission for this module
  if (!hasPermission(user, permission)) {
    return { authorized: false, reason: `Missing ${permission} permission` }
  }

  // Check franchise access if applicable
  if (resourceFranchiseId !== undefined && !canAccessResource(user, resourceFranchiseId)) {
    return { authorized: false, reason: 'Cannot access resource from different franchise' }
  }

  return { authorized: true }
}

/**
 * Validate bulk operation authorization
 */
export function authorizeBulkAction(
  user: AuthenticatedUser,
  action: 'create' | 'update' | 'delete',
  permission: keyof UserPermissions,
  resources: Array<{ franchise_id?: string | null }>
): { authorized: boolean; invalidIndexes: number[]; reason?: string } {
  // Check base permission
  if (!hasPermission(user, permission)) {
    return { authorized: false, invalidIndexes: [], reason: `Missing ${permission} permission` }
  }

  // Check each resource
  const invalidIndexes: number[] = []
  resources.forEach((resource, index) => {
    if (resource.franchise_id !== undefined && !canAccessResource(user, resource.franchise_id)) {
      invalidIndexes.push(index)
    }
  })

  if (invalidIndexes.length > 0) {
    return {
      authorized: false,
      invalidIndexes,
      reason: `Cannot access ${invalidIndexes.length} resource(s) from different franchise(s)`,
    }
  }

  return { authorized: true, invalidIndexes: [] }
}
