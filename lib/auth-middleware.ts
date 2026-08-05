/**
 * UNIFIED AUTHENTICATION SYSTEM v2
 * 
 * Supabase Auth + App-level RBAC + Module Permissions + Franchise Isolation
 * 
 * Role Hierarchy:
 * - super_admin (4): Full access across all franchises
 * - franchise_admin (3): Full access within their franchise
 * - staff (2): Limited access within their franchise based on permissions
 * - readonly (1): Read-only access based on permissions
 * 
 * Usage:
 *   const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'bookings' })
 *   if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode })
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseServer } from './supabase-server-simple';
import type { UserPermissions } from './types';

// Role hierarchy levels
const ROLE_LEVELS = {
  readonly: 1,
  staff: 2,
  warehouse_staff: 2,
  booking_staff: 2,
  qc_staff: 2,
  delivery_staff: 2,
  accounts_staff: 2,
  hr_staff: 2,
  travels_staff: 2,
  stylist: 2,
  franchise_admin: 3,
  super_admin: 4,
} as const;

export type AppRole = keyof typeof ROLE_LEVELS;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  department?: string;
  franchise_id?: string;
  franchise_name?: string;
  franchise_code?: string;
  permissions: UserPermissions;
  is_super_admin: boolean;
}

export interface AuthenticationResult {
  authorized: boolean;
  user?: AuthenticatedUser;
  error?: { error: string; message?: string };
  statusCode?: number;
}

export interface AuthOptions {
  minRole?: AppRole;
  requirePermission?: keyof UserPermissions;
  allowSuperAdminOverride?: boolean; // Super admin bypasses permission checks
}

/** Resolve permissions from the relational RBAC model. A null result means
 * the installation/user has not been migrated yet, so callers may safely use
 * the legacy JSON permissions as a compatibility fallback. */
async function getRelationalPermission(userId: string, code: string): Promise<boolean | null> {
  try {
    // The relational permissions table only knows about a small, partially
    // rolled-out set of codes (warehouse.*, qc.*, delivery.*, users.manage,
    // roles.manage, permissions.manage, settings.manage). Most of the app
    // (inventory, staff, bookings, customers, ...) still runs entirely on
    // the legacy JSON `users.permissions` column and was never added here.
    // If `code` isn't a registered relational permission at all, this
    // system has no opinion — defer to the legacy column instead of
    // treating "not explicitly granted" as "explicitly denied".
    const { data: knownPermission, error: knownError } = await supabaseServer
      .from('permissions')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (knownError) return null
    if (!knownPermission) return null

    const { data: assignments, error: assignmentError } = await supabaseServer
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)

    if (assignmentError || !assignments) return null
    if (assignments.length === 0) return null

    const roleIds = assignments.map((row: any) => row.role_id).filter(Boolean)
    const { data: links, error: linkError } = await supabaseServer
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds)
      .eq('permission_id', knownPermission.id)

    if (linkError || !links) return null
    return links.length > 0
  } catch {
    // During a staged rollout the RBAC tables may not exist yet.
    return null
  }
}

async function withRelationalPermissions(profile: any, userId: string): Promise<UserPermissions> {
  const legacy = profile.permissions as UserPermissions
  try {
    const { data: assignments, error } = await supabaseServer
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
    if (error || !assignments?.length) return legacy
    const roleIds = assignments.map((row: any) => row.role_id).filter(Boolean)
    const { data: links, error: linkError } = await supabaseServer
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds)
    if (linkError || !links?.length) return legacy
    const ids = links.map((row: any) => row.permission_id).filter(Boolean)
    const { data: permissions, error: permissionError } = await supabaseServer
      .from('permissions')
      .select('code')
      .in('id', ids)
    if (permissionError || !permissions) return legacy
    return permissions.reduce((result: UserPermissions, permission: any) => {
      result[permission.code as keyof UserPermissions] = true
      return result
    }, { ...legacy })
  } catch {
    return legacy
  }
}

interface CookieIdentity {
  id: string;
  email: string;
  role?: string;
  department?: string;
  franchise_id?: string;
  session_token?: string;
}

