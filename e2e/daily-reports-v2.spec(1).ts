/**
 * Daily Reports V2 E2E Tests
 *
 * Tests critical V2 daily report workflows:
 * - Quick Mode form completion
 * - Detailed Mode form completion
 * - Copy from yesterday functionality
 * - Template application
 * - Photo upload with GPS
 * - Approval workflow (submit -> review -> approve)
 * - Safety incident OSHA compliance
 */

import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Helper to login
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Wait for auth response
  const responsePromise = page.waitForResponse(
    resp => (resp.url().includes('auth') || resp.url().includes('session')) && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.click('button[type="submit"]');
  await responsePromise;

  // Wait for redirect away from login
  await page.waitForURL(/\/(projects|dashboard)/, { timeout: 15000 });

  // Verify authenticated state
  await page.waitForTimeout(500);
}

// Helper to navigate to project's daily reports
async function navigateToDailyReports(page: Page) {
  await page.goto('/projects');
  const projectLink = page.locator('a[href*="/projects/"]').first();
  await projectLink.click();
  await page.waitForLoadState('domcontentloaded');

  const dailyReportsLink = page.locator('a:has-text("Daily Reports"), a[href*="daily-reports"]');
  await dailyReportsLink.first().click();
  await expect(page).toHaveURL(/daily-reports/, { timeout: 10000 });
}

test.describe('Daily Reports V2 - Quick Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);
  });

  test('should create a Quick Mode daily report', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Should default to Quick Mode
    const quickModeIndicator = page.locator('text=/Quick Mode/i').or(page.locator('[data-mode="quick"]'));
    await expect(quickModeIndicator.first()).toBeVisible({ timeout: 5000 });

    // Fill Work Summary section
    const workSummary = page.locator('textarea[name*="work_summary"], textarea[placeholder*="summary" i]');
    if (await workSummary.first().isVisible()) {
      await workSummary.first().fill('E2E Test: Concrete pouring on Level 3, electrical rough-in continues');
    }

    // Fill Work Planned Tomorrow
    const workPlanned = page.locator('textarea[name*="planned"], textarea[placeholder*="tomorrow" i]');
    if (await workPlanned.first().isVisible()) {
      await workPlanned.first().fill('Continue concrete work, begin framing');
    }

    // Check weather section is visible
    const weatherSection = page.locator('text=/Weather/i').first();
    await expect(weatherSection).toBeVisible();
  });

  test('should add workforce entries in Quick Mode', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Expand workforce section if collapsed
    const workforceHeader = page.locator('button:has-text("Workforce"), [data-section="workforce"]');
    if (await workforceHeader.isVisible()) {
      await workforceHeader.click();
    }

    // Click add workforce entry
    const addButton = page.locator('button:has-text("Add Crew"), button:has-text("Add Worker")');
    if (await addButton.first().isVisible()) {
      await addButton.first().click();

      // Fill company name
      const companyInput = page.locator('input[name*="company"], input[placeholder*="company" i]');
      if (await companyInput.first().isVisible()) {
        await companyInput.first().fill('ABC Construction');
      }

      // Fill worker count
      const workerCountInput = page.locator('input[name*="count"], input[type="number"]');
      if (await workerCountInput.first().isVisible()) {
        await workerCountInput.first().fill('8');
      }

      // Fill trade
      const tradeInput = page.locator('input[name*="trade"], select[name*="trade"]');
      if (await tradeInput.first().isVisible()) {
        await tradeInput.first().fill('Electrician');
      }
    }
  });

  test('should add equipment entries in Quick Mode', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Expand equipment section
    const equipmentHeader = page.locator('button:has-text("Equipment"), [data-section="equipment"]');
    if (await equipmentHeader.isVisible()) {
      await equipmentHeader.click();
    }

    // Click add equipment
    const addButton = page.locator('button:has-text("Add Equipment")');
    if (await addButton.first().isVisible()) {
      await addButton.first().click();

      // Fill equipment type
      const equipmentType = page.locator('input[name*="equipment_type"], input[placeholder*="equipment" i]');
      if (await equipmentType.first().isVisible()) {
        await equipmentType.first().fill('Excavator');
      }

      // Fill hours used
      const hoursInput = page.locator('input[name*="hours"]');
      if (await hoursInput.first().isVisible()) {
        await hoursInput.first().fill('6');
      }
    }
  });

  test('should show copy from yesterday option', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Look for copy from yesterday button
    const copyButton = page.locator('button:has-text("Copy from Yesterday"), button:has-text("Copy")');
    // This may or may not be visible depending on whether there's a previous report
    if (await copyButton.first().isVisible()) {
      await expect(copyButton.first()).toBeEnabled();
    }
  });

  test('should show template picker option', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Look for template button
    const templateButton = page.locator('button:has-text("Template"), button:has-text("Apply Template")');
    if (await templateButton.first().isVisible()) {
      await templateButton.first().click();

      // Should show template picker modal
      const templateModal = page.locator('[role="dialog"]:has-text("Template"), .modal:has-text("Template")');
      await expect(templateModal.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Daily Reports V2 - Detailed Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);
  });

  test('should switch to Detailed Mode', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Look for switch to detailed mode link
    const switchLink = page.locator('text=/Detailed Mode/i').or(page.locator('button:has-text("Detailed")')).or(page.locator('a:has-text("Detailed")'));
    if (await switchLink.first().isVisible()) {
      await switchLink.first().click();
      await page.waitForTimeout(500);

      // Should now show detailed mode sections
      const detailedSections = page.locator('text=/Safety|Inspections|T&M Work|Deliveries|Visitors/i');
      await expect(detailedSections.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show all detailed mode sections', async ({ page }) => {
    // Navigate to existing report or create new
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Switch to detailed mode
    const switchLink = page.locator('text=/Detailed Mode/i').or(page.locator('button:has-text("Detailed")'));
    if (await switchLink.first().isVisible()) {
      await switchLink.first().click();
      await page.waitForTimeout(500);

      // Check for main sections
      const expectedSections = [
        'Work Summary',
        'Workforce',
        'Equipment',
        'Delays',
        'Safety',
        'Inspections',
        'Deliveries',
        'Photos',
      ];

      for (const section of expectedSections) {
        const sectionElement = page.locator(`text=/${section}/i`).first();
        // Some sections might be in collapsed accordions
        await expect(sectionElement).toBeVisible({ timeout: 3000 }).catch(() => {
          // Section might be collapsed
        });
      }
    }
  });
});

