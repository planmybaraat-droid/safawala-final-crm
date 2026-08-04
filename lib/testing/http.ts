import { TestContext } from './types';

export async function relativeFetch<T = unknown>(
  ctx: TestContext,
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; ok: boolean; data: T | null; headers: Headers; text: string }> {
  const url = path.startsWith('http') ? path : `${ctx.baseUrl}${path}`;
  const headers = new Headers(init.headers || {});

  // Ensure cookies and JSON headers pass through
  let cookie: string | null = null;
  if (typeof (ctx.headers as any)?.get === 'function') {
    cookie = (ctx.headers as Headers).get('cookie');
  } else if (ctx.headers && typeof ctx.headers === 'object') {
    const rec = ctx.headers as Record<string, string>;
    cookie = rec['cookie'] ?? null;
  }
  
  if (cookie) headers.set('cookie', cookie as string);
  if (!headers.has('accept')) headers.set('accept', 'application/json');

  const res = await fetch(url, {
    ...init,
    headers,
    // Avoid caching during tests
    cache: 'no-store',
  });

  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : (null as T | null);
  } catch {
    // Keep as text if not JSON
    data = null;
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers, text };
}