async function getUserFromTrustedCookie(cookieValue?: string): Promise<AuthenticatedUser | null> {
  if (!cookieValue) return null;

  let parsed: CookieIdentity;
  try {
    parsed = JSON.parse(cookieValue);
  } catch (e) {
    console.warn("[Auth Middleware] Failed to parse safawala_user cookie:", e);
    return null;
  }

  if (!parsed?.id || !parsed?.email) {
    return null;
  }

  // The department login bypass is intentionally development-only. It lets a
  // local portal run without a service-role key while production always
  // resolves the identity from Supabase and RLS.
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_LEGACY_DEPT_LOGIN_BYPASS === "true" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const role = (parsed.role || "staff") as AppRole
    const permissions = getDefaultPermissions(role)
    return {
      id: parsed.id,
      email: parsed.email,
      name: `${role === "qc_staff" ? "QC" : role === "warehouse_staff" ? "Warehouse" : "Department"} Staff`,
      role,
      department: parsed.department,
      franchise_id: parsed.franchise_id,
      permissions,
      is_super_admin: role === "super_admin",
    }
  }

  const { data: appUser, error } = await supabaseServer
    .from('users')
    .select(`
      id,
      name,
      email,
      role,
      department,
      franchise_id,
      is_active,
      permissions,
      session_token,
      franchises!left (
        id,
        name,
        code
      )
    `)
    .eq('id', parsed.id)
    .ilike('email', parsed.email)
    .eq('is_active', true)
    .single();

  if (error || !appUser) {
    console.warn("[Auth Middleware] Cookie fallback user lookup failed:", error?.message);
    return null;
  }

  const franchise = Array.isArray(appUser.franchises) ? appUser.franchises[0] : appUser.franchises;

  return {
    id: appUser.id,
    email: appUser.email,
    name: appUser.name,
    role: appUser.role as AppRole,
    department: (appUser as any).department || undefined,
    franchise_id: appUser.franchise_id,
    franchise_name: franchise?.name,
    franchise_code: franchise?.code,
    permissions: await withRelationalPermissions(
      { ...appUser, permissions: ensurePermissions(appUser.permissions, appUser.role as AppRole) },
      appUser.id,
    ),
    is_super_admin: appUser.role === 'super_admin',
  };
}

/**
 * Main authentication function - validates Supabase Auth session + app permissions
 */
