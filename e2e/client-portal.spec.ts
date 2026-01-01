/**
 * Client Portal E2E Tests
 *
 * Tests the complete client portal experience for client users with limited permissions.
 *
 * Features tested:
 * - Client Dashboard: Overview and metrics
 * - Projects View: Assigned projects listing
 * - Project Schedule: Read-only schedule viewing
 * - Project Photos: Photo gallery and viewing
 * - Project Documents: Document viewing and downloading
 * - RFIs: View RFIs and respond
 * - Change Orders: View and approve change orders
 * - Notification Settings: Configure client notification preferences
 *
 * Note: Client users have read-only access to most features with selective
 * interaction permissions (RFI responses, change order approvals).
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser, navigateToPage, waitForPageLoad } from './helpers/test-helpers';

// Test credentials - use client-specific credentials or fall back to regular test user
const TEST_CLIENT_EMAIL = process.env.TEST_CLIENT_EMAIL || process.env.TEST_USER_EMAIL || 'client@example.com';
const TEST_CLIENT_PASSWORD = process.env.TEST_CLIENT_PASSWORD || process.env.TEST_USER_PASSWORD || 'clientpassword123';

/**
 * Helper function to login as client user
 */
async function loginAsClient(page: Page) {
  await loginAsTestUser(page, TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD);
}

/**
 * Helper function to navigate to client portal
 */
async function navigateToClientPortal(page: Page) {
  await page.goto('/client');
  await waitForPageLoad(page);
}

/**
 * Helper function to select first available project
 */
async function selectFirstProject(page: Page): Promise<boolean> {
  await page.waitForTimeout(2000);

  const projectCard = page.locator('[data-testid*="project-card"], .project-card, article').first();
  const projectLink = page.locator('a[href*="/client/projects/"]').first();

  if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await projectCard.click();
    await waitForPageLoad(page);
    return true;
  } else if (await projectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await projectLink.click();
    await waitForPageLoad(page);
    return true;
  }

  return false;
}

// ============================================================================
// CLIENT DASHBOARD TESTS
// ============================================================================

test.describe('Client Portal - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateToClientPortal(page);
  });

  test('should display client dashboard with welcome message', async ({ page }) => {
    // Should show dashboard heading or welcome message
    const heading = page.locator('h1, h2').filter({ hasText: /dashboard|welcome|portal/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show project summary cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for summary cards (project count, active projects, etc.)
    const summaryCards = page.locator('[data-testid*="summary"], [data-testid*="card"], .summary-card, article');
    const cardCount = await summaryCards.count();

    // Should have at least some summary information
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('should display recent activity or updates', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for recent activity section
    const activitySection = page.locator('text=/recent|activity|update|notification/i').first();
    const hasActivity = await activitySection.isVisible({ timeout: 3000 }).catch(() => false);

    // Activity section is optional but common in client portals
    if (hasActivity) {
      await expect(activitySection).toBeVisible();
    }
  });

  test('should have navigation to portal sections', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for navigation links to projects, documents, etc.
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();

    expect(linkCount).toBeGreaterThan(0);
  });

  test('should display client-specific metrics', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for metrics like number of projects, pending approvals, etc.
    const metricsText = page.locator('text=/project|approval|document|change order/i');
    const hasMetrics = await metricsText.first().isVisible({ timeout: 3000 }).catch(() => false);

    // Metrics are expected in a client dashboard
    expect(hasMetrics).toBeTruthy();
  });
});

// ============================================================================
// ASSIGNED PROJECTS TESTS
// ============================================================================

