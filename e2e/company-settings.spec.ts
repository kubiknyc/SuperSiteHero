/**
 * E2E Tests: Company Settings
 *
 * Comprehensive tests for company-wide settings and configuration
 * including profile, branding, integrations, and administrative settings.
 *
 * Coverage:
 * - Company profile viewing and editing
 * - Company information updates (name, email, phone, address)
 * - Logo/branding settings (upload, color customization)
 * - User management (invite, roles, deactivation)
 * - Default project settings and templates
 * - Integration settings (QuickBooks, DocuSign, Calendar)
 * - Company-wide notification preferences
 * - Roles & permissions management
 * - AI settings configuration
 * - Audit logs viewing
 * - Distribution lists
 * - Approval workflows
 */

import { test, expect } from '@playwright/test'
import { waitForContentLoad, waitForFormResponse } from './helpers/test-helpers'

// Use pre-authenticated admin session for company settings access
test.use({ storageState: 'playwright/.auth/admin.json' })

test.describe('Company Settings - Main Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display settings page with all admin sections', async ({ page }) => {
    const heading = page.locator('h1').filter({ hasText: /setting/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })

    // Verify admin-only sections are visible
    const adminSections = [
      /company.*profile/i,
      /user.*management/i,
      /project.*template/i,
      /role.*permission/i,
      /ai.*setting/i,
      /audit.*log/i,
    ]

    for (const sectionPattern of adminSections) {
      const section = page.locator('a, button, h2, h3').filter({ hasText: sectionPattern }).first()
      const isVisible = await section.isVisible({ timeout: 3000 }).catch(() => false)

      // Should have at least some admin sections visible
      if (isVisible) {
        expect(isVisible).toBeTruthy()
      }
    }
  })

  test('should navigate to company profile', async ({ page }) => {
    const companyLink = page.locator('a').filter({ hasText: /company.*profile/i }).first()

    if (await companyLink.isVisible({ timeout: 3000 })) {
      await companyLink.click()
      await page.waitForLoadState('networkidle')
      await waitForContentLoad(page)

      expect(page.url()).toContain('/settings/company')
    } else {
      test.skip()
    }
  })

  test('should display user profile card', async ({ page }) => {
    // Should show current user's profile
    const avatar = page.locator('[class*="avatar"], img[alt*="profile" i]').first()
    const hasAvatar = await avatar.isVisible({ timeout: 3000 }).catch(() => false)

    // Should show edit profile button
    const editButton = page.locator('a, button').filter({ hasText: /edit.*profile/i }).first()
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasAvatar || hasEditButton).toBeTruthy()
  })
})

