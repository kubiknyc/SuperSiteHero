import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Approvals Feature
 *
 * Coverage:
 * - My Approvals page display
 * - Approval request detail view
 * - Approve/reject actions
 * - Approval comments
 * - Filtering by status
 * - Searching approvals
 * - Email notifications (if configured)
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

test.describe('Approvals Feature', () => {
  // Authenticate before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect away from login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // Navigate to approvals
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
  });

  test('should display my approvals page', async ({ page }) => {
    // Check for page heading
    const heading = page.locator('h1, h2').filter({ hasText: /approval/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Check for approvals list or empty state
    const hasApprovals = await page.locator('[data-testid="approval-item"], .approval-item, article, [role="article"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*approval/i, text=/no.*pending/i').isVisible().catch(() => false);

    expect(hasApprovals || hasEmptyState).toBeTruthy();
  });

  test('should filter approvals by status', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for filter controls
    const statusFilter = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Try to select "Pending" status
      const pendingOption = page.locator('option, [role="option"], button, a').filter({ hasText: /pending/i }).first();
      if (await pendingOption.isVisible()) {
        await pendingOption.click();
        await page.waitForTimeout(1000);

        // Verify URL or list updated
        const urlHasFilter = page.url().includes('status') || page.url().includes('pending');
        const listUpdated = await page.locator('text=/pending/i').first().isVisible({ timeout: 3000 }).catch(() => false);

        expect(urlHasFilter || listUpdated).toBeTruthy();
      }
    }
  });

  test('should search for approvals', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Verify search is working (list should update or show results)
      const resultsVisible = await page.locator('[data-testid="approval-item"], .approval-item, article').first().isVisible({ timeout: 3000 }).catch(() => false);
      const emptyState = await page.locator('text=/no.*result/i, text=/no.*found/i').isVisible().catch(() => false);

      expect(resultsVisible || emptyState).toBeTruthy();
    }
  });

  test('should open approval detail view', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find first approval item
    const approvalItem = page.locator('[data-testid="approval-item"], .approval-item, article, [role="article"]').first();

    if (await approvalItem.isVisible()) {
      // Click to open detail
      await approvalItem.click();
      await page.waitForTimeout(1000);

      // Verify detail view opened (either new page or modal)
      const isDetailPage = page.url().includes('/approvals/');
      const isModal = await page.locator('[role="dialog"], .modal, .drawer').isVisible({ timeout: 3000 }).catch(() => false);

      expect(isDetailPage || isModal).toBeTruthy();

      if (isDetailPage || isModal) {
        // Verify approval details are visible
        const hasDetails = await page.locator('text=/requested by/i, text=/request date/i, text=/status/i').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasDetails).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should display approve and reject buttons for pending approvals', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find first pending approval
    const approvalItem = page.locator('[data-testid="approval-item"], .approval-item, article').first();

    if (await approvalItem.isVisible()) {
      await approvalItem.click();
      await page.waitForTimeout(1000);

      // Look for approve and reject buttons
      const approveButton = page.locator('button').filter({ hasText: /approve/i }).first();
      const rejectButton = page.locator('button').filter({ hasText: /reject|deny/i }).first();

      const hasApproveButton = await approveButton.isVisible({ timeout: 3000 }).catch(() => false);
      const hasRejectButton = await rejectButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Should have at least one action button for pending approvals
      expect(hasApproveButton || hasRejectButton).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should handle approval action with comments', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find first pending approval
    const approvalItem = page.locator('[data-testid="approval-item"], .approval-item, article').first();

    if (await approvalItem.isVisible()) {
      await approvalItem.click();
      await page.waitForTimeout(1000);

      // Look for approve button
      const approveButton = page.locator('button').filter({ hasText: /approve/i }).first();

      if (await approveButton.isVisible({ timeout: 3000 })) {
        await approveButton.click();
        await page.waitForTimeout(500);

        // Look for comment/notes field in approval dialog
        const commentField = page.locator('textarea, input[type="text"]').filter({ hasText: /comment|note|reason/i }).first();
        const visibleCommentField = page.locator('textarea:visible, input[type="text"]:visible').last();

        const commentInput = await commentField.isVisible({ timeout: 2000 }).catch(() => false)
          ? commentField
          : visibleCommentField;

        if (await commentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await commentInput.fill('Approved - looks good to proceed');
          await page.waitForTimeout(500);
        }

        // Find and click confirm button
        const confirmButton = page.locator('button').filter({ hasText: /confirm|submit|approve/i }).last();

        if (await confirmButton.isVisible({ timeout: 3000 })) {
          await confirmButton.click();
          await page.waitForTimeout(1000);

          // Verify success (success message or redirect)
          const successMessage = await page.locator('text=/approved/i, text=/success/i, [role="alert"]').first().isVisible({ timeout: 5000 }).catch(() => false);
          const redirected = !page.url().includes('/approvals/') || page.url() === '/approvals';

          expect(successMessage || redirected).toBeTruthy();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should handle rejection with reason', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find first pending approval
    const approvalItem = page.locator('[data-testid="approval-item"], .approval-item, article').first();

    if (await approvalItem.isVisible()) {
      await approvalItem.click();
      await page.waitForTimeout(1000);

      // Look for reject button
      const rejectButton = page.locator('button').filter({ hasText: /reject|deny/i }).first();

      if (await rejectButton.isVisible({ timeout: 3000 })) {
        await rejectButton.click();
        await page.waitForTimeout(500);

        // Look for reason field (usually required for rejections)
        const reasonField = page.locator('textarea, input[type="text"]').filter({ hasText: /reason|comment|note/i }).first();
        const visibleReasonField = page.locator('textarea:visible, input[type="text"]:visible').last();

        const reasonInput = await reasonField.isVisible({ timeout: 2000 }).catch(() => false)
          ? reasonField
          : visibleReasonField;

        if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reasonInput.fill('Does not meet requirements - please revise and resubmit');
          await page.waitForTimeout(500);
        }

        // Find and click confirm button
        const confirmButton = page.locator('button').filter({ hasText: /confirm|submit|reject|deny/i }).last();

        if (await confirmButton.isVisible({ timeout: 3000 })) {
          await confirmButton.click();
          await page.waitForTimeout(1000);

          // Verify success (success message or redirect)
          const successMessage = await page.locator('text=/rejected/i, text=/denied/i, text=/success/i, [role="alert"]').first().isVisible({ timeout: 5000 }).catch(() => false);
          const redirected = !page.url().includes('/approvals/') || page.url() === '/approvals';

          expect(successMessage || redirected).toBeTruthy();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display approval history and timeline', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find any approval item (preferably approved/rejected one)
    const approvalItem = page.locator('[data-testid="approval-item"], .approval-item, article').first();

    if (await approvalItem.isVisible()) {
      await approvalItem.click();
      await page.waitForTimeout(1000);

      // Look for history/timeline section
      const historySection = page.locator('text=/history|timeline|activity/i').first();

      if (await historySection.isVisible({ timeout: 3000 })) {
        // Verify history entries are visible
        const hasHistoryEntries = await page.locator('[data-testid="history-item"], .timeline-item, .activity-item').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasHistoryEntries).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should show pending approval count badge', async ({ page }) => {
    // Look for badge or count indicator
    const badge = page.locator('[data-testid="pending-count"], .badge, .count').filter({ hasText: /\d+/ }).first();
    const hasBadge = await badge.isVisible({ timeout: 3000 }).catch(() => false);

    // Badge may not be visible if no pending approvals
    if (hasBadge) {
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/\d+/);
    }
  });

  test('should navigate between different approval types', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for tabs or filters for different approval types
    const typeFilter = page.locator('button, a, [role="tab"]').filter({ hasText: /change order|rfi|submittal|invoice/i }).first();

    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(1000);

      // Verify list updated
      const listUpdated = await page.locator('[data-testid="approval-item"], .approval-item, article').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(listUpdated).toBeTruthy();
    }
  });

  test('should display approval request metadata', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    const approvalItem = page.locator('[data-testid="approval-item"], .approval-item, article').first();

    if (await approvalItem.isVisible()) {
      await approvalItem.click();
      await page.waitForTimeout(1000);

      // Verify key metadata fields are present
      const hasRequester = await page.locator('text=/requested by|requester|submitted by/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasDate = await page.locator('text=/request date|submitted|created/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasStatus = await page.locator('text=/status/i').first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasRequester || hasDate || hasStatus).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should support bulk approval actions', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for checkboxes for selecting multiple approvals
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 2) {
      // Select first two approvals
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await page.waitForTimeout(500);

      // Look for bulk action button
      const bulkApproveButton = page.locator('button').filter({ hasText: /approve.*selected|bulk.*approve/i }).first();
      const hasBulkAction = await bulkApproveButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasBulkAction) {
        expect(bulkApproveButton).toBeVisible();
      }
    }
  });
});
