// Minimal Playwright smoke tests for auth gating
// Note: This is a skeleton; install Playwright devDependency to run:
//   pnpm dlx playwright install
//   pnpm dlx playwright test
// Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set, and app server running.

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Adjust to a real test user in your environment
const TEST_EMAIL = process.env.TEST_EMAIL || 'surat@safawala.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123'

// Public pages should load without redirect loop
const PUBLIC_PAGES = ['/', '/auth/login']

// A representative protected page
const PROTECTED_PAGE = '/dashboard'

test.describe('Auth middleware smoke', () => {
  test('public pages are accessible without auth', async ({ page }) => {
    for (const p of PUBLIC_PAGES) {
      const url = `${BASE_URL}${p}`
      await page.goto(url)
      await expect(page).toHaveURL(new RegExp(`${p.replace('/', '\\/')}`))
    }
  })

  test('unauthenticated user gets redirected to /auth/login on protected page', async ({ page }) => {
    await page.goto(`${BASE_URL}${PROTECTED_PAGE}`)
    await expect(page).toHaveURL(new RegExp('/auth/login'))
  })

  test('authenticated user can access protected page', async ({ page }) => {
    // Go to login page
    await page.goto(`${BASE_URL}/auth/login`)

    // Fill in credentials (update selectors to your login form)
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in|login/i }).click()

    // After login, navigate to protected page
    await page.goto(`${BASE_URL}${PROTECTED_PAGE}`)
    await expect(page).toHaveURL(new RegExp(`${PROTECTED_PAGE.replace('/', '\\/')}`))
  })
})
