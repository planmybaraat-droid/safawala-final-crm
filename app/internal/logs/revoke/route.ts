import { NextRequest, NextResponse } from 'next/server';
import { logService } from '@/lib/log-service';
import { requireAuth } from '@/lib/auth-middleware';
import { ApiResponseBuilder } from '@/lib/api-response';

/**
 * Revoke signed deep link tokens
 * POST /internal/logs/revoke
 */
export async function POST(request: NextRequest) {
  const requestId = logService.generateRequestId();
  
  try {
    // Require super admin access
    const authResult = await requireAuth(request, 'super_admin');
    if (!authResult.success) {
      await logService.logWarn(requestId, 'Unauthorized access to log token revocation', {
        endpoint: '/internal/logs/revoke',
        httpMethod: 'POST',
        responseStatus: 401,
      });
      return NextResponse.json(authResult.response, { status: 401 });
    }

    const { authContext } = authResult;
    const body = await request.json();
    const { token_id, request_id, reason } = body;

    // Validate input - require either token_id or request_id
    if (!token_id && !request_id) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Either token_id or request_id is required'),
        { status: 400 }
      );
    }

    const identifier = token_id || request_id;
    
    // Revoke the token(s)
    const success = await logService.revokeToken(identifier, authContext!.user.id);

    if (!success) {
      return NextResponse.json(
        ApiResponseBuilder.serverError('Failed to revoke token'),
        { status: 500 }
      );
    }

    await logService.logInfo(requestId, 'Log access token revoked', {
      endpoint: '/internal/logs/revoke',
      httpMethod: 'POST',
      userId: authContext!.user.id,
      userRole: authContext!.user.role,
      franchiseId: authContext!.user.franchise_id,
      responseStatus: 200,
    });

    return NextResponse.json(
      ApiResponseBuilder.success(
        { 
          revoked: true, 
          identifier,
          revoked_by: authContext!.user.id,
          reason 
        }, 
        'Token revoked successfully'
      ),
      { status: 200 }
    );

  } catch (error) {
    await logService.logError(requestId, error as Error, {
      endpoint: '/internal/logs/revoke',
      httpMethod: 'POST',
      responseStatus: 500,
    });

    console.error('Failed to revoke token:', error);
    return NextResponse.json(
      ApiResponseBuilder.serverError('Failed to revoke token'),
      { status: 500 }
    );
  }
}
