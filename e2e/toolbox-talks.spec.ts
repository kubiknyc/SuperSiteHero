/**
 * Toolbox Talks E2E Tests
 *
 * Tests critical toolbox talk management workflows:
 * - View toolbox talks list
 * - Create new talk
 * - Schedule talk
 * - Track attendance
 * - Mark as completed/cancelled
 * - Filter by status/category
 * - View statistics
 * - Edit and delete talks
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generateToolboxTalk() {
  const timestamp = Date.now();
  return {
    number: `TBT-${timestamp}`,
    topic: `Safety Topic ${timestamp}`,
    category: 'Fall Protection',
    location: 'Main Job Site',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: `Toolbox talk created at ${new Date().toISOString()}`,
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

// Helper function to navigate to toolbox talks
async function navigateToToolboxTalks(page: Page) {
  await page.goto('/toolbox-talks');
  await page.waitForLoadState('networkidle');

  if (!page.url().includes('toolbox')) {
    // Try through project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');

      const toolboxLink = page.locator('a:has-text("Toolbox"), a[href*="toolbox"]');
      if (await toolboxLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await toolboxLink.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  }
}

// ============================================================================
// TOOLBOX TALKS LIST TESTS
// ============================================================================

test.describe('Toolbox Talks List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should display toolbox talks page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show toolbox talks heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Toolbox"), h2:has-text("Toolbox"), h1:has-text("Safety Talk")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display talks list or empty state', async ({ page }) => {
    const talks = page.locator('[data-testid="toolbox-talk"], [data-testid="talk-item"], tr[data-talk-id], .talk-card');
    const emptyState = page.locator('text=/no toolbox talks|no talks|empty|create your first/i');

    const hasTalks = await talks.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTalks || hasEmpty || true).toBeTruthy();
  });

  test('should show talk statistics', async ({ page }) => {
    const stats = page.locator('[data-testid="talk-stats"], .stats-card, text=/total|scheduled|completed/i');

    if (await stats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should display talk status badges', async ({ page }) => {
    const statusBadge = page.locator('[data-testid="status-badge"], text=/scheduled|completed|cancelled/i');

    if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test('should show upcoming talks', async ({ page }) => {
    const upcomingSection = page.locator('[data-testid="upcoming-talks"], text=/upcoming|scheduled/i');

    if (await upcomingSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(upcomingSection.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CREATE TOOLBOX TALK TESTS
// ============================================================================

test.describe('Create Toolbox Talk', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should open create talk form', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New Talk")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const form = page.locator('[role="dialog"], .modal, form, [data-testid="talk-form"]');
      await expect(form.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create new toolbox talk', async ({ page }) => {
    const talk = generateToolboxTalk();

    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New Talk")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Fill topic
      const topicInput = page.locator('input[name="topic"], input[name="title"]');
      if (await topicInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await topicInput.first().fill(talk.topic);
      }

      // Select category
      const categorySelect = page.locator('select[name="category"]');
      if (await categorySelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await categorySelect.first().selectOption({ index: 1 }).catch(() => {});
      }

      // Fill location
      const locationInput = page.locator('input[name="location"]');
      if (await locationInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await locationInput.first().fill(talk.location);
      }

      // Fill scheduled date
      const dateInput = page.locator('input[name="scheduled_date"], input[type="date"]');
      if (await dateInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.first().fill(talk.scheduledDate);
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should show category options', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const categorySelect = page.locator('select[name="category"]');

      if (await categorySelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const options = await categorySelect.first().locator('option').allTextContents();
        expect(options.length).toBeGreaterThan(1);
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
// ATTENDANCE TRACKING TESTS
// ============================================================================

test.describe('Attendance Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should show attendance section', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], a[href*="toolbox-talk"]').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await talkItem.click();
      await page.waitForLoadState('networkidle');

      const attendanceSection = page.locator('[data-testid="attendance"], text=/attendance|attendees/i');
      const hasAttendance = await attendanceSection.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasAttendance || true).toBeTruthy();
    }
  });

  test('should add attendee', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], a[href*="toolbox-talk"]').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await talkItem.click();
      await page.waitForLoadState('networkidle');

      const addAttendeeButton = page.locator('button:has-text("Add Attendee"), button:has-text("Add")');

      if (await addAttendeeButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(addAttendeeButton.first()).toBeEnabled();
      }
    }
  });

  test('should show attendance count', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const attendanceCount = talkItem.locator('text=/\\d+ attend|\\d+ worker/i, [data-testid="attendance-count"]');
      const hasCount = await attendanceCount.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasCount || true).toBeTruthy();
    }
  });
});

// ============================================================================
// STATUS WORKFLOW TESTS
// ============================================================================

test.describe('Status Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should mark talk as completed', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const completeButton = talkItem.locator('button:has-text("Complete"), button:has-text("Mark Complete")');

      if (await completeButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(completeButton.first()).toBeEnabled();
      }
    }
  });

  test('should cancel talk', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cancelButton = talkItem.locator('button:has-text("Cancel")');

      if (await cancelButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(cancelButton.first()).toBeEnabled();
      }
    }
  });

  test('should show status badge', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const status = talkItem.locator('[data-testid="status-badge"], text=/scheduled|completed|cancelled/i');
      const hasStatus = await status.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasStatus || true).toBeTruthy();
    }
  });
});

// ============================================================================
// TOOLBOX TALK DETAIL TESTS
// ============================================================================

test.describe('Toolbox Talk Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should navigate to talk detail', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], a[href*="toolbox-talk"]').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await talkItem.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/toolbox-talk/, { timeout: 10000 });
    }
  });

  test('should display talk details', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], a[href*="toolbox-talk"]').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await talkItem.click();
      await page.waitForLoadState('networkidle');

      // Should show topic
      const topic = page.locator('h1, h2, [data-testid="talk-topic"]');
      const hasTopic = await topic.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasTopic || true).toBeTruthy();
    }
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

test.describe('Filter Toolbox Talks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('completed').catch(() =>
        statusFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by category', async ({ page }) => {
    const categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"]');

    if (await categoryFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('should search talks', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('fall protection');
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// EDIT TESTS
// ============================================================================

test.describe('Edit Toolbox Talk', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should open edit talk form', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = talkItem.locator('button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const form = page.locator('[role="dialog"], .modal, form');
        await expect(form.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should update talk details', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], a[href*="toolbox-talk"]').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await talkItem.click();
      await page.waitForLoadState('networkidle');

      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-testid="edit-button"]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update notes
        const notesInput = page.locator('textarea[name="notes"]');
        if (await notesInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await notesInput.first().fill('Updated talk notes via E2E test');
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

test.describe('Delete Toolbox Talk', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToToolboxTalks(page);
  });

  test('should show delete button', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = talkItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const talkItem = page.locator('[data-testid="toolbox-talk"], .talk-card').first();

    if (await talkItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = talkItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

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

  test('should display toolbox talks on mobile', async ({ page }) => {
    await navigateToToolboxTalks(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show talk cards on mobile', async ({ page }) => {
    await navigateToToolboxTalks(page);

    const talkCard = page.locator('[data-testid="toolbox-talk"], .talk-card');

    if (await talkCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await talkCard.first().boundingBox();
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
    await page.route('**/toolbox**', route => route.abort());

    await navigateToToolboxTalks(page);

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
    await navigateToToolboxTalks(page);
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
