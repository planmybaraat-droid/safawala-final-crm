import { TestContext, TestRunResponse, TestSuite, TestSuiteResult } from './types';
import { authSuite } from './tests/auth';
import { customersSuite } from './tests/customers';

export function getSuites(requested: string[]): TestSuite[] {
  const map: Record<string, TestSuite> = {
    auth: authSuite,
    customers: customersSuite,
  };

  if (requested.includes('all')) {
    return Object.values(map);
  }

  const suites: TestSuite[] = [];
  for (const key of requested) {
    if (map[key]) suites.push(map[key]);
  }
  return suites.length ? suites : [authSuite];
}

export async function runSuites(ctx: TestContext, suites: TestSuite[]): Promise<TestRunResponse> {
  const startedAt = new Date();
  const suiteResults: TestSuiteResult[] = [];

  for (const suite of suites) {
    const results = [] as TestSuiteResult['results'];
    const suiteStart = Date.now();

    for (const tc of suite.cases) {
      // run sequentially for now
      const result = await tc.run(ctx);
      results.push(result);
    }

    const pass = results.filter(r => r.status === 'pass').length;
    const fail = results.filter(r => r.status === 'fail').length;
    const skip = results.filter(r => r.status === 'skip').length;
    const durationMs = Date.now() - suiteStart;

    suiteResults.push({
      suite: suite.name,
      results,
      summary: { pass, fail, skip, durationMs },
    });
  }

  const finishedAt = new Date();
  const totalDurationMs = finishedAt.getTime() - startedAt.getTime();

  return {
    suites: suiteResults,
    meta: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      totalDurationMs,
    },
  };
}
