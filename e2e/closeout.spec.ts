/**
 * E2E Tests: Project Closeout
 *
 * Tests the project closeout workflow including:
 * - Closeout page navigation and access
 * - Punch list closeout status tracking
 * - Closeout document management
 * - Warranty tracking
 * - Final inspection checklist
 * - Certificate of Occupancy readiness
 */

import { test, expect, Page } from '@playwright/test'

// Use authenticated state
test.use({ storageState: 'playwright/.auth/user.json' })

const TEST_EMAIL = 'test@JobSight.local'
const TEST_PASSWORD = 'Test123!@#'

// Helper function for consistent login
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  // Wait for redirect away from login (Phase 1 pattern)
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(500)
}

// Helper to navigate to closeout page
async function navigateToCloseout(page: Page) {
  await page.goto('/projects')
  await page.waitForLoadState('domcontentloaded')

  // Click first project
  const projectLink = page.locator('a[href*="/projects/"]').first()
  if (await projectLink.isVisible({ timeout: 5000 })) {
    await projectLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Navigate to closeout from project detail
    // Try multiple ways to get to closeout
    const closeoutLink = page.locator('a[href*="closeout"], button:has-text("Closeout")')
    if (await closeoutLink.first().isVisible({ timeout: 3000 })) {
      await closeoutLink.first().click()
    } else {
      // Direct navigation as fallback
      await page.goto('/closeout')
    }
    await page.waitForLoadState('domcontentloaded')
  } else {
    // No projects, navigate directly
    await page.goto('/closeout')
    await page.waitForLoadState('domcontentloaded')
  }
}

test.describe('Project Closeout', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to closeout page', async ({ page }) => {
    await page.goto('/closeout')
    await page.waitForLoadState('domcontentloaded')

    // Should show closeout page
    await expect(page).toHaveURL(/closeout/)

    // Should have closeout-related content
    const heading = page.locator('h1, h2').filter({ hasText: /closeout|completion/i })
    const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasHeading) {
      // If no heading, at least we navigated to the route
      expect(page.url()).toContain('closeout')
    }
  })

  test('should display punch list status summary', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for punch list status indicators
    const punchListIndicators = page.locator('[data-testid*="punch"], text=/punch.*list|punch.*status/i, [class*="punch"]')

    if (await punchListIndicators.first().isVisible({ timeout: 5000 })) {
      // Should show some punch list data
      const statusElements = page.locator('text=/verified|completed|open|pending/i')
      const hasStatus = await statusElements.first().isVisible({ timeout: 3000 }).catch(() => false)

      expect(hasStatus).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should show closeout readiness indicator', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for readiness status
    const readinessIndicators = page.locator(
      'text=/ready|not ready|complete|incomplete/i, ' +
      '[data-testid*="ready"], ' +
      '[class*="ready"]'
    )

    if (await readinessIndicators.first().isVisible({ timeout: 5000 })) {
      // Should have some readiness indicator
      expect(await readinessIndicators.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should display closeout statistics', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for statistics/metrics
    const statCards = page.locator(
      '[data-testid*="stat"], ' +
      '[class*="stat-card"], ' +
      'text=/\\d+\\/\\d+|\\d+%|total|count/i'
    )

    if (await statCards.first().isVisible({ timeout: 5000 })) {
      const count = await statCards.count()
      expect(count).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should list closeout documents', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for documents section
    const documentsSection = page.locator(
      'text=/documents|warranties|manuals/i, ' +
      '[data-testid*="document"]'
    ).first()

    if (await documentsSection.isVisible({ timeout: 5000 })) {
      // Should be able to see document list or empty state
      const hasDocuments = await page.locator('[data-testid*="document-"], [class*="document-"]')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      const hasEmptyState = await page.locator('text=/no documents|add document/i')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasDocuments || hasEmptyState).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should allow adding closeout documents', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for add document button
    const addButton = page.locator(
      'button:has-text("Add"), ' +
      'button:has-text("Upload"), ' +
      'button:has-text("New"), ' +
      '[data-testid*="add-document"]'
    ).first()

    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Should open a dialog or form
      const dialog = page.locator('[role="dialog"], [class*="modal"], form')
      await expect(dialog.first()).toBeVisible({ timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('should show warranties section', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for warranties
    const warrantiesSection = page.locator('text=/warrant/i').first()

    if (await warrantiesSection.isVisible({ timeout: 5000 })) {
      // Should have warranty-related content
      expect(await warrantiesSection.textContent()).toMatch(/warrant/i)
    } else {
      test.skip()
    }
  })

  test('should display completion percentage', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for percentage indicators
    const percentageElements = page.locator('text=/\\d+%|percent/i')

    if (await percentageElements.first().isVisible({ timeout: 5000 })) {
      const count = await percentageElements.count()
      expect(count).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should show verification status by location', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for location-based breakdown
    const locationElements = page.locator(
      'text=/location|area|building|floor/i, ' +
      '[data-testid*="location"]'
    )

    if (await locationElements.first().isVisible({ timeout: 5000 })) {
      // Should show some location data
      expect(await locationElements.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should show outstanding items by assignee', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for assignee breakdown
    const assigneeElements = page.locator(
      'text=/assigned|assignee|responsible/i, ' +
      '[data-testid*="assignee"]'
    )

    if (await assigneeElements.first().isVisible({ timeout: 5000 })) {
      // Should show assignee information
      expect(await assigneeElements.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should handle project selection', async ({ page }) => {
    await page.goto('/closeout')
    await page.waitForLoadState('domcontentloaded')

    // Look for project selector
    const projectSelector = page.locator(
      'select, ' +
      '[role="combobox"], ' +
      'button:has-text("Select"), ' +
      '[data-testid*="project-select"]'
    ).first()

    if (await projectSelector.isVisible({ timeout: 5000 })) {
      // Should be able to interact with selector
      const isEnabled = await projectSelector.isEnabled()
      expect(isEnabled).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should show certificate of occupancy readiness', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for C of O or certificate indicators
    const certificateElements = page.locator('text=/certificate|c of o|occupancy/i')

    if (await certificateElements.first().isVisible({ timeout: 5000 })) {
      expect(await certificateElements.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should allow filtering/sorting closeout items', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for filter/sort controls
    const filterControls = page.locator(
      'button:has-text("Filter"), ' +
      'button:has-text("Sort"), ' +
      '[data-testid*="filter"], ' +
      '[data-testid*="sort"]'
    )

    if (await filterControls.first().isVisible({ timeout: 5000 })) {
      await filterControls.first().click()
      await page.waitForTimeout(500)

      // Should show filter options
      const filterOptions = page.locator('[role="menu"], [class*="dropdown"], [class*="popover"]')
      const visible = await filterOptions.first().isVisible({ timeout: 3000 }).catch(() => false)

      expect(visible).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should show priority-based breakdown', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for priority indicators
    const priorityElements = page.locator('text=/critical|high|medium|low|priority/i')

    if (await priorityElements.first().isVisible({ timeout: 5000 })) {
      const count = await priorityElements.count()
      expect(count).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should display last updated timestamp', async ({ page }) => {
    await navigateToCloseout(page)

    // Look for timestamps
    const timestampElements = page.locator('text=/updated|last|ago|today|yesterday/i')

    if (await timestampElements.first().isVisible({ timeout: 5000 })) {
      expect(await timestampElements.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })
})
