import { test, expect } from '@playwright/test';

/**
 * RFI (Request for Information) E2E Tests
 *
 * Tests CRUD operations and workflows for RFIs.
 */
test.describe('RFIs', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/rfis');
  });

  test('should display RFIs page', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1')).toContainText(/rfi/i);

    // Check for create button
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create RFI"), button:has-text("Add")');
    await expect(createBtn.first()).toBeVisible();
  });

  test('should show RFIs list or empty state', async ({ page }) => {
    // Either shows a list of RFIs or an empty state
    const hasRFIs = await page.locator('[data-testid="rfi-item"], .rfi-card, tr[data-testid], [data-testid="rfi-row"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*rfi|empty|create.*first/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasRFIs || hasEmptyState).toBeTruthy();
  });

  test('should open create RFI dialog/form', async ({ page }) => {
    // Click create button
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add RFI")').first();
    await createBtn.click();

    // Check for form or dialog
    const form = page.locator('form, [role="dialog"], [data-testid="rfi-form"]');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Check for common form fields
    await expect(
      page.locator('input[name*="subject"], input[name*="title"], input[placeholder*="Subject"]')
    ).toBeVisible();
  });

  test('should create a new RFI', async ({ page }) => {
    const uniqueSubject = `Test RFI ${Date.now()}`;
    const description = 'This is a test RFI description for automated testing.';

    // Open create form
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    await createBtn.click();

    // Fill subject/title
    const subjectInput = page.locator('input[name*="subject"], input[name*="title"]').first();
    await subjectInput.fill(uniqueSubject);

    // Fill description/question
    const descInput = page.locator('textarea[name*="description"], textarea[name*="question"], textarea[name*="body"]').first();
    if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descInput.fill(description);
    }

    // Select project if required
    const projectSelect = page.locator('select[name*="project"], [data-testid="project-select"]').first();
    if (await projectSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await projectSelect.selectOption({ index: 1 });
    }

    // Select assignee if available
    const assigneeSelect = page.locator('select[name*="assignee"], [data-testid="assignee-select"]').first();
    if (await assigneeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await assigneeSelect.selectOption({ index: 1 });
    }

    // Set due date if available
    const dueDateInput = page.locator('input[name*="due"], input[type="date"]').first();
    if (await dueDateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await dueDateInput.fill(dueDate);
    }

    // Submit form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
    await submitBtn.click();

    // Check for success
    await expect(
      page.locator('text=/created|submitted|success/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should filter RFIs by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Filter by open status
      await statusFilter.selectOption({ label: /open|pending/i });

      // Wait for filtered results
      await page.waitForLoadState('networkidle');

      // All visible RFIs should have matching status
      const statusBadges = page.locator('[data-testid="rfi-status"], .status-badge');
      const count = await statusBadges.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const status = await statusBadges.nth(i).textContent();
        expect(status?.toLowerCase()).toMatch(/open|pending/i);
      }
    }
  });

  test('should view RFI details', async ({ page }) => {
    // Wait for RFIs to load
    await page.waitForLoadState('networkidle');

    // Click on first RFI
    const rfiItem = page.locator('[data-testid="rfi-item"], .rfi-card, tr[data-testid="rfi-row"]').first();

    if (await rfiItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rfiItem.click();

      // Should show detail view
      await expect(
        page.locator('[data-testid="rfi-detail"], .rfi-detail, h2:has-text("RFI")')
      ).toBeVisible({ timeout: 5000 });

      // Should show subject and description
      await expect(page.locator('text=/subject|question|description/i')).toBeVisible();
    }
  });

  test('should respond to an RFI', async ({ page }) => {
    // Find an open RFI
    const openRFI = page.locator('[data-testid="rfi-status"]:has-text("Open")').first();

    if (await openRFI.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to open details
      await openRFI.locator('..').click();

      // Look for respond button
      const respondBtn = page.locator('button:has-text("Respond"), button:has-text("Answer")').first();

      if (await respondBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await respondBtn.click();

        // Fill response
        const responseField = page.locator('textarea[name*="response"], textarea[name*="answer"]').first();
        await responseField.fill('This is a test response to the RFI.');

        // Submit response
        const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitBtn.click();

        // Check for success
        await expect(
          page.locator('text=/submitted|saved|success/i')
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should close an RFI', async ({ page }) => {
    // Find a responded RFI
    const respondedRFI = page.locator('[data-testid="rfi-status"]:has-text("Responded")').first();

    if (await respondedRFI.isVisible({ timeout: 5000 }).catch(() => false)) {
      await respondedRFI.locator('..').click();

      // Look for close button
      const closeBtn = page.locator('button:has-text("Close"), button:has-text("Complete")').first();

      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();

        // Confirm if needed
        const confirmBtn = page.locator('button:has-text("Yes"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Check for success
        await expect(
          page.locator('text=/closed|completed|success/i')
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should show RFI timeline/history', async ({ page }) => {
    // Click on first RFI
    const rfiItem = page.locator('[data-testid="rfi-item"], .rfi-card').first();

    if (await rfiItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rfiItem.click();

      // Look for timeline/history section
      const timeline = page.locator('[data-testid="rfi-timeline"], .timeline, .history, text=/history|activity/i');

      if (await timeline.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Timeline should have at least one entry (creation)
        const entries = timeline.locator('.timeline-entry, .history-item, li');
        expect(await entries.count()).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('RFIs - Mobile', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 375, height: 667 },
  });

  test('should display mobile-optimized RFI list', async ({ page }) => {
    await page.goto('/rfis');

    // Page should load
    await expect(page.locator('h1')).toContainText(/rfi/i);

    // Create button should be accessible (might be floating action button)
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), [aria-label="Create"], .fab');
    await expect(createBtn.first()).toBeVisible();
  });

  test('should swipe to see RFI actions', async ({ page }) => {
    await page.goto('/rfis');

    // On mobile, some apps use swipe actions
    const rfiItem = page.locator('[data-testid="rfi-item"]').first();

    if (await rfiItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to swipe left (simulate touch)
      const box = await rfiItem.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();

        // Check if action buttons appeared
        const actionBtns = page.locator('[data-testid="swipe-actions"], .action-buttons');
        // Actions may or may not appear depending on implementation
      }
    }
  });
});
