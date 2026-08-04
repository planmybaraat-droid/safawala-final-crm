# Auth smoke tests (optional)

This folder contains a minimal Playwright smoke test to verify the middleware:
- Unauthenticated visitors to protected routes redirect to `/auth/login`
- Authenticated users can access protected pages

How to run locally:

1. Start the app server on http://localhost:3000
2. Install Playwright binaries:

```
pnpm dlx playwright install
```

3. Run the tests:

```
pnpm dlx playwright test
```

Env variables:
- BASE_URL (default: http://localhost:3000)
- TEST_EMAIL, TEST_PASSWORD (a valid user in your environment)

Notes:
- These tests are JS-only and won’t affect Next.js build/typecheck.
- They’re optional; use them as a quick sanity check when changing auth/middleware.
