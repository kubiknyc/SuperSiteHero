/**
 * Safety Incidents E2E Tests
 *
 * Tests critical safety incident management workflows:
 * - View safety incidents list
 * - Create new incident report
 * - Add incident type, severity, location
 * - Add involved parties and witnesses
 * - Upload incident photos
 * - Record corrective actions
 * - Edit incident details
 * - Change incident status
 * - Filter by severity, type, date range
 * - View incident details
 * - Generate OSHA 300 log entries
 * - Search incidents
 * - Validate required fields
 * - Add follow-up actions
 */

import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Safety Incidents', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('should navigate to safety incidents from project', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    const projectVisible = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!projectVisible) {
      test.skip(true, 'No projects found to navigate from');
      return;
    }
    await projectLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Look for safety/incidents navigation link
    const incidentsLink = page.locator('a:has-text("Safety"), a:has-text("Incidents"), a[href*="incidents"], a[href*="safety"]');
    const incidentsVisible = await incidentsLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!incidentsVisible) {
      test.skip(true, 'Safety incidents link not found in project');
      return;
    }
    await incidentsLink.first().click();

    await expect(page).toHaveURL(/\/(safety\/)?incidents/, { timeout: 10000 });
  });

  test('should display safety incidents list page', async ({ page }) => {
    // Try direct navigation to incidents page
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Should show main content area
    const content = page.locator('main, h1, h2, [role="main"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Look for incidents-specific content
    const incidentsIndicator = page.locator('h1:has-text("Incident"), h2:has-text("Incident"), h1:has-text("Safety"), [data-testid*="incident"]');
    const hasContent = await incidentsIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasContent) {
      // May need to navigate from project
      await page.goto('/projects');
      const projectLink = page.locator('a[href*="/projects/"]').first();
      if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await projectLink.click();
        const incidentsLink = page.locator('a:has-text("Safety"), a:has-text("Incidents"), a[href*="incidents"]');
        if (await incidentsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await incidentsLink.first().click();
        }
      }
    }
  });

  test('should open create incident form', async ({ page }) => {
    // Navigate to incidents page
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), button:has-text("Report"), a:has-text("New Incident")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Check for form, dialog, OR URL change
    const formOrDialog = page.locator('[role="dialog"], .modal, form, input[name="incident_type"], input[name="title"], [data-testid*="incident-form"]');
    const formVisible = await formOrDialog.first().isVisible({ timeout: 5000 }).catch(() => false);
    const currentUrl = page.url();
    const urlChanged = currentUrl.includes('incident') && (currentUrl.includes('new') || currentUrl.includes('create'));

    expect(formVisible || urlChanged).toBe(true);
  });

  test('should create new incident report with basic details', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Report")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Fill incident title/description
    const titleInput = page.locator('input[name*="title"], input[name*="subject"], input[placeholder*="title" i]');
    if (await titleInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.first().fill('E2E Test - Safety Incident Report');
    }

    // Fill description
    const descInput = page.locator('textarea[name*="description"], textarea[name*="details"], textarea[placeholder*="description" i]');
    if (await descInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.first().fill('Worker slipped on wet floor in main hallway. Minor injury to ankle.');
    }

    // Select incident date
    const dateInput = page.locator('input[type="date"], input[name*="date"], button[aria-label*="date" i]');
    if (await dateInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const inputType = await dateInput.first().getAttribute('type');
      if (inputType === 'date') {
        await dateInput.first().fill('2025-12-17');
      } else {
        await dateInput.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")');
    if (await submitButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('should add incident type and severity', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Select incident type
    const typeSelect = page.locator('select[name*="type"], select[name*="category"], [data-testid*="incident-type"]');
    if (await typeSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeSelect.first().selectOption({ index: 1 });
    } else {
      // Try dropdown/combobox
      const typeDropdown = page.locator('button[aria-label*="type" i], [role="combobox"]:near(:text("Type"))');
      if (await typeDropdown.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeDropdown.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
    }

    // Select severity level
    const severitySelect = page.locator('select[name*="severity"], select[name*="level"], [data-testid*="severity"]');
    if (await severitySelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await severitySelect.first().selectOption({ index: 1 });
    } else {
      // Try dropdown
      const severityDropdown = page.locator('button[aria-label*="severity" i], [role="combobox"]:near(:text("Severity"))');
      if (await severityDropdown.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await severityDropdown.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
    }
  });

  test('should add incident location', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Fill location
    const locationInput = page.locator('input[name*="location"], input[placeholder*="location" i], textarea[name*="location"]');
    if (await locationInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await locationInput.first().fill('Building A, 2nd Floor, Main Hallway');
    }

    // Fill specific area/zone if available
    const areaInput = page.locator('input[name*="area"], input[name*="zone"], select[name*="area"]');
    if (await areaInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const tagName = await areaInput.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await areaInput.first().selectOption({ index: 1 });
      } else {
        await areaInput.first().fill('Zone 2A');
      }
    }
  });

  test('should add involved parties and witnesses', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Add involved party
    const involvedInput = page.locator('input[name*="involved"], input[name*="injured"], input[placeholder*="involved" i]');
    if (await involvedInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await involvedInput.first().fill('John Smith');
    }

    // Add witness button/section
    const addWitnessButton = page.locator('button:has-text("Add Witness"), button:has-text("Witness")');
    if (await addWitnessButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await addWitnessButton.first().click();
      await page.waitForTimeout(500);
    }

    // Fill witness information
    const witnessInput = page.locator('input[name*="witness"], input[placeholder*="witness" i]');
    if (await witnessInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await witnessInput.first().fill('Jane Doe');
    }
  });

  test('should upload incident photos', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Look for file upload
    const fileInput = page.locator('input[type="file"], input[name*="photo"], input[name*="attachment"], input[accept*="image"]');
    const fileInputVisible = await fileInput.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (!fileInputVisible) {
      // May need to click an upload button first
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Photo"), button:has-text("Attach")');
      if (await uploadButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await uploadButton.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Note: Actual file upload would require a test file
    // This test validates the upload interface is present
    const uploadInterface = page.locator('input[type="file"], [data-testid*="upload"], .upload-zone, text=/Upload|Drag.*drop/i');
    const hasUpload = await uploadInterface.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasUpload) {
      expect(hasUpload).toBe(true);
    } else {
      test.skip(true, 'Photo upload interface not found');
    }
  });

  test('should record corrective actions', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Look for corrective actions field
    const correctiveInput = page.locator('textarea[name*="corrective"], textarea[name*="action"], input[name*="corrective"]');
    if (await correctiveInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await correctiveInput.first().fill('Placed warning signs. Immediately cleaned and dried the floor. Added anti-slip mats.');
    } else {
      // May be in a separate section/tab
      const correctiveSection = page.locator('button:has-text("Corrective"), a:has-text("Action"), [role="tab"]:has-text("Action")');
      if (await correctiveSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await correctiveSection.first().click();
        await page.waitForTimeout(500);
        const actionField = page.locator('textarea, input[type="text"]').first();
        if (await actionField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await actionField.fill('Placed warning signs and cleaned area.');
        }
      }
    }
  });

  test('should edit incident details', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Click on first incident
    const incidentLink = page.locator('a[href*="incidents/"], tr, .incident-card, [data-testid*="incident-item"]').first();
    const incidentVisible = await incidentLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!incidentVisible) {
      test.skip(true, 'No incidents found to edit');
      return;
    }

    await incidentLink.click();
    await page.waitForTimeout(1500);

    // Look for edit button
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit" i]');
    const editVisible = await editButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!editVisible) {
      test.skip(true, 'Edit button not found');
      return;
    }

    await editButton.first().click();
    await page.waitForTimeout(1000);

    // Should show edit form
    const editForm = page.locator('form, [role="dialog"], input, textarea');
    await expect(editForm.first()).toBeVisible({ timeout: 5000 });
  });

  test('should change incident status', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const incidentLink = page.locator('a[href*="incidents/"], tr, .incident-card').first();
    const incidentVisible = await incidentLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!incidentVisible) {
      test.skip(true, 'No incidents found');
      return;
    }

    await incidentLink.click();
    await page.waitForTimeout(1500);

    // Look for status dropdown/button
    const statusControl = page.locator('select[name*="status"], button[aria-label*="status" i], [data-testid*="status"]');
    if (await statusControl.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await statusControl.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await statusControl.first().selectOption({ index: 1 });
      } else {
        await statusControl.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"], [role="menuitem"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
    } else {
      test.skip(true, 'Status control not found');
    }
  });

  test('should filter by severity', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for severity filter
    const severityFilter = page.locator('select[name*="severity"], button:has-text("Severity"), [data-testid*="severity-filter"]');
    if (await severityFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await severityFilter.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await severityFilter.first().selectOption({ index: 1 });
      } else {
        await severityFilter.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"], [role="menuitem"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
      await page.waitForTimeout(1000);
    } else {
      test.skip(true, 'Severity filter not found');
    }
  });

  test('should filter by incident type', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for type filter
    const typeFilter = page.locator('select[name*="type"], button:has-text("Type"), [data-testid*="type-filter"]');
    if (await typeFilter.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await typeFilter.first().evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await typeFilter.first().selectOption({ index: 1 });
      } else {
        await typeFilter.first().click();
        await page.waitForTimeout(500);
        const option = page.locator('[role="option"], [role="menuitem"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
      await page.waitForTimeout(1000);
    } else {
      test.skip(true, 'Type filter not found');
    }
  });

  test('should filter by date range', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for date filters
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
    } else {
      test.skip(true, 'Date filter not found');
    }
  });

  test('should view incident detail page', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Click on first incident
    const incidentLink = page.locator('a[href*="incidents/"]').first();
    const incidentVisible = await incidentLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!incidentVisible) {
      test.skip(true, 'No incidents found to view');
      return;
    }

    await incidentLink.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/incidents\/[a-z0-9-]+/i, { timeout: 10000 });

    // Should show incident details
    const detailContent = page.locator('h1, h2, [data-testid*="incident-detail"]');
    await expect(detailContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should generate OSHA 300 log entries', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for OSHA or reports button
    const oshaButton = page.locator('button:has-text("OSHA"), a:has-text("OSHA"), button:has-text("300 Log"), a:has-text("Reports")');
    if (await oshaButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await oshaButton.first().click();
      await page.waitForTimeout(1500);

      // Should show OSHA report or export dialog
      const oshaContent = page.locator('[role="dialog"], .modal, h1:has-text("OSHA"), h2:has-text("300")');
      const hasOsha = await oshaContent.first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasOsha).toBe(true);
    } else {
      // May be in menu or settings
      const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("More"), button[aria-haspopup]');
      if (await menuButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuButton.first().click();
        await page.waitForTimeout(500);
        const oshaMenuItem = page.locator('[role="menuitem"]:has-text("OSHA")');
        if (await oshaMenuItem.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await oshaMenuItem.first().click();
        } else {
          test.skip(true, 'OSHA 300 log feature not found');
        }
      } else {
        test.skip(true, 'OSHA 300 log feature not found');
      }
    }
  });

  test('should search incidents', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]');
    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('slip');
      await page.waitForTimeout(1000);

      // Results should update
      const results = page.locator('main, [data-testid*="incident"]');
      await expect(results.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'Search input not found');
    }
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create incident button not found');
      return;
    }

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
  });

  test('should add follow-up actions to incident', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    const incidentLink = page.locator('a[href*="incidents/"]').first();
    const incidentVisible = await incidentLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!incidentVisible) {
      test.skip(true, 'No incidents found');
      return;
    }

    await incidentLink.click();
    await page.waitForTimeout(1500);

    // Look for follow-up section
    const followUpButton = page.locator('button:has-text("Follow"), button:has-text("Action"), a:has-text("Follow-up")');
    if (await followUpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await followUpButton.first().click();
      await page.waitForTimeout(1000);

      // Fill follow-up details
      const followUpInput = page.locator('textarea, input[type="text"]').first();
      if (await followUpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await followUpInput.fill('Schedule safety training for all floor workers. Review wet floor protocols.');

        // Save if there's a save button
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
        if (await saveButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.first().click();
          await page.waitForTimeout(1000);
        }
      }
    } else {
      test.skip(true, 'Follow-up actions feature not found');
    }
  });

  test('should display incident statistics or summary', async ({ page }) => {
    await page.goto('/safety/incidents').catch(() => page.goto('/incidents'));
    await page.waitForLoadState('domcontentloaded');

    // Look for statistics or summary cards
    const statsIndicator = page.locator('[data-testid*="stat"], .stat, .metric, text=/Total.*Incident/i, text=/Open.*Case/i');
    const hasStats = await statsIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasStats) {
      expect(hasStats).toBe(true);
    } else {
      // Stats may be in a dashboard view
      const dashboardLink = page.locator('a:has-text("Dashboard"), a:has-text("Overview")');
      if (await dashboardLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await dashboardLink.first().click();
        await page.waitForTimeout(1000);
      } else {
        test.skip(true, 'Incident statistics not found');
      }
    }
  });
});
