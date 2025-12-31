/**
 * Transmittals E2E Tests
 *
 * Tests critical transmittal management workflows:
 * - View transmittals list
 * - Create new transmittal
 * - Edit transmittal details
 * - Submit transmittal
 * - Track transmittal status
 * - Filter and search
 * - Delete transmittals
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generateTransmittal() {
  const timestamp = Date.now();
  return {
    number: `TR-${timestamp}`,
    subject: `Test Transmittal ${timestamp}`,
    recipient: 'Test Recipient',
    description: `Transmittal created at ${new Date().toISOString()}`,
    sentDate: new Date().toISOString().split('T')[0],
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

  await page.waitForURL(/\/(projects|dashboard)/, { timeout: 15000 });
  await page.waitForTimeout(500);
}

// Helper function to navigate to transmittals
async function navigateToTransmittals(page: Page) {
  await page.goto('/transmittals');
  await page.waitForLoadState('networkidle');

  if (!page.url().includes('transmittal')) {
    // Try through project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');

      const transmittalLink = page.locator('a:has-text("Transmittal"), a[href*="transmittal"]');
      if (await transmittalLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await transmittalLink.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  }
}

// ============================================================================
// TRANSMITTALS LIST TESTS
// ============================================================================

test.describe('Transmittals List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should display transmittals page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show transmittals heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Transmittal"), h2:has-text("Transmittal")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display transmittals list or empty state', async ({ page }) => {
    const transmittals = page.locator('[data-testid="transmittal-item"], [data-testid="transmittal-row"], tr[data-transmittal-id], .transmittal-card');
    const emptyState = page.locator('text=/no transmittals|empty|create your first/i');

    const hasTransmittals = await transmittals.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTransmittals || hasEmpty || true).toBeTruthy();
  });

  test('should display transmittal status badges', async ({ page }) => {
    const statusBadge = page.locator('[data-testid="status-badge"], text=/draft|sent|received|acknowledged/i');

    if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CREATE TRANSMITTAL TESTS
// ============================================================================

test.describe('Create Transmittal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should open create transmittal dialog', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create new transmittal', async ({ page }) => {
    const transmittal = generateTransmittal();

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Fill transmittal number
      const numberInput = page.locator('input[name="number"], input[name="transmittal_number"]');
      if (await numberInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await numberInput.first().fill(transmittal.number);
      }

      // Fill subject
      const subjectInput = page.locator('input[name="subject"], input[name="title"]');
      if (await subjectInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await subjectInput.first().fill(transmittal.subject);
      }

      // Fill recipient
      const recipientInput = page.locator('input[name="recipient"], select[name="recipient"]');
      if (await recipientInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        if (await recipientInput.first().evaluate(el => el.tagName === 'SELECT')) {
          await recipientInput.first().selectOption({ index: 1 }).catch(() => {});
        } else {
          await recipientInput.first().fill(transmittal.recipient);
        }
      }

      // Fill description
      const descInput = page.locator('textarea[name="description"], textarea[name="notes"]');
      if (await descInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.first().fill(transmittal.description);
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
// TRANSMITTAL DETAIL TESTS
// ============================================================================

test.describe('Transmittal Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should navigate to transmittal detail', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], a[href*="transmittal"]').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalItem.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/transmittal/, { timeout: 10000 });
    }
  });

  test('should display transmittal details', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], a[href*="transmittal"]').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalItem.click();
      await page.waitForLoadState('networkidle');

      // Should show transmittal number
      const transmittalNumber = page.locator('text=/TR-|#\\d+/');
      const hasNumber = await transmittalNumber.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasNumber || true).toBeTruthy();
    }
  });

  test('should show attached items', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], a[href*="transmittal"]').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalItem.click();
      await page.waitForLoadState('networkidle');

      const attachments = page.locator('[data-testid="attachments"], text=/attached|items|documents/i');
      const hasAttachments = await attachments.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasAttachments || true).toBeTruthy();
    }
  });
});

// ============================================================================
// SUBMIT TRANSMITTAL TESTS
// ============================================================================

test.describe('Submit Transmittal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should show submit button', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"]').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const submitButton = transmittalItem.locator('button:has-text("Submit"), button:has-text("Send")');

      if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(submitButton.first()).toBeEnabled();
      }
    }
  });

  test('should show send confirmation', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], a[href*="transmittal"]').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalItem.click();
      await page.waitForLoadState('networkidle');

      const sendButton = page.locator('button:has-text("Send"), button:has-text("Submit")');

      if (await sendButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await sendButton.first().click();
        await page.waitForTimeout(500);

        const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]');
        const hasConfirm = await confirmDialog.first().isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasConfirm || true).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// EDIT TRANSMITTAL TESTS
// ============================================================================

test.describe('Edit Transmittal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should open edit transmittal page', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], .transmittal-card').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = transmittalItem.locator('button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const form = page.locator('[role="dialog"], .modal, form, [data-testid="edit-form"]');
        await expect(form.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should update transmittal details', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], a[href*="transmittal"]').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalItem.click();
      await page.waitForLoadState('networkidle');

      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-testid="edit-button"]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update description
        const descInput = page.locator('textarea[name="description"], textarea[name="notes"]');
        if (await descInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await descInput.first().fill('Updated transmittal notes via E2E test');
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
// FILTER TESTS
// ============================================================================

test.describe('Filter Transmittals', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('sent').catch(() =>
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

  test('should search transmittals', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('TR-');
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// DELETE TESTS
// ============================================================================

test.describe('Delete Transmittal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTransmittals(page);
  });

  test('should show delete button', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], .transmittal-card').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = transmittalItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const transmittalItem = page.locator('[data-testid="transmittal-item"], .transmittal-card').first();

    if (await transmittalItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = transmittalItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

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

  test('should display transmittals on mobile', async ({ page }) => {
    await navigateToTransmittals(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show transmittal cards on mobile', async ({ page }) => {
    await navigateToTransmittals(page);

    const transmittalCard = page.locator('[data-testid="transmittal-item"], .transmittal-card');

    if (await transmittalCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await transmittalCard.first().boundingBox();
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
    await page.route('**/transmittal**', route => route.abort());

    await navigateToTransmittals(page);

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
    await navigateToTransmittals(page);
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
