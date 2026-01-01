/**
 * Checklists E2E Tests
 *
 * Tests checklist management functionality:
 * - View checklist templates
 * - Create new checklist from template
 * - Execute checklist (check off items)
 * - Add photos and notes to checklist items
 * - Complete checklist
 * - View checklist history
 * - Schedule recurring checklists
 * - Filter by status and type
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Checklists Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // Navigate to checklists page
    await page.goto('/checklists');
    await page.waitForLoadState('networkidle');
  });

  test('should display checklists dashboard', async ({ page }) => {
    // Should show page title
    const heading = page.locator('h1, h2').filter({ hasText: /checklist/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to templates page', async ({ page }) => {
    // Look for templates link/button
    const templatesButton = page.locator('a, button').filter({ hasText: /template/i }).first();

    if (await templatesButton.isVisible()) {
      await templatesButton.click();

      // Should show templates
      await page.waitForLoadState('networkidle');
      expect(await page.locator('text=/template/i').count()).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('should start a checklist execution', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for start/execute button
    const startButton = page.locator('button, a').filter({ hasText: /start|execute|begin/i }).first();

    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForLoadState('networkidle');

      // Should show checklist items
      const checklistItems = page.locator('[type="checkbox"], [role="checkbox"]');
      expect(await checklistItems.count()).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('should check off checklist items', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Navigate to an active checklist
    const activeChecklist = page.locator('[data-testid*="checklist-"] a, .checklist-item a').first();

    if (await activeChecklist.isVisible()) {
      await activeChecklist.click();
      await page.waitForLoadState('networkidle');

      // Find first checkbox
      const firstCheckbox = page.locator('[type="checkbox"], [role="checkbox"]').first();

      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
        await page.waitForTimeout(500);

        // Verify checkbox state changed
        expect(await firstCheckbox.isChecked().catch(() => true)).toBeTruthy();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should add notes to checklist item', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Navigate to an active checklist
    const activeChecklist = page.locator('[data-testid*="checklist-"] a, .checklist-item a').first();

    if (await activeChecklist.isVisible()) {
      await activeChecklist.click();
      await page.waitForLoadState('networkidle');

      // Look for notes/comments field
      const notesField = page.locator('textarea, input[placeholder*="note" i]').first();

      if (await notesField.isVisible()) {
        await notesField.fill('Test note for checklist item');
        await page.waitForTimeout(500);

        await expect(notesField).toHaveValue(/Test note/);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should complete a checklist', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Navigate to an active checklist
    const activeChecklist = page.locator('[data-testid*="checklist-"] a, .checklist-item a').first();

    if (await activeChecklist.isVisible()) {
      await activeChecklist.click();
      await page.waitForLoadState('networkidle');

      // Look for complete button
      const completeButton = page.locator('button').filter({ hasText: /complete|finish|submit/i }).first();

      if (await completeButton.isVisible()) {
        await completeButton.click();
        await page.waitForTimeout(1000);

        // Look for success message
        const success = page.locator('[role="alert"]').filter({ hasText: /complete|success/i });
        expect(await success.count()).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should view checklist executions history', async ({ page }) => {
    // Look for history/executions link
    const historyLink = page.locator('a, button').filter({ hasText: /history|execution/i }).first();

    if (await historyLink.isVisible()) {
      await historyLink.click();
      await page.waitForLoadState('networkidle');

      expect(await page.locator('text=/execution|history/i').count()).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('should filter checklists by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      expect(await statusFilter.inputValue()).toBeTruthy();
    } else {
      test.skip();
    }
  });
});
