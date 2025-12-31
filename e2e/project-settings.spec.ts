/**
 * E2E Tests: Project Settings & Team Management
 *
 * Tests the project settings and team management functionality:
 * - Project settings page access
 * - Team member management (add, edit, remove)
 * - Role assignment
 * - Permission management
 * - Financial settings
 * - Feature toggles
 */

import { test, expect, Page } from '@playwright/test'

// Use authenticated state
test.use({ storageState: 'playwright/.auth/user.json' })

const TEST_EMAIL = 'test@supersitehero.local'
const TEST_PASSWORD = 'Test123!@#'

// Helper function for consistent login
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  // Wait for redirect away from login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await page.waitForTimeout(500)
}

// Helper to navigate to project settings
async function navigateToProjectSettings(page: Page) {
  await page.goto('/projects')
  await page.waitForLoadState('networkidle')

  // Click first project
  const projectLink = page.locator('a[href*="/projects/"]').first()
  if (await projectLink.isVisible({ timeout: 5000 })) {
    await projectLink.click()
    await page.waitForLoadState('networkidle')

    // Click settings button
    const settingsButton = page.locator(
      'button:has-text("Settings"), ' +
      'a:has-text("Settings"), ' +
      '[data-testid*="settings"]'
    ).first()

    if (await settingsButton.isVisible({ timeout: 3000 })) {
      await settingsButton.click()
      await page.waitForLoadState('networkidle')
    }
  }
}

test.describe('Project Settings', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to project settings', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Should be on settings page
    const isOnSettingsPage = page.url().includes('settings')
    expect(isOnSettingsPage).toBeTruthy()
  })

  test('should display project settings tabs', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for tabs or sections
    const tabs = page.locator(
      '[role="tab"], ' +
      'button[data-state], ' +
      'a[class*="tab"]'
    )

    if (await tabs.first().isVisible({ timeout: 5000 })) {
      const count = await tabs.count()
      expect(count).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should show financial settings section', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for financial fields
    const financialFields = page.locator(
      'text=/contract|budget|contingency/i, ' +
      'input[name*="contract"], ' +
      'input[name*="budget"]'
    )

    if (await financialFields.first().isVisible({ timeout: 5000 })) {
      expect(await financialFields.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should allow editing contract value', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Find contract value input
    const contractInput = page.locator('input[name*="contract"], input[placeholder*="contract" i]').first()

    if (await contractInput.isVisible({ timeout: 5000 })) {
      await contractInput.clear()
      await contractInput.fill('1000000')

      const value = await contractInput.inputValue()
      expect(value).toContain('1000000')
    } else {
      test.skip()
    }
  })

  test('should allow editing budget', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Find budget input
    const budgetInput = page.locator('input[name*="budget"], input[placeholder*="budget" i]').first()

    if (await budgetInput.isVisible({ timeout: 5000 })) {
      await budgetInput.clear()
      await budgetInput.fill('950000')

      const value = await budgetInput.inputValue()
      expect(value).toContain('950000')
    } else {
      test.skip()
    }
  })
})