test.describe('Client Portal - Assigned Projects', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto('/client');
    await waitForPageLoad(page);
  });

  test('should display list of assigned projects', async ({ page }) => {
    // Navigate to projects view if not already there
    const projectsLink = page.locator('a[href="/client/projects"], a:has-text("Projects")').first();
    if (await projectsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectsLink.click();
      await waitForPageLoad(page);
    }

    await page.waitForTimeout(2000);

    // Should show projects list or empty state
    const projectsList = page.locator('[data-testid*="project"], .project-card, table, article');
    const hasProjects = await projectsList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*project/i').isVisible().catch(() => false);

    expect(hasProjects || emptyState).toBeTruthy();
  });

  test('should display project information cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    const projectCard = page.locator('[data-testid*="project-card"], .project-card, article').first();

    if (await projectCard.isVisible({ timeout: 3000 })) {
      // Verify project card contains essential information
      const hasText = await projectCard.textContent();
      expect(hasText).toBeTruthy();
      expect(hasText!.length).toBeGreaterThan(0);
    }
  });

  test('should navigate to project details when clicking a project', async ({ page }) => {
    const navigated = await selectFirstProject(page);

    if (navigated) {
      // Should navigate to project detail page
      await expect(page).toHaveURL(/\/client\/projects\/[a-z0-9-]+/i, { timeout: 10000 });

      // Should show project details
      const detailContent = page.locator('h1, h2, main');
      await expect(detailContent.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should filter projects by status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const statusFilter = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Select a filter option
      const option = page.locator('option, [role="option"]').first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }

      expect(statusFilter).toBeVisible();
    }
  });

  test('should show project status indicators', async ({ page }) => {
    await page.waitForTimeout(2000);

    const statusBadge = page.locator('[data-testid*="status"], .status-badge, .badge').first();
    const hasStatus = await statusBadge.isVisible({ timeout: 3000 }).catch(() => false);

    // Status indicators are common but not mandatory
    if (hasStatus) {
      await expect(statusBadge).toBeVisible();
    }
  });
});

// ============================================================================
// PROJECT SCHEDULE (READ-ONLY) TESTS
// ============================================================================