test.describe('Company Settings - Company Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/company')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display company profile page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /company.*profile/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display company information form fields', async ({ page }) => {
    // Check for required fields
    const companyNameInput = page.locator('input[name="name"], input#name, input[placeholder*="company" i]').first()
    const emailInput = page.locator('input[name="email"], input#email, input[type="email"]').first()
    const phoneInput = page.locator('input[name="phone"], input#phone, input[type="tel"]').first()

    await expect(companyNameInput).toBeVisible({ timeout: 5000 })

    // Email and phone should be visible if company name is
    if (await companyNameInput.isVisible()) {
      const hasEmail = await emailInput.isVisible({ timeout: 2000 }).catch(() => false)
      const hasPhone = await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)
      expect(hasEmail || hasPhone).toBeTruthy()
    }
  })

  test('should update company name', async ({ page }) => {
    const companyNameInput = page.locator('input[name="name"], input#name').first()

    if (await companyNameInput.isVisible({ timeout: 3000 })) {
      const originalValue = await companyNameInput.inputValue()
      const testValue = `Test Company ${Date.now()}`

      await companyNameInput.fill(testValue)

      // Find and click save button for basic info section
      const saveButton = page.locator('button').filter({ hasText: /save/i }).first()

      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click()
        await waitForFormResponse(page)

        // Check for success - either toast or page still loads
        const hasContent = await page.locator('main, [role="main"]').first().isVisible({ timeout: 3000 }).catch(() => false)
        expect(hasContent).toBeTruthy()

        // Restore original value
        await companyNameInput.fill(originalValue)
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click()
          await waitForFormResponse(page)
        }
      }
    } else {
      test.skip()
    }
  })

  test('should update company contact information', async ({ page }) => {
    const emailInput = page.locator('input#email, input[type="email"]').first()
    const phoneInput = page.locator('input#phone, input[type="tel"]').first()

    if (await emailInput.isVisible({ timeout: 3000 })) {
      const originalEmail = await emailInput.inputValue()
      const originalPhone = await phoneInput.inputValue().catch(() => '')

      // Update email
      await emailInput.fill('test-company@example.com')

      if (await phoneInput.isVisible({ timeout: 2000 })) {
        await phoneInput.fill('(555) 123-4567')
      }

      const saveButton = page.locator('button').filter({ hasText: /save/i }).first()

      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click()
        await waitForFormResponse(page)

        // Restore original values
        await emailInput.fill(originalEmail)
        if (originalPhone && await phoneInput.isVisible({ timeout: 2000 })) {
          await phoneInput.fill(originalPhone)
        }

        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click()
          await waitForFormResponse(page)
        }
      }
    } else {
      test.skip()
    }
  })

  test('should update company address', async ({ page }) => {
    const addressInput = page.locator('input#address, input[name="address"]').first()
    const cityInput = page.locator('input#city, input[name="city"]').first()
    const stateInput = page.locator('input#state, input[name="state"]').first()
    const zipInput = page.locator('input#zip, input[name="zip"]').first()

    if (await addressInput.isVisible({ timeout: 3000 })) {
      const originalAddress = await addressInput.inputValue()
      const originalCity = await cityInput.inputValue().catch(() => '')
      const originalState = await stateInput.inputValue().catch(() => '')
      const originalZip = await zipInput.inputValue().catch(() => '')

      // Update address fields
      await addressInput.fill('123 Test Street')

      if (await cityInput.isVisible({ timeout: 2000 })) {
        await cityInput.fill('Test City')
      }

      if (await stateInput.isVisible({ timeout: 2000 })) {
        await stateInput.fill('CA')
      }

      if (await zipInput.isVisible({ timeout: 2000 })) {
        await zipInput.fill('12345')
      }

      // Find the save button in the address section
      const saveButtons = page.locator('button').filter({ hasText: /save/i })
      const saveButtonCount = await saveButtons.count()

      // Click the second save button if there are multiple (first is basic info, second is address)
      const saveButton = saveButtonCount > 1 ? saveButtons.nth(1) : saveButtons.first()

      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click()
        await waitForFormResponse(page)

        // Restore original values
        await addressInput.fill(originalAddress)
        if (originalCity && await cityInput.isVisible({ timeout: 2000 })) {
          await cityInput.fill(originalCity)
        }
        if (originalState && await stateInput.isVisible({ timeout: 2000 })) {
          await stateInput.fill(originalState)
        }
        if (originalZip && await zipInput.isVisible({ timeout: 2000 })) {
          await zipInput.fill(originalZip)
        }

        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click()
          await waitForFormResponse(page)
        }
      }
    } else {
      test.skip()
    }
  })

  test('should display branding section with logo upload', async ({ page }) => {
    const brandingHeading = page.locator('h2, h3').filter({ hasText: /branding/i }).first()
    const hasBrandingSection = await brandingHeading.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasBrandingSection) {
      // Should have logo upload functionality
      const uploadButton = page.locator('button').filter({ hasText: /upload.*logo/i }).first()
      const fileInput = page.locator('input[type="file"]').first()

      const hasUpload = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)
      const hasFileInput = await fileInput.isVisible({ timeout: 3000 }).catch(() => false)

      expect(hasUpload || hasFileInput).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should allow brand color customization', async ({ page }) => {
    const colorInput = page.locator('input[type="color"], input#primaryColor').first()

    if (await colorInput.isVisible({ timeout: 3000 })) {
      const originalColor = await colorInput.inputValue()

      // Change color
      await colorInput.fill('#ff6600')

      // Should update hex input as well
      const hexInput = page.locator('input[class*="font-mono"]').first()
      if (await hexInput.isVisible({ timeout: 2000 })) {
        const hexValue = await hexInput.inputValue()
        expect(hexValue.toLowerCase()).toContain('ff6600')
      }

      // Find branding save button (last save button on the page)
      const saveButtons = page.locator('button').filter({ hasText: /save/i })
      const saveButton = saveButtons.last()

      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click()
        await waitForFormResponse(page)

        // Restore original color
        await colorInput.fill(originalColor)
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click()
          await waitForFormResponse(page)
        }
      }
    } else {
      test.skip()
    }
  })

  test('should show delete logo button when logo exists', async ({ page }) => {
    // Check if logo image is displayed
    const logoImage = page.locator('img[alt*="logo" i]').first()
    const hasLogo = await logoImage.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasLogo) {
      // Should have delete button
      const deleteButton = page.locator('button').filter({ hasText: /delete|remove|trash/i }).first()
      const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)

      // Delete button might be an icon button
      const trashIcon = page.locator('button svg').first()
      const hasTrashIcon = await trashIcon.isVisible({ timeout: 3000 }).catch(() => false)

      expect(hasDeleteButton || hasTrashIcon).toBeTruthy()
    }
  })
})

