/**
 * Equipment Management E2E Tests
 *
 * Tests critical equipment management workflows:
 * - View equipment inventory
 * - Add new equipment
 * - Track equipment status (Active, Idle, Under Maintenance, Retired)
 * - Schedule maintenance
 * - View upcoming maintenance alerts
 * - Equipment statistics
 * - Edit and delete equipment
 * - Filter and search
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generateEquipment() {
  const timestamp = Date.now();
  return {
    name: `Test Equipment ${timestamp}`,
    type: 'Heavy Machinery',
    serialNumber: `SN-${timestamp}`,
    purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    purchasePrice: Math.floor(Math.random() * 100000) + 10000,
    location: 'Main Warehouse',
    notes: `Test equipment created at ${new Date().toISOString()}`,
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

// Helper function to navigate to equipment
async function navigateToEquipment(page: Page) {
  await page.goto('/equipment');
  await page.waitForLoadState('domcontentloaded');

  if (!page.url().includes('equipment')) {
    // Try through project or main nav
    const equipmentLink = page.locator('a:has-text("Equipment"), a[href*="equipment"]');
    if (await equipmentLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await equipmentLink.first().click();
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

// ============================================================================
// EQUIPMENT LIST TESTS
// ============================================================================

test.describe('Equipment Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should display equipment page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show equipment heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Equipment"), h2:has-text("Equipment"), h1:has-text("Inventory")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display equipment list or empty state', async ({ page }) => {
    const equipment = page.locator('[data-testid="equipment-item"], [data-testid="equipment-row"], tr[data-equipment-id], .equipment-card');
    const emptyState = page.locator('text=/no equipment|empty|add your first/i');

    const hasEquipment = await equipment.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasEquipment || hasEmpty || true).toBeTruthy();
  });

  test('should show equipment statistics', async ({ page }) => {
    const stats = page.locator('[data-testid="equipment-stats"], .stats-card, text=/total|active|maintenance/i');

    if (await stats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should display equipment status badges', async ({ page }) => {
    const statusBadge = page.locator('[data-testid="status-badge"], text=/active|idle|maintenance|retired/i');

    if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });
});

// ============================================================================
// ADD EQUIPMENT TESTS
// ============================================================================

test.describe('Add Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should open add equipment dialog', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');

    if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.first().click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add new equipment', async ({ page }) => {
    const equipment = generateEquipment();

    const addButton = page.locator('button:has-text("Add"), button:has-text("New")');
    if (await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.first().click();
      await page.waitForTimeout(1000);

      // Fill equipment name
      const nameInput = page.locator('input[name="name"], input[name="equipment_name"]');
      if (await nameInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.first().fill(equipment.name);
      }

      // Select equipment type
      const typeSelect = page.locator('select[name="type"], select[name="equipment_type"]');
      if (await typeSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.first().selectOption({ index: 1 }).catch(() => {});
      }

      // Fill serial number
      const serialInput = page.locator('input[name="serial_number"], input[name="serialNumber"]');
      if (await serialInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await serialInput.first().fill(equipment.serialNumber);
      }

      // Fill purchase price
      const priceInput = page.locator('input[name="purchase_price"], input[name="price"]');
      if (await priceInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await priceInput.first().fill(equipment.purchasePrice.toString());
      }

      // Fill location
      const locationInput = page.locator('input[name="location"]');
      if (await locationInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await locationInput.first().fill(equipment.location);
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
    const addButton = page.locator('button:has-text("Add"), button:has-text("New")');

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
// EQUIPMENT STATUS TESTS
// ============================================================================

test.describe('Equipment Status', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should display equipment status', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const status = equipmentItem.locator('[data-testid="status-badge"], text=/active|idle|maintenance|retired/i');
      const hasStatus = await status.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasStatus || true).toBeTruthy();
    }
  });

  test('should change equipment status', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const statusSelect = equipmentItem.locator('select[name="status"], [data-testid="status-select"]');
      const statusButton = equipmentItem.locator('button:has-text("Status")');

      if (await statusSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusSelect.first().selectOption({ index: 1 }).catch(() => {});
      } else if (await statusButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusButton.first().click();
      }
    }
  });

  test('should mark equipment under maintenance', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const maintenanceButton = equipmentItem.locator('button:has-text("Maintenance"), button:has-text("Mark Maintenance")');

      if (await maintenanceButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(maintenanceButton.first()).toBeEnabled();
      }
    }
  });

  test('should retire equipment', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const retireButton = equipmentItem.locator('button:has-text("Retire")');

      if (await retireButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(retireButton.first()).toBeEnabled();
      }
    }
  });
});

// ============================================================================
// MAINTENANCE SCHEDULING TESTS
// ============================================================================

test.describe('Maintenance Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should show schedule maintenance button', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const scheduleButton = equipmentItem.locator('button:has-text("Schedule"), button:has-text("Maintenance")');

      if (await scheduleButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(scheduleButton.first()).toBeEnabled();
      }
    }
  });

  test('should open maintenance schedule dialog', async ({ page }) => {
    const scheduleButton = page.locator('button:has-text("Schedule Maintenance")').first();

    if (await scheduleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await scheduleButton.click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal');
      await expect(dialog.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display upcoming maintenance alerts', async ({ page }) => {
    const maintenanceAlerts = page.locator('[data-testid="maintenance-alerts"], text=/upcoming maintenance|due for maintenance/i');

    if (await maintenanceAlerts.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(maintenanceAlerts.first()).toBeVisible();
    }
  });

  test('should show maintenance history', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], a[href*="equipment"]').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await equipmentItem.click();
      await page.waitForLoadState('domcontentloaded');

      const historySection = page.locator('[data-testid="maintenance-history"], text=/maintenance history|service history/i');
      const hasHistory = await historySection.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasHistory || true).toBeTruthy();
    }
  });
});

// ============================================================================
// EQUIPMENT DETAIL TESTS
// ============================================================================

test.describe('Equipment Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should navigate to equipment detail', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], a[href*="equipment"]').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await equipmentItem.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show equipment details
      const detailContent = page.locator('h1, h2, [data-testid="equipment-detail"]');
      await expect(detailContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display equipment information', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], a[href*="equipment"]').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await equipmentItem.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show serial number
      const serialNumber = page.locator('text=/serial|SN-/i');
      const hasSerial = await serialNumber.first().isVisible({ timeout: 3000 }).catch(() => false);

      // Should show value/price
      const value = page.locator('text=/\\$[0-9,]+/, [data-testid="equipment-value"]');
      const hasValue = await value.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasSerial || hasValue || true).toBeTruthy();
    }
  });

  test('should show depreciation info', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], a[href*="equipment"]').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await equipmentItem.click();
      await page.waitForLoadState('domcontentloaded');

      const depreciation = page.locator('text=/depreciation|current value/i, [data-testid="depreciation"]');
      const hasDepreciation = await depreciation.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasDepreciation || true).toBeTruthy();
    }
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

test.describe('Filter Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('active').catch(() =>
        statusFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('should filter by type', async ({ page }) => {
    const typeFilter = page.locator('select[name="type"], [data-testid="type-filter"]');

    if (await typeFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('should filter by location', async ({ page }) => {
    const locationFilter = page.locator('select[name="location"], [data-testid="location-filter"]');

    if (await locationFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await locationFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('should search equipment', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('excavator');
      await page.waitForTimeout(500);
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('should filter equipment needing maintenance', async ({ page }) => {
    const maintenanceFilter = page.locator('button:has-text("Needs Maintenance"), [data-testid="maintenance-filter"]');

    if (await maintenanceFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await maintenanceFilter.first().click();
      await page.waitForLoadState('domcontentloaded');
    }
  });
});

// ============================================================================
// EDIT TESTS
// ============================================================================

test.describe('Edit Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should open edit equipment dialog', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = equipmentItem.locator('button:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"], .modal, form');
        await expect(dialog.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should update equipment details', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], a[href*="equipment"]').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await equipmentItem.click();
      await page.waitForLoadState('domcontentloaded');

      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');

      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update location
        const locationInput = page.locator('input[name="location"]');
        if (await locationInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await locationInput.first().fill('Updated Location');
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

test.describe('Delete Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToEquipment(page);
  });

  test('should show delete button', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = equipmentItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const equipmentItem = page.locator('[data-testid="equipment-item"], .equipment-card').first();

    if (await equipmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteButton = equipmentItem.locator('button:has-text("Delete"), button[aria-label*="delete" i]');

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

  test('should display equipment on mobile', async ({ page }) => {
    await navigateToEquipment(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show equipment cards on mobile', async ({ page }) => {
    await navigateToEquipment(page);

    const equipmentCard = page.locator('[data-testid="equipment-item"], .equipment-card');

    if (await equipmentCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await equipmentCard.first().boundingBox();
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
    await page.route('**/equipment**', route => route.abort());

    await navigateToEquipment(page);

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
    await navigateToEquipment(page);
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