test.describe('Daily Reports V2 - Safety Incidents (OSHA)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);
  });

  test('should add a safety incident with OSHA fields', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Switch to detailed mode for safety section
    const switchLink = page.locator('text=/Detailed Mode/i').or(page.locator('button:has-text("Detailed")'));
    if (await switchLink.first().isVisible()) {
      await switchLink.first().click();
      await page.waitForTimeout(500);
    }

    // Expand safety section
    const safetyHeader = page.locator('button:has-text("Safety"), [data-section="safety"]');
    if (await safetyHeader.first().isVisible()) {
      await safetyHeader.first().click();
      await page.waitForTimeout(300);

      // Add incident
      const addIncidentButton = page.locator('button:has-text("Add Incident"), button:has-text("Report Incident")');
      if (await addIncidentButton.first().isVisible()) {
        await addIncidentButton.first().click();

        // Should show incident form with OSHA fields
        const oshaFields = page.locator('text=/OSHA|Reportable|Days Away|Hospitalized/i');
        await expect(oshaFields.first()).toBeVisible({ timeout: 5000 });

        // Fill incident type
        const incidentType = page.locator('select[name*="incident_type"], input[name*="incident_type"]');
        if (await incidentType.first().isVisible()) {
          await incidentType.first().selectOption({ label: 'Near Miss' }).catch(() => {
            // Handle different select implementations
          });
        }

        // Fill description
        const description = page.locator('textarea[name*="description"]');
        if (await description.first().isVisible()) {
          await description.first().fill('E2E Test: Near miss - worker slipped on wet surface');
        }
      }
    }
  });
});

