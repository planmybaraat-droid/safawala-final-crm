// Minimal Playwright smoke tests for auth gating
// To run: install Playwright and run tests (optional for local verification).
//   pnpm dlx playwright install
//   pnpm dlx playwright test
// Ensure NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are set and app server is running.

const { test, expect } = require('@playwright/test')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Use env to provide a valid test user
const TEST_EMAIL = process.env.TEST_EMAIL || 'surat@safawala.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123'

const PUBLIC_PAGES = ['/', '/auth/login']
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
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('authenticated user can access protected page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`)
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in|login/i }).click()

    await page.goto(`${BASE_URL}${PROTECTED_PAGE}`)
    await expect(page).toHaveURL(new RegExp(`${PROTECTED_PAGE.replace('/', '\\/')}`))
  })
})
