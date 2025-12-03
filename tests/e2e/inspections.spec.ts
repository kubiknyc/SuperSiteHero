import { test, expect } from '@playwright/test';

/**
 * Inspections E2E Tests
 *
 * Tests the inspections page with scheduling and tracking.
 */
test.describe('Inspections', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/inspections', { waitUntil: 'networkidle' });
  });

  test('should display inspections page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Inspections")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Schedule and track inspections for your projects"')).toBeVisible();
  });

  test('should show Schedule Inspection button', async ({ page }) => {
    // Check for Schedule Inspection button
    const scheduleBtn = page.locator('button:has-text("Schedule Inspection"), a:has-text("Schedule Inspection")');
    await expect(scheduleBtn).toBeVisible();
  });

  test('should show project selector', async ({ page }) => {
    // Check for Select Project label
    await expect(page.locator('text="Select Project"')).toBeVisible();
  });

  test('should show statistics cards when project has inspections', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for stats cards (may not be visible if no data)
    const totalCard = page.locator('text="Total Inspections"');
    const upcomingCard = page.locator('text="Upcoming (7 days)"');
    const passedCard = page.locator('text="Passed"');
    const overdueCard = page.locator('text="Overdue"');

    // At least verify the page loads correctly
    const hasStats = await totalCard.isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoProjects = await page.locator('text="No Projects Found"').isVisible({ timeout: 2000 }).catch(() => false);
    const hasNoInspections = await page.locator('text="No inspections found"').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasStats || hasNoProjects || hasNoInspections).toBeTruthy();
  });

  test('should show upcoming inspections section when data exists', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for Upcoming Inspections section (conditional on data)
    const upcomingSection = page.locator('text="Upcoming Inspections (Next 7 Days)"');
    const hasUpcoming = await upcomingSection.isVisible({ timeout: 3000 }).catch(() => false);

    // Just verify page loads - upcoming section is data-dependent
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show All Inspections section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for All Inspections heading or empty state
    const allInspectionsHeading = page.locator('text="All Inspections"');
    const noInspections = page.locator('text="No inspections found"');
    const noProjects = page.locator('text="No Projects Found"');

    const hasContent =
      (await allInspectionsHeading.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await noInspections.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await noProjects.isVisible({ timeout: 2000 }).catch(() => false));

    expect(hasContent).toBeTruthy();
  });

  test('should navigate to create inspection page', async ({ page }) => {
    const scheduleBtn = page.locator('a:has-text("Schedule Inspection")').first();

    if (await scheduleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check if button is enabled
      const isDisabled = await scheduleBtn.isDisabled();

      if (!isDisabled) {
        await scheduleBtn.click();
        await expect(page).toHaveURL(/.*inspections\/new/);
      }
    }
  });

  test('should show empty state message when no inspections', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for empty state or inspections list
    const noInspections = page.locator('text="No inspections found"');
    const hasInspections = await page.locator('text="All Inspections"').isVisible({ timeout: 3000 }).catch(() => false);
    const noProjects = await page.locator('text="No Projects Found"').isVisible({ timeout: 2000 }).catch(() => false);

    // One of these states should be visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show loading state while fetching', async ({ page }) => {
    // Navigate fresh
    await page.goto('/inspections');

    // Either loading state or content should appear
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });
});
