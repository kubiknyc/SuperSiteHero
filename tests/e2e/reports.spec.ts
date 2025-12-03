import { test, expect } from '@playwright/test';

/**
 * Reports E2E Tests
 *
 * Tests the reports and analytics page.
 */
test.describe('Reports', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/reports', { waitUntil: 'networkidle' });
  });

  test('should display reports page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Reports & Analytics")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Generate and view project reports"')).toBeVisible();
  });

  test('should show Select Report card', async ({ page }) => {
    // Check for Select Report heading
    await expect(page.locator('text="Select Report"')).toBeVisible();
  });

  test('should show report type dropdown', async ({ page }) => {
    // Check for Report Type label
    await expect(page.locator('text="Report Type"')).toBeVisible();

    // Check for select dropdown with report options
    const reportSelect = page.locator('select').filter({ has: page.locator('option:has-text("Project Health Dashboard")') });
    await expect(reportSelect).toBeVisible();
  });

  test('should show project input', async ({ page }) => {
    // Check for Project input
    await expect(page.locator('text="Project (Optional)"')).toBeVisible();

    // Check for input field
    const projectInput = page.locator('input[placeholder*="Enter project ID"]');
    await expect(projectInput).toBeVisible();
  });

  test('should show action buttons', async ({ page }) => {
    // Check for Print button
    const printBtn = page.locator('button:has-text("Print")');
    await expect(printBtn).toBeVisible();

    // Check for Export PDF button
    const exportBtn = page.locator('button:has-text("Export PDF")');
    await expect(exportBtn).toBeVisible();

    // Check for Generate Report button
    const generateBtn = page.locator('button:has-text("Generate Report")');
    await expect(generateBtn).toBeVisible();
  });

  test('should show placeholder when no project selected', async ({ page }) => {
    // Check for placeholder message
    await expect(page.locator('text="Select a project to generate reports"')).toBeVisible();
  });

  test('should have report type options', async ({ page }) => {
    const reportSelect = page.locator('select').filter({ has: page.locator('option:has-text("Project Health Dashboard")') });

    // Check for all report type options
    await expect(reportSelect.locator('option:has-text("Project Health Dashboard")')).toBeVisible();
    await expect(reportSelect.locator('option:has-text("Financial Summary")')).toBeVisible();
    await expect(reportSelect.locator('option:has-text("Punch List Status")')).toBeVisible();
    await expect(reportSelect.locator('option:has-text("Safety Incident Report")')).toBeVisible();
  });

  test('should change report type selection', async ({ page }) => {
    const reportSelect = page.locator('select').filter({ has: page.locator('option:has-text("Project Health Dashboard")') });

    // Select Financial Summary
    await reportSelect.selectOption('financial');

    // Verify selection changed
    await expect(reportSelect).toHaveValue('financial');
  });

  test('should enable generate button when project entered', async ({ page }) => {
    // Generate button should be disabled initially
    const generateBtn = page.locator('button:has-text("Generate Report")');
    await expect(generateBtn).toBeDisabled();

    // Enter project ID
    const projectInput = page.locator('input[placeholder*="Enter project ID"]');
    await projectInput.fill('test-project-id');

    // Button should now be enabled
    await expect(generateBtn).toBeEnabled();
  });

  test('should show loading state', async ({ page }) => {
    // Navigate fresh
    await page.goto('/reports');

    // Content should appear
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});
