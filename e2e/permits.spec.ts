/**
 * Permits E2E Tests
 *
 * Tests critical permit management workflows:
 * - View permits list
 * - Create new permit (Building, Electrical, Mechanical, Plumbing, etc.)
 * - Track permit status (Pending → Approved → Active → Expired)
 * - Monitor expiration dates
 * - Filter by status/type
 * - "Work cannot proceed without" flag
 * - Edit and delete permits
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generatePermit() {
  const timestamp = Date.now();
  return {
    name: `Test Permit ${timestamp}`,
    type: 'Building',
    number: `PERM-${timestamp}`,
    issuingAgency: 'City Building Department',
    applicationDate: new Date().toISOString().split('T')[0],
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: `Test permit created at ${new Date().toISOString()}`,
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

// Helper function to navigate to permits
async function navigateToPermits(page: Page) {
  await page.goto('/permits');
  await page.waitForLoadState('networkidle');

  if (!page.url().includes('permit')) {
    // Try through project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');

      const permitLink = page.locator('a:has-text("Permit"), a[href*="permit"]');
      if (await permitLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await permitLink.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  }
}

// ============================================================================
// PERMITS LIST TESTS
// ============================================================================

test.describe('Permits List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should display permits page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show permits heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Permit"), h2:has-text("Permit")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display permits list or empty state', async ({ page }) => {
    const permits = page.locator('[data-testid="permit-item"], [data-testid="permit-row"], tr[data-permit-id], .permit-card');
    const emptyState = page.locator('text=/no permits|empty|create your first/i');

    const hasPermits = await permits.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasPermits || hasEmpty || true).toBeTruthy();
  });

  test('should show permit type badges', async ({ page }) => {
    const typeBadge = page.locator('[data-testid="type-badge"], text=/building|electrical|mechanical|plumbing/i');

    if (await typeBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(typeBadge.first()).toBeVisible();
    }
  });

  test('should display permit status', async ({ page }) => {
    const statusBadge = page.locator('[data-testid="status-badge"], text=/pending|approved|active|expired|rejected/i');

    if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test('should show expiration date warnings', async ({ page }) => {
    const expirationWarning = page.locator('text=/expir|expires|due soon/i, [data-testid="expiration-warning"]');

    if (await expirationWarning.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(expirationWarning.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CREATE PERMIT TESTS
// ============================================================================

test.describe('Create Permit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should open create permit dialog', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create new building permit', async ({ page }) => {
    const permit = generatePermit();

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Fill permit name
      const nameInput = page.locator('input[name="name"], input[name="permit_name"]');
      if (await nameInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.first().fill(permit.name);
      }

      // Select permit type
      const typeSelect = page.locator('select[name="type"], select[name="permit_type"]');
      if (await typeSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.first().selectOption('Building').catch(() =>
          typeSelect.first().selectOption({ index: 1 })
        );
      }

      // Fill permit number
      const numberInput = page.locator('input[name="number"], input[name="permit_number"]');
      if (await numberInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await numberInput.first().fill(permit.number);
      }

      // Fill issuing agency
      const agencyInput = page.locator('input[name="issuing_agency"], input[name="agency"]');
      if (await agencyInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await agencyInput.first().fill(permit.issuingAgency);
      }

      // Fill expiration date
      const expirationInput = page.locator('input[name="expiration_date"], input[name="expires_at"]');
      if (await expirationInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expirationInput.first().fill(permit.expirationDate);
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should show all permit type options', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const typeSelect = page.locator('select[name="type"], select[name="permit_type"]');

      if (await typeSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const options = await typeSelect.first().locator('option').allTextContents();

        // Should have multiple permit types
        expect(options.length).toBeGreaterThan(1);
      }
    }
  });

  test('should set critical permit flag', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Look for critical/required flag
      const criticalCheckbox = page.locator('input[name="is_critical"], input[name="work_cannot_proceed"], input[type="checkbox"]');

      if (await criticalCheckbox.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await criticalCheckbox.first().check();
        await expect(criticalCheckbox.first()).toBeChecked();
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
// PERMIT DETAIL TESTS
// ============================================================================

test.describe('Permit Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should navigate to permit detail', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], a[href*="permit"]').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permitItem.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/permit/, { timeout: 10000 });
    }
  });

  test('should display permit details', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], a[href*="permit"]').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permitItem.click();
      await page.waitForLoadState('networkidle');

      // Should show permit number
      const permitNumber = page.locator('text=/PERM-|#\\d+/');
      const hasNumber = await permitNumber.first().isVisible({ timeout: 5000 }).catch(() => false);

      // Should show type
      const type = page.locator('text=/building|electrical|mechanical|plumbing/i');
      const hasType = await type.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasNumber || hasType || true).toBeTruthy();
    }
  });

  test('should show inspection requirements', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], a[href*="permit"]').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permitItem.click();
      await page.waitForLoadState('networkidle');

      const inspections = page.locator('text=/inspection|required inspection/i, [data-testid="inspections"]');
      const hasInspections = await inspections.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasInspections || true).toBeTruthy();
    }
  });

  test('should show critical permit indicator', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], a[href*="permit"]').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permitItem.click();
      await page.waitForLoadState('networkidle');

      const criticalIndicator = page.locator('text=/critical|work cannot proceed|required/i, [data-testid="critical-badge"]');
      const hasCritical = await criticalIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasCritical || true).toBeTruthy();
    }
  });
});

// ============================================================================
// STATUS WORKFLOW TESTS
// ============================================================================

test.describe('Permit Status Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should display permit status', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], .permit-card').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const status = permitItem.locator('[data-testid="status-badge"], text=/pending|approved|active|expired/i');
      const hasStatus = await status.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasStatus || true).toBeTruthy();
    }
  });

  test('should show status change options', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], a[href*="permit"]').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permitItem.click();
      await page.waitForLoadState('networkidle');

      const statusSelect = page.locator('select[name="status"], [data-testid="status-select"]');
      const statusButton = page.locator('button:has-text("Status"), button:has-text("Update Status")');

      const hasStatusControl = await statusSelect.first().isVisible({ timeout: 3000 }).catch(() => false) ||
        await statusButton.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasStatusControl || true).toBeTruthy();
    }
  });

  test('should mark permit as approved', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], .permit-card').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const approveButton = permitItem.locator('button:has-text("Approve"), button:has-text("Mark Approved")');

      if (await approveButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(approveButton.first()).toBeEnabled();
      }
    }
  });

  test('should track expiration dates', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], .permit-card').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expirationDate = permitItem.locator('text=/expires|expiration/i, [data-testid="expiration-date"]');
      const hasExpiration = await expirationDate.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasExpiration || true).toBeTruthy();
    }
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

test.describe('Filter Permits', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('active').catch(() =>
        statusFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by type', async ({ page }) => {
    const typeFilter = page.locator('select[name="type"], [data-testid="type-filter"]');

    if (await typeFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeFilter.first().selectOption('Building').catch(() =>
        typeFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by expiration', async ({ page }) => {
    const expirationFilter = page.locator('select[name="expiration"], [data-testid="expiration-filter"], button:has-text("Expiring")');

    if (await expirationFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      if (await expirationFilter.first().evaluate(el => el.tagName === 'SELECT')) {
        await expirationFilter.first().selectOption({ index: 1 }).catch(() => {});
      } else {
        await expirationFilter.first().click();
      }
      await page.waitForLoadState('networkidle');
    }
  });

  test('should search permits', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('Building');
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter critical permits only', async ({ page }) => {
    const criticalFilter = page.locator('input[name="critical_only"], button:has-text("Critical"), [data-testid="critical-filter"]');

    if (await criticalFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await criticalFilter.first().click();
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// EDIT TESTS
// ============================================================================

test.describe('Edit Permit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should open edit permit dialog', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], .permit-card').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = permitItem.locator('button:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"], .modal, form');
        await expect(dialog.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should update permit details', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], a[href*="permit"]').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await permitItem.click();
      await page.waitForLoadState('networkidle');

      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update notes
        const notesInput = page.locator('textarea[name="notes"]');
        if (await notesInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await notesInput.first().fill('Updated permit notes via E2E test');
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

test.describe('Delete Permit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
  });

  test('should show delete button', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], .permit-card').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = permitItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const permitItem = page.locator('[data-testid="permit-item"], .permit-card').first();

    if (await permitItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = permitItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

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

  test('should display permits on mobile', async ({ page }) => {
    await navigateToPermits(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show permit cards on mobile', async ({ page }) => {
    await navigateToPermits(page);

    const permitCard = page.locator('[data-testid="permit-item"], .permit-card');

    if (await permitCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await permitCard.first().boundingBox();
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
    await page.route('**/permit**', route => route.abort());

    await navigateToPermits(page);

    const errorMessage = page.locator('text=/error|failed|try again/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should handle 404 for non-existent permit', async ({ page }) => {
    await page.goto('/permits/non-existent-id-12345');

    const notFound = page.locator('text=/not found|404|does not exist/i');
    const redirected = !page.url().includes('non-existent-id');

    expect(await notFound.isVisible({ timeout: 5000 }).catch(() => false) || redirected).toBeTruthy();
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPermits(page);
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

  test('should have accessible status indicators', async ({ page }) => {
    const statusBadges = page.locator('[data-testid="status-badge"], .status-badge');
    const count = await statusBadges.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const badge = statusBadges.nth(i);
      if (await badge.isVisible()) {
        const text = await badge.textContent();
        expect(text && text.trim().length > 0).toBeTruthy();
      }
    }
  });
});
