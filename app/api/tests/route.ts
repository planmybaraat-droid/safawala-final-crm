import { NextRequest, NextResponse } from 'next/server';
import { getSuites, runSuites } from '@/lib/testing/runner';
import { TestContext } from '@/lib/testing/types';
import { authenticateRequest } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

function isLocalDevRequest(req: NextRequest) {
  const host = req.nextUrl.hostname;
  return process.env.NODE_ENV !== 'production' && (
    host === 'localhost' || host === '127.0.0.1' || host === '::1'
  );
}

export async function GET(req: NextRequest) {
  if (!isLocalDevRequest(req)) {
    return NextResponse.json({ error: 'This endpoint is only available in local development' }, { status: 403 });
  }

  const auth = await authenticateRequest(req, { minRole: 'super_admin' });
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode || 401 });
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const suiteParams = url.searchParams.getAll('suite');
  const suitesRequested = suiteParams.length ? suiteParams : ['auth'];

  const customerId = url.searchParams.get('customerId') || undefined;

  const ctx: TestContext = {
    baseUrl: origin,
    headers: req.headers,
    request: req,
    params: { customerId },
  };

  const suites = getSuites(suitesRequested);
  const results = await runSuites(ctx, suites);

  return NextResponse.json(results, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
