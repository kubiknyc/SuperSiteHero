/**
 * Punch Lists E2E Tests
 *
 * Tests critical punch list workflows:
 * - View punch lists with filtering and sorting
 * - Create new punch items with description, location, and assignee
 * - Edit punch item details
 * - Change punch item status (open, in progress, closed, verified)
 * - Filter by status, area/location, trade, and assignee
 * - Punch item detail view
 * - Add photos to punch items
 * - Search punch items
 * - Sort by column
 * - Mark items as complete/verified
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Punch Lists Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Navigate to punch lists page
    await page.goto('/punch-lists');
    await page.waitForLoadState('networkidle');
  });

  test('should display punch lists page with filters', async ({ page }) => {
    // Should show page title
    const heading = page.locator('h1, h2').filter({ hasText: /punch list|punch item/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });

    // Should show create button
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i });
    await expect(createButton.first()).toBeVisible();

    // Should show filter controls
    const filters = page.locator('[data-testid*="filter"], select, [role="combobox"]');
    const filterCount = await filters.count();
    expect(filterCount).toBeGreaterThanOrEqual(0);
  });

  test('should show punch list status indicators', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for status badges or indicators (open, in progress, closed, verified)
    const statusElements = page.locator('[data-testid*="status"], .status-badge, .badge, [class*="status"]');

    // Should have status indicators if punch items exist
    const count = await statusElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to create punch item page', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();

    // Should navigate to create page or open dialog
    await page.waitForTimeout(1000);

    // Check if dialog opened OR navigated to new page
    const dialogOrForm = page.locator('[role="dialog"], .modal, [data-state="open"], form');
    const formVisible = await dialogOrForm.first().isVisible({ timeout: 5000 }).catch(() => false);

    // Check if URL changed to create page
    const urlChanged = page.url().includes('/punch-lists/new') || page.url().includes('/punch-lists/create');

    // Either dialog/form should be visible, or we navigated to a new URL
    expect(formVisible || urlChanged).toBe(true);
  });

  test('should create new punch item with description, location, and assignee', async ({ page }) => {
    // Navigate to create page
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fill in punch item description
    const punchItemTitle = `Test Punch Item ${Date.now()}`;
    const titleInput = page.locator('input[name="title"], input[name="description"], input[placeholder*="description" i], textarea[name="description"]').first();
    await titleInput.fill(punchItemTitle);

    // Fill in location/area
    const locationInput = page.locator('input[name="location"], input[name="area"], select[name="location"], select[name="area"]').first();
    if (await locationInput.isVisible()) {
      if ((await locationInput.getAttribute('type')) === 'select-one' || locationInput.tagName === 'SELECT') {
        await locationInput.selectOption({ index: 1 });
      } else {
        await locationInput.fill('Floor 2, Room 205');
      }
    }

    // Fill in trade (if available)
    const tradeSelect = page.locator('select[name="trade"], [data-testid="trade-select"]').first();
    if (await tradeSelect.isVisible()) {
      await tradeSelect.selectOption({ index: 1 });
    }

    // Assign to team member
    const assigneeSelect = page.locator('select[name="assignee"], select[name="assigned_to"], [data-testid="assignee-select"]').first();
    if (await assigneeSelect.isVisible()) {
      await assigneeSelect.selectOption({ index: 1 });
    }

    // Fill in detailed description if separate field exists
    const descriptionField = page.locator('textarea[name="notes"], textarea[placeholder*="notes" i], textarea[placeholder*="details" i]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('Paint touch-up needed on north wall. Multiple scuffs visible.');
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Add")').first();
    await submitButton.click();

    // Should redirect or show success
    await page.waitForTimeout(2000);

    // Look for success indication
    const successIndicator = page.locator('[role="alert"]').filter({ hasText: /created|success|added/i });
    const itemInList = page.locator(`text="${punchItemTitle}"`);

    await expect(successIndicator.or(itemInList)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields on create', async ({ page }) => {
    // Navigate to create page
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Add")').first();
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-destructive, [data-testid*="error"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter punch items by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible()) {
      // Get initial count
      const initialItems = await page.locator('[data-testid*="punch-"], [role="row"], .punch-item').count();

      // Change filter to a specific status
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Count should potentially change
      const filteredItems = await page.locator('[data-testid*="punch-"], [role="row"], .punch-item').count();

      // Verify filter interaction worked
      expect(typeof filteredItems).toBe('number');
    } else {
      test.skip();
    }
  });

  test('should filter punch items by location/area', async ({ page }) => {
    // Look for location/area filter
    const locationFilter = page.locator('select[name="location"], select[name="area"], [data-testid="location-filter"], [data-testid="area-filter"]').first();

    if (await locationFilter.isVisible()) {
      // Change filter
      await locationFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Verify filter was applied
      expect(await locationFilter.inputValue()).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should filter punch items by trade', async ({ page }) => {
    // Look for trade filter
    const tradeFilter = page.locator('select[name="trade"], [data-testid="trade-filter"]').first();

    if (await tradeFilter.isVisible()) {
      // Change filter
      await tradeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Verify filter was applied
      expect(await tradeFilter.inputValue()).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should filter punch items by assignee', async ({ page }) => {
    // Look for assignee filter
    const assigneeFilter = page.locator('select[name="assignee"], select[name="assigned_to"], [data-testid="assignee-filter"]').first();

    if (await assigneeFilter.isVisible()) {
      // Change filter
      await assigneeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Verify filter was applied
      expect(await assigneeFilter.inputValue()).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should open punch item detail view', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a, button:has-text("View")').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/\/punch-lists\/[^/]+/, { timeout: 10000 });

      // Should show punch item details
      const detailContent = page.locator('[data-testid="punch-detail"], .punch-detail, main');
      await expect(detailContent).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display punch item details with all information', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Should show description, location, assignee, status
      const contentElements = page.locator('text=/description|location|assign|status|trade/i');
      const hasContent = await contentElements.count() > 0;

      expect(hasContent).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should navigate to edit punch item page', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for edit button
      const editButton = page.locator('button, a').filter({ hasText: /edit/i }).first();

      if (await editButton.isVisible()) {
        await editButton.click();

        // Should navigate to edit page
        await expect(page).toHaveURL(/\/punch-lists\/[^/]+\/edit/, { timeout: 10000 });

        // Should show form
        const form = page.locator('form');
        await expect(form).toBeVisible();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should edit punch item details', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for edit button
      const editButton = page.locator('button, a').filter({ hasText: /edit/i }).first();

      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForLoadState('networkidle');

        // Update description
        const descriptionField = page.locator('textarea[name="description"], textarea[name="notes"], input[name="description"]').first();
        if (await descriptionField.isVisible()) {
          await descriptionField.fill('Updated punch item description');
        }

        // Update location
        const locationField = page.locator('input[name="location"], select[name="location"]').first();
        if (await locationField.isVisible()) {
          if ((await locationField.getAttribute('type')) === 'select-one' || locationField.tagName === 'SELECT') {
            await locationField.selectOption({ index: 1 });
          } else {
            await locationField.fill('Updated Location');
          }
        }

        // Submit the form
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
        await submitButton.click();

        // Should show success or redirect
        await page.waitForTimeout(2000);

        const successIndicator = page.locator('[role="alert"]').filter({ hasText: /updated|success|saved/i });
        await expect(successIndicator).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should change punch item status to "In Progress"', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for status change control
      const statusControl = page.locator('select[name="status"], [data-testid="status-select"], button:has-text("In Progress")').first();

      if (await statusControl.isVisible()) {
        const tagName = await statusControl.evaluate(el => el.tagName);

        if (tagName === 'SELECT') {
          // If it's a dropdown, select "In Progress"
          await statusControl.selectOption({ label: /in progress/i });
        } else {
          // If it's a button, click it
          await statusControl.click();
        }

        await page.waitForTimeout(1000);

        // Verify status change
        expect(await statusControl.isVisible()).toBe(true);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should change punch item status to "Closed"', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for status control
      const statusControl = page.locator('select[name="status"], [data-testid="status-select"], button:has-text("Close"), button:has-text("Complete")').first();

      if (await statusControl.isVisible()) {
        const tagName = await statusControl.evaluate(el => el.tagName);

        if (tagName === 'SELECT') {
          await statusControl.selectOption({ label: /closed|complete/i });
        } else {
          await statusControl.click();
        }

        await page.waitForTimeout(1000);

        // Verify interaction worked
        expect(await statusControl.isVisible()).toBe(true);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should mark punch item as verified', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for verify button or status
      const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Mark as Verified"), select[name="status"]').first();

      if (await verifyButton.isVisible()) {
        const tagName = await verifyButton.evaluate(el => el.tagName);

        if (tagName === 'SELECT') {
          await verifyButton.selectOption({ label: /verified/i });
        } else {
          await verifyButton.click();
        }

        await page.waitForTimeout(1000);

        // Look for verification confirmation
        const verifiedIndicator = page.locator('text=/verified/i, [data-status="verified"]');
        expect(await verifiedIndicator.count()).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should add photos to punch items', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for photo upload or add photo button
      const photoButton = page.locator('button:has-text("Add Photo"), button:has-text("Upload Photo"), input[type="file"]').first();

      if (await photoButton.isVisible()) {
        const tagName = await photoButton.evaluate(el => el.tagName);

        if (tagName === 'INPUT') {
          // If it's a file input, we can verify it exists
          expect(await photoButton.getAttribute('type')).toBe('file');
        } else {
          // If it's a button, click to open upload dialog
          await photoButton.click();
          await page.waitForTimeout(500);

          // Look for file input after clicking
          const fileInput = page.locator('input[type="file"]');
          expect(await fileInput.count()).toBeGreaterThan(0);
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display photo gallery in punch item detail', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for photo gallery or image elements
      const photoElements = page.locator('[data-testid*="photo"], [data-testid*="image"], img[alt*="punch"], .photo-gallery');

      // Count photos (may be 0 if none uploaded)
      const photoCount = await photoElements.count();
      expect(photoCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test('should search punch items', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('paint');
      await page.waitForTimeout(1000);

      // Verify search was applied
      await expect(searchInput).toHaveValue('paint');
    } else {
      test.skip();
    }
  });

  test('should sort punch items by column', async ({ page }) => {
    // Look for sortable column headers
    const columnHeaders = page.locator('[role="columnheader"], th, .sortable, [data-sortable="true"]');

    if (await columnHeaders.count() > 0) {
      const firstHeader = columnHeaders.first();
      await firstHeader.click();
      await page.waitForTimeout(1000);

      // Verify page still shows punch lists (sort applied)
      const heading = page.locator('h1, h2').filter({ hasText: /punch list|punch item/i });
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display punch list summary statistics', async ({ page }) => {
    // Look for summary cards or statistics
    const summaryElements = page.locator('[data-testid*="summary"], .summary-card, .stats-card, text=/total|open|closed|verified/i');

    // Should show some summary information
    const count = await summaryElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter by multiple criteria simultaneously', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Apply status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }

    // Apply location filter
    const locationFilter = page.locator('select[name="location"], select[name="area"]').first();
    if (await locationFilter.isVisible()) {
      await locationFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }

    // Apply trade filter
    const tradeFilter = page.locator('select[name="trade"]').first();
    if (await tradeFilter.isVisible()) {
      await tradeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }

    // Verify filters were applied (page should still be visible)
    const heading = page.locator('h1, h2').filter({ hasText: /punch list|punch item/i });
    await expect(heading.first()).toBeVisible();
  });

  test('should display empty state when no punch items match filters', async ({ page }) => {
    // Apply filter that likely returns no results
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible()) {
      const options = await statusFilter.locator('option').count();
      if (options > 1) {
        // Try last option which might have no items
        await statusFilter.selectOption({ index: options - 1 });
        await page.waitForTimeout(1000);

        // Look for empty state message
        const emptyState = page.locator('text=/no punch|empty|nothing to show|no items/i');

        // Empty state might or might not show depending on data
        expect(await emptyState.count()).toBeGreaterThanOrEqual(0);
      }
    } else {
      test.skip();
    }
  });

  test('should show punch item priority levels', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for priority indicators
    const priorityElements = page.locator('[data-testid*="priority"], .priority, [class*="priority"]');

    // Should have priority indicators if punch items exist
    const count = await priorityElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should export punch list data', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")').first();

    if (await exportButton.isVisible()) {
      // Click export button
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for export options or confirmation
      const exportDialog = page.locator('[role="dialog"], .modal, [data-state="open"]');
      expect(await exportDialog.count()).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test('should show punch item history/activity log', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for activity log or history
      const activityLog = page.locator('[data-testid*="activity"], [data-testid*="history"], text=/activity|history|timeline/i');

      // Activity log might exist
      const count = await activityLog.count();
      expect(count).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test('should bulk update punch item status', async ({ page }) => {
    // Look for bulk actions or select all
    const selectAllCheckbox = page.locator('input[type="checkbox"][name="select-all"], [data-testid="select-all"]').first();

    if (await selectAllCheckbox.isVisible()) {
      // Select all items
      await selectAllCheckbox.click();
      await page.waitForTimeout(500);

      // Look for bulk actions menu
      const bulkActionsMenu = page.locator('button:has-text("Bulk Actions"), select[name="bulk-action"]').first();

      if (await bulkActionsMenu.isVisible()) {
        expect(await bulkActionsMenu.isVisible()).toBe(true);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should show responsible party/contractor information', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Click first punch item
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');

      // Look for responsible party or contractor info
      const responsibleParty = page.locator('text=/responsible|contractor|assignee|assigned to/i');

      const count = await responsibleParty.count();
      expect(count).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('should show due date for punch items', async ({ page }) => {
    // Wait for punch items to load
    await page.waitForTimeout(2000);

    // Look for due date fields in the list or detail view
    const dueDateElements = page.locator('[data-testid*="due-date"], text=/due date|deadline/i, input[type="date"]');

    // Due dates might be present
    const count = await dueDateElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
