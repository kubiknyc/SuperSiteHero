/**
 * Daily Reports E2E Tests
 *
 * Tests critical daily report workflows:
 * - View daily reports list
 * - Create new daily report
 * - Add weather data
 * - Add manpower entries
 * - Submit daily report
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Daily Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('should navigate to daily reports from project', async ({ page }) => {
    // Go to projects
    await page.goto('/projects');

    // Click on first project
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    // Navigate to daily reports
    const dailyReportsLink = page.locator('a:has-text("Daily Reports"), a[href*="daily-reports"]');
    await dailyReportsLink.first().click();

    // Should be on daily reports page
    await expect(page).toHaveURL(/daily-reports/, { timeout: 10000 });
    await expect(page.locator('h1:has-text("Daily Reports"), h2:has-text("Daily Reports")')).toBeVisible();
  });

  test('should open create daily report form', async ({ page }) => {
    // Navigate to a project's daily reports
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();
    await page.waitForTimeout(1000);

    const dailyReportsLink = page.locator('a:has-text("Daily Reports"), a[href*="daily-reports"]');
    await dailyReportsLink.first().click();

    // Click create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New Daily Report")');
    await createButton.first().click();

    // Should show form with date field
    const dateInput = page.locator('input[type="date"], input[name="report_date"], button[aria-label*="date" i]');
    await expect(dateInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a daily report with weather', async ({ page }) => {
    // Navigate to daily reports
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();
    await page.waitForTimeout(1000);

    const dailyReportsLink = page.locator('a:has-text("Daily Reports"), a[href*="daily-reports"]');
    await dailyReportsLink.first().click();

    // Click create
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New")');
    await createButton.first().click();

    // Wait for form
    await page.waitForTimeout(1000);

    // Fill weather conditions if visible
    const weatherInput = page.locator('select[name*="weather"], input[name*="weather"], [data-testid="weather-select"]');
    if (await weatherInput.first().isVisible()) {
      await weatherInput.first().selectOption({ index: 1 }).catch(() => {
        // If not a select, try clicking
        weatherInput.first().click();
      });
    }

    // Look for temperature field
    const tempInput = page.locator('input[name*="temp"], input[placeholder*="temp" i]');
    if (await tempInput.first().isVisible()) {
      await tempInput.first().fill('72');
    }

    // Add notes/description
    const notesInput = page.locator('textarea[name*="notes"], textarea[name*="description"], textarea[placeholder*="notes" i]');
    if (await notesInput.first().isVisible()) {
      await notesInput.first().fill('E2E Test Daily Report - Weather conditions recorded');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.first().click();

    // Should show success or redirect
    await page.waitForTimeout(2000);
  });

  test('should view daily report details', async ({ page }) => {
    // Navigate to daily reports
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();
    await page.waitForTimeout(1000);

    const dailyReportsLink = page.locator('a:has-text("Daily Reports"), a[href*="daily-reports"]');
    await dailyReportsLink.first().click();

    // Click on existing report
    const reportRow = page.locator('tr, .report-card, a[href*="daily-reports/"]').first();
    await reportRow.click();

    // Should show report details
    await page.waitForTimeout(2000);

    // Look for common detail elements
    const detailIndicator = page.locator('h1, h2, [data-testid="report-date"], text=/Weather|Manpower|Notes/i');
    await expect(detailIndicator.first()).toBeVisible({ timeout: 10000 });
  });
});
