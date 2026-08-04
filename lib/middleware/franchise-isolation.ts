import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

/**
 * Franchise Isolation Middleware
 * Ensures data is filtered by franchise_id for all non-super-admin users
 */

export interface FranchiseContext {
  userId: string
  userRole: "super_admin" | "franchise_admin" | "staff" | "accountant"
  franchiseId: string | null
  canAccessAllFranchises: boolean
}

/**
 * Get the current user's franchise context
 * Super Admin: Can see all franchises but has their own HQ franchise for operations
 * Franchise Admin: Can only see their own franchise
 */
export async function getFranchiseContext(): Promise<FranchiseContext | null> {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error("[FranchiseContext] Auth error:", authError)
    return null
  }

  // Get user details with role and franchise
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, role, franchise_id")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    console.error("[FranchiseContext] User fetch error:", userError)
    return null
  }

  const isSuperAdmin = userData.role === "super_admin"

  return {
    userId: userData.id,
    userRole: userData.role as any,
    franchiseId: userData.franchise_id,
    canAccessAllFranchises: isSuperAdmin,
  }
}

/**
 * Apply franchise filter to a Supabase query
 * Super Admin: No filter (sees all data)
 * Others: Filter by their franchise_id
 */
export function applyFranchiseFilter<T>(
  query: any,
  context: FranchiseContext,
  tableName?: string
): any {
  // Super admin sees everything
  if (context.canAccessAllFranchises) {
    console.log(`[FranchiseFilter] Super admin - no filter applied`)
    return query
  }

  // Must have franchise_id
  if (!context.franchiseId) {
    console.error(`[FranchiseFilter] User has no franchise_id!`)
    throw new Error("User not assigned to any franchise")
  }

  // Apply franchise filter
  console.log(`[FranchiseFilter] Filtering by franchise_id: ${context.franchiseId}`)
  return query.eq("franchise_id", context.franchiseId)
}

/**
 * Get franchise_id for creating new records
 * Super Admin: Uses their HQ franchise_id (for personal operations)
 * Others: Uses their assigned franchise_id
 */
export function getFranchiseIdForCreate(context: FranchiseContext): string {
  if (!context.franchiseId) {
    throw new Error("User not assigned to any franchise")
  }
  
  return context.franchiseId
}

/**
 * Validate franchise access for a specific record
 * Super Admin: Can access any franchise
 * Others: Can only access their own franchise
 */
export function canAccessFranchise(
  context: FranchiseContext,
  targetFranchiseId: string
): boolean {
  // Super admin can access all franchises
  if (context.canAccessAllFranchises) {
    return true
  }

  // Others can only access their own franchise
  return context.franchiseId === targetFranchiseId
}

/**
 * Get list of franchise IDs the user can access
 * Super Admin: Returns null (meaning all franchises)
 * Others: Returns array with their franchise_id
 */
export async function getAccessibleFranchiseIds(
  context: FranchiseContext
): Promise<string[] | null> {
  // Super admin can access all franchises
  if (context.canAccessAllFranchises) {
    return null // null means "all franchises"
  }

  // Others can only access their own franchise
  if (!context.franchiseId) {
    return []
  }

  return [context.franchiseId]
}

/**
 * Middleware to protect API routes with franchise isolation
 */
export async function withFranchiseIsolation<T>(
  handler: (context: FranchiseContext) => Promise<T>
): Promise<T> {
  const context = await getFranchiseContext()
  
  if (!context) {
    throw new Error("Unauthorized: Invalid user session")
  }

  return handler(context)
}

/**
 * Get franchise info for the current user
 */
export async function getCurrentFranchiseInfo() {
  const context = await getFranchiseContext()
  
  if (!context || !context.franchiseId) {
    return null
  }

  const supabase = await createClient()
  
  const { data: franchise } = await supabase
    .from("franchises")
    .select("*")
    .eq("id", context.franchiseId)
    .single()

  return franchise
}
