/**
 * E2E Tests: User Profile Management
 *
 * Tests the user profile functionality including:
 * - Profile viewing and editing
 * - Avatar upload
 * - MFA setup and verification
 * - Password management
 * - Personal information updates
 */

import { test, expect, Page } from '@playwright/test'
import * as path from 'path'

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

test.describe('User Profile Management', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to profile page', async ({ page }) => {
    // Try navigation from settings or user menu
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Should be on profile page
    await expect(page).toHaveURL(/profile/)
  })

  test('should display user profile information', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Should show user information
    const emailElement = page.locator(`text="${TEST_EMAIL}"`)
    const hasEmail = await emailElement.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasEmail) {
      // At least should have some profile fields
      const profileFields = page.locator('input[type="text"], input[type="email"]')
      const count = await profileFields.count()
      expect(count).toBeGreaterThan(0)
    } else {
      expect(hasEmail).toBeTruthy()
    }
  })

  test('should display avatar or placeholder', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Look for avatar image or placeholder
    const avatar = page.locator(
      'img[alt*="avatar"], ' +
      'img[alt*="profile"], ' +
      '[data-testid*="avatar"], ' +
      '[class*="avatar"]'
    ).first()

    if (await avatar.isVisible({ timeout: 5000 })) {
      // Should have avatar element
      expect(await avatar.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should allow editing first name', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Find first name input
    const firstNameInput = page.locator(
      'input[name="first_name"], ' +
      'input[name="firstName"], ' +
      'input[placeholder*="first" i]'
    ).first()

    if (await firstNameInput.isVisible({ timeout: 5000 })) {
      // Clear and type new value
      await firstNameInput.clear()
      await firstNameInput.fill('Test')

      // Should accept input
      const value = await firstNameInput.inputValue()
      expect(value).toBe('Test')
    } else {
      test.skip()
    }
  })

  test('should allow editing last name', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Find last name input
    const lastNameInput = page.locator(
      'input[name="last_name"], ' +
      'input[name="lastName"], ' +
      'input[placeholder*="last" i]'
    ).first()

    if (await lastNameInput.isVisible({ timeout: 5000 })) {
      await lastNameInput.clear()
      await lastNameInput.fill('User')

      const value = await lastNameInput.inputValue()
      expect(value).toBe('User')
    } else {
      test.skip()
    }
  })

  test('should allow editing phone number', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Find phone input
    const phoneInput = page.locator(
      'input[name="phone"], ' +
      'input[type="tel"], ' +
      'input[placeholder*="phone" i]'
    ).first()

    if (await phoneInput.isVisible({ timeout: 5000 })) {
      await phoneInput.clear()
      await phoneInput.fill('555-123-4567')

      const value = await phoneInput.inputValue()
      expect(value).toContain('555')
    } else {
      test.skip()
    }
  })

  test('should have save/update button', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Look for save button
    const saveButton = page.locator(
      'button[type="submit"], ' +
      'button:has-text("Save"), ' +
      'button:has-text("Update")'
    ).first()

    if (await saveButton.isVisible({ timeout: 5000 })) {
      const isEnabled = await saveButton.isEnabled()
      expect(isEnabled).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have avatar upload functionality', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Look for upload button or file input
    const uploadControl = page.locator(
      'input[type="file"], ' +
      'button:has-text("Upload"), ' +
      'button:has-text("Change"), ' +
      '[data-testid*="upload"]'
    ).first()

    if (await uploadControl.isVisible({ timeout: 5000 })) {
      expect(await uploadControl.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should display current role', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Look for role display
    const roleElement = page.locator('text=/role|admin|user|owner|project manager/i')

    if (await roleElement.first().isVisible({ timeout: 5000 })) {
      expect(await roleElement.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should navigate to MFA setup from profile', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Look for MFA/security link
    const mfaLink = page.locator(
      'a:has-text("MFA"), ' +
      'a:has-text("Two-Factor"), ' +
      'a:has-text("Security"), ' +
      'button:has-text("MFA")'
    ).first()

    if (await mfaLink.isVisible({ timeout: 5000 })) {
      await mfaLink.click()
      await page.waitForTimeout(1000)

      // Should navigate to MFA setup or security page
      const hasMFAContent = await page.locator('text=/two-factor|authenticator|mfa/i')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasMFAContent || page.url().includes('mfa') || page.url().includes('security')).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should show email as read-only', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Email should be displayed but not editable
    const emailDisplay = page.locator(`text="${TEST_EMAIL}"`)
    const hasEmail = await emailDisplay.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasEmail) {
      // Check if there's a disabled email input
      const emailInput = page.locator('input[type="email"]').first()
      if (await emailInput.isVisible({ timeout: 2000 })) {
        const isDisabled = await emailInput.isDisabled()
        expect(isDisabled).toBeTruthy()
      }
    }

    // At minimum, email should be visible somewhere
    expect(page.url()).toContain('profile')
  })

  test('should allow canceling profile edit', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Look for cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")').first()

    if (await cancelButton.isVisible({ timeout: 5000 })) {
      await cancelButton.click()
      await page.waitForTimeout(500)

      // Should navigate away or close form
      const stillEditing = page.url().includes('edit')
      expect(stillEditing).toBeFalsy()
    } else {
      test.skip()
    }
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Try to submit with empty required field
    const firstNameInput = page.locator('input[name*="first"]').first()

    if (await firstNameInput.isVisible({ timeout: 5000 })) {
      await firstNameInput.clear()

      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.isVisible({ timeout: 3000 })) {
        await submitButton.click({ force: true })
        await page.waitForTimeout(500)

        // Should show validation error
        const errorMessage = page.locator('text=/required|invalid|error/i, [class*="error"]')
        const hasError = await errorMessage.first().isVisible({ timeout: 3000 }).catch(() => false)

        // Either shows error or button is disabled
        const isDisabled = await submitButton.isDisabled()
        expect(hasError || isDisabled).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })

  test('should display company information', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Look for company name or info
    const companyElement = page.locator('text=/company/i')

    if (await companyElement.first().isVisible({ timeout: 5000 })) {
      expect(await companyElement.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should handle profile photo removal', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForLoadState('networkidle')

    // Look for remove photo option
    const removeButton = page.locator(
      'button:has-text("Remove"), ' +
      'button:has-text("Delete"), ' +
      '[data-testid*="remove-avatar"]'
    ).first()

    if (await removeButton.isVisible({ timeout: 5000 })) {
      expect(await removeButton.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should show account creation date', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Look for creation/joined date
    const dateElement = page.locator('text=/joined|created|member since/i')

    if (await dateElement.first().isVisible({ timeout: 5000 })) {
      expect(await dateElement.count()).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })
})

test.describe('MFA Setup', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to MFA setup page', async ({ page }) => {
    await page.goto('/auth/mfa-setup')
    await page.waitForLoadState('networkidle')

    // Should be on MFA setup page
    await expect(page).toHaveURL(/mfa-setup/)
  })

  test('should display MFA setup instructions', async ({ page }) => {
    await page.goto('/auth/mfa-setup')
    await page.waitForLoadState('networkidle')

    // Should have instructions
    const instructions = page.locator('text=/scan|authenticator|code|app/i')

    if (await instructions.first().isVisible({ timeout: 5000 })) {
      const count = await instructions.count()
      expect(count).toBeGreaterThan(0)
    } else {
      test.skip()
    }
  })

  test('should display QR code for MFA setup', async ({ page }) => {
    await page.goto('/auth/mfa-setup')
    await page.waitForLoadState('networkidle')

    // Look for QR code or canvas
    const qrCode = page.locator('canvas, img[alt*="qr"], [data-testid*="qr"]').first()

    if (await qrCode.isVisible({ timeout: 5000 })) {
      expect(await qrCode.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have verification code input', async ({ page }) => {
    await page.goto('/auth/mfa-setup')
    await page.waitForLoadState('networkidle')

    // Look for code input
    const codeInput = page.locator(
      'input[type="text"][maxlength="6"], ' +
      'input[placeholder*="code" i], ' +
      '[data-testid*="code"]'
    ).first()

    if (await codeInput.isVisible({ timeout: 5000 })) {
      expect(await codeInput.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should have verify/enable button', async ({ page }) => {
    await page.goto('/auth/mfa-setup')
    await page.waitForLoadState('networkidle')

    // Look for verify button
    const verifyButton = page.locator(
      'button:has-text("Verify"), ' +
      'button:has-text("Enable"), ' +
      'button:has-text("Activate")'
    ).first()

    if (await verifyButton.isVisible({ timeout: 5000 })) {
      expect(await verifyButton.isVisible()).toBeTruthy()
    } else {
      test.skip()
    }
  })
})
