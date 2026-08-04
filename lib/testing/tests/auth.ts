import { relativeFetch } from '../http';
import { TestCase, TestContext, TestResult } from '../types';

export const authSessionTest: TestCase = {
  id: 'auth.session',
  name: 'Auth: session is valid (Supabase cookies)',
  async run(ctx: TestContext): Promise<TestResult> {
    const start = Date.now();
    try {
      const res = await relativeFetch<{ email?: string; id?: string }>(ctx, '/api/auth/user');
      const durationMs = Date.now() - start;
      if (res.status === 200 && res.data) {
        return {
          id: 'auth.session',
          name: 'Auth: session is valid (Supabase cookies)',
          status: 'pass',
          durationMs,
          details: { user: res.data },
        };
      }
      return {
        id: 'auth.session',
        name: 'Auth: session is valid (Supabase cookies)',
        status: 'fail',
        durationMs,
        error: `Expected 200 from /api/auth/user but got ${res.status}. Body: ${res.text}`,
      };
    } catch (err: any) {
      return {
        id: 'auth.session',
        name: 'Auth: session is valid (Supabase cookies)',
        status: 'fail',
        durationMs: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  },
};

export const authPermissionsTest: TestCase = {
  id: 'auth.permissions',
  name: 'Auth: user permissions are correctly loaded',
  async run(ctx: TestContext): Promise<TestResult> {
    const start = Date.now();
    try {
      const res = await relativeFetch<{ email?: string; permissions?: any }>(ctx, '/api/auth/user');
      const durationMs = Date.now() - start;
      
      if (res.status !== 200) {
        return {
          id: 'auth.permissions',
          name: 'Auth: user permissions are correctly loaded',
          status: 'fail',
          durationMs,
          error: `Expected 200 from /api/auth/user but got ${res.status}`,
        };
      }

      const permissions = res.data?.permissions;
      if (!permissions || typeof permissions !== 'object') {
        return {
          id: 'auth.permissions',
          name: 'Auth: user permissions are correctly loaded',
          status: 'fail',
          durationMs,
          error: 'User has no permissions object',
        };
      }

      // Count enabled permissions
      const enabled = Object.entries(permissions).filter(([_, v]) => v === true).map(([k]) => k);
      const disabled = Object.entries(permissions).filter(([_, v]) => v === false).map(([k]) => k);

      return {
        id: 'auth.permissions',
        name: 'Auth: user permissions are correctly loaded',
        status: 'pass',
        durationMs,
        details: {
          enabled: enabled.join(', '),
          disabled: disabled.join(', '),
          total: Object.keys(permissions).length,
        },
      };
    } catch (err: any) {
      return {
        id: 'auth.permissions',
        name: 'Auth: user permissions are correctly loaded',
        status: 'fail',
        durationMs: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  },
};

export const authSuite = {
  name: 'auth',
  cases: [authSessionTest, authPermissionsTest],
};
