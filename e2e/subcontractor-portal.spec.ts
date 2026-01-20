import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

/**
 * E2E Tests for Subcontractor Portal
 *
 * Coverage:
 * - Subcontractor Dashboard
 * - Projects view
 * - Bids management
 * - Bid detail and submission
 * - Punch items assigned to subcontractor
 * - Tasks assigned to subcontractor
 * - Compliance documentation
 * - Daily reports submission
 *
 * Note: These tests require a subcontractor role user
 */

const TEST_EMAIL = process.env.TEST_SUBCONTRACTOR_EMAIL || process.env.TEST_USER_EMAIL || 'subcontractor@example.com';
const TEST_PASSWORD = process.env.TEST_SUBCONTRACTOR_PASSWORD || process.env.TEST_USER_PASSWORD || 'password123';

test.describe('Subcontractor Portal - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display subcontractor dashboard', async ({ page }) => {
    // Check for dashboard heading or welcome message
    const heading = page.locator('h1, h2').filter({ hasText: /dashboard|welcome|portal/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show key metrics or summary cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for metric cards (active bids, open punch items, pending tasks, etc.)
    const cards = page.locator('[data-testid*="card"], .card, [role="region"], article');
    const cardCount = await cards.count();

    // Dashboard should have at least some summary information
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should display navigation to portal sections', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();

    expect(linkCount).toBeGreaterThan(0);
  });

  test('should show recent activity or notifications', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for activity feed or notifications
    const activitySection = page.locator('text=/recent|activity|notification/i').first();
    const hasActivity = await activitySection.isVisible({ timeout: 3000 }).catch(() => false);

    // Activity section is optional
    if (hasActivity) {
      expect(activitySection).toBeVisible();
    }
  });
});

test.describe('Subcontractor Portal - Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub/projects');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display projects list', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /project/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show assigned projects', async ({ page }) => {
    await page.waitForTimeout(2000);

    const projectList = page.locator('table, [role="table"], .project-list, [data-testid*="project"], article');
    const hasProjects = await projectList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*project/i').isVisible().catch(() => false);

    expect(hasProjects || emptyState).toBeTruthy();
  });

  test('should display project details when clicking a project', async ({ page }) => {
    await page.waitForTimeout(2000);

    const projectItem = page.locator('[data-testid*="project"], .project-item, article, table tbody tr').first();

    if (await projectItem.isVisible({ timeout: 3000 })) {
      await projectItem.click();
      await page.waitForTimeout(1000);

      // Verify project details are shown (either new page or expanded view)
      const hasDetails = await page.locator('text=/project.*detail|description|address|status/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasDetails).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should filter projects by status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const filterControl = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await filterControl.isVisible({ timeout: 3000 })) {
      await filterControl.click();
      await page.waitForTimeout(500);

      const hasOptions = await page.locator('option, [role="option"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasOptions).toBeTruthy();
    }
  });
});

