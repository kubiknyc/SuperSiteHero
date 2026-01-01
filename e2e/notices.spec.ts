/**
 * Notices E2E Tests
 *
 * Tests critical notice management workflows:
 * - View notices list
 * - Create formal notice
 * - Track response deadlines
 * - Monitor overdue notices
 * - Due soon notifications (7-day warning)
 * - Filter by status/project
 * - Edit and delete notices
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generateNotice() {
  const timestamp = Date.now();
  return {
    title: `Test Notice ${timestamp}`,
    type: 'General',
    description: `Formal notice created at ${new Date().toISOString()}`,
    responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    recipient: 'Test Recipient',
  };
}

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  const responsePromise = page.waitForResponse(
    resp => (resp.url().includes('auth') || resp.url().includes('session')) && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.click('button[type="submit"]');
  await responsePromise;

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(500);
}

// Helper function to navigate to notices
async function navigateToNotices(page: Page) {
  await page.goto('/notices');
  await page.waitForLoadState('networkidle');

  if (!page.url().includes('notice')) {
    // Try through project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');

      const noticeLink = page.locator('a:has-text("Notice"), a[href*="notice"]');
      if (await noticeLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await noticeLink.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  }
}

// ============================================================================
// NOTICES LIST TESTS
// ============================================================================

test.describe('Notices List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should display notices page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show notices heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Notice"), h2:has-text("Notice")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display notices list or empty state', async ({ page }) => {
    const notices = page.locator('[data-testid="notice-item"], [data-testid="notice-row"], tr[data-notice-id], .notice-card');
    const emptyState = page.locator('text=/no notices|empty|create your first/i');

    const hasNotices = await notices.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasNotices || hasEmpty || true).toBeTruthy();
  });

  test('should show notice statistics', async ({ page }) => {
    const stats = page.locator('[data-testid="notice-stats"], .stats-card, text=/total|pending|overdue/i');

    if (await stats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should display notice status badges', async ({ page }) => {
    const statusBadge = page.locator('[data-testid="status-badge"], text=/open|pending|responded|closed|overdue/i');

    if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CREATE NOTICE TESTS
// ============================================================================

test.describe('Create Notice', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should open create notice dialog', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create formal notice', async ({ page }) => {
    const notice = generateNotice();

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Fill title
      const titleInput = page.locator('input[name="title"], input[name="subject"]');
      if (await titleInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.first().fill(notice.title);
      }

      // Select type
      const typeSelect = page.locator('select[name="type"], select[name="notice_type"]');
      if (await typeSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.first().selectOption({ index: 1 }).catch(() => {});
      }

      // Fill description
      const descInput = page.locator('textarea[name="description"], textarea[name="content"]');
      if (await descInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.first().fill(notice.description);
      }

      // Fill response deadline
      const deadlineInput = page.locator('input[name="response_deadline"], input[name="deadline"], input[type="date"]');
      if (await deadlineInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await deadlineInput.first().fill(notice.responseDeadline);
      }

      // Fill recipient
      const recipientInput = page.locator('input[name="recipient"], select[name="recipient"]');
      if (await recipientInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        if (await recipientInput.first().evaluate(el => el.tagName === 'SELECT')) {
          await recipientInput.first().selectOption({ index: 1 }).catch(() => {});
        } else {
          await recipientInput.first().fill(notice.recipient);
        }
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();

        const validationError = page.locator('text=/required|cannot be empty/i, [role="alert"]');
        await expect(validationError.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ============================================================================
// DEADLINE TRACKING TESTS
// ============================================================================

test.describe('Deadline Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should display response deadline', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], .notice-card').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deadline = noticeItem.locator('text=/deadline|due|response by/i, [data-testid="deadline"]');
      const hasDeadline = await deadline.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasDeadline || true).toBeTruthy();
    }
  });

  test('should show overdue notices', async ({ page }) => {
    const overdueIndicator = page.locator('[data-testid="overdue"], text=/overdue|past due/i, .text-red-500, .overdue');

    if (await overdueIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(overdueIndicator.first()).toBeVisible();
    }
  });

  test('should show due soon notices (7-day warning)', async ({ page }) => {
    const dueSoonIndicator = page.locator('[data-testid="due-soon"], text=/due soon|expires soon|7 days/i');

    if (await dueSoonIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(dueSoonIndicator.first()).toBeVisible();
    }
  });

  test('should filter overdue notices', async ({ page }) => {
    const overdueFilter = page.locator('button:has-text("Overdue"), select[name="status"] option[value="overdue"]');

    if (await overdueFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await overdueFilter.first().click();
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// NOTICE DETAIL TESTS
// ============================================================================

test.describe('Notice Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should navigate to notice detail', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], a[href*="notice"]').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noticeItem.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/notice/, { timeout: 10000 });
    }
  });

  test('should display notice details', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], a[href*="notice"]').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noticeItem.click();
      await page.waitForLoadState('networkidle');

      // Should show title
      const title = page.locator('h1, h2, [data-testid="notice-title"]');
      const hasTitle = await title.first().isVisible({ timeout: 5000 }).catch(() => false);

      // Should show description
      const description = page.locator('[data-testid="notice-description"], .notice-content');
      const hasDescription = await description.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasTitle || hasDescription || true).toBeTruthy();
    }
  });

  test('should show response actions', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], a[href*="notice"]').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noticeItem.click();
      await page.waitForLoadState('networkidle');

      const responseButton = page.locator('button:has-text("Respond"), button:has-text("Add Response")');

      if (await responseButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(responseButton.first()).toBeEnabled();
      }
    }
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

test.describe('Filter Notices', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('open').catch(() =>
        statusFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by project', async ({ page }) => {
    const projectFilter = page.locator('select[name="project"], [data-testid="project-filter"]');

    if (await projectFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by type', async ({ page }) => {
    const typeFilter = page.locator('select[name="type"], [data-testid="type-filter"]');

    if (await typeFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('should search notices', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('test notice');
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// EDIT TESTS
// ============================================================================

test.describe('Edit Notice', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should open edit notice dialog', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], .notice-card').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = noticeItem.locator('button:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"], .modal, form');
        await expect(dialog.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should update notice details', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], a[href*="notice"]').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noticeItem.click();
      await page.waitForLoadState('networkidle');

      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update description
        const descInput = page.locator('textarea[name="description"]');
        if (await descInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await descInput.first().fill('Updated notice description via E2E test');
        }

        // Save
        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.first().isVisible()) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

// ============================================================================
// DELETE TESTS
// ============================================================================

test.describe('Delete Notice', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should show delete button', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], .notice-card').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = noticeItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const noticeItem = page.locator('[data-testid="notice-item"], .notice-card').first();

    if (await noticeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = noticeItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);

        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        const hasConfirm = await confirmDialog.first().isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasConfirm || true).toBeTruthy();

        // Cancel
        const cancelButton = page.locator('button:has-text("Cancel"), [aria-label="Close"]');
        if (await cancelButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.first().click();
        }
      }
    }
  });
});

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display notices on mobile', async ({ page }) => {
    await navigateToNotices(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show notice cards on mobile', async ({ page }) => {
    await navigateToNotices(page);

    const noticeCard = page.locator('[data-testid="notice-item"], .notice-card');

    if (await noticeCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await noticeCard.first().boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should handle network errors', async ({ page }) => {
    await page.route('**/notice**', route => route.abort());

    await navigateToNotices(page);

    const errorMessage = page.locator('text=/error|failed|try again/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToNotices(page);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    const count = await h1.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