export async function authenticateRequest(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthenticationResult> {
  const {
    minRole = 'readonly',
    requirePermission,
    allowSuperAdminOverride = true,
  } = options;

  try {
    // 1. Validate Supabase Auth session
    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();

    let trustedCookieUser: AuthenticatedUser | null = null;
    if (authError || !authUser?.email) {
      trustedCookieUser = await getUserFromTrustedCookie(cookieStore.get("safawala_user")?.value);
      if (trustedCookieUser) {
        console.log("[Auth Middleware] Authenticated via trusted safawala_user cookie fallback:", trustedCookieUser.email);
      }
    }

    if (!authUser?.email && !trustedCookieUser) {
      return {
        authorized: false,
        error: { error: 'Unauthorized', message: 'Authentication required' },
        statusCode: 401,
      };
    }

    let user: AuthenticatedUser;
    if (trustedCookieUser) {
      user = trustedCookieUser;
    } else {
      // 2. Fetch app user profile with permissions (case-insensitive email match)
      const { data: appUser, error: profileError } = await supabaseServer
        .from('users')
        .select(`
          id,
          name,
          email,
          role,
          department,
          franchise_id,
          is_active,
          permissions,
          franchises!left (
            id,
            name,
            code
          )
        `)
        .ilike('email', authUser!.email)
        .eq('is_active', true)
        .single();

      if (profileError || !appUser) {
        return {
          authorized: false,
          error: { error: 'Forbidden', message: 'User profile not found or inactive: ' + profileError?.message },
          statusCode: 403,
        };
      }

      const franchise = Array.isArray(appUser.franchises) ? appUser.franchises[0] : appUser.franchises;

      user = {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        role: appUser.role as AppRole,
        department: (appUser as any).department || undefined,
        franchise_id: appUser.franchise_id,
        franchise_name: franchise?.name,
        franchise_code: franchise?.code,
        permissions: await withRelationalPermissions(
          { ...appUser, permissions: ensurePermissions(appUser.permissions, appUser.role as AppRole) },
          appUser.id,
        ),
        is_super_admin: appUser.role === 'super_admin',
      };
    }

    // 3. Check role hierarchy
    // Department-specific roles mapped to appropriate levels
    const userLevel = ROLE_LEVELS[user.role] ??
      ((user.role as any) === 'manager' || (user.role as any) === 'franchise_owner' ? 3 :
       (user.role as any)?.endsWith('_staff') || (user.role as any) === 'stylist' ? 2 : 0);
    const requiredLevel = ROLE_LEVELS[minRole] || 0;

    if (userLevel < requiredLevel) {
      return {
        authorized: false,
        error: {
          error: 'Forbidden',
          message: `This action requires ${minRole} role or higher`,
        },
        statusCode: 403,
      };
    }

    // 4. Check module permission if required
    if (requirePermission) {
      const relationalPermission = await getRelationalPermission(user.id, requirePermission);
      // Once a user has a relational role assignment, it is the source of truth.
      // Legacy JSON permissions are only used for users not yet migrated.
      const hasPermission = relationalPermission === null
        ? user.permissions[requirePermission]
        : relationalPermission;
      const isSuperAdmin = user.is_super_admin && allowSuperAdminOverride;

      if (!hasPermission && !isSuperAdmin) {
        return {
          authorized: false,
          error: {
            error: 'Forbidden',
            message: `You do not have permission to access ${requirePermission}`,
          },
          statusCode: 403,
        };
      }
    }

    return {
      authorized: true,
      user,
    };
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return {
      authorized: false,
      error: { error: 'Internal Server Error', message: 'Authentication failed' },
      statusCode: 500,
    };
  }
}

/**
 * Ensure user has valid permissions object with defaults based on role
 */
function ensurePermissions(permissions: any, role: AppRole): UserPermissions {
  // If user has explicit permissions in DB, use those (don't override with defaults)
  if (permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0) {
    // Just ensure all required keys exist by filling in missing ones with false
    const allKeys: Array<keyof UserPermissions> = [
      'dashboard', 'bookings', 'customers', 'inventory', 'packages', 'vendors',
      'quotes', 'invoices', 'laundry', 'expenses', 'deliveries', 'productArchive',
      'payroll', 'attendance', 'reports', 'financials', 'franchises', 'staff',
      'integrations', 'settings'
    ];
    
    const result = { ...permissions } as UserPermissions;
    for (const key of allKeys) {
      if (!(key in result)) {
        result[key] = false;
      }
    }
    return result;
  }
  
  // Only use defaults if permissions is null/empty
  return getDefaultPermissions(role);
}

/**
 * Get default permissions based on role
 */
function getDefaultPermissions(role: AppRole): UserPermissions {
  switch (role) {
    case 'warehouse_staff':
      return {
        dashboard: false,
        bookings: false,
        customers: false,
        inventory: true,
        packages: false,
        vendors: false,
        quotes: false,
        invoices: false,
        laundry: true,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: false,
        reports: false,
        financials: false,
        franchises: false,
        staff: false,
        integrations: false,
        settings: false,
        invoice_payment_access: false,
        "warehouse.view": true,
        "warehouse.update": true,
      };
    case 'qc_staff':
      return {
        dashboard: false, bookings: false, customers: false, inventory: false,
        packages: false, vendors: false, quotes: false, invoices: false,
        laundry: false, expenses: false, deliveries: false, productArchive: false,
        payroll: false, attendance: false, reports: false, financials: false,
        franchises: false, staff: false, integrations: false, settings: false,
        invoice_payment_access: false,
        "qc.view": true,
        "qc.update": true,
      };
    case 'delivery_staff':
      return {
        dashboard: false, bookings: false, customers: false, inventory: false,
        packages: false, vendors: false, quotes: false, invoices: false,
        laundry: false, expenses: false, deliveries: true, productArchive: false,
        payroll: false, attendance: false, reports: false, financials: false,
        franchises: false, staff: false, integrations: false, settings: false,
        invoice_payment_access: false,
        "delivery.view": true,
        "delivery.update": true,
      };
    case 'super_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
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
        invoice_payment_access: true,
        "qc.view": true,
        "qc.update": true,
        "delivery.view": true,
        "delivery.update": true,
      };
    
    case 'franchise_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: false, // Only super_admin
        staff: true,
        integrations: false, // Only super_admin
        settings: true,
        invoice_payment_access: true,
        "qc.view": true,
        "qc.update": true,
        "delivery.view": true,
        "delivery.update": true,
      };
    
    case 'staff':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: false,
        vendors: false,
        quotes: true,
        invoices: true,
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
        invoice_payment_access: true,
      };
    
    case 'readonly':
      return {
        dashboard: true,
        bookings: false,
        customers: true,
        inventory: false,
        packages: false,
        vendors: false,
        quotes: false,
        invoices: false,
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
        invoice_payment_access: false,
      };
    
    default:
      // Minimal permissions for unknown roles
      return {
        dashboard: true,
        bookings: false,
        customers: false,
        inventory: false,
        packages: false,
        vendors: false,
        quotes: false,
        invoices: false,
        laundry: false,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: false,
        reports: false,
        financials: false,
        franchises: false,
        staff: false,
        integrations: false,
        settings: false,
        invoice_payment_access: false,
      };
  }
}

/**
 * Check if user can access a specific franchise's data
 */
export function canAccessFranchise(user: AuthenticatedUser, targetFranchiseId?: string): boolean {
  if (user.is_super_admin) return true;
  if (!targetFranchiseId) return true; // No franchise restriction
  return user.franchise_id === targetFranchiseId;
}

/**
 * Legacy compatibility - maps to new system
 */
export async function requireAuth(
  request: NextRequest,
  minRole: AppRole = 'readonly',
  requirePermission?: keyof UserPermissions,
): Promise<{
  success: boolean;
  authContext?: { user: AuthenticatedUser; isAuthenticated: boolean };
  response?: any;
}> {
  const result = await authenticateRequest(request, { minRole, requirePermission });

  if (!result.authorized) {
    return {
      success: false,
      response: result.error,
    };
  }

  return {
    success: true,
    authContext: {
      user: result.user!,
      isAuthenticated: true,
    },
  };
}

// Export legacy AuthMiddleware for backward compatibility
export const AuthMiddleware = {
  canAccessFranchise,
  extractAuditContext: (authContext: any, request: NextRequest) => ({
    userId: authContext?.user?.id,
    userEmail: authContext?.user?.email,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    sessionId: request.headers.get('X-Session-ID'),
  }),
};
