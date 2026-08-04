export type TestStatus = 'pass' | 'fail' | 'skip';

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  error?: string;
  details?: unknown;
}

export interface TestCase {
  id: string;
  name: string;
  run: (ctx: TestContext) => Promise<TestResult>;
}

export interface TestSuite {
  name: string;
  cases: TestCase[];
}

export interface TestSuiteResult {
  suite: string;
  results: TestResult[];
  summary: {
    pass: number;
    fail: number;
    skip: number;
    durationMs: number;
  };
}

export interface TestRunResponse {
  suites: TestSuiteResult[];
  meta: {
    startedAt: string;
    finishedAt: string;
    totalDurationMs: number;
  };
}

export interface TestContextParams {
  // Optional params passed from query string
  customerId?: string;
}

export interface TestContext {
  baseUrl: string; // e.g., https://app.example.com
  headers: HeadersInit; // including Cookie header
  request: Request;
  params: TestContextParams;
}
