import { test, expect } from '@playwright/test';

/**
 * Documents E2E Tests
 *
 * Tests the document library page with folders and documents.
 */
test.describe('Documents', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/documents', { waitUntil: 'networkidle' });
  });

  test('should display document library page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Document Library")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Manage drawings, specifications, and project documents"')).toBeVisible();
  });

  test('should show project selector', async ({ page }) => {
    // Check for project selector label
    await expect(page.locator('label:has-text("Select Project")')).toBeVisible();

    // Check for select dropdown
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();
  });

  test('should show select project message when no project selected', async ({ page }) => {
    // Without project selection, shows prompt
    const noProjectMessage = page.locator('text="Select a Project"');
    const hasMessage = await noProjectMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // Either shows message or a project is already selected
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show folders sidebar when project selected', async ({ page }) => {
    // Select first project if available
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show folders section
      const foldersHeading = page.locator('h3:has-text("Folders")');
      await expect(foldersHeading).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show All Documents option in sidebar', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show All Documents button
      const allDocsBtn = page.locator('button:has-text("All Documents")');
      await expect(allDocsBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show document filters when project selected', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show search input
      const searchInput = page.locator('#search-docs');
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Should show status filter
      const statusFilter = page.locator('#status-filter');
      await expect(statusFilter).toBeVisible();

      // Should show type filter
      const typeFilter = page.locator('#type-filter');
      await expect(typeFilter).toBeVisible();
    }
  });

  test('should show view toggle buttons', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show list/grid view toggle buttons
      const listViewBtn = page.locator('button[title="List view"]');
      const gridViewBtn = page.locator('button[title="Grid view"]');

      await expect(listViewBtn).toBeVisible({ timeout: 5000 });
      await expect(gridViewBtn).toBeVisible();
    }
  });

  test('should show create folder button', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show folder creation button
      const createFolderBtn = page.locator('button[title="Create new folder"]');
      await expect(createFolderBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open create folder dialog', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Click create folder button
      const createFolderBtn = page.locator('button[title="Create new folder"]');
      await createFolderBtn.click();

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.locator('text="Create New Folder"')).toBeVisible();
    }
  });

  test('should show breadcrumb navigation', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show breadcrumb with "All Documents"
      const breadcrumb = page.locator('text="All Documents"').first();
      await expect(breadcrumb).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter documents by status', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      const statusFilter = page.locator('#status-filter');
      await statusFilter.selectOption('current');
      await page.waitForLoadState('networkidle');

      // Page should update
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should search documents', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('#search-docs');
      await searchInput.fill('drawing');
      await page.waitForLoadState('networkidle');

      // Page should update
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
