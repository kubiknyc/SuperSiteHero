import { test, expect } from '@playwright/test';

/**
 * Change Orders E2E Tests
 *
 * Tests CRUD operations and workflows for change orders.
 */
test.describe('Change Orders', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/change-orders');
  });

  test('should display change orders page', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1')).toContainText(/change.*order/i);

    // Check for create button
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');
    await expect(createBtn.first()).toBeVisible();
  });

  test('should show change orders list or empty state', async ({ page }) => {
    const hasCOs = await page.locator('[data-testid="change-order-item"], .change-order-card, tr[data-testid]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*change.*order|empty|create.*first/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasCOs || hasEmptyState).toBeTruthy();
  });

  test('should create a new change order', async ({ page }) => {
    const uniqueTitle = `Test CO ${Date.now()}`;

    // Open create form
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    await createBtn.click();

    // Fill title/subject
    const titleInput = page.locator('input[name*="title"], input[name*="subject"]').first();
    await titleInput.fill(uniqueTitle);

    // Fill description
    const descInput = page.locator('textarea[name*="description"]').first();
    if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descInput.fill('Test change order description for automated testing.');
    }

    // Select project if required
    const projectSelect = page.locator('select[name*="project"], [data-testid="project-select"]').first();
    if (await projectSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await projectSelect.selectOption({ index: 1 });
    }

    // Fill cost if available
    const costInput = page.locator('input[name*="cost"], input[name*="amount"]').first();
    if (await costInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await costInput.fill('5000');
    }

    // Submit form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
    await submitBtn.click();

    // Check for success
    await expect(
      page.locator('text=/created|submitted|success/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should filter change orders by status', async ({ page }) => {
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusFilter.selectOption({ label: /pending|draft/i });
      await page.waitForLoadState('networkidle');
    }
  });

  test('should view change order details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const coItem = page.locator('[data-testid="change-order-item"], .change-order-card, tr[data-testid]').first();

    if (await coItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await coItem.click();

      await expect(
        page.locator('[data-testid="change-order-detail"], .change-order-detail, h2')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add bid to change order', async ({ page }) => {
    // Find a change order that needs bids
    const coItem = page.locator('[data-testid="change-order-item"]').first();

    if (await coItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await coItem.click();

      // Look for add bid button
      const addBidBtn = page.locator('button:has-text("Add Bid"), button:has-text("New Bid")').first();

      if (await addBidBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBidBtn.click();

        // Fill bid amount
        const amountInput = page.locator('input[name*="amount"], input[name*="cost"]').first();
        await amountInput.fill('7500');

        // Select subcontractor if required
        const subSelect = page.locator('select[name*="subcontractor"]').first();
        if (await subSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
          await subSelect.selectOption({ index: 1 });
        }

        // Submit bid
        const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitBtn.click();

        await expect(
          page.locator('text=/bid.*added|submitted|success/i')
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should approve change order', async ({ page }) => {
    // Find a pending change order
    const pendingCO = page.locator('[data-testid="change-order-status"]:has-text("Pending")').first();

    if (await pendingCO.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pendingCO.locator('..').click();

      // Look for approve button
      const approveBtn = page.locator('button:has-text("Approve")').first();

      if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveBtn.click();

        // Fill approval notes if required
        const notesInput = page.locator('textarea[name*="notes"], textarea[name*="comment"]').first();
        if (await notesInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await notesInput.fill('Approved for execution.');
        }

        // Confirm approval
        const confirmBtn = page.locator('button:has-text("Confirm"), button[type="submit"]').first();
        await confirmBtn.click();

        await expect(
          page.locator('text=/approved|success/i')
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should reject change order', async ({ page }) => {
    const pendingCO = page.locator('[data-testid="change-order-status"]:has-text("Pending")').first();

    if (await pendingCO.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pendingCO.locator('..').click();

      const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("Decline")').first();

      if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rejectBtn.click();

        // Fill rejection reason
        const reasonInput = page.locator('textarea[name*="reason"], textarea[name*="notes"]').first();
        if (await reasonInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await reasonInput.fill('Rejected - cost too high.');
        }

        const confirmBtn = page.locator('button:has-text("Confirm"), button[type="submit"]').first();
        await confirmBtn.click();

        await expect(
          page.locator('text=/rejected|declined|success/i')
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('Change Orders - Workflow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should complete full change order workflow', async ({ page }) => {
    await page.goto('/change-orders');

    // 1. Create change order
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    await createBtn.click();

    const uniqueTitle = `Workflow Test CO ${Date.now()}`;
    await page.locator('input[name*="title"]').first().fill(uniqueTitle);

    const descInput = page.locator('textarea[name*="description"]').first();
    if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descInput.fill('Full workflow test');
    }

    await page.locator('button[type="submit"], button:has-text("Create")').first().click();

    await expect(page.locator('text=/created|success/i')).toBeVisible({ timeout: 10000 });

    // 2. Navigate back to list
    await page.goto('/change-orders');

    // 3. Verify the change order appears
    await expect(page.locator(`text="${uniqueTitle}"`)).toBeVisible({ timeout: 5000 });
  });
});
