/**
 * DocuSign E2E Tests
 *
 * Tests critical DocuSign integration flows:
 * - OAuth connection setup
 * - Creating signature requests
 * - Viewing envelope status
 * - Managing envelopes
 * - Disconnecting integration
 */

import { test, expect } from '@playwright/test'

// Test configuration
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

test.describe('DocuSign Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/')

    // Clear any existing session
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Login
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect after login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  })

  test.describe('Connection Setup', () => {
    test('should navigate to DocuSign settings', async ({ page }) => {
      // Navigate to settings/integrations/DocuSign page
      // This might vary based on your app's navigation structure
      await page.goto('/settings/integrations')

      // Look for DocuSign section or link
      const docusignSection = page.locator(
        'text=/DocuSign/i, [data-testid="docusign-section"]'
      )
      await expect(docusignSection.first()).toBeVisible({ timeout: 10000 })
    })

    test('should display connection status', async ({ page }) => {
      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')

      // Check for connection status indicator
      const statusIndicator = page.locator(
        '[data-testid="docusign-connection-status"], .connection-status, text=/Connected|Not Connected/i'
      )
      await expect(statusIndicator.first()).toBeVisible({ timeout: 10000 })
    })

    test('should show connect button when not connected', async ({ page, context }) => {
      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')

      // Look for connect button
      const connectButton = page.locator(
        'button:has-text("Connect"), button:has-text("Connect to DocuSign"), [data-testid="docusign-connect-button"]'
      )

      // If not connected, button should be visible
      const isVisible = await connectButton.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        // Click connect button
        await connectButton.first().click()

        // Should show OAuth consent or redirect
        // Note: In real E2E, this would redirect to DocuSign
        // In test environment, mock this or use demo mode
        await expect(page.locator('text=/OAuth|Authorization|Demo Mode/i').first()).toBeVisible({
          timeout: 10000,
        })
      } else {
        // Already connected, skip this test
        test.skip()
      }
    })

    test('should support demo mode connection', async ({ page }) => {
      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')

      // Look for demo mode option
      const demoModeToggle = page.locator(
        'input[type="checkbox"][name*="demo"], [data-testid="demo-mode-toggle"]'
      )

      const hasDemoMode = await demoModeToggle.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasDemoMode) {
        // Enable demo mode
        await demoModeToggle.check()

        // Connect with demo mode
        const connectButton = page.locator('button:has-text("Connect")')
        await connectButton.first().click()

        // Should show success message
        await expect(
          page.locator('text=/Connected|Success|Demo mode enabled/i')
        ).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display connection info when connected', async ({ page }) => {
      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Check if connected (look for account info)
      const accountInfo = page.locator(
        '[data-testid="docusign-account-info"], .account-name, text=/Account:/i'
      )

      const isConnected = await accountInfo.isVisible({ timeout: 5000 }).catch(() => false)

      if (isConnected) {
        // Should show account details
        expect(await accountInfo.textContent()).toBeTruthy()
      }
    })
  })

  test.describe('Signature Request Creation', () => {
    test('should open signature request dialog from payment application', async ({ page }) => {
      // Navigate to a payment application
      await page.goto('/payment-applications')

      // Wait for list to load
      await page.waitForLoadState('networkidle')

      // Find first payment application
      const firstPayApp = page.locator('[data-testid="payment-app-card"]').first()
      const hasPayApps = await firstPayApp.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPayApps) {
        test.skip()
        return
      }

      // Click on payment app
      await firstPayApp.click()

      // Look for "Send for Signature" or DocuSign button
      const sendForSignatureButton = page.locator(
        'button:has-text("Send for Signature"), button:has-text("DocuSign"), [data-testid="send-for-signature"]'
      )

      await expect(sendForSignatureButton.first()).toBeVisible({ timeout: 10000 })

      // Click send for signature
      await sendForSignatureButton.first().click()

      // Dialog should open
      await expect(
        page.locator('[role="dialog"], .dialog, text=/Send for Signature/i')
      ).toBeVisible({ timeout: 5000 })
    })

    test('should add signers to envelope', async ({ page }) => {
      // Navigate to payment applications
      await page.goto('/payment-applications')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Open first payment app
      const firstPayApp = page.locator('[data-testid="payment-app-card"]').first()
      const hasPayApps = await firstPayApp.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPayApps) {
        test.skip()
        return
      }

      await firstPayApp.click()

      // Open send for signature dialog
      const sendButton = page.locator('button:has-text("Send for Signature")').first()
      const hasButton = await sendButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasButton) {
        test.skip()
        return
      }

      await sendButton.click()

      // Add signer
      const addSignerButton = page.locator('button:has-text("Add Signer"), [data-testid="add-signer"]')
      await addSignerButton.first().click()

      // Fill in signer details
      const emailInput = page.locator('input[name*="email"], input[placeholder*="email" i]').last()
      const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').last()

      await emailInput.fill('test.signer@example.com')
      await nameInput.fill('Test Signer')

      // Verify signer was added
      await expect(page.locator('text=test.signer@example.com')).toBeVisible()
    })

    test('should validate required fields before sending', async ({ page }) => {
      // Navigate to payment applications
      await page.goto('/payment-applications')
      await page.waitForLoadState('networkidle')

      // Open first payment app and signature dialog
      const firstPayApp = page.locator('[data-testid="payment-app-card"]').first()
      const hasPayApps = await firstPayApp.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPayApps) {
        test.skip()
        return
      }

      await firstPayApp.click()

      const sendButton = page.locator('button:has-text("Send for Signature")').first()
      const hasButton = await sendButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasButton) {
        test.skip()
        return
      }

      await sendButton.click()

      // Try to send without signers
      const submitButton = page.locator(
        'button[type="submit"]:has-text("Send"), button:has-text("Send Envelope")'
      )

      const isSubmitVisible = await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)

      if (isSubmitVisible) {
        await submitButton.first().click()

        // Should show validation error
        await expect(
          page.locator('text=/required|at least one signer|add signer/i')
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test('should successfully create envelope with valid data', async ({ page }) => {
      // Navigate to payment applications
      await page.goto('/payment-applications')
      await page.waitForLoadState('networkidle')

      // Open first payment app
      const firstPayApp = page.locator('[data-testid="payment-app-card"]').first()
      const hasPayApps = await firstPayApp.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPayApps) {
        test.skip()
        return
      }

      await firstPayApp.click()

      // Open send for signature dialog
      const sendButton = page.locator('button:has-text("Send for Signature")').first()
      const hasButton = await sendButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasButton) {
        test.skip()
        return
      }

      await sendButton.click()

      // Add signer
      const addSignerButton = page.locator('button:has-text("Add Signer")').first()
      await addSignerButton.click()

      // Fill signer details
      const emailInput = page.locator('input[name*="email"]').last()
      const nameInput = page.locator('input[name*="name"]').last()

      await emailInput.fill('e2e.test@example.com')
      await nameInput.fill('E2E Test Signer')

      // Submit
      const submitButton = page.locator('button[type="submit"]:has-text("Send")').first()
      await submitButton.click()

      // Should show success message
      await expect(
        page.locator('text=/sent|success|envelope created/i')
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Envelope Management', () => {
    test('should display DocuSign dashboard', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')

      // Should show dashboard
      await expect(
        page.locator('text=/DocuSign|Envelopes|Signatures/i').first()
      ).toBeVisible({ timeout: 10000 })
    })

    test('should show envelope list', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Should show envelope list or empty state
      const envelopeList = page.locator(
        '[data-testid="envelope-list"], .envelope-list, text=/No envelopes|Envelope|Status/i'
      )
      await expect(envelopeList.first()).toBeVisible({ timeout: 10000 })
    })

    test('should display envelope status badges', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Look for status badges
      const statusBadge = page.locator(
        '[data-testid="envelope-status"], .badge, text=/sent|completed|pending|declined/i'
      )

      const hasBadges = await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (hasBadges) {
        // At least one badge should be visible
        expect(await statusBadge.count()).toBeGreaterThan(0)
      }
    })

    test('should view envelope details', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Find first envelope
      const firstEnvelope = page.locator('[data-testid="envelope-card"], .envelope-item').first()
      const hasEnvelopes = await firstEnvelope.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasEnvelopes) {
        test.skip()
        return
      }

      // Click envelope
      await firstEnvelope.click()

      // Should show envelope details
      await expect(
        page.locator('text=/Envelope|Recipients|Status|Document/i')
      ).toBeVisible({ timeout: 10000 })
    })

    test('should show envelope statistics', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Should show stats
      const statsSection = page.locator(
        '[data-testid="envelope-stats"], .stats, text=/Total|Pending|Completed/i'
      )
      await expect(statsSection.first()).toBeVisible({ timeout: 10000 })
    })

    test('should allow voiding pending envelope', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Find a pending envelope
      const pendingEnvelope = page.locator(
        '[data-testid="envelope-card"]:has-text("Pending"), [data-testid="envelope-card"]:has-text("Sent")'
      ).first()

      const hasPending = await pendingEnvelope.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPending) {
        test.skip()
        return
      }

      // Click envelope
      await pendingEnvelope.click()

      // Look for void button
      const voidButton = page.locator('button:has-text("Void"), button:has-text("Cancel Envelope")')
      const hasVoidButton = await voidButton.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (hasVoidButton) {
        await voidButton.first().click()

        // Confirm void
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
        await confirmButton.first().click()

        // Should show success
        await expect(
          page.locator('text=/voided|cancelled|success/i')
        ).toBeVisible({ timeout: 10000 })
      }
    })

    test('should allow resending envelope', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Find a sent envelope
      const sentEnvelope = page.locator(
        '[data-testid="envelope-card"]:has-text("Sent")'
      ).first()

      const hasSent = await sentEnvelope.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasSent) {
        test.skip()
        return
      }

      // Click envelope
      await sentEnvelope.click()

      // Look for resend button
      const resendButton = page.locator('button:has-text("Resend"), button:has-text("Send Reminder")')
      const hasResendButton = await resendButton.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (hasResendButton) {
        await resendButton.first().click()

        // Should show success
        await expect(
          page.locator('text=/resent|reminder sent|success/i')
        ).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Disconnect', () => {
    test('should allow disconnecting DocuSign', async ({ page }) => {
      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')
      await page.waitForLoadState('networkidle')

      // Look for disconnect button (only visible when connected)
      const disconnectButton = page.locator(
        'button:has-text("Disconnect"), button:has-text("Remove Connection")'
      )

      const hasDisconnect = await disconnectButton.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasDisconnect) {
        // Not connected, skip
        test.skip()
        return
      }

      // Click disconnect
      await disconnectButton.first().click()

      // Confirm disconnect
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Disconnect")'
      )
      await confirmButton.last().click()

      // Should show success and connect button again
      await expect(
        page.locator('button:has-text("Connect"), text=/disconnected|removed/i')
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should have accessible form labels', async ({ page }) => {
      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')

      // Check for accessible labels
      const labels = page.locator('label')
      const labelCount = await labels.count()

      // Should have labels for form inputs
      expect(labelCount).toBeGreaterThan(0)
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Navigate to DocuSign dashboard
      await page.goto('/docusign')
      await page.waitForLoadState('networkidle')

      // Press Tab to navigate
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Should be able to navigate with keyboard
      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(['BUTTON', 'A', 'INPUT']).toContain(focused)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Block API requests to simulate network error
      await context.route('**/api/docusign/**', (route) => {
        route.abort('failed')
      })

      // Navigate to DocuSign dashboard
      await page.goto('/docusign')

      // Should show error state
      await expect(
        page.locator('text=/error|failed|try again/i')
      ).toBeVisible({ timeout: 10000 })
    })

    test('should show error when connection fails', async ({ page, context }) => {
      // Mock connection failure
      await context.route('**/api/docusign/connection/initiate', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Connection failed' }),
        })
      })

      // Navigate to DocuSign settings
      await page.goto('/settings/integrations/docusign')

      // Try to connect
      const connectButton = page.locator('button:has-text("Connect")').first()
      const hasConnect = await connectButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (hasConnect) {
        await connectButton.click()

        // Should show error
        await expect(
          page.locator('text=/error|failed|try again/i')
        ).toBeVisible({ timeout: 5000 })
      }
    })
  })
})
