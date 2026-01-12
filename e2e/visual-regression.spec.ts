/**
 * Visual Regression Tests
 *
 * Tests visual consistency across different viewports and states.
 * Uses Playwright's built-in screenshot comparison with toHaveScreenshot().
 *
 * Run with: npm run test:e2e -- visual-regression.spec.ts
 * Update snapshots: npm run test:e2e -- visual-regression.spec.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });
import { loginAsTestUser } from './helpers/test-helpers';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Visual Regression - Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match tasks list page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('tasks-list-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match tasks list page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('tasks-list-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match task detail page snapshot', async ({ page }) => {
    const firstTask = page.locator('[data-testid*="task-"] a, [role="row"] a, .task-item a').first();

    if (await firstTask.isVisible()) {
      await firstTask.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('task-detail-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });

  test('should match task create form snapshot', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /new task|create|add/i }).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('task-create-form.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Change Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/change-orders');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match change orders list page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('change-orders-list-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match change orders list on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('change-orders-list-tablet.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match change order detail page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstCO = page.locator('[data-testid*="change-order-"] a, [role="row"] a, .change-order-item a').first();

    if (await firstCO.isVisible()) {
      await firstCO.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('change-order-detail-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });

  test('should match change order create form snapshot', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('change-order-create-form.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match change order with filters applied', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('change-orders-filtered.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Punch Lists Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/punch-lists');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match punch lists page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('punch-lists-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match punch lists on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('punch-lists-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match punch item detail snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstItem = page.locator('[data-testid*="punch-"] a, [role="row"] a, .punch-item a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('punch-item-detail.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });

  test('should match punch item create form', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('punch-item-create-form.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Schedule/Gantt Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match schedule page snapshot', async ({ page }) => {
    await page.waitForTimeout(3000); // Gantt charts take longer to render
    await expect(page).toHaveScreenshot('schedule-page.png', {
      fullPage: true,
      maxDiffPixels: 200, // Gantt charts may have more variation
    });
  });

  test('should match schedule page on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(3000);
    await expect(page).toHaveScreenshot('schedule-page-desktop.png', {
      fullPage: false, // Don't scroll for large desktop view
      maxDiffPixels: 200,
    });
  });

  test('should match schedule page on tablet landscape', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('schedule-page-tablet-landscape.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('should match gantt chart zoomed in', async ({ page }) => {
    await page.waitForTimeout(2000);
    const zoomControl = page.locator('button, [role="button"]').filter({ hasText: /zoom in|\+/i }).first();

    if (await zoomControl.isVisible()) {
      await zoomControl.click();
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('gantt-zoomed-in.png', {
        fullPage: true,
        maxDiffPixels: 200,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Inspections Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/inspections');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match inspections list page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('inspections-list-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match inspections list on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('inspections-list-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match inspection detail page', async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstInspection = page.locator('[data-testid*="inspection-"] a, [role="row"] a, .inspection-item a').first();

    if (await firstInspection.isVisible()) {
      await firstInspection.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('inspection-detail-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });

  test('should match inspection create form', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('inspection-create-form.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Safety Incidents Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/safety/incidents');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match safety incidents list page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('safety-incidents-list-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match safety incidents on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('safety-incidents-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match incident detail page', async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstIncident = page.locator('[data-testid*="incident-"] a, [role="row"] a, .incident-item a').first();

    if (await firstIncident.isVisible()) {
      await firstIncident.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('incident-detail-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });

  test('should match incident create form', async ({ page }) => {
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add|report/i }).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('incident-create-form.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });

  test('should match incident with severity filter', async ({ page }) => {
    const severityFilter = page.locator('select[name*="severity"], [data-testid*="severity"]').first();

    if (await severityFilter.isVisible()) {
      await severityFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('incidents-filtered-by-severity.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Checklists Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/checklists');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match checklists page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('checklists-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match checklists on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('checklists-tablet.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match checklist execution page', async ({ page }) => {
    await page.waitForTimeout(2000);
    const activeChecklist = page.locator('[data-testid*="checklist-"] a, .checklist-item a').first();

    if (await activeChecklist.isVisible()) {
      await activeChecklist.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('checklist-execution-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Workflows Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/workflows');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match workflows list page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('workflows-list-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match workflows on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('workflows-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match workflow detail with steps', async ({ page }) => {
    await page.waitForTimeout(2000);
    const firstWorkflow = page.locator('[data-testid*="workflow-"] a, [role="row"] a, .workflow-item a').first();

    if (await firstWorkflow.isVisible()) {
      await firstWorkflow.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('workflow-detail-with-steps.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    } else {
      test.skip();
    }
  });
});

test.describe('Visual Regression - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should match dashboard page snapshot', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('dashboard-page.png', {
      fullPage: true,
      maxDiffPixels: 150, // Dashboard may have dynamic content
    });
  });

  test('should match dashboard on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      maxDiffPixels: 150,
    });
  });

  test('should match dashboard on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      maxDiffPixels: 150,
    });
  });

  test('should match dashboard on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: false, // Don't scroll for large desktop view
      maxDiffPixels: 150,
    });
  });
});