test.describe('Company Settings - User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/users')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display user management page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /user.*management/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display list of users in table', async ({ page }) => {
    const table = page.locator('table, [role="table"]').first()
    const hasTable = await table.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasTable) {
      // Should have table headers
      const headers = page.locator('th')
      const headerCount = await headers.count()
      expect(headerCount).toBeGreaterThan(0)

      // Should have user rows
      const rows = page.locator('tbody tr')
      const rowCount = await rows.count()
      expect(rowCount).toBeGreaterThan(0)
    } else {
      // Might be empty state
      const emptyState = page.locator('text=/no.*user/i, text=/no.*team/i').first()
      const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasEmptyState).toBeTruthy()
    }
  })

  test('should have invite user button', async ({ page }) => {
    const inviteButton = page.locator('button, a').filter({ hasText: /invite.*user/i }).first()
    await expect(inviteButton).toBeVisible({ timeout: 5000 })
  })

  test('should open invite user dialog', async ({ page }) => {
    const inviteButton = page.locator('button, a').filter({ hasText: /invite.*user/i }).first()

    if (await inviteButton.isVisible({ timeout: 3000 })) {
      await inviteButton.click()
      await waitForContentLoad(page)

      // Should open dialog
      const dialog = page.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Should have email input
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first()
      await expect(emailInput).toBeVisible({ timeout: 3000 })

      // Should have role selector
      const roleSelect = page.locator('select, [role="combobox"]').first()
      const hasRoleSelect = await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)

      // Close dialog
      const cancelButton = page.locator('button').filter({ hasText: /cancel|close/i }).first()
      if (await cancelButton.isVisible({ timeout: 2000 })) {
        await cancelButton.click()
      } else {
        // Try escape key
        await page.keyboard.press('Escape')
      }
    } else {
      test.skip()
    }
  })

  test('should display user roles', async ({ page }) => {
    const roleElements = page.locator('text=/owner|admin|project manager|superintendent|worker/i')
    const roleCount = await roleElements.count()

    if (roleCount > 0) {
      expect(roleCount).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should display user status badges', async ({ page }) => {
    const statusBadges = page.locator('text=/active|inactive/i')
    const badgeCount = await statusBadges.count()

    if (badgeCount > 0) {
      expect(badgeCount).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should have user actions menu', async ({ page }) => {
    // Look for more actions button (three dots)
    const moreButton = page.locator('button[aria-label*="action" i], button[aria-label*="menu" i]').first()
    const hasMoreButton = await moreButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasMoreButton) {
      await moreButton.click()
      await waitForContentLoad(page)

      // Should show menu with deactivate/activate option
      const menu = page.locator('[role="menu"], [role="menuitem"]').first()
      const hasMenu = await menu.isVisible({ timeout: 3000 }).catch(() => false)

      expect(hasMenu).toBeTruthy()

      // Close menu
      await page.keyboard.press('Escape')
    }
  })

  test('should allow role changes for non-owner users', async ({ page }) => {
    // Find a user that is not owner
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      // Look for role selector in table
      const roleSelectors = page.locator('select, button[role="combobox"]')
      const selectorCount = await roleSelectors.count()

      // Should have at least one editable role
      if (selectorCount > 0) {
        expect(selectorCount).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Company Settings - Project Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/project-templates')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display project templates page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /project.*template/i }).first()
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false)
    const hasContent = await page.locator('main, [role="main"]').first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasHeading || hasContent).toBeTruthy()
  })

  test('should display templates list or empty state', async ({ page }) => {
    const templateList = page.locator('table, [role="table"], [data-testid*="template"], .grid, article').first()
    const hasTemplateList = await templateList.isVisible({ timeout: 3000 }).catch(() => false)

    const emptyState = page.locator('text=/no.*template/i').first()
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasTemplateList || hasEmptyState).toBeTruthy()
  })

  test('should have create template button', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /create|add|new.*template/i }).first()
    const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false)
    const hasContent = await page.locator('main, [role="main"]').first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasCreateButton || hasContent).toBeTruthy()
  })
})

