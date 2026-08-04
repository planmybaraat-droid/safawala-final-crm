import { relativeFetch } from '../http';
import { TestCase, TestContext, TestResult } from '../types';

function skipResult(id: string, name: string, reason: string): TestResult {
  return { id, name, status: 'skip', durationMs: 0, details: { reason } };
}

export const customersEtagTest: TestCase = {
  id: 'customers.etag',
  name: 'Customers: ETag returns 304 on revalidation',
  async run(ctx: TestContext): Promise<TestResult> {
    const start = Date.now();
    const id = ctx.params.customerId;
    if (!id) {
      return skipResult('customers.etag', 'Customers: ETag returns 304 on revalidation', 'customerId not provided');
    }

    try {
      const first = await relativeFetch<any>(ctx, `/api/customers/${id}`);
      if (first.status !== 200) {
        return {
          id: 'customers.etag',
          name: 'Customers: ETag returns 304 on revalidation',
          status: 'fail',
          durationMs: Date.now() - start,
          error: `Expected 200 on initial GET, got ${first.status}. Body: ${first.text}`,
        };
      }

      const etag = first.headers.get('etag');
      if (!etag) {
        return {
          id: 'customers.etag',
          name: 'Customers: ETag returns 304 on revalidation',
          status: 'fail',
          durationMs: Date.now() - start,
          error: 'Missing ETag header on initial response',
        };
      }

      const second = await relativeFetch<any>(ctx, `/api/customers/${id}`, {
        headers: { 'If-None-Match': etag },
      });

      const durationMs = Date.now() - start;
      if (second.status === 304) {
        return {
          id: 'customers.etag',
          name: 'Customers: ETag returns 304 on revalidation',
          status: 'pass',
          durationMs,
          details: { etag },
        };
      }
      return {
        id: 'customers.etag',
        name: 'Customers: ETag returns 304 on revalidation',
        status: 'fail',
        durationMs,
        error: `Expected 304 on revalidation, got ${second.status}. Body: ${second.text}`,
      };
    } catch (err: any) {
      return {
        id: 'customers.etag',
        name: 'Customers: ETag returns 304 on revalidation',
        status: 'fail',
        durationMs: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  },
};

export const customersVaryCookieTest: TestCase = {
  id: 'customers.vary-cookie',
  name: 'Customers: Vary includes Cookie',
  async run(ctx: TestContext): Promise<TestResult> {
    const start = Date.now();
    const id = ctx.params.customerId;
    if (!id) {
      return skipResult('customers.vary-cookie', 'Customers: Vary includes Cookie', 'customerId not provided');
    }

    try {
      const res = await relativeFetch<any>(ctx, `/api/customers/${id}`);
      const vary = res.headers.get('vary') || res.headers.get('Vary');
      const durationMs = Date.now() - start;
      if (!vary) {
        return {
          id: 'customers.vary-cookie',
          name: 'Customers: Vary includes Cookie',
          status: 'fail',
          durationMs,
          error: 'Missing Vary header',
        };
      }
      if (/cookie/i.test(vary)) {
        return {
          id: 'customers.vary-cookie',
          name: 'Customers: Vary includes Cookie',
          status: 'pass',
          durationMs,
          details: { vary },
        };
      }
      return {
        id: 'customers.vary-cookie',
        name: 'Customers: Vary includes Cookie',
        status: 'fail',
        durationMs,
        error: `Vary header does not include Cookie. Vary: ${vary}`,
      };
    } catch (err: any) {
      return {
        id: 'customers.vary-cookie',
        name: 'Customers: Vary includes Cookie',
        status: 'fail',
        durationMs: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  },
};

export const customersSuite = {
  name: 'customers',
  cases: [customersEtagTest, customersVaryCookieTest],
};