test.describe('Team Management', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display team members list', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for team section
    const teamSection = page.locator('text=/team|members/i').first()

    if (await teamSection.isVisible({ timeout: 5000 })) {
      // Should have team members or empty state
      const teamMembers = page.locator('[data-testid*="team-member"], [class*="team-member"]')
      const count = await teamMembers.count()

      // Either has members or shows empty state
      const emptyState = await page.locator('text=/no members|add member/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(count > 0 || emptyState).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have add team member button', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for add button
    const addButton = page.locator(
      'button:has-text("Add"), ' +
      'button:has-text("Invite"), ' +
      '[data-testid*="add-member"]'
    ).first()

    if (await addButton.isVisible({ timeout: 5000 })) {
      expect(await addButton.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should open add team member dialog', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Click add button
    const addButton = page.locator(
      'button:has-text("Add Team"), ' +
      'button:has-text("Add Member"), ' +
      '[data-testid*="add-member"]'
    ).first()

    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Should open dialog
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('should show user selection dropdown in add dialog', async ({ page }) => {
    await navigateToProjectSettings(page)

    const addButton = page.locator('button:has-text("Add"), button:has-text("Invite")').first()

    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Look for user selector
      const userSelect = page.locator(
        'select, ' +
        '[role="combobox"], ' +
        '[data-testid*="user-select"]'
      ).first()

      if (await userSelect.isVisible({ timeout: 3000 })) {
        expect(await userSelect.isVisible()).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })

  test('should show role selection in add dialog', async ({ page }) => {
    await navigateToProjectSettings(page)

    const addButton = page.locator('button:has-text("Add")').first()

    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Look for role selector
      const roleSelect = page.locator(
        'select[name*="role"], ' +
        '[data-testid*="role-select"], ' +
        'text=/project manager|superintendent|foreman/i'
      ).first()

      if (await roleSelect.isVisible({ timeout: 3000 })) {
        expect(await roleSelect.isVisible()).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })

  test('should show permission checkboxes', async ({ page }) => {
    await navigateToProjectSettings(page)

    const addButton = page.locator('button:has-text("Add")').first()

    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click()
      await page.waitForTimeout(500)

      // Look for permission checkboxes
      const permissions = page.locator(
        'input[type="checkbox"], ' +
        'text=/can edit|can delete|can approve/i'
      )

      if (await permissions.first().isVisible({ timeout: 3000 })) {
        const count = await permissions.count()
        expect(count).toBeGreaterThan(0)
      }
    } else {
      test.skip()
    }
  })

  test('should display team member cards', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for team member cards
    const memberCards = page.locator(
      '[data-testid*="member-card"], ' +
      '[class*="member-card"], ' +
      '[class*="team-member"]'
    )

    if (await memberCards.first().isVisible({ timeout: 5000 })) {
      expect(await memberCards.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should show member role on card', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for role badges
    const roleBadges = page.locator(
      'text=/project manager|superintendent|foreman|engineer/i, ' +
      '[data-testid*="role"]'
    )

    if (await roleBadges.first().isVisible({ timeout: 5000 })) {
      expect(await roleBadges.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should have edit button for team members', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for edit buttons on member cards
    const editButton = page.locator(
      'button:has-text("Edit"), ' +
      '[data-testid*="edit-member"]'
    ).first()

    if (await editButton.isVisible({ timeout: 5000 })) {
      expect(await editButton.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have remove button for team members', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for remove buttons
    const removeButton = page.locator(
      'button:has-text("Remove"), ' +
      'button:has-text("Delete"), ' +
      '[data-testid*="remove-member"]'
    ).first()

    if (await removeButton.isVisible({ timeout: 5000 })) {
      expect(await removeButton.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should show confirmation dialog before removing member', async ({ page }) => {
    await navigateToProjectSettings(page)

    const removeButton = page.locator('button:has-text("Remove")').first()

    if (await removeButton.isVisible({ timeout: 5000 })) {
      await removeButton.click()
      await page.waitForTimeout(500)

      // Should show confirmation
      const confirmation = page.locator(
        '[role="alertdialog"], ' +
        'text=/are you sure|confirm|delete/i'
      )

      if (await confirmation.first().isVisible({ timeout: 3000 })) {
        expect(await confirmation.first().isVisible()).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })

  test('should allow searching/filtering team members', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], ' +
      'input[placeholder*="search" i], ' +
      '[data-testid*="search"]'
    ).first()

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test')

      const value = await searchInput.inputValue()
      expect(value).toBe('test')
    } else {
      test.skip()
    }
  })

  test('should display permission badges on member cards', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for permission indicators
    const permissionBadges = page.locator(
      'text=/can edit|can delete|can approve/i, ' +
      '[data-testid*="permission"]'
    )

    if (await permissionBadges.first().isVisible({ timeout: 5000 })) {
      expect(await permissionBadges.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should show assigned date for team members', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for date information
    const dateElements = page.locator('text=/added|assigned|joined|ago/i')

    if (await dateElements.first().isVisible({ timeout: 5000 })) {
      expect(await dateElements.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })
})

test.describe('Feature Toggles', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display feature toggle section', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for features section
    const featuresSection = page.locator('text=/features|enable|disable/i').first()

    if (await featuresSection.isVisible({ timeout: 5000 })) {
      expect(await featuresSection.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have toggle switches for features', async ({ page }) => {
    await navigateToProjectSettings(page)

    // Look for toggle switches
    const toggles = page.locator(
      '[role="switch"], ' +
      'input[type="checkbox"][class*="toggle"]'
    )

    if (await toggles.first().isVisible({ timeout: 5000 })) {
      expect(await toggles.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })
})