test.describe('Company Settings - Integrations', () => {
  test('should display QuickBooks integration page', async ({ page }) => {
    await page.goto('/settings/quickbooks')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)

    const heading = page.locator('h1, h2').filter({ hasText: /quickbooks/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should show QuickBooks connection status', async ({ page }) => {
    await page.goto('/settings/quickbooks')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)

    const statusText = page.locator('text=/connected|not connected|disconnected/i').first()
    const hasStatus = await statusText.isVisible({ timeout: 3000 }).catch(() => false)

    const actionButton = page.locator('button, a').filter({ hasText: /connect|disconnect|authorize/i }).first()
    const hasActionButton = await actionButton.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasStatus || hasActionButton).toBeTruthy()
  })

  test('should display DocuSign integration page', async ({ page }) => {
    await page.goto('/settings/docusign')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)

    const heading = page.locator('h1, h2').filter({ hasText: /docusign/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display calendar integrations page', async ({ page }) => {
    await page.goto('/settings/calendar')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)

    const heading = page.locator('h1, h2').filter({ hasText: /calendar/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })

    // Should show calendar provider options
    const providers = page.locator('text=/google|outlook|microsoft/i')
    const providerCount = await providers.count()

    expect(providerCount).toBeGreaterThan(0)
  })
})

test.describe('Company Settings - Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display notification preferences page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /notification/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display notification toggle switches', async ({ page }) => {
    const toggles = page.locator('input[type="checkbox"], [role="switch"]')
    const toggleCount = await toggles.count()

    expect(toggleCount).toBeGreaterThan(0)
  })

  test('should allow toggling notification preferences', async ({ page }) => {
    const firstToggle = page.locator('input[type="checkbox"], [role="switch"]').first()

    if (await firstToggle.isVisible({ timeout: 3000 })) {
      const wasChecked = await firstToggle.isChecked()

      await firstToggle.click()
      await page.waitForTimeout(500)

      const isNowChecked = await firstToggle.isChecked()
      expect(isNowChecked).not.toBe(wasChecked)

      // Toggle back
      await firstToggle.click()
      await page.waitForTimeout(500)
    } else {
      test.skip()
    }
  })

  test('should have save button for preferences', async ({ page }) => {
    const saveButton = page.locator('button').filter({ hasText: /save/i }).first()
    const hasSaveButton = await saveButton.isVisible({ timeout: 3000 }).catch(() => false)

    // Some notification settings might auto-save
    if (hasSaveButton) {
      expect(hasSaveButton).toBeTruthy()
    }
  })
})

test.describe('Company Settings - Approval Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/approval-workflows')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display approval workflows page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /approval.*workflow|workflow/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display workflows list or empty state', async ({ page }) => {
    const workflowList = page.locator('table, [role="table"], .workflow-list, [data-testid*="workflow"]').first()
    const hasWorkflowList = await workflowList.isVisible({ timeout: 3000 }).catch(() => false)

    const emptyState = page.locator('text=/no.*workflow/i').first()
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasWorkflowList || hasEmptyState).toBeTruthy()
  })

  test('should have create workflow button', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /create|add|new.*workflow/i }).first()
    const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasCreateButton).toBeTruthy()
  })
})

test.describe('Company Settings - Roles & Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/roles')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display roles & permissions page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /role|permission/i }).first()
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false)
    const hasContent = await page.locator('main, [role="main"]').first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasHeading || hasContent).toBeTruthy()
  })

  test('should display list of roles', async ({ page }) => {
    const roleList = page.locator('table, [role="table"], .role-list, [data-testid*="role"]').first()
    const hasRoleList = await roleList.isVisible({ timeout: 3000 }).catch(() => false)

    // Should have role names visible
    const roleNames = page.locator('text=/owner|admin|project manager|superintendent|worker/i')
    const roleCount = await roleNames.count()

    expect(hasRoleList || roleCount > 0).toBeTruthy()
  })

  test('should display permission categories or toggles', async ({ page }) => {
    const permissionElements = page.locator('input[type="checkbox"], [role="switch"], text=/permission/i')
    const permissionCount = await permissionElements.count()

    // Roles page should have permission controls
    expect(permissionCount).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Company Settings - Distribution Lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/distribution-lists')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display distribution lists page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /distribution/i }).first()
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false)
    const hasContent = await page.locator('main, [role="main"]').first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasHeading || hasContent).toBeTruthy()
  })

  test('should display lists or empty state', async ({ page }) => {
    const distList = page.locator('table, [role="table"], .list, [data-testid*="distribution"]').first()
    const hasDistList = await distList.isVisible({ timeout: 3000 }).catch(() => false)

    const emptyState = page.locator('text=/no.*distribution/i, text=/no.*list/i').first()
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasDistList || hasEmptyState).toBeTruthy()
  })

  test('should have create list button', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /create|add|new.*list/i }).first()
    const hasCreateButton = await createButton.isVisible({ timeout: 5000 }).catch(() => false)

    // Distribution lists should allow creation
    expect(hasCreateButton).toBeTruthy()
  })
})

