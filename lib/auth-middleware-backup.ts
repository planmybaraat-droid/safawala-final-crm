/**
 * Authentication Middleware
 * 
 * Provides authentication verification for API routes.
 * Can be easily enabled/disabled by setting AUTH_ENABLED environment variable.
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseServer } from './supabase-server-simple';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  franchise_id?: string;
  name?: string;
}

export interface AuthContext {
  user: AuthUser;
  isAuthenticated: boolean;
}

export class AuthMiddleware {
  
  /**
   * Check if authentication is enabled
   */
  static isEnabled(): boolean {
    return process.env.AUTH_ENABLED === 'true';
  }

  /**
   * Verify user session from request headers
   */
  static async verifySession(request: NextRequest): Promise<AuthContext | null> {
    try {
      // If auth is disabled, return a default admin context
      if (!this.isEnabled()) {
        return {
          user: {
            id: 'system',
            email: 'system@safawala.com',
            role: 'super_admin',
            name: 'System User'
          },
          isAuthenticated: true
        };
      }

      // Use Supabase Auth cookies to validate session
      const cookieStore = cookies();
      const auth = createRouteHandlerClient({ cookies: () => cookieStore });

      const { data: { user: authUser }, error: authError } = await auth.auth.getUser();

      if (authError || !authUser) {
        return null;
      }

      // Look up role/franchise from our users table (service role client) using email mapping
      const { data: user, error } = await supabaseServer
        .from('users')
        .select(`
          id,
          email,
          role,
          franchise_id,
          first_name,
          last_name,
          is_active
        `)
        .ilike('email', authUser.email as string)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        console.warn('Authentication failed - profile not found or inactive:', authUser.id);
        return null;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          franchise_id: user.franchise_id,
          name: `${user.first_name} ${user.last_name}`.trim()
        },
        isAuthenticated: true
      };
    } catch (error) {
      console.error('Authentication verification error:', error);
      return null;
    }
  }

  /**
   * Check if user has required role permissions
   */
  static hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'super_admin': 4,
      'franchise_admin': 3,
      'staff': 2,
      'viewer': 1
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Check if user can access records for a specific franchise
   */
  static canAccessFranchise(user: AuthUser, targetFranchiseId: string): boolean {
    // Super admins can access any franchise
    if (user.role === 'super_admin') {
      return true;
    }

    // Other users can only access their own franchise
    return user.franchise_id === targetFranchiseId;
  }

  /**
   * Extract user context for audit logging
   */
  static extractAuditContext(authContext: AuthContext | null, request: NextRequest) {
    return {
      userId: authContext?.user?.id,
      userEmail: authContext?.user?.email,
      ipAddress: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: request.headers.get('X-Session-ID') // Optional session tracking
    };
  }

  /**
   * Create authentication response for unauthorized access
   */
  static createUnauthorizedResponse(message = 'Authentication required') {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      message,
      data: null
    };
  }

  /**
   * Create forbidden response for insufficient permissions
   */
  static createForbiddenResponse(message = 'Insufficient permissions') {
    return {
      success: false,
      error: 'FORBIDDEN', 
      message,
      data: null
    };
  }
}

/**
 * Authentication decorator for API routes
 * Usage: const authResult = await requireAuth(request, 'staff');
 */
export async function requireAuth(
  request: NextRequest, 
  requiredRole?: string
): Promise<{
  success: boolean;
  authContext?: AuthContext;
  response?: any;
}> {
  const authContext = await AuthMiddleware.verifySession(request);
  
  if (!authContext) {
    return {
      success: false,
      response: AuthMiddleware.createUnauthorizedResponse()
    };
  }

  if (requiredRole && !AuthMiddleware.hasPermission(authContext.user.role, requiredRole)) {
    return {
      success: false,
      response: AuthMiddleware.createForbiddenResponse(
        `This action requires ${requiredRole} role or higher`
      )
    };
  }

  return {
    success: true,
    authContext
  };
}

export default AuthMiddleware;