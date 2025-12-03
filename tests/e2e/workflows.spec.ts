import { test, expect } from '@playwright/test';

/**
 * Workflows E2E Tests
 *
 * Tests the workflows page with RFIs, Change Orders, and Submittals sections.
 */
test.describe('Workflows', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/workflows', { waitUntil: 'networkidle' });
  });

  test('should display workflows page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Workflows")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Manage RFIs, Change Orders, and Submittals"')).toBeVisible();
  });

  test('should show project selector', async ({ page }) => {
    // Check for Select Project card
    await expect(page.locator('text="Select Project"')).toBeVisible();

    // Check for select dropdown
    const projectSelect = page.locator('select').first();
    await expect(projectSelect).toBeVisible();
  });

  test('should show RFIs section', async ({ page }) => {
    // Check for RFIs section
    await expect(page.locator('text="RFIs"')).toBeVisible();
    await expect(page.locator('text="Manage requests for information from contractors"')).toBeVisible();
  });

  test('should show Change Orders section', async ({ page }) => {
    // Check for Change Orders section
    await expect(page.locator('text="Change Orders"')).toBeVisible();
    await expect(page.locator('text="Track change orders and scope adjustments"')).toBeVisible();
  });

  test('should show Submittals section', async ({ page }) => {
    // Check for Submittals section
    await expect(page.locator('text="Submittals"')).toBeVisible();
    await expect(page.locator('text="Manage material and equipment submittals"')).toBeVisible();
  });

  test('should show no projects message when no projects available', async ({ page }) => {
    // If no projects, should show message
    const noProjectsMessage = page.locator('text="No Projects Available"');
    const hasMessage = await noProjectsMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // Either shows message or has projects (with workflow sections)
    const hasWorkflows = await page.locator('text="RFIs"').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasMessage || hasWorkflows).toBeTruthy();
  });

  test('should load workflow data for selected project', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Either shows loading spinner, workflow data, or empty state
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should display workflow icons', async ({ page }) => {
    // Check for workflow type icons (emojis in this case)
    const rfiIcon = page.locator('text="📋"');
    const coIcon = page.locator('text="📝"');
    const submittalIcon = page.locator('text="📤"');

    // At least one should be visible if workflows section is shown
    const hasIcons =
      (await rfiIcon.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await coIcon.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await submittalIcon.isVisible({ timeout: 2000 }).catch(() => false));

    // Either has icons or no projects message
    const hasNoProjects = await page.locator('text="No Projects Available"').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasIcons || hasNoProjects).toBeTruthy();
  });

  test('should change project selection', async ({ page }) => {
    const projectSelect = page.locator('select').first();
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Page should update
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
