import { NextRequest, NextResponse } from 'next/server';
import { logService } from '@/lib/log-service';
import { requireAuth } from '@/lib/auth-middleware';
import { ApiResponseBuilder } from '@/lib/api-response';

/**
 * Generate signed deep link for log access
 * POST /internal/logs/link
 */
export async function POST(request: NextRequest) {
  const requestId = logService.generateRequestId();
  
  try {
    // Require super admin access
    const authResult = await requireAuth(request, 'super_admin');
    if (!authResult.success) {
      await logService.logWarn(requestId, 'Unauthorized access to log link generation', {
        endpoint: '/internal/logs/link',
        httpMethod: 'POST',
        responseStatus: 401,
      });
      return NextResponse.json(authResult.response, { status: 401 });
    }

    const { authContext } = authResult;
    const body = await request.json();
    const { 
      request_id, 
      expires_in_seconds = 3600, 
      scope = 'redacted',
      reason 
    } = body;

    // Validate input
    if (!request_id) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('request_id is required', 'request_id'),
        { status: 400 }
      );
    }

    if (scope && !['full', 'redacted'].includes(scope)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('scope must be "full" or "redacted"', 'scope'),
        { status: 400 }
      );
    }

    // Only allow 'full' scope for super admins
    if (scope === 'full' && authContext!.user.role !== 'super_admin') {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('Full scope access requires super admin role'),
        { status: 403 }
      );
    }

    // Verify the log entry exists
    const logResult = await logService.getLogs({ 
      requestId: request_id, 
      pageSize: 1,
      scope: 'full' // Admin can check existence
    });

    if (!logResult.data || logResult.data.length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.notFoundError('Log entry'),
        { status: 404 }
      );
    }

    // Generate signed token
    const tokenResult = await logService.generateSignedToken(
      request_id,
      authContext!.user.id,
      authContext!.user.email,
      expires_in_seconds,
      scope,
      reason
    );

    await logService.logInfo(requestId, 'Signed log link generated', {
      endpoint: '/internal/logs/link',
      httpMethod: 'POST',
      userId: authContext!.user.id,
      userRole: authContext!.user.role,
      franchiseId: authContext!.user.franchise_id,
      responseStatus: 200,
    });

    return NextResponse.json(
      ApiResponseBuilder.success({
        url: tokenResult.url,
        expires_at: tokenResult.expiresAt,
        scope,
        request_id,
      }, 'Signed link generated successfully'),
      { status: 200 }
    );

  } catch (error) {
    await logService.logError(requestId, error as Error, {
      endpoint: '/internal/logs/link',
      httpMethod: 'POST',
      responseStatus: 500,
    });

    console.error('Failed to generate signed link:', error);
    return NextResponse.json(
      ApiResponseBuilder.serverError('Failed to generate signed link'),
      { status: 500 }
    );
  }
}