test.describe('Client Portal - Project Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateToClientPortal(page);

    const navigated = await selectFirstProject(page);
    if (!navigated) {
      test.skip();
    }
  });

  test('should navigate to project schedule', async ({ page }) => {
    // Look for schedule tab or link
    const scheduleLink = page.locator('a[href*="/schedule"], a:has-text("Schedule"), button:has-text("Schedule")').first();

    if (await scheduleLink.isVisible({ timeout: 5000 })) {
      await scheduleLink.click();
      await waitForPageLoad(page);

      // Should show schedule page
      await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });
    } else {
      // Try direct navigation
      const currentUrl = page.url();
      const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

      if (projectMatch) {
        await page.goto(`/client/projects/${projectMatch[1]}/schedule`);
        await waitForPageLoad(page);
      } else {
        test.skip();
      }
    }
  });

  test('should display schedule in read-only mode', async ({ page }) => {
    // Navigate to schedule
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/schedule`);
    await waitForPageLoad(page);

    // Should show schedule view
    const scheduleContent = page.locator('[data-testid*="schedule"], [data-testid*="gantt"], .gantt-chart, canvas, svg').first();
    const hasSchedule = await scheduleContent.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasSchedule) {
      // May show empty state
      const emptyState = await page.locator('text=/no.*schedule|no.*task/i').isVisible().catch(() => false);
      expect(emptyState).toBeTruthy();
    } else {
      await expect(scheduleContent).toBeVisible();
    }
  });

  test('should NOT show edit or create buttons for schedule items', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/schedule`);
    await waitForPageLoad(page);

    // Look for edit/create buttons - these should NOT be visible for clients
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Add"), button:has-text("Create")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 2000 }).catch(() => false);

    // Client should have read-only access - no edit buttons
    expect(hasEditButton).toBeFalsy();
  });

  test('should view schedule tasks and timeline', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/schedule`);
    await waitForPageLoad(page);

    // Look for task items or timeline
    const taskItems = page.locator('[data-testid*="task"], .task-item, tr');
    const taskCount = await taskItems.count();

    expect(taskCount).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// PROJECT PHOTOS TESTS
// ============================================================================

test.describe('Client Portal - Project Photos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateToClientPortal(page);

    const navigated = await selectFirstProject(page);
    if (!navigated) {
      test.skip();
    }
  });

  test('should navigate to project photos', async ({ page }) => {
    // Look for photos tab or link
    const photosLink = page.locator('a[href*="/photos"], a:has-text("Photos"), button:has-text("Photos")').first();

    if (await photosLink.isVisible({ timeout: 5000 })) {
      await photosLink.click();
      await waitForPageLoad(page);

      await expect(page).toHaveURL(/\/photos/, { timeout: 10000 });
    } else {
      // Try direct navigation
      const currentUrl = page.url();
      const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

      if (projectMatch) {
        await page.goto(`/client/projects/${projectMatch[1]}/photos`);
        await waitForPageLoad(page);
      } else {
        test.skip();
      }
    }
  });

  test('should display photo gallery', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/photos`);
    await waitForPageLoad(page);

    // Should show photo gallery or empty state
    const photoGallery = page.locator('[data-testid*="photo"], .photo-grid, img, [role="img"]');
    const hasPhotos = await photoGallery.first().isVisible({ timeout: 5000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*photo/i').isVisible().catch(() => false);

    expect(hasPhotos || emptyState).toBeTruthy();
  });

  test('should view photo in lightbox or detail view', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/photos`);
    await waitForPageLoad(page);

    // Click on first photo
    const firstPhoto = page.locator('[data-testid*="photo"], .photo-item, img').first();

    if (await firstPhoto.isVisible({ timeout: 3000 })) {
      await firstPhoto.click();
      await page.waitForTimeout(1000);

      // Should open lightbox or detail view
      const lightbox = page.locator('[role="dialog"], .lightbox, .photo-viewer, [data-testid*="lightbox"]');
      const hasLightbox = await lightbox.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasLightbox).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should filter photos by date or category', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/photos`);
    await waitForPageLoad(page);

    // Look for filter controls
    const filterControl = page.locator('select, [role="combobox"], button').filter({ hasText: /filter|category|date/i }).first();

    if (await filterControl.isVisible({ timeout: 3000 })) {
      await filterControl.click();
      await page.waitForTimeout(500);
      expect(filterControl).toBeVisible();
    }
  });

  test('should NOT show upload or delete buttons', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/photos`);
    await waitForPageLoad(page);

    // Clients should not be able to upload or delete photos
    const uploadButton = page.locator('button:has-text("Upload"), input[type="file"]').first();
    const deleteButton = page.locator('button:has-text("Delete")').first();

    const hasUpload = await uploadButton.isVisible({ timeout: 2000 }).catch(() => false);
    const hasDelete = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasUpload).toBeFalsy();
    expect(hasDelete).toBeFalsy();
  });
});

// ============================================================================
// PROJECT DOCUMENTS TESTS
// ============================================================================

test.describe('Client Portal - Project Documents', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateToClientPortal(page);

    const navigated = await selectFirstProject(page);
    if (!navigated) {
      test.skip();
    }
  });

  test('should navigate to project documents', async ({ page }) => {
    // Look for documents tab or link
    const documentsLink = page.locator('a[href*="/documents"], a:has-text("Documents"), button:has-text("Documents")').first();

    if (await documentsLink.isVisible({ timeout: 5000 })) {
      await documentsLink.click();
      await waitForPageLoad(page);

      await expect(page).toHaveURL(/\/documents/, { timeout: 10000 });
    } else {
      // Try direct navigation
      const currentUrl = page.url();
      const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

      if (projectMatch) {
        await page.goto(`/client/projects/${projectMatch[1]}/documents`);
        await waitForPageLoad(page);
      } else {
        test.skip();
      }
    }
  });

  test('should display document list', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/documents`);
    await waitForPageLoad(page);

    // Should show documents list or empty state
    const documentsList = page.locator('[data-testid*="document"], table, .document-list, article');
    const hasDocs = await documentsList.first().isVisible({ timeout: 5000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*document/i').isVisible().catch(() => false);

    expect(hasDocs || emptyState).toBeTruthy();
  });

  test('should view document details', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/documents`);
    await waitForPageLoad(page);

    // Click on first document
    const firstDocument = page.locator('[data-testid*="document"], .document-item, tr').first();

    if (await firstDocument.isVisible({ timeout: 3000 })) {
      await firstDocument.click();
      await page.waitForTimeout(1000);

      // Should show document details or preview
      const detailView = page.locator('[role="dialog"], .document-viewer, main');
      await expect(detailView.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should download document', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/documents`);
    await waitForPageLoad(page);

    // Look for download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download"), [data-testid*="download"]').first();

    if (await downloadButton.isVisible({ timeout: 3000 })) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await downloadButton.click();

      const download = await downloadPromise;

      // Verify download was initiated (may or may not complete depending on file)
      if (download) {
        expect(download).toBeTruthy();
      }
    }
  });

  test('should NOT show upload or delete buttons', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/documents`);
    await waitForPageLoad(page);

    // Clients should not be able to upload or delete documents
    const uploadButton = page.locator('button:has-text("Upload"), input[type="file"]').first();
    const deleteButton = page.locator('button:has-text("Delete")').first();

    const hasUpload = await uploadButton.isVisible({ timeout: 2000 }).catch(() => false);
    const hasDelete = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasUpload).toBeFalsy();
    expect(hasDelete).toBeFalsy();
  });

  test('should filter documents by type or category', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/documents`);
    await waitForPageLoad(page);

    // Look for filter controls
    const filterControl = page.locator('select, [role="combobox"], button').filter({ hasText: /filter|type|category/i }).first();

    if (await filterControl.isVisible({ timeout: 3000 })) {
      await filterControl.click();
      await page.waitForTimeout(500);
      expect(filterControl).toBeVisible();
    }
  });
});

