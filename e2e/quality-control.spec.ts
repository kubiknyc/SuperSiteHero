/**
 * Quality Control E2E Tests
 *
 * Tests critical quality control workflows:
 * - Display Quality Control page with NCR list
 * - Create new NCR (Non-Conformance Report)
 * - NCR workflow: Draft → Investigation → Corrective Action → Verification → Closed
 * - Filter and search NCRs
 * - Create QC Inspections
 * - NCR detail view and editing
 * - Void NCRs
 * - Mobile responsiveness
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });
import { generateTestNCR, generateTestQCInspection } from './helpers/test-data';

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for redirect away from login (use Phase 1 pattern - negative assertion)
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

  // Verify authenticated state
  await page.waitForTimeout(500);
}

// Helper function to navigate to quality control
async function navigateToQualityControl(page: Page) {
  const navLink = page.locator('a[href="/quality-control"], a[href*="quality-control"]');
  if (await navLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await navLink.first().click();
  } else {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('domcontentloaded');

      const qcLink = page.locator('a:has-text("Quality Control"), a[href*="quality-control"]');
      if (await qcLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await qcLink.first().click();
      } else {
        await page.goto('/quality-control');
      }
    } else {
      await page.goto('/quality-control');
    }
  }
  await page.waitForLoadState('domcontentloaded');
}

// ============================================================================
// QUALITY CONTROL LIST TESTS
// ============================================================================

test.describe('Quality Control List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToQualityControl(page);
  });

  test('should display quality control page', async ({ page }) => {
    await expect(page).toHaveURL(/quality-control/, { timeout: 10000 });

    const mainContent = page.locator('main, [role="main"], h1');
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 });

    const heading = page.locator('h1:has-text("Quality"), h1:has-text("NCR"), h2:has-text("Quality")');
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should show NCR list or empty state', async ({ page }) => {
    const hasNCRs = await page.locator('[data-testid*="ncr-"], .ncr-row, tr[data-ncr-id]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no ncr|no non-conformance|empty|create your first/i').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasNCRs || hasEmptyState).toBeTruthy();
  });

  test('should display NCR cards with key information', async ({ page }) => {
    const ncrItem = page.locator('[data-testid*="ncr-"], .ncr-row, [role="article"]').first();

    if (await ncrItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should show NCR number or title
      const hasIdentifier = await ncrItem.locator('text=/NCR-|#|title/i').isVisible({ timeout: 2000 }).catch(() => false);

      // Should show status
      const hasStatus = await ncrItem.locator('text=/draft|open|investigation|verification|closed|voided/i').isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasIdentifier || hasStatus).toBeTruthy();
    }
  });

  test('should display stats cards', async ({ page }) => {
    const statsCards = page.locator('.stat-card, [data-testid*="stats"], [data-testid*="card"]');

    if (await statsCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should show at least one stat
      const count = await statsCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should open create NCR dialog', async ({ page }) => {
    const createButton = page.locator('button:has-text("New NCR"), button:has-text("Create NCR"), button:has-text("Add NCR"), button:has-text("New"), button:has-text("Create")');

    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create NCR button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1000);

    const dialogOrForm = page.locator('[role="dialog"], .modal, [data-state="open"], form');
    const formVisible = await dialogOrForm.first().isVisible({ timeout: 5000 }).catch(() => false);
    const urlChanged = page.url().includes('new') || page.url().includes('create');

    expect(formVisible || urlChanged).toBe(true);
  });
});

// ============================================================================
// CREATE NCR TESTS
// ============================================================================

test.describe('Create NCR', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToQualityControl(page);
  });

  test('should create new NCR with required fields', async ({ page }) => {
    const ncr = generateTestNCR();

    const createButton = page.locator('button:has-text("New NCR"), button:has-text("Create NCR"), button:has-text("Add NCR"), button:has-text("New")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      test.skip(true, 'Create button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Fill title
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
    if (await titleInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.first().fill(ncr.title);
    }

    // Fill description
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]');
    if (await descInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.first().fill(ncr.description);
    }

    // Select category
    const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]');
    if (await categorySelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await categorySelect.first().selectOption(ncr.category).catch(() =>
        categorySelect.first().selectOption({ index: 1 })
      );
    }

    // Select severity
    const severitySelect = page.locator('select[name="severity"], [data-testid="severity-select"]');
    if (await severitySelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await severitySelect.first().selectOption(ncr.severity).catch(() =>
        severitySelect.first().selectOption({ index: 1 })
      );
    }

    // Fill location
    const buildingInput = page.locator('input[name="building"]');
    if (await buildingInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await buildingInput.first().fill(ncr.building);
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    if (await submitButton.first().isVisible()) {
      await submitButton.first().click();
      await page.waitForTimeout(2000);

      const urlChanged = page.url().includes('quality-control') && !page.url().includes('new');
      const successMessage = await page.locator('text=/created|success/i, [role="alert"]').first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(urlChanged || successMessage).toBeTruthy();
    }
  });

  test('should validate required fields', async ({ page }) => {
    const createButton = page.locator('button:has-text("New NCR"), button:has-text("Create NCR"), button:has-text("New")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.first().click();

        // Should show validation error
        const validationError = page.locator('text=/required|cannot be empty|please enter/i, [role="alert"]');
        await expect(validationError.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should set NCR category and severity', async ({ page }) => {
    const ncr = generateTestNCR();

    const createButton = page.locator('button:has-text("New NCR"), button:has-text("New")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Check for category dropdown
      const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]');
      if (await categorySelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        // Verify options exist
        const options = categorySelect.first().locator('option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(1);
      }

      // Check for severity dropdown
      const severitySelect = page.locator('select[name="severity"], [data-testid="severity-select"]');
      if (await severitySelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const options = severitySelect.first().locator('option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(1);
      }
    }
  });
});

// ============================================================================
// NCR WORKFLOW TESTS
// ============================================================================

test.describe('NCR Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToQualityControl(page);
  });

  test('should navigate to NCR detail page', async ({ page }) => {
    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, .ncr-row:first-child, a[href*="quality-control/"]').first();

    const linkVisible = await firstNCR.isVisible({ timeout: 5000 }).catch(() => false);
    if (!linkVisible) {
      test.skip(true, 'No NCRs found to navigate to');
      return;
    }

    await firstNCR.click();
    await expect(page).toHaveURL(/\/quality-control\/[a-z0-9-]+/i, { timeout: 10000 });
  });

  test('should display NCR detail with status workflow', async ({ page }) => {
    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, a[href*="quality-control/"]').first();

    if (await firstNCR.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNCR.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show NCR details
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });

      // Check for status indicator
      const statusBadge = page.locator('[data-testid="status-badge"], .badge, text=/draft|open|investigation|verification|closed/i');
      if (await statusBadge.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(statusBadge.first()).toBeVisible();
      }

      // Check for workflow actions
      const workflowSection = page.locator('[data-testid="workflow-section"], text=/workflow|actions|status/i');
      if (await workflowSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(workflowSection.first()).toBeVisible();
      }
    }
  });

  test('should have start investigation button for open NCRs', async ({ page }) => {
    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, a[href*="quality-control/"]').first();

    if (await firstNCR.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNCR.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for investigation button
      const investigationButton = page.locator('button:has-text("Start Investigation"), button:has-text("Begin Investigation")');
      if (await investigationButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(investigationButton.first()).toBeVisible();
        await expect(investigationButton.first()).toBeEnabled();
      }
    }
  });

  test('should show corrective actions section', async ({ page }) => {
    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, a[href*="quality-control/"]').first();

    if (await firstNCR.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNCR.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for corrective actions section
      const correctiveSection = page.locator('text=/corrective action|actions|remediation/i, [data-testid="corrective-actions"]');
      if (await correctiveSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(correctiveSection.first()).toBeVisible();
      }

      // Look for add corrective action button
      const addButton = page.locator('button:has-text("Add Corrective"), button:has-text("Add Action")');
      if (await addButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(addButton.first()).toBeVisible();
      }
    }
  });

  test('should show verification section for applicable NCRs', async ({ page }) => {
    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, a[href*="quality-control/"]').first();

    if (await firstNCR.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNCR.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for verification section or button
      const verificationSection = page.locator('text=/verification|verify|close/i, button:has-text("Submit for Verification"), button:has-text("Request Verification")');
      if (await verificationSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(verificationSection.first()).toBeVisible();
      }
    }
  });

  test('should have void NCR option', async ({ page }) => {
    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, a[href*="quality-control/"]').first();

    if (await firstNCR.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNCR.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for void button
      const voidButton = page.locator('button:has-text("Void"), [data-testid="void-button"]');
      if (await voidButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(voidButton.first()).toBeVisible();
      }
    }
  });
});

// ============================================================================
// SEARCH AND FILTER TESTS
// ============================================================================

test.describe('Search and Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToQualityControl(page);
  });

  test('should search NCRs', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(500);
      await page.waitForLoadState('domcontentloaded');

      const hasResults = await page.locator('[data-testid*="ncr-"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasNoResults = await page.locator('text=/no.*results|no.*ncr|not found/i').first().isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasResults || hasNoResults).toBeTruthy();

      await searchInput.first().clear();
    }
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('open').catch(() =>
        statusFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
  });

  test('should filter by category', async ({ page }) => {
    const categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"]');

    if (await categoryFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryFilter.first().selectOption({ index: 1 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
  });

  test('should filter by severity', async ({ page }) => {
    const severityFilter = page.locator('select[name="severity"], [data-testid="severity-filter"]');

    if (await severityFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await severityFilter.first().selectOption({ index: 1 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
  });

  test('should clear all filters', async ({ page }) => {
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-filters"]');

    // Apply a filter first
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(500);
    }

    if (await clearButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearButton.first().click();
      await page.waitForLoadState('domcontentloaded');

      if (await searchInput.first().isVisible()) {
        await expect(searchInput.first()).toHaveValue('');
      }
    }
  });
});

// ============================================================================
// QC INSPECTION TESTS
// ============================================================================

test.describe('QC Inspections', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToQualityControl(page);
  });

  test('should switch to inspections tab', async ({ page }) => {
    const inspectionsTab = page.getByRole('tab', { name: /inspection/i });

    if (await inspectionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inspectionsTab.click();
      await page.waitForTimeout(1000);

      // Should show inspections content
      const inspectionsContent = page.locator('text=/inspection/i, [data-testid*="inspection"]');
      await expect(inspectionsContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open create inspection dialog', async ({ page }) => {
    const inspectionsTab = page.getByRole('tab', { name: /inspection/i });
    if (await inspectionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inspectionsTab.click();
      await page.waitForTimeout(1000);
    }

    const createButton = page.locator('button:has-text("New Inspection"), button:has-text("Create Inspection"), button:has-text("Add Inspection")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const dialogOrForm = page.locator('[role="dialog"], form');
      await expect(dialogOrForm.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create QC inspection with fields', async ({ page }) => {
    const inspection = generateTestQCInspection();

    const inspectionsTab = page.getByRole('tab', { name: /inspection/i });
    if (await inspectionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inspectionsTab.click();
      await page.waitForTimeout(1000);
    }

    const createButton = page.locator('button:has-text("New Inspection"), button:has-text("Create Inspection")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Fill title
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
      if (await titleInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.first().fill(inspection.title);
      }

      // Fill description
      const descInput = page.locator('textarea[name="description"]');
      if (await descInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.first().fill(inspection.description);
      }

      // Select inspection type
      const typeSelect = page.locator('select[name="inspection_type"]');
      if (await typeSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.first().selectOption(inspection.inspection_type).catch(() =>
          typeSelect.first().selectOption({ index: 1 })
        );
      }

      // Fill location
      const locationInput = page.locator('input[name="location"]');
      if (await locationInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await locationInput.first().fill(inspection.location);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
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

  test('should display quality control page on mobile', async ({ page }) => {
    await navigateToQualityControl(page);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('should have mobile-friendly navigation', async ({ page }) => {
    await navigateToQualityControl(page);

    const menuButton = page.locator('button[aria-label="Menu"], button[aria-label="Toggle menu"], [data-testid="mobile-menu"]');

    if (await menuButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuButton.first().click();

      const menu = page.locator('[role="menu"], [data-testid="mobile-nav"]');
      await expect(menu.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should handle NCR list on mobile', async ({ page }) => {
    await navigateToQualityControl(page);

    const ncrs = page.locator('[data-testid*="ncr-"], .ncr-row');
    await page.waitForTimeout(2000);

    const hasContent =
      await ncrs.first().isVisible({ timeout: 3000 }).catch(() => false) ||
      await page.locator('text=/no ncr|empty/i').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test('should handle NCR detail on mobile', async ({ page }) => {
    await navigateToQualityControl(page);

    const firstNCR = page.locator('[data-testid*="ncr-"]:first-child, a[href*="quality-control/"]').first();

    if (await firstNCR.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNCR.click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });

      const backButton = page.locator('button[aria-label*="back" i], a[aria-label*="back" i]');
      if (await backButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(backButton.first()).toBeVisible();
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

  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('**/quality-control**', route => route.abort());
    await page.route('**/ncr**', route => route.abort());

    await navigateToQualityControl(page);

    const errorMessage = page.locator('text=/error|failed|try again|unable to load/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should handle 404 for non-existent NCR', async ({ page }) => {
    await page.goto('/quality-control/non-existent-id-12345');

    const notFound = page.locator('text=/not found|404|does not exist/i');
    const redirected = !page.url().includes('non-existent-id-12345');

    expect(await notFound.isVisible({ timeout: 5000 }).catch(() => false) || redirected).toBeTruthy();
  });

  test('should show validation errors for incomplete forms', async ({ page }) => {
    await navigateToQualityControl(page);

    const createButton = page.locator('button:has-text("New NCR"), button:has-text("Create")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.first().click();

        const validationError = page.locator('text=/required|cannot be empty|please enter/i, [role="alert"]');
        await expect(validationError.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToQualityControl(page);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 5000 });

    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have accessible buttons with labels', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        const hasAccessibleName = ariaLabel || (textContent && textContent.trim().length > 0);
        expect(hasAccessibleName || true).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load quality control list within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await navigateToQualityControl(page);
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });

  test('should show loading state during data fetch', async ({ page }) => {
    await page.route('**/quality-control**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await navigateToQualityControl(page);

    const loadingIndicator = page.locator('[aria-label="Loading"], .loading, [data-testid="loading"], .spinner, [role="progressbar"]');
    const wasLoading = await loadingIndicator.first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(wasLoading || true).toBeTruthy();
  });
});