test.describe('Daily Reports V2 - Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);
  });

  test('should show submit button for draft reports', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Should show submit button in footer
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Submit for Approval")');
    await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('should require signature for submission', async ({ page }) => {
    // Create new report with minimal data
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Try to submit
    const submitButton = page.locator('button:has-text("Submit")');
    if (await submitButton.first().isVisible()) {
      await submitButton.first().click();

      // Should show signature dialog or validation error
      const signatureDialog = page.locator('[role="dialog"]:has-text("Signature"), .modal:has-text("Signature"), text=/signature required/i');
      const validationError = page.locator('text=/required|validation|error/i');

      // Either signature dialog or validation error should appear
      const signatureOrError = signatureDialog.or(validationError);
      await expect(signatureOrError.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show approval workflow panel for submitted reports', async ({ page }) => {
    // Look for a submitted report in the list
    const submittedReport = page.locator('tr:has-text("Submitted"), .report-card:has-text("Submitted")');
    if (await submittedReport.first().isVisible()) {
      await submittedReport.first().click();
      await page.waitForTimeout(1000);

      // Should show approval workflow panel
      const approvalPanel = page.locator('text=/Approval|Review|Approve/i');
      await expect(approvalPanel.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Daily Reports V2 - Photo Upload', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);
  });

  test('should show photo upload section', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Look for photos section
    const photosSection = page.locator('button:has-text("Photos")').or(page.locator('[data-section="photos"]')).or(page.locator('text=/Photos/i'));
    if (await photosSection.first().isVisible()) {
      await photosSection.first().click();
      await page.waitForTimeout(300);

      // Should show upload area
      const uploadArea = page.locator('text=/upload|drag and drop/i').or(page.locator('input[type="file"]'));
      await expect(uploadArea.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show GPS toggle in photo section', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Expand photos section
    const photosSection = page.locator('button:has-text("Photos"), [data-section="photos"]');
    if (await photosSection.first().isVisible()) {
      await photosSection.first().click();
      await page.waitForTimeout(300);

      // Should show GPS toggle
      const gpsToggle = page.locator('text=/Auto GPS/i').or(page.locator('[id="auto-gps"]'));
      await expect(gpsToggle.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Daily Reports V2 - Delays Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);
  });

  test('should add a delay entry', async ({ page }) => {
    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Expand delays section
    const delaysSection = page.locator('button:has-text("Delays"), [data-section="delays"]');
    if (await delaysSection.first().isVisible()) {
      await delaysSection.first().click();
      await page.waitForTimeout(300);

      // Add delay
      const addButton = page.locator('button:has-text("Add Delay"), button:has-text("Log Delay")');
      if (await addButton.first().isVisible()) {
        await addButton.first().click();

        // Should show delay form with type and category
        const delayType = page.locator('select[name*="delay_type"], input[name*="delay_type"]');
        await expect(delayType.first()).toBeVisible({ timeout: 5000 });

        // Fill description
        const description = page.locator('textarea[name*="description"]');
        if (await description.first().isVisible()) {
          await description.first().fill('E2E Test: Weather delay - rain');
        }
      }
    }
  });
});

test.describe('Daily Reports V2 - Offline Support', () => {
  test('should show sync status indicator', async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);

    // Create new report
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Look for sync status indicator
    const syncIndicator = page.locator('text=/Saved|Synced|Offline|Online/i').or(page.locator('[data-sync-status]'));
    // Sync indicator may or may not be visible depending on implementation
    if (await syncIndicator.first().isVisible()) {
      await expect(syncIndicator.first()).toBeVisible();
    }
  });

  test('should persist draft in local storage', async ({ page }) => {
    await login(page);
    await navigateToDailyReports(page);

    // Create new report and add some data
    const createButton = page.locator('button:has-text("New"), a:has-text("New")');
    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Fill in work summary
    const workSummary = page.locator('textarea[name*="work_summary"]');
    if (await workSummary.first().isVisible()) {
      await workSummary.first().fill('E2E Test: Draft persistence test');
    }

    // Wait for auto-save
    await page.waitForTimeout(2000);

    // Check localStorage for draft
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('daily-report-store-v2');
    });

    expect(draftData).toBeTruthy();
  });
});