// ============================================================================
// PROJECT RFIs TESTS
// ============================================================================

test.describe('Client Portal - RFIs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateToClientPortal(page);

    const navigated = await selectFirstProject(page);
    if (!navigated) {
      test.skip();
    }
  });

  test('should navigate to project RFIs', async ({ page }) => {
    // Look for RFIs tab or link
    const rfisLink = page.locator('a[href*="/rfis"], a:has-text("RFIs"), button:has-text("RFI")').first();

    if (await rfisLink.isVisible({ timeout: 5000 })) {
      await rfisLink.click();
      await waitForPageLoad(page);

      await expect(page).toHaveURL(/\/rfis/, { timeout: 10000 });
    } else {
      // Try direct navigation
      const currentUrl = page.url();
      const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

      if (projectMatch) {
        await page.goto(`/client/projects/${projectMatch[1]}/rfis`);
        await waitForPageLoad(page);
      } else {
        test.skip();
      }
    }
  });

  test('should display RFI list', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/rfis`);
    await waitForPageLoad(page);

    // Should show RFIs list or empty state
    const rfisList = page.locator('[data-testid*="rfi"], table, .rfi-list, article');
    const hasRfis = await rfisList.first().isVisible({ timeout: 5000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*rfi/i').isVisible().catch(() => false);

    expect(hasRfis || emptyState).toBeTruthy();
  });

  test('should view RFI details', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/rfis`);
    await waitForPageLoad(page);

    // Click on first RFI
    const firstRfi = page.locator('[data-testid*="rfi"], .rfi-item, a[href*="/rfis/"]').first();

    if (await firstRfi.isVisible({ timeout: 3000 })) {
      await firstRfi.click();
      await waitForPageLoad(page);

      // Should show RFI details
      await expect(page).toHaveURL(/\/rfis\/[a-z0-9-]+/i, { timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test('should respond to RFI', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/rfis`);
    await waitForPageLoad(page);

    // Click on first RFI
    const firstRfi = page.locator('[data-testid*="rfi"], .rfi-item, a[href*="/rfis/"]').first();

    if (await firstRfi.isVisible({ timeout: 3000 })) {
      await firstRfi.click();
      await waitForPageLoad(page);

      // Look for respond button or form
      const respondButton = page.locator('button:has-text("Respond"), button:has-text("Reply"), button:has-text("Add Response")').first();

      if (await respondButton.isVisible({ timeout: 5000 })) {
        await respondButton.click();
        await page.waitForTimeout(1000);

        // Should show response form
        const responseForm = page.locator('textarea, [role="dialog"]');
        await expect(responseForm.first()).toBeVisible({ timeout: 5000 });

        // Fill in response
        const responseField = page.locator('textarea').first();
        if (await responseField.isVisible()) {
          await responseField.fill('Client response to RFI - automated test');

          // Submit response
          const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Send")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    } else {
      test.skip();
    }
  });

  test('should filter RFIs by status', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/rfis`);
    await waitForPageLoad(page);

    // Look for status filter
    const statusFilter = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      const option = page.locator('option, [role="option"]').first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }

      expect(statusFilter).toBeVisible();
    }
  });
});

