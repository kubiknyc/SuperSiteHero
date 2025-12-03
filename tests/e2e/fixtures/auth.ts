import { test as base, expect, Page } from '@playwright/test'

/**
 * Authentication fixture that extends the base Playwright test
 * Provides an authenticated page context for tests that require login
 */

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login')

    // Wait for login page to load
    await page.waitForLoadState('networkidle')

    // Fill in login credentials
    // NOTE: Replace with actual test credentials or environment variables
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com'
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword'

    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for navigation away from login page
    // The app redirects to "/" (root) which renders DashboardPage
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 })

    // Verify user is logged in by checking for user-specific element
    // This could be a profile menu, user name, or any authenticated-only element
    await expect(page.locator('[data-testid="user-menu"], nav, header')).toBeVisible()

    // Use the authenticated page in the test
    await use(page)

    // Cleanup: Logout after test (optional)
    // await page.click('[data-testid="logout-button"]')
  },
})

export { expect }
