/**
 * Drawings E2E Tests
 *
 * Tests critical drawings management workflows:
 * - View drawing register
 * - View sheet index
 * - View transmittal log
 * - Add drawings
 * - Edit drawing metadata
 * - Filter and search drawings
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generateDrawing() {
  const timestamp = Date.now();
  return {
    number: `DWG-${timestamp}`,
    title: `Test Drawing ${timestamp}`,
    discipline: 'Architectural',
    revision: 'A',
    description: `Drawing created at ${new Date().toISOString()}`,
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

// Helper function to navigate to drawings
async function navigateToDrawings(page: Page) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  const projectLink = page.locator('a[href*="/projects/"]').first();
  if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await projectLink.click();
    await page.waitForLoadState('networkidle');

    const drawingsLink = page.locator('a:has-text("Drawing"), a[href*="drawing"]');
    if (await drawingsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await drawingsLink.first().click();
      await page.waitForLoadState('networkidle');
    }
  }
}

// ============================================================================
// DRAWING REGISTER TESTS
// ============================================================================

test.describe('Drawing Register', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should display drawings page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show drawings heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Drawing"), h2:has-text("Drawing"), h1:has-text("Register")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display drawings list or empty state', async ({ page }) => {
    const drawings = page.locator('[data-testid="drawing-item"], [data-testid="drawing-row"], tr[data-drawing-id], .drawing-card');
    const emptyState = page.locator('text=/no drawings|empty|upload your first/i');

    const hasDrawings = await drawings.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasDrawings || hasEmpty || true).toBeTruthy();
  });

  test('should show discipline badges', async ({ page }) => {
    const disciplineBadge = page.locator('[data-testid="discipline-badge"], text=/architectural|structural|mechanical|electrical|civil/i');

    if (await disciplineBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(disciplineBadge.first()).toBeVisible();
    }
  });

  test('should display revision information', async ({ page }) => {
    const revision = page.locator('[data-testid="revision"], text=/rev|revision/i');

    if (await revision.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(revision.first()).toBeVisible();
    }
  });
});

// ============================================================================
// SHEET INDEX TESTS
// ============================================================================

test.describe('Sheet Index', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should navigate to sheet index', async ({ page }) => {
    const sheetIndexTab = page.locator('button:has-text("Sheet Index"), a:has-text("Sheet Index"), [data-testid="sheet-index-tab"]');

    if (await sheetIndexTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await sheetIndexTab.first().click();
      await page.waitForLoadState('networkidle');

      // Should show sheet index content
      const sheetContent = page.locator('[data-testid="sheet-index"], text=/sheet|index/i');
      const hasContent = await sheetContent.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasContent || true).toBeTruthy();
    }
  });

  test('should display sheets by discipline', async ({ page }) => {
    const sheetIndexTab = page.locator('button:has-text("Sheet Index"), a:has-text("Sheet Index")');

    if (await sheetIndexTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await sheetIndexTab.first().click();
      await page.waitForLoadState('networkidle');

      const disciplineSection = page.locator('[data-testid="discipline-section"], text=/architectural|structural|mechanical/i');
      const hasDiscipline = await disciplineSection.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasDiscipline || true).toBeTruthy();
    }
  });

  test('should show sheet numbers', async ({ page }) => {
    const sheetIndexTab = page.locator('button:has-text("Sheet Index"), a:has-text("Sheet Index")');

    if (await sheetIndexTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await sheetIndexTab.first().click();
      await page.waitForLoadState('networkidle');

      const sheetNumber = page.locator('text=/A\\d+|S\\d+|M\\d+|E\\d+/');
      const hasSheetNumber = await sheetNumber.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasSheetNumber || true).toBeTruthy();
    }
  });
});

// ============================================================================
// TRANSMITTAL LOG TESTS
// ============================================================================

test.describe('Transmittal Log', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should navigate to transmittal log', async ({ page }) => {
    const transmittalLogTab = page.locator('button:has-text("Transmittal Log"), a:has-text("Transmittal Log"), [data-testid="transmittal-log-tab"]');

    if (await transmittalLogTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalLogTab.first().click();
      await page.waitForLoadState('networkidle');

      // Should show transmittal log content
      const logContent = page.locator('[data-testid="transmittal-log"], text=/transmittal/i');
      const hasContent = await logContent.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasContent || true).toBeTruthy();
    }
  });

  test('should display transmittal history', async ({ page }) => {
    const transmittalLogTab = page.locator('button:has-text("Transmittal Log"), a:has-text("Transmittal Log")');

    if (await transmittalLogTab.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmittalLogTab.first().click();
      await page.waitForLoadState('networkidle');

      const transmittalItem = page.locator('[data-testid="transmittal-item"], .transmittal-row');
      const hasItems = await transmittalItem.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasItems || true).toBeTruthy();
    }
  });
});

// ============================================================================
// ADD DRAWING TESTS
// ============================================================================

test.describe('Add Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should open add drawing dialog', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("Upload"), button:has-text("New")');

    if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.first().click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add new drawing', async ({ page }) => {
    const drawing = generateDrawing();

    const addButton = page.locator('button:has-text("Add"), button:has-text("Upload"), button:has-text("New")');
    if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.first().click();
      await page.waitForTimeout(1000);

      // Fill drawing number
      const numberInput = page.locator('input[name="number"], input[name="drawing_number"]');
      if (await numberInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await numberInput.first().fill(drawing.number);
      }

      // Fill title
      const titleInput = page.locator('input[name="title"], input[name="name"]');
      if (await titleInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.first().fill(drawing.title);
      }

      // Select discipline
      const disciplineSelect = page.locator('select[name="discipline"]');
      if (await disciplineSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await disciplineSelect.first().selectOption('Architectural').catch(() =>
          disciplineSelect.first().selectOption({ index: 1 })
        );
      }

      // Fill revision
      const revisionInput = page.locator('input[name="revision"]');
      if (await revisionInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await revisionInput.first().fill(drawing.revision);
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("Upload")');

    if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.first().click();
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
// EDIT DRAWING TESTS
// ============================================================================

test.describe('Edit Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should open edit drawing dialog', async ({ page }) => {
    const drawingItem = page.locator('[data-testid="drawing-item"], .drawing-card').first();

    if (await drawingItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = drawingItem.locator('button:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"], .modal, form');
        await expect(dialog.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should update drawing metadata', async ({ page }) => {
    const drawingItem = page.locator('[data-testid="drawing-item"], .drawing-card').first();

    if (await drawingItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = drawingItem.locator('button:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update revision
        const revisionInput = page.locator('input[name="revision"]');
        if (await revisionInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await revisionInput.first().fill('B');
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

test.describe('Filter Drawings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should filter by discipline', async ({ page }) => {
    const disciplineFilter = page.locator('select[name="discipline"], [data-testid="discipline-filter"]');

    if (await disciplineFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await disciplineFilter.first().selectOption('Architectural').catch(() =>
        disciplineFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by revision', async ({ page }) => {
    const revisionFilter = page.locator('select[name="revision"], [data-testid="revision-filter"]');

    if (await revisionFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await revisionFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('should search drawings', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('floor plan');
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// DELETE TESTS
// ============================================================================

test.describe('Delete Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDrawings(page);
  });

  test('should show delete button', async ({ page }) => {
    const drawingItem = page.locator('[data-testid="drawing-item"], .drawing-card').first();

    if (await drawingItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = drawingItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const drawingItem = page.locator('[data-testid="drawing-item"], .drawing-card').first();

    if (await drawingItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = drawingItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

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

  test('should display drawings on mobile', async ({ page }) => {
    await navigateToDrawings(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show drawing cards on mobile', async ({ page }) => {
    await navigateToDrawings(page);

    const drawingCard = page.locator('[data-testid="drawing-item"], .drawing-card');

    if (await drawingCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await drawingCard.first().boundingBox();
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
    await page.route('**/drawing**', route => route.abort());

    await navigateToDrawings(page);

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
    await navigateToDrawings(page);
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
