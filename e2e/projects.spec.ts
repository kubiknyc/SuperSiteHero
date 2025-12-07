/**
 * Projects E2E Tests
 *
 * Tests critical project management flows:
 * - View projects list
 * - Create new project
 * - Edit project details
 * - Navigate to project detail
 * - Project dashboard
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Projects', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15000 });
  });

  test('should display projects list', async ({ page }) => {
    await page.goto('/projects');

    // Should show projects page
    await expect(page.locator('h1:has-text("Projects"), h2:has-text("Projects")')).toBeVisible({ timeout: 10000 });

    // Should have create project button
    const createButton = page.locator('button:has-text("New Project"), button:has-text("Create Project"), button:has-text("Add Project")');
    await expect(createButton.first()).toBeVisible();
  });

  test('should open create project dialog', async ({ page }) => {
    await page.goto('/projects');

    // Click create button
    const createButton = page.locator('button:has-text("New Project"), button:has-text("Create Project"), button:has-text("Add Project")');
    await createButton.first().click();

    // Should show dialog/modal with form
    const dialog = page.locator('[role="dialog"], .modal, [data-state="open"]');
    await expect(dialog.first()).toBeVisible({ timeout: 5000 });

    // Should have project name input
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], label:has-text("Name") + input, label:has-text("Project Name") + input');
    await expect(nameInput.first()).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects');

    const projectName = `Test Project ${Date.now()}`;

    // Click create button
    const createButton = page.locator('button:has-text("New Project"), button:has-text("Create Project"), button:has-text("Add Project")');
    await createButton.first().click();

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .modal, [data-state="open"]', { timeout: 5000 });

    // Fill in project details
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.fill(projectName);

    // Look for address field (optional)
    const addressInput = page.locator('input[name="address"], input[placeholder*="address" i]');
    if (await addressInput.first().isVisible()) {
      await addressInput.first().fill('123 Test Street');
    }

    // Submit the form
    const submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Save")');
    await submitButton.first().click();

    // Wait for dialog to close or success message
    await page.waitForTimeout(2000);

    // Project should appear in list
    await expect(page.locator(`text=${projectName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to project detail page', async ({ page }) => {
    await page.goto('/projects');

    // Click on first project in list
    const projectRow = page.locator('[data-testid="project-row"], tr, .project-card, a[href*="/projects/"]').first();
    await projectRow.click();

    // Should navigate to project detail
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/i, { timeout: 10000 });
  });

  test('should show project dashboard with modules', async ({ page }) => {
    await page.goto('/projects');

    // Click on first project
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    // Should show project navigation or dashboard
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/i, { timeout: 10000 });

    // Look for common project modules
    const moduleLinks = page.locator('a:has-text("RFIs"), a:has-text("Submittals"), a:has-text("Daily Reports"), a:has-text("Documents")');
    // At least one module should be visible
    await expect(moduleLinks.first()).toBeVisible({ timeout: 10000 });
  });
});
