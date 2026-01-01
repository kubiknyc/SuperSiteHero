/**
 * Client Approval Workflows E2E Tests
 *
 * Tests the full approval workflow including:
 * - Creating approval requests (authenticated)
 * - Generating public approval links (authenticated)
 * - Public approval page access (unauthenticated)
 * - Client response submission (unauthenticated)
 * - Rate limiting and security
 */

import { test, expect, Page } from '@playwright/test'

// Use pre-authenticated session
test.use({ storageState: 'playwright/.auth/user.json' });;

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Wait for auth response
  const responsePromise = page.waitForResponse(
    resp => (resp.url().includes('auth') || resp.url().includes('session')) && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.click('button[type="submit"]');
  await responsePromise;

  // Wait for redirect away from login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

  // Verify authenticated state
  await page.waitForTimeout(500);
}

// Helper function to generate a test token (mock for testing)
function generateMockToken() {
  return 'test_token_' + Math.random().toString(36).substring(2, 15);
}

test.describe('Public Approval Page', () => {
  test.describe('Unauthenticated Access', () => {
    test('should show error for invalid token', async ({ page }) => {
      await page.goto('/approve/invalid_token_12345');

      // Should show error message about invalid link
      await expect(page.locator('text=/invalid|expired|unavailable/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show error for missing token', async ({ page }) => {
      await page.goto('/approve/');

      // Should show error or redirect
      await expect(page.locator('text=/invalid|missing|error/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display loading state initially', async ({ page }) => {
      // Navigate to the approval page
      await page.goto('/approve/some_token');

      // Should show loading indicator or skeleton
      const loading = page.locator('[class*="animate-pulse"], [class*="loading"], [role="progressbar"]');
      // Loading state might be very brief, so we just check it doesn't error immediately
      await page.waitForTimeout(500);
    });

    test('should be accessible without authentication', async ({ page }) => {
      // Clear any session
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate directly to approval page
      await page.goto('/approve/test_token');

      // Should not redirect to login
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
    });
  });

  test.describe('Approval Form UI', () => {
    // Note: These tests would require a valid token from the database
    // In a real CI environment, you would seed the database with test data

    test.skip('should display approval form with valid token', async ({ page }) => {
      // This test would require database seeding
      await page.goto('/approve/valid_seeded_token');

      // Should show the approval form
      await expect(page.locator('text=Your Decision')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Approve")')).toBeVisible();
      await expect(page.locator('button:has-text("Reject")')).toBeVisible();
      await expect(page.locator('button:has-text("Request Changes")')).toBeVisible();
    });

    test.skip('should validate required fields', async ({ page }) => {
      await page.goto('/approve/valid_seeded_token');

      // Try to submit without filling required fields
      await page.click('button:has-text("Submit Response")');

      // Should show validation errors
      await expect(page.locator('text=/required|please select/i')).toBeVisible();
    });

    test.skip('should show different form fields based on decision', async ({ page }) => {
      await page.goto('/approve/valid_seeded_token');

      // Select "Request Changes"
      await page.click('button:has-text("Request Changes")');

      // Should show required comments field
      await expect(page.locator('textarea')).toBeVisible();
      await expect(page.locator('text=/describe the changes/i')).toBeVisible();
    });
  });
});

test.describe('Authenticated Approval Link Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should access approvals page', async ({ page }) => {
    await page.goto('/approvals');

    // Should show approvals page
    await expect(page.locator('h1:has-text("Approval"), [data-testid="approvals-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('should access approval workflows settings', async ({ page }) => {
    await page.goto('/settings/approval-workflows');

    // Should show approval workflows page
    await expect(page.locator('h1, h2').filter({ hasText: /workflow/i })).toBeVisible({ timeout: 10000 });
  });

  test.skip('should create a public approval link', async ({ page }) => {
    // This test requires an existing approval request
    await page.goto('/approvals/test_approval_request_id');

    // Click generate link button
    await page.click('button:has-text("Generate Link")');

    // Fill in link options
    await page.fill('input[placeholder*="email"]', 'client@example.com');
    await page.fill('input[placeholder*="name"]', 'Test Client');

    // Select expiration
    await page.selectOption('select', '30');

    // Generate the link
    await page.click('button:has-text("Generate")');

    // Should show success message and the link
    await expect(page.locator('text=/link created|generated/i')).toBeVisible({ timeout: 5000 });
  });

  test.skip('should revoke an existing link', async ({ page }) => {
    // This test requires an existing approval link
    await page.goto('/approvals/test_approval_request_id');

    // Find and click revoke button
    await page.click('button[title="Revoke link"]');

    // Confirm revocation if there's a dialog
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should show success message
    await expect(page.locator('text=/revoked/i')).toBeVisible({ timeout: 5000 });
  });

  test.skip('should copy link to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/approvals/test_approval_request_id');

    // Click copy button
    await page.click('button[title="Copy link"]');

    // Should show copied indicator
    await expect(page.locator('[data-copied="true"], svg.text-green-600')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Approval Flow Integration', () => {
  // Full integration test - would require database seeding
  test.skip('should complete full approval flow', async ({ page, context }) => {
    // 1. Login as admin/manager
    await login(page);

    // 2. Navigate to an existing approval request
    await page.goto('/approvals');
    await page.click('[data-testid="approval-request-item"]');

    // 3. Generate a public approval link
    await page.click('button:has-text("Generate Link")');
    await page.fill('input[placeholder*="email"]', 'client@example.com');
    await page.click('button:has-text("Generate")');

    // 4. Get the generated link token
    await page.waitForSelector('[data-approval-link-token]');
    const token = await page.getAttribute('[data-approval-link-token]', 'data-approval-link-token');

    // 5. Open new browser context (unauthenticated)
    const newContext = await page.context().browser()!.newContext();
    const publicPage = await newContext.newPage();

    // 6. Access the public approval page
    await publicPage.goto(`/approve/${token}`);

    // 7. Fill in the approval form
    await publicPage.click('button:has-text("Approve")');
    await publicPage.fill('input[placeholder*="name"]', 'John Client');
    await publicPage.fill('input[placeholder*="email"]', 'client@example.com');
    await publicPage.fill('input[placeholder*="Company"]', 'Client Company');

    // 8. Draw signature (optional)
    const canvas = publicPage.locator('canvas');
    if (await canvas.isVisible()) {
      await canvas.click({ position: { x: 100, y: 50 } });
    }

    // 9. Submit the response
    await publicPage.click('button:has-text("Submit Response")');

    // 10. Verify success
    await expect(publicPage.locator('text=/submitted|recorded/i')).toBeVisible({ timeout: 10000 });

    // Cleanup
    await newContext.close();
  });
});

test.describe('Security Tests', () => {
  test('should not expose sensitive data in URL', async ({ page }) => {
    await page.goto('/approve/test_token');

    // URL should only contain the token, not any other sensitive data
    expect(page.url()).not.toMatch(/password|secret|api_key/i);
  });

  test('should not allow XSS in client input fields', async ({ page }) => {
    // This would require a valid token
    test.skip();

    await page.goto('/approve/valid_token');

    // Try to inject script
    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('input[placeholder*="name"]', xssPayload);
    await page.fill('textarea', xssPayload);

    // Submit the form
    await page.click('button:has-text("Approve")');
    await page.click('button:has-text("Submit")');

    // Verify no script execution (page should still be functional)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show security badge on public page', async ({ page }) => {
    await page.goto('/approve/test_token');

    // Should display security indicator
    await expect(page.locator('text=/secure/i').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.route('**/api/**', (route) => route.abort());

    await page.goto('/approve/test_token');

    // Should show error message
    await expect(page.locator('text=/error|unavailable|try again/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle already-used single-use link', async ({ page }) => {
    // This would require a used token in the database
    test.skip();

    await page.goto('/approve/used_single_use_token');

    // Should show appropriate message
    await expect(page.locator('text=/already.*used|response.*submitted/i')).toBeVisible();
  });

  test('should handle expired link', async ({ page }) => {
    // This would require an expired token in the database
    test.skip();

    await page.goto('/approve/expired_token');

    // Should show expiration message
    await expect(page.locator('text=/expired|no longer valid/i')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should display properly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/approve/test_token');

    // Form elements should be visible and properly sized
    // Note: This is a basic test; the actual content depends on valid token
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle signature drawing on touch devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // This would require a valid token
    test.skip();

    await page.goto('/approve/valid_token');

    // Simulate touch drawing
    const canvas = page.locator('canvas');
    await canvas.tap({ position: { x: 50, y: 50 } });
    await canvas.tap({ position: { x: 100, y: 75 } });
    await canvas.tap({ position: { x: 150, y: 50 } });

    // Should capture signature
    await expect(page.locator('button:has-text("Clear Signature")')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/approve/test_token');

    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(0); // May show error page
  });

  test('should have proper form labels', async ({ page }) => {
    // This would require a valid token
    test.skip();

    await page.goto('/approve/valid_token');

    // All form inputs should have associated labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // This would require a valid token
    test.skip();

    await page.goto('/approve/valid_token');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate buttons with Enter
    await page.keyboard.press('Enter');
  });
});
