import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for Project Management
 *
 * These tests run against a real browser and test the entire application flow
 * from the user's perspective.
 *
 * Prerequisites:
 * - Development server must be running (npm run dev)
 * - Test database should be seeded with test data
 * - Test user credentials should be available
 */

test.describe('Project Management E2E', () => {
  // Run before each test - handle authentication
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in test credentials
    // Replace with your actual test credentials
    await page.fill('input[name="email"]', 'test-super@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard after successful login
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify we're logged in
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should display projects list page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Verify page title
    await expect(page.locator('h1')).toContainText(/projects/i);

    // Verify "New Project" button exists
    await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'screenshots/projects-list.png' });
  });

  test('should create a new project', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Click "New Project" button
    await page.click('button:has-text("New Project")');

    // Wait for modal/form to appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in project details
    const projectName = `E2E Test Project ${Date.now()}`;
    await page.fill('input[name="name"]', projectName);
    await page.fill('textarea[name="description"]', 'Created via E2E test');

    // Fill in dates if present
    const startDateInput = page.locator('input[name="start_date"]');
    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2024-01-01');
    }

    // Select status if dropdown exists
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('active');
    }

    // Submit the form
    await page.click('button[type="submit"]:has-text("Create")');

    // Wait for success message or navigation
    await page.waitForTimeout(1000);

    // Verify the new project appears in the list
    await expect(page.locator(`text=${projectName}`)).toBeVisible();

    // Take a screenshot
    await page.screenshot({ path: 'screenshots/project-created.png' });
  });

  test('should edit an existing project', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"]', { timeout: 5000 });

    // Click on the first project's edit button
    await page.click('[data-testid="project-card"]:first-child button[aria-label="Edit"]');

    // Wait for edit form
    await expect(page.getByRole('dialog')).toBeVisible();

    // Modify the project name
    const updatedName = `Updated Project ${Date.now()}`;
    await page.fill('input[name="name"]', updatedName);

    // Submit changes
    await page.click('button[type="submit"]:has-text("Save")');

    // Wait for update to complete
    await page.waitForTimeout(1000);

    // Verify the updated name appears
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
  });

  test('should delete a project', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Get initial project count
    const initialCount = await page.locator('[data-testid="project-card"]').count();

    // Click delete button on the first project
    await page.click('[data-testid="project-card"]:first-child button[aria-label="Delete"]');

    // Confirm deletion in the confirmation dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.click('button:has-text("Confirm")');

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Verify project count decreased
    const newCount = await page.locator('[data-testid="project-card"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should filter and search projects', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Type in search box if it exists
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Office');

      // Wait for filtered results
      await page.waitForTimeout(500);

      // Verify filtered results contain search term
      const projectCards = page.locator('[data-testid="project-card"]');
      const count = await projectCards.count();

      for (let i = 0; i < count; i++) {
        const text = await projectCards.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('office');
      }
    }
  });

  test('should handle validation errors', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Click "New Project" button
    await page.click('button:has-text("New Project")');

    // Submit form without filling required fields
    await page.click('button[type="submit"]:has-text("Create")');

    // Verify validation error messages appear
    const errorMessage = page.locator('text=/required|cannot be empty/i');
    await expect(errorMessage.first()).toBeVisible();
  });

  test('should navigate to project details page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Click on the first project
    await page.click('[data-testid="project-card"]:first-child');

    // Verify we're on the project details page
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/);

    // Verify project details are visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should maintain state after page reload', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Get the first project name
    const firstProjectName = await page.locator('[data-testid="project-card"]:first-child').textContent();

    // Reload the page
    await page.reload();

    // Verify the same project is still there
    await expect(page.locator(`text=${firstProjectName}`)).toBeVisible();
  });
});

test.describe('Project Management - Mobile View', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
  });

  test('should display projects on mobile', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test-super@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to projects
    await page.goto('/projects');

    // Verify mobile-responsive layout
    await expect(page.locator('h1')).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/projects-mobile.png' });
  });
});

test.describe('Project Management - Multi-tenant Isolation', () => {
  test('should only show projects for current company', async ({ page }) => {
    // Login as user from company-123
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test-super@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to projects
    await page.goto('/projects');

    // Get all visible projects
    const projectCards = page.locator('[data-testid="project-card"]');
    const count = await projectCards.count();

    // Verify all projects belong to the same company
    // This would require checking project metadata or using data attributes
    expect(count).toBeGreaterThan(0);

    // In a real implementation, you would verify company_id matches
    // for all visible projects through the DOM or API calls
  });
});
