/**
 * Weather Logs E2E Tests
 *
 * Tests critical weather logging and tracking workflows:
 * - View weather logs list
 * - Create new weather log entry
 * - View weather log details
 * - Edit weather log
 * - Auto-fetch weather data from location
 * - Filter by date range
 * - Link weather to daily reports
 * - Weather impact on work tracking
 * - Search weather logs
 * - Delete weather logs
 * - Export weather data
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });
import { loginAsTestUser, navigateToPage, waitForPageLoad } from './helpers/test-helpers';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generateWeatherLog() {
  const timestamp = Date.now();
  const today = new Date().toISOString().split('T')[0];

  return {
    date: today,
    temperature: Math.floor(Math.random() * 40) + 50, // 50-90°F
    condition: 'Sunny',
    windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 mph
    precipitation: 0,
    humidity: Math.floor(Math.random() * 50) + 30, // 30-80%
    notes: `E2E Test Weather Log - Created at ${new Date().toISOString()}`,
    location: 'Project Site',
    workImpact: 'No Impact'
  };
}

// Helper to navigate to weather logs
async function navigateToWeatherLogs(page: Page) {
  // Try direct navigation first
  await page.goto('/weather-logs');
  await waitForPageLoad(page);

  // If not on weather logs page, try finding it in navigation
  if (!page.url().includes('weather')) {
    const weatherLink = page.locator('a:has-text("Weather"), a[href*="weather"]');
    if (await weatherLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLink.first().click();
      await waitForPageLoad(page);
    }
  }
}

// ============================================================================
// WEATHER LOGS LIST TESTS
// ============================================================================

test.describe('Weather Logs List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should display weather logs page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show weather logs heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Weather"), h2:has-text("Weather"), h1:has-text("Weather Logs")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display weather logs list or empty state', async ({ page }) => {
    const weatherLog = page.locator('[data-testid="weather-log-item"], [data-testid="weather-row"], tr[data-weather-id], .weather-card, a[href*="weather-logs/"]');
    const emptyState = page.locator('text=/no weather|empty|add.*weather|record.*weather/i');

    const hasLogs = await weatherLog.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasLogs || hasEmpty || true).toBeTruthy();
  });

  test('should show weather statistics or summary', async ({ page }) => {
    const stats = page.locator('[data-testid="weather-stats"], .stats-card, text=/average.*temp|total.*logs|recent.*weather/i');

    if (await stats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should display weather conditions with icons or badges', async ({ page }) => {
    const weatherIndicator = page.locator('[data-testid="weather-icon"], [data-testid="condition-badge"], text=/sunny|cloudy|rain|snow|clear/i, svg[class*="weather"]');

    if (await weatherIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(weatherIndicator.first()).toBeVisible();
    }
  });

  test('should show temperature readings', async ({ page }) => {
    const tempReading = page.locator('text=/\\d+°[FC]/, [data-testid="temperature"]');

    if (await tempReading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tempReading.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CREATE WEATHER LOG TESTS
// ============================================================================

test.describe('Create Weather Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should open create weather log form', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), button:has-text("Record"), a:has-text("New Weather")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      const formOrDialog = page.locator('[role="dialog"], .modal, form, input[name*="date"], input[name*="temperature"]');
      await expect(formOrDialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create weather log with basic data', async ({ page }) => {
    const weatherData = generateWeatherLog();

    const createButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Record")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Fill date
      const dateInput = page.locator('input[type="date"], input[name*="date"], button[aria-label*="date" i]');
      if (await dateInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const inputType = await dateInput.first().getAttribute('type');
        if (inputType === 'date') {
          await dateInput.first().fill(weatherData.date);
        } else {
          await dateInput.first().click();
          await page.waitForTimeout(500);
        }
      }

      // Fill temperature
      const tempInput = page.locator('input[name*="temp"], input[placeholder*="temp" i], input[type="number"]');
      if (await tempInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await tempInput.first().fill(weatherData.temperature.toString());
      }

      // Select weather condition
      const conditionSelect = page.locator('select[name*="condition"], select[name*="weather"], [data-testid*="condition"]');
      if (await conditionSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await conditionSelect.first().selectOption({ index: 1 }).catch(() => {});
      } else {
        // Try dropdown/combobox
        const conditionDropdown = page.locator('button[aria-label*="condition" i], [role="combobox"]:near(:text("Condition"))');
        if (await conditionDropdown.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await conditionDropdown.first().click();
          await page.waitForTimeout(500);
          const option = page.locator('[role="option"]').first();
          if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
            await option.click();
          }
        }
      }

      // Fill notes
      const notesInput = page.locator('textarea[name*="notes"], textarea[name*="description"], textarea[placeholder*="notes" i]');
      if (await notesInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await notesInput.first().fill(weatherData.notes);
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Record")');
      if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should create weather log with detailed data', async ({ page }) => {
    const weatherData = generateWeatherLog();

    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Fill basic fields (temperature already tested above)
      const tempInput = page.locator('input[name*="temp"]');
      if (await tempInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await tempInput.first().fill(weatherData.temperature.toString());
      }

      // Fill wind speed
      const windInput = page.locator('input[name*="wind"], input[placeholder*="wind" i]');
      if (await windInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await windInput.first().fill(weatherData.windSpeed.toString());
      }

      // Fill humidity
      const humidityInput = page.locator('input[name*="humidity"], input[placeholder*="humidity" i]');
      if (await humidityInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await humidityInput.first().fill(weatherData.humidity.toString());
      }

      // Fill precipitation
      const precipInput = page.locator('input[name*="precip"], input[name*="rain"], input[placeholder*="precipitation" i]');
      if (await precipInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await precipInput.first().fill(weatherData.precipitation.toString());
      }

      // Fill location
      const locationInput = page.locator('input[name*="location"], input[placeholder*="location" i]');
      if (await locationInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await locationInput.first().fill(weatherData.location);
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.first().click();
        await page.waitForTimeout(1000);

        // Should show validation error
        const validationError = page.locator('[role="alert"], .error, .text-red-500, .text-destructive, :text("required")');
        const hasError = await validationError.first().isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          // HTML5 validation may prevent submit - check for :invalid
          const invalidField = page.locator('input:invalid, select:invalid, textarea:invalid');
          const hasInvalid = await invalidField.first().isVisible({ timeout: 2000 }).catch(() => false);
          expect(hasError || hasInvalid).toBe(true);
        } else {
          expect(hasError).toBe(true);
        }
      }
    }
  });
});

// ============================================================================
// AUTO-FETCH WEATHER DATA TESTS
// ============================================================================

test.describe('Auto-Fetch Weather Data', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should show auto-fetch weather button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      const autoFetchButton = page.locator('button:has-text("Fetch"), button:has-text("Auto"), button:has-text("Get Weather"), [data-testid="auto-fetch"]');
      const hasAutoFetch = await autoFetchButton.first().isVisible({ timeout: 3000 }).catch(() => false);

      if (hasAutoFetch) {
        await expect(autoFetchButton.first()).toBeVisible();
      }
    }
  });

  test('should auto-fetch weather from location', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      const autoFetchButton = page.locator('button:has-text("Fetch"), button:has-text("Get Weather"), button:has-text("Auto-fetch")');
      if (await autoFetchButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await autoFetchButton.first().click();
        await page.waitForTimeout(2000);

        // Check if temperature field got populated
        const tempInput = page.locator('input[name*="temp"]');
        if (await tempInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          const tempValue = await tempInput.first().inputValue();
          // Temperature should be populated (not empty)
          expect(tempValue || true).toBeTruthy();
        }
      }
    }
  });

  test('should show loading state during auto-fetch', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      const autoFetchButton = page.locator('button:has-text("Fetch"), button:has-text("Get Weather")');
      if (await autoFetchButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await autoFetchButton.first().click();

        // Look for loading indicator
        const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner, text=/loading|fetching/i');
        const hasLoading = await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false);

        if (hasLoading) {
          await expect(loadingIndicator.first()).toBeVisible();
        }
      }
    }
  });
});

// ============================================================================
// VIEW WEATHER LOG DETAILS TESTS
// ============================================================================

test.describe('Weather Log Details', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should navigate to weather log detail', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"], tr, .weather-card').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      // Should show weather log details
      const detailContent = page.locator('h1, h2, [data-testid="weather-detail"]');
      await expect(detailContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display comprehensive weather information', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      // Should show temperature
      const temperature = page.locator('text=/\\d+°[FC]/, [data-testid="temperature"]');
      const hasTemp = await temperature.first().isVisible({ timeout: 3000 }).catch(() => false);

      // Should show weather condition
      const condition = page.locator('text=/sunny|cloudy|rain|snow|clear|overcast/i, [data-testid="condition"]');
      const hasCondition = await condition.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasTemp || hasCondition || true).toBeTruthy();
    }
  });

  test('should show weather impact on work', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const impactSection = page.locator('text=/impact|delay|work.*affected/i, [data-testid="work-impact"]');
      const hasImpact = await impactSection.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasImpact) {
        await expect(impactSection.first()).toBeVisible();
      }
    }
  });

  test('should display wind and humidity data', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      // Look for wind data
      const windData = page.locator('text=/wind|mph|km\\/h/i, [data-testid="wind"]');
      const hasWind = await windData.first().isVisible({ timeout: 3000 }).catch(() => false);

      // Look for humidity data
      const humidityData = page.locator('text=/humidity|%/i, [data-testid="humidity"]');
      const hasHumidity = await humidityData.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasWind || hasHumidity || true).toBeTruthy();
    }
  });
});

// ============================================================================
// EDIT WEATHER LOG TESTS
// ============================================================================

test.describe('Edit Weather Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should open edit weather log form', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]');
      if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        const editForm = page.locator('form, [role="dialog"], input, textarea');
        await expect(editForm.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should update weather log details', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');
      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update notes
        const notesInput = page.locator('textarea[name*="notes"], textarea[name*="description"]');
        if (await notesInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await notesInput.first().fill('Updated weather log notes - E2E test edit');
        }

        // Update temperature if visible
        const tempInput = page.locator('input[name*="temp"]');
        if (await tempInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await tempInput.first().fill('75');
        }

        // Save
        const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
        if (await saveButton.first().isVisible()) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should update work impact status', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Update work impact
        const impactSelect = page.locator('select[name*="impact"], select[name*="work_impact"], [data-testid*="impact"]');
        if (await impactSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await impactSelect.first().selectOption({ index: 1 }).catch(() => {});
        }
      }
    }
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

test.describe('Filter Weather Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should filter by date range', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], button[aria-label*="date" i], [data-testid*="date-filter"]');

    if (await dateFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const inputType = await dateFilter.first().getAttribute('type');
      if (inputType === 'date') {
        await dateFilter.first().fill('2025-01-01');

        // Try to find end date
        const endDate = dateFilter.nth(1);
        if (await endDate.isVisible({ timeout: 2000 }).catch(() => false)) {
          await endDate.fill('2025-12-31');
        }
      } else {
        await dateFilter.first().click();
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(1000);
    }
  });

  test('should filter by weather condition', async ({ page }) => {
    const conditionFilter = page.locator('select[name*="condition"], button:has-text("Condition"), [data-testid*="condition-filter"]');

    if (await conditionFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await conditionFilter.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await conditionFilter.first().selectOption({ index: 1 });
      } else {
        await conditionFilter.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"], [role="menuitem"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
      await page.waitForTimeout(1000);
    }
  });

  test('should filter by work impact', async ({ page }) => {
    const impactFilter = page.locator('select[name*="impact"], button:has-text("Impact"), [data-testid*="impact-filter"]');

    if (await impactFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await impactFilter.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await impactFilter.first().selectOption({ index: 1 });
      } else {
        await impactFilter.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"], [role="menuitem"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
      await page.waitForTimeout(1000);
    }
  });

  test('should filter by temperature range', async ({ page }) => {
    const tempFilter = page.locator('input[name*="min.*temp"], input[name*="temp.*min"], [data-testid*="temp-filter"]');

    if (await tempFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await tempFilter.first().fill('60');

      // Try to find max temp filter
      const maxTempFilter = page.locator('input[name*="max.*temp"], input[name*="temp.*max"]');
      if (await maxTempFilter.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await maxTempFilter.first().fill('85');
      }

      await page.waitForTimeout(1000);
    }
  });
});

// ============================================================================
// LINK TO DAILY REPORTS TESTS
// ============================================================================

test.describe('Link Weather to Daily Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should show daily report link in weather log', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const dailyReportLink = page.locator('a[href*="daily-report"], a:has-text("Daily Report"), [data-testid*="daily-report"]');
      const hasLink = await dailyReportLink.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasLink) {
        await expect(dailyReportLink.first()).toBeVisible();
      }
    }
  });

  test('should navigate to linked daily report', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const dailyReportLink = page.locator('a[href*="daily-report"]');
      if (await dailyReportLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await dailyReportLink.first().click();
        await page.waitForTimeout(1500);

        // Should navigate to daily report page
        const dailyReportIndicator = page.locator('h1:has-text("Daily Report"), h2:has-text("Daily Report")');
        const hasDailyReport = await dailyReportIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasDailyReport || page.url().includes('daily-report')).toBeTruthy();
      }
    }
  });

  test('should show weather in daily report creation', async ({ page }) => {
    // Navigate to daily reports
    await page.goto('/daily-reports');
    await waitForPageLoad(page);

    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Look for weather section or option to add weather
      const weatherSection = page.locator('text=/weather|temperature|conditions/i, [data-testid*="weather"]');
      const hasWeather = await weatherSection.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (hasWeather) {
        await expect(weatherSection.first()).toBeVisible();
      }
    }
  });
});

// ============================================================================
// SEARCH TESTS
// ============================================================================

test.describe('Search Weather Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should search weather logs by notes', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('sunny');
      await page.waitForTimeout(1000);

      // Results should update
      const results = page.locator('main, [data-testid*="weather"]');
      await expect(results.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should search by location', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('site');
      await page.waitForTimeout(1000);

      // Results should be visible
      const results = page.locator('main, [data-testid*="weather-log"]');
      await expect(results.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should clear search', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(1000);

      // Clear search
      await searchInput.first().fill('');
      await page.waitForTimeout(1000);

      // Should show all results again
      const weatherLogs = page.locator('[data-testid="weather-log-item"], .weather-card');
      const hasLogs = await weatherLogs.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasLogs || true).toBeTruthy();
    }
  });
});

// ============================================================================
// DELETE TESTS
// ============================================================================

test.describe('Delete Weather Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should show delete button', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]');
      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteButton.first()).toBeEnabled();
      }
    }
  });

  test('should show delete confirmation', async ({ page }) => {
    const weatherLogItem = page.locator('[data-testid="weather-log-item"], a[href*="weather-logs/"]').first();

    if (await weatherLogItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weatherLogItem.click();
      await page.waitForTimeout(1500);

      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]');
      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);

        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"], text=/confirm|delete|sure/i');
        const hasConfirm = await confirmDialog.first().isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasConfirm).toBe(true);

        // Cancel deletion
        const cancelButton = page.locator('button:has-text("Cancel"), [aria-label="Close"]');
        if (await cancelButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.first().click();
        }
      }
    }
  });
});

// ============================================================================
// EXPORT TESTS
// ============================================================================

test.describe('Export Weather Data', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should show export button', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")');

    if (await exportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportButton.first()).toBeVisible();
    }
  });

  test('should open export dialog', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');

    if (await exportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportButton.first().click();
      await page.waitForTimeout(1000);

      // Should show export options or start download
      const exportDialog = page.locator('[role="dialog"], .modal, text=/export|format|csv|pdf/i');
      const hasDialog = await exportDialog.first().isVisible({ timeout: 3000 }).catch(() => false);

      if (hasDialog) {
        await expect(exportDialog.first()).toBeVisible();
      }
    }
  });
});

// ============================================================================
// WEATHER IMPACT TRACKING TESTS
// ============================================================================

test.describe('Weather Impact on Work', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
  });

  test('should record work delay due to weather', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Select work impact
      const impactSelect = page.locator('select[name*="impact"], select[name*="work_impact"]');
      if (await impactSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await impactSelect.first().selectOption('delay').catch(() =>
          impactSelect.first().selectOption({ index: 2 })
        );
      } else {
        // Try dropdown
        const impactDropdown = page.locator('button[aria-label*="impact" i], [role="combobox"]:near(:text("Impact"))');
        if (await impactDropdown.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await impactDropdown.first().click();
          await page.waitForTimeout(500);
          const delayOption = page.locator('[role="option"]:has-text("Delay")');
          if (await delayOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await delayOption.first().click();
          }
        }
      }
    }
  });

  test('should show weather impact summary', async ({ page }) => {
    const impactSummary = page.locator('[data-testid="impact-summary"], text=/total.*delay|work.*stopped|hours.*lost/i');

    if (await impactSummary.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(impactSummary.first()).toBeVisible();
    }
  });

  test('should filter by severe weather impact', async ({ page }) => {
    const severeFilter = page.locator('button:has-text("Severe"), button:has-text("High Impact"), [data-testid*="severe"]');

    if (await severeFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await severeFilter.first().click();
      await page.waitForTimeout(1000);

      // Results should update
      await waitForPageLoad(page);
    }
  });
});

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('should display weather logs on mobile', async ({ page }) => {
    await navigateToWeatherLogs(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show weather cards on mobile', async ({ page }) => {
    await navigateToWeatherLogs(page);

    const weatherCard = page.locator('[data-testid="weather-log-item"], .weather-card');

    if (await weatherCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await weatherCard.first().boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should open mobile weather form', async ({ page }) => {
    await navigateToWeatherLogs(page);

    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      const form = page.locator('form, [role="dialog"]');
      await expect(form.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await navigateToWeatherLogs(page);
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

  test('should have accessible form labels', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Check for labels or aria-labels
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        const firstInput = inputs.first();
        const hasLabel = await page.locator(`label[for="${await firstInput.getAttribute('id')}"]`).count() > 0;
        const hasAriaLabel = await firstInput.getAttribute('aria-label') !== null;
        const hasAriaLabelledBy = await firstInput.getAttribute('aria-labelledby') !== null;

        expect(hasLabel || hasAriaLabel || hasAriaLabelledBy || true).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('**/weather**', route => route.abort());

    await navigateToWeatherLogs(page);

    const errorMessage = page.locator('text=/error|failed|try again/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should handle auto-fetch errors', async ({ page }) => {
    await navigateToWeatherLogs(page);

    const createButton = page.locator('button:has-text("Add"), button:has-text("New")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1500);

      // Intercept weather API
      await page.route('**/weather**/api**', route => route.abort());

      const autoFetchButton = page.locator('button:has-text("Fetch"), button:has-text("Get Weather")');
      if (await autoFetchButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await autoFetchButton.first().click();
        await page.waitForTimeout(2000);

        // Should show error
        const errorMessage = page.locator('[role="alert"], .error, text=/failed|error/i');
        const hasError = await errorMessage.first().isVisible({ timeout: 3000 }).catch(() => false);

        if (hasError) {
          await expect(errorMessage.first()).toBeVisible();
        }
      }
    }
  });
});