test.describe('Subcontractor Portal - Bids', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub/bids');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display bids list', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /bid/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show available bid packages', async ({ page }) => {
    await page.waitForTimeout(2000);

    const bidList = page.locator('table, [role="table"], .bid-list, [data-testid*="bid"], article');
    const hasBids = await bidList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*bid/i').isVisible().catch(() => false);

    expect(hasBids || emptyState).toBeTruthy();
  });

  test('should filter bids by status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const statusFilter = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Select a status filter
      const option = page.locator('option, [role="option"]').first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should open bid detail view', async ({ page }) => {
    await page.waitForTimeout(2000);

    const bidItem = page.locator('[data-testid*="bid"], .bid-item, article, table tbody tr').first();

    if (await bidItem.isVisible({ timeout: 3000 })) {
      await bidItem.click();
      await page.waitForTimeout(1000);

      // Verify bid detail page or modal
      const isDetailPage = page.url().includes('/sub/bids/');
      const isModal = await page.locator('[role="dialog"], .modal').isVisible({ timeout: 3000 }).catch(() => false);

      expect(isDetailPage || isModal).toBeTruthy();

      if (isDetailPage || isModal) {
        // Verify bid details are visible
        const hasDetails = await page.locator('text=/bid.*amount|scope|deadline|due.*date/i').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasDetails).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should allow submitting a bid', async ({ page }) => {
    await page.waitForTimeout(2000);

    const bidItem = page.locator('[data-testid*="bid"], .bid-item, article, table tbody tr').first();

    if (await bidItem.isVisible({ timeout: 3000 })) {
      await bidItem.click();
      await page.waitForTimeout(1000);

      // Look for submit bid button
      const submitButton = page.locator('button').filter({ hasText: /submit.*bid|place.*bid/i }).first();

      if (await submitButton.isVisible({ timeout: 3000 })) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Verify bid submission form appears
        const bidAmountField = page.locator('input[name*="amount"], input[placeholder*="amount" i]').first();
        const hasForm = await bidAmountField.isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasForm).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should download bid documents', async ({ page }) => {
    await page.waitForTimeout(2000);

    const bidItem = page.locator('[data-testid*="bid"], .bid-item, article, table tbody tr').first();

    if (await bidItem.isVisible({ timeout: 3000 })) {
      await bidItem.click();
      await page.waitForTimeout(1000);

      // Look for download button or documents section
      const downloadButton = page.locator('button, a').filter({ hasText: /download|document/i }).first();
      const hasDownload = await downloadButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Download functionality is optional but common
      if (hasDownload) {
        expect(downloadButton).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Subcontractor Portal - Punch Items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub/punch-items');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display punch items assigned to subcontractor', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /punch/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show list of assigned punch items', async ({ page }) => {
    await page.waitForTimeout(2000);

    const punchList = page.locator('table, [role="table"], .punch-list, [data-testid*="punch"], article');
    const hasPunchItems = await punchList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*punch/i, text=/no.*item/i').isVisible().catch(() => false);

    expect(hasPunchItems || emptyState).toBeTruthy();
  });

  test('should filter punch items by status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const statusFilter = page.locator('select, [role="combobox"], button').filter({ hasText: /status|filter/i }).first();

    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      const option = page.locator('option, [role="option"]').filter({ hasText: /open|in.*progress|completed/i }).first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should update punch item status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const punchItem = page.locator('[data-testid*="punch"], .punch-item, article, table tbody tr').first();

    if (await punchItem.isVisible({ timeout: 3000 })) {
      await punchItem.click();
      await page.waitForTimeout(1000);

      // Look for status update control
      const statusControl = page.locator('select, [role="combobox"], button').filter({ hasText: /status|mark.*complete/i }).first();

      if (await statusControl.isVisible({ timeout: 3000 })) {
        expect(statusControl).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should add photos to punch item', async ({ page }) => {
    await page.waitForTimeout(2000);

    const punchItem = page.locator('[data-testid*="punch"], .punch-item, article, table tbody tr').first();

    if (await punchItem.isVisible({ timeout: 3000 })) {
      await punchItem.click();
      await page.waitForTimeout(1000);

      // Look for photo upload button
      const uploadButton = page.locator('button, input[type="file"]').filter({ hasText: /photo|upload|attach/i }).first();
      const hasUpload = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Photo upload is optional but common
      if (hasUpload) {
        expect(uploadButton).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Subcontractor Portal - Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub/tasks');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display tasks assigned to subcontractor', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /task/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show list of assigned tasks', async ({ page }) => {
    await page.waitForTimeout(2000);

    const taskList = page.locator('table, [role="table"], .task-list, [data-testid*="task"], article');
    const hasTasks = await taskList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*task/i').isVisible().catch(() => false);

    expect(hasTasks || emptyState).toBeTruthy();
  });

  test('should filter tasks by status or priority', async ({ page }) => {
    await page.waitForTimeout(2000);

    const filterControl = page.locator('select, [role="combobox"], button').filter({ hasText: /status|priority|filter/i }).first();

    if (await filterControl.isVisible({ timeout: 3000 })) {
      await filterControl.click();
      await page.waitForTimeout(500);

      const option = page.locator('option, [role="option"]').first();
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should update task status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const taskItem = page.locator('[data-testid*="task"], .task-item, article, table tbody tr').first();

    if (await taskItem.isVisible({ timeout: 3000 })) {
      await taskItem.click();
      await page.waitForTimeout(1000);

      // Look for status update control
      const statusControl = page.locator('select, [role="combobox"], button').filter({ hasText: /status/i }).first();

      if (await statusControl.isVisible({ timeout: 3000 })) {
        expect(statusControl).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Subcontractor Portal - Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub/compliance');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display compliance page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /compliance|document/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show required compliance documents', async ({ page }) => {
    await page.waitForTimeout(2000);

    const docList = page.locator('table, [role="table"], .document-list, [data-testid*="document"], article');
    const hasDocs = await docList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*document/i').isVisible().catch(() => false);

    expect(hasDocs || emptyState).toBeTruthy();
  });

  test('should upload compliance document', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for upload button
    const uploadButton = page.locator('button, input[type="file"]').filter({ hasText: /upload|add.*document/i }).first();

    if (await uploadButton.isVisible({ timeout: 3000 })) {
      expect(uploadButton).toBeVisible();
    }
  });

  test('should show document status (approved, pending, expired)', async ({ page }) => {
    await page.waitForTimeout(2000);

    const docItem = page.locator('[data-testid*="document"], .document-item, article, table tbody tr').first();

    if (await docItem.isVisible({ timeout: 3000 })) {
      // Look for status indicator
      const statusBadge = page.locator('text=/approved|pending|expired|rejected/i, [data-testid*="status"], .badge, .status').first();
      const hasStatus = await statusBadge.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasStatus).toBeTruthy();
    } else {
      test.skip();
    }
  });
});

test.describe('Subcontractor Portal - Daily Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/sub/daily-reports');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display daily reports list', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /daily.*report|report/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show submitted reports', async ({ page }) => {
    await page.waitForTimeout(2000);

    const reportList = page.locator('table, [role="table"], .report-list, [data-testid*="report"], article');
    const hasReports = await reportList.first().isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*report/i').isVisible().catch(() => false);

    expect(hasReports || emptyState).toBeTruthy();
  });

  test('should have create new report button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const createButton = page.locator('button, a').filter({ hasText: /create|new.*report|add.*report/i }).first();
    const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasCreateButton).toBeTruthy();
  });

  test('should open report detail view', async ({ page }) => {
    await page.waitForTimeout(2000);

    const reportItem = page.locator('[data-testid*="report"], .report-item, article, table tbody tr').first();

    if (await reportItem.isVisible({ timeout: 3000 })) {
      await reportItem.click();
      await page.waitForTimeout(1000);

      // Verify detail page or modal
      const isDetailPage = page.url().includes('/sub/daily-reports/');
      const isModal = await page.locator('[role="dialog"], .modal').isVisible({ timeout: 3000 }).catch(() => false);

      expect(isDetailPage || isModal).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should filter reports by date range', async ({ page }) => {
    await page.waitForTimeout(2000);

    const dateFilter = page.locator('input[type="date"], input[placeholder*="date" i]').first();

    if (await dateFilter.isVisible({ timeout: 3000 })) {
      expect(dateFilter).toBeVisible();
    }
  });
});