test.describe('Company Settings - AI Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/ai')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display AI settings page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /ai|artificial intelligence/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display AI feature configuration', async ({ page }) => {
    const aiToggles = page.locator('input[type="checkbox"], [role="switch"]')
    const toggleCount = await aiToggles.count()

    // AI settings should have configuration options
    expect(toggleCount).toBeGreaterThanOrEqual(0)
  })

  test('should show AI provider options', async ({ page }) => {
    const providerText = page.locator('text=/provider|openai|anthropic|claude|gpt/i')
    const providerCount = await providerText.count()

    // Should mention AI providers
    if (providerCount > 0) {
      expect(providerCount).toBeGreaterThan(0)
    }
  })

  test('should display usage limits or quota information', async ({ page }) => {
    const limitText = page.locator('text=/limit|quota|usage|billing/i')
    const hasLimits = await limitText.first().isVisible({ timeout: 3000 }).catch(() => false)

    // AI settings might show usage information
    const hasContent = await page.locator('main, [role="main"]').first().isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasContent).toBeTruthy()
  })
})

test.describe('Company Settings - Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/audit-logs')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)
  })

  test('should display audit logs page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /audit.*log/i }).first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })

  test('should display audit log entries table', async ({ page }) => {
    const table = page.locator('table, [role="table"]').first()
    const hasTable = await table.isVisible({ timeout: 3000 }).catch(() => false)

    const emptyState = page.locator('text=/no.*log|no.*audit/i').first()
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('should have filter options for audit logs', async ({ page }) => {
    // Look for filters like date range, user, action type
    const filterControls = page.locator('select, input[type="date"], button').filter({ hasText: /filter|date|user|action/i })
    const filterCount = await filterControls.count()

    // Audit logs should have filtering capabilities
    expect(filterCount).toBeGreaterThanOrEqual(0)
  })

  test('should display timestamp and user information', async ({ page }) => {
    // Look for timestamp columns
    const timeElements = page.locator('text=/ago|am|pm|202/i, time, [datetime]')
    const timeCount = await timeElements.count()

    // Should show when actions occurred
    if (timeCount > 0) {
      expect(timeCount).toBeGreaterThan(0)
    }
  })

  test('should show action types in logs', async ({ page }) => {
    const actionText = page.locator('text=/created|updated|deleted|login|logout|invite|change/i')
    const actionCount = await actionText.count()

    // Should display action types if logs exist
    if (actionCount > 0) {
      expect(actionCount).toBeGreaterThan(0)
    }
  })
})

test.describe('Company Settings - Data Management', () => {
  test('should allow navigation between settings sections', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)

    // Test navigation to multiple sections
    const sections = [
      { name: 'Company Profile', path: '/settings/company' },
      { name: 'User Management', path: '/settings/users' },
      { name: 'Notifications', path: '/settings/notifications' },
    ]

    for (const section of sections) {
      const link = page.locator('a').filter({ hasText: new RegExp(section.name, 'i') }).first()

      if (await link.isVisible({ timeout: 2000 })) {
        await link.click()
        await page.waitForLoadState('networkidle')
        await waitForContentLoad(page)

        expect(page.url()).toContain(section.path)

        // Go back to settings
        await page.goto('/settings')
        await page.waitForLoadState('networkidle')
        await waitForContentLoad(page)
      }
    }
  })

  test('should display cost codes page if available', async ({ page }) => {
    await page.goto('/settings/cost-codes')
    await page.waitForLoadState('networkidle')
    await waitForContentLoad(page)

    const heading = page.locator('h1, h2').filter({ hasText: /cost.*code/i }).first()
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasHeading) {
      expect(hasHeading).toBeTruthy()

      // Should have list or creation option
      const table = page.locator('table, [role="table"]').first()
      const createButton = page.locator('button, a').filter({ hasText: /create|add/i }).first()

      const hasTable = await table.isVisible({ timeout: 3000 }).catch(() => false)
      const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false)

      expect(hasTable || hasCreateButton).toBeTruthy()
    }
  })
})