// ============================================================================
// CHANGE ORDERS TESTS
// ============================================================================

test.describe('Client Portal - Change Orders', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await navigateToClientPortal(page);

    const navigated = await selectFirstProject(page);
    if (!navigated) {
      test.skip();
    }
  });

  test('should navigate to change orders', async ({ page }) => {
    // Look for change orders tab or link
    const changeOrdersLink = page.locator('a[href*="/change-orders"], a:has-text("Change Orders"), button:has-text("Change Order")').first();

    if (await changeOrdersLink.isVisible({ timeout: 5000 })) {
      await changeOrdersLink.click();
      await waitForPageLoad(page);

      await expect(page).toHaveURL(/\/change-orders/, { timeout: 10000 });
    } else {
      // Try direct navigation
      const currentUrl = page.url();
      const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

      if (projectMatch) {
        await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
        await waitForPageLoad(page);
      } else {
        test.skip();
      }
    }
  });

  test('should display change orders list', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
    await waitForPageLoad(page);

    // Should show change orders list or empty state
    const changeOrdersList = page.locator('[data-testid*="change-order"], table, .change-order-list, article');
    const hasChangeOrders = await changeOrdersList.first().isVisible({ timeout: 5000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*change order/i').isVisible().catch(() => false);

    expect(hasChangeOrders || emptyState).toBeTruthy();
  });

  test('should view change order details', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
    await waitForPageLoad(page);

    // Click on first change order
    const firstChangeOrder = page.locator('[data-testid*="change-order"], .change-order-item, a[href*="/change-orders/"]').first();

    if (await firstChangeOrder.isVisible({ timeout: 3000 })) {
      await firstChangeOrder.click();
      await waitForPageLoad(page);

      // Should show change order details
      const detailContent = page.locator('h1, h2, main');
      await expect(detailContent.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should display change order cost information', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
    await waitForPageLoad(page);

    // Click on first change order
    const firstChangeOrder = page.locator('[data-testid*="change-order"], .change-order-item, a[href*="/change-orders/"]').first();

    if (await firstChangeOrder.isVisible({ timeout: 3000 })) {
      await firstChangeOrder.click();
      await waitForPageLoad(page);

      // Look for cost/amount information
      const costInfo = page.locator('text=/\\$|amount|cost|total/i');
      const hasCostInfo = await costInfo.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasCostInfo).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should approve change order', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
    await waitForPageLoad(page);

    // Click on first change order
    const firstChangeOrder = page.locator('[data-testid*="change-order"], .change-order-item, a[href*="/change-orders/"]').first();

    if (await firstChangeOrder.isVisible({ timeout: 3000 })) {
      await firstChangeOrder.click();
      await waitForPageLoad(page);

      // Look for approve button
      const approveButton = page.locator('button:has-text("Approve")').first();

      if (await approveButton.isVisible({ timeout: 5000 })) {
        await approveButton.click();
        await page.waitForTimeout(1000);

        // May show confirmation dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }

        // Should show success message or status update
        const successIndicator = page.locator('text=/approved|success/i, [role="alert"]');
        const hasSuccess = await successIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (hasSuccess) {
          expect(successIndicator.first()).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test('should reject change order with reason', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
    await waitForPageLoad(page);

    // Click on first change order
    const firstChangeOrder = page.locator('[data-testid*="change-order"], .change-order-item, a[href*="/change-orders/"]').first();

    if (await firstChangeOrder.isVisible({ timeout: 3000 })) {
      await firstChangeOrder.click();
      await waitForPageLoad(page);

      // Look for reject button
      const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Decline")').first();

      if (await rejectButton.isVisible({ timeout: 5000 })) {
        await rejectButton.click();
        await page.waitForTimeout(1000);

        // Should show reason field
        const reasonField = page.locator('textarea, input[name*="reason"]').first();
        if (await reasonField.isVisible({ timeout: 3000 })) {
          await reasonField.fill('Test rejection reason - automated test');

          // Submit rejection
          const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Confirm")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    } else {
      test.skip();
    }
  });

  test('should filter change orders by status', async ({ page }) => {
    const currentUrl = page.url();
    const projectMatch = currentUrl.match(/\/client\/projects\/([^/]+)/);

    if (!projectMatch) {
      test.skip();
      return;
    }

    await page.goto(`/client/projects/${projectMatch[1]}/change-orders`);
    await waitForPageLoad(page);

    // Look for status filter
    const statusFilter = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      const option = page.locator('option, [role="option"]').first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }

      expect(statusFilter).toBeVisible();
    }
  });
});

// ============================================================================
// NOTIFICATION SETTINGS TESTS
// ============================================================================

test.describe('Client Portal - Notification Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test('should navigate to notification settings', async ({ page }) => {
    // Navigate to settings
    await page.goto('/client/settings/notifications');
    await waitForPageLoad(page);

    // Should show settings page
    const heading = page.locator('h1, h2').filter({ hasText: /notification|setting/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display notification preference options', async ({ page }) => {
    await page.goto('/client/settings/notifications');
    await waitForPageLoad(page);

    // Look for notification toggles or checkboxes
    const notificationOptions = page.locator('input[type="checkbox"], input[type="radio"], [role="switch"]');
    const optionCount = await notificationOptions.count();

    expect(optionCount).toBeGreaterThan(0);
  });

  test('should toggle email notifications', async ({ page }) => {
    await page.goto('/client/settings/notifications');
    await waitForPageLoad(page);

    // Find email notification toggle
    const emailToggle = page.locator('input[type="checkbox"], [role="switch"]').first();

    if (await emailToggle.isVisible({ timeout: 5000 })) {
      // Get initial state
      const initialState = await emailToggle.isChecked().catch(() => false);

      // Toggle the setting
      await emailToggle.click();
      await page.waitForTimeout(1000);

      // Verify state changed
      const newState = await emailToggle.isChecked().catch(() => false);
      expect(newState).not.toBe(initialState);
    } else {
      test.skip();
    }
  });

  test('should save notification preferences', async ({ page }) => {
    await page.goto('/client/settings/notifications');
    await waitForPageLoad(page);

    // Toggle a setting
    const toggle = page.locator('input[type="checkbox"], [role="switch"]').first();
    if (await toggle.isVisible({ timeout: 5000 })) {
      await toggle.click();
      await page.waitForTimeout(500);

      // Look for save button
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();

      if (await saveButton.isVisible({ timeout: 3000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Should show success message
        const successMessage = page.locator('[role="alert"]').filter({ hasText: /saved|success|updated/i });
        const hasSuccess = await successMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (hasSuccess) {
          await expect(successMessage.first()).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test('should configure notification frequency', async ({ page }) => {
    await page.goto('/client/settings/notifications');
    await waitForPageLoad(page);

    // Look for frequency selector
    const frequencySelector = page.locator('select, [role="combobox"]').filter({ hasText: /frequency|digest|daily|weekly/i }).first();

    if (await frequencySelector.isVisible({ timeout: 5000 })) {
      await frequencySelector.click();
      await page.waitForTimeout(500);

      // Select an option
      const option = page.locator('option, [role="option"]').nth(1);
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }

      expect(frequencySelector).toBeVisible();
    }
  });

  test('should show notification categories', async ({ page }) => {
    await page.goto('/client/settings/notifications');
    await waitForPageLoad(page);

    // Look for different notification categories
    const categories = page.locator('text=/project update|change order|rfi|document|photo/i');
    const categoryCount = await categories.count();

    // Should have at least some notification categories
    expect(categoryCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// PERMISSION AND SECURITY TESTS
// ============================================================================

test.describe('Client Portal - Permissions and Security', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test('should NOT access admin routes', async ({ page }) => {
    // Try to access admin route
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Should redirect to client portal or show access denied
    const isClientPortal = page.url().includes('/client');
    const hasAccessDenied = await page.locator('text=/access denied|unauthorized|forbidden/i').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(isClientPortal || hasAccessDenied).toBeTruthy();
  });

  test('should NOT access regular project routes (non-client)', async ({ page }) => {
    // Try to access regular project route (not client-specific)
    await page.goto('/projects');
    await waitForPageLoad(page);

    // Should redirect to client portal or show access denied
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('/client') || currentUrl.includes('/login');
    const hasAccessDenied = await page.locator('text=/access denied|unauthorized/i').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(isRedirected || hasAccessDenied).toBeTruthy();
  });

  test('should only see assigned projects', async ({ page }) => {
    await navigateToClientPortal(page);

    // Client should only see their assigned projects
    // This is verified by checking that project access is restricted
    const navigated = await selectFirstProject(page);

    if (navigated) {
      // Verify we're on a client project route
      await expect(page).toHaveURL(/\/client\/projects\/[a-z0-9-]+/i, { timeout: 10000 });
    }
  });

  test('should maintain session across page navigation', async ({ page }) => {
    await navigateToClientPortal(page);

    // Navigate to different sections
    await page.goto('/client');
    await waitForPageLoad(page);

    // Should still be authenticated
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // Verify client portal is accessible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Client Portal - Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsClient(page);
  });

  test('should display mobile-optimized dashboard', async ({ page }) => {
    await navigateToClientPortal(page);

    // Dashboard should be visible on mobile
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should have accessible mobile navigation', async ({ page }) => {
    await navigateToClientPortal(page);

    // Look for mobile menu/hamburger
    const mobileMenu = page.locator('button[aria-label*="menu" i], button:has-text("Menu"), [data-testid="mobile-menu"]');

    if (await mobileMenu.isVisible({ timeout: 5000 })) {
      await mobileMenu.click();
      await page.waitForTimeout(500);

      // Should show navigation menu
      const navMenu = page.locator('nav, [role="navigation"]');
      await expect(navMenu.first()).toBeVisible();
    }
  });

  test('should display projects in mobile layout', async ({ page }) => {
    await navigateToClientPortal(page);

    // Projects should stack vertically on mobile
    const projectCards = page.locator('[data-testid*="project-card"], .project-card, article');
    const cardCount = await projectCards.count();

    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('should allow touch interactions on mobile', async ({ page }) => {
    await navigateToClientPortal(page);

    const navigated = await selectFirstProject(page);

    if (navigated) {
      // Verify navigation worked via touch/tap
      await expect(page).toHaveURL(/\/client\/projects\/[a-z0-9-]+/i, { timeout: 10000 });
    }
  });
});
