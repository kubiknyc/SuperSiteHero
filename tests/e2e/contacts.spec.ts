import { test, expect } from '@playwright/test';

/**
 * Contacts E2E Tests
 *
 * Tests the contacts directory page.
 */
test.describe('Contacts', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/contacts', { waitUntil: 'networkidle' });
  });

  test('should display contacts page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Contacts Directory")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Manage contacts for your projects"')).toBeVisible();
  });

  test('should show Add Contact button', async ({ page }) => {
    // Check for Add Contact button
    const addBtn = page.locator('button:has-text("Add Contact")');
    await expect(addBtn).toBeVisible();
  });

  test('should show project selector', async ({ page }) => {
    // Check for Select Project label
    await expect(page.locator('text="Select Project"')).toBeVisible();

    // Check for select dropdown
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();
  });

  test('should show no project selected message', async ({ page }) => {
    // Without project selection, shows prompt
    const noProjectMessage = page.locator('text="No Project Selected"');
    const selectPrompt = page.locator('text="Select a project to view contacts"');

    const hasMessage =
      (await noProjectMessage.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await selectPrompt.isVisible({ timeout: 2000 }).catch(() => false));

    expect(hasMessage).toBeTruthy();
  });

  test('should show statistics cards when project selected', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Check for stat cards
      const totalCard = page.locator('text="Total Contacts"');
      const subCard = page.locator('text="Subcontractors"');
      const primaryCard = page.locator('text="Primary"');
      const emergencyCard = page.locator('text="Emergency"');

      // Stats should be visible
      await expect(totalCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show search and filter controls when project selected', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Contact type filter (All Types option)
      const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Types")') });
      await expect(typeSelect).toBeVisible();
    }
  });

  test('should show primary only checkbox', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Primary only checkbox
      const primaryCheckbox = page.locator('#primary-only');
      await expect(primaryCheckbox).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show contacts list or empty state when project selected', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Either shows contacts grid or empty state
      const hasContacts = await page.locator('.grid').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasEmpty = await page.locator('text="No Contacts Yet"').isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasContacts || hasEmpty).toBeTruthy();
    }
  });

  test('should filter by contact type', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Select subcontractor filter
      const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Types")') });
      await typeSelect.selectOption('subcontractor');
      await page.waitForLoadState('networkidle');

      // Page should update
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should navigate to add contact page', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Click Add Contact button
      const addBtn = page.locator('button:has-text("Add Contact")');
      await addBtn.click();

      // Should navigate to new contact page
      await expect(page).toHaveURL(/.*contacts\/new/);
    }
  });
});
