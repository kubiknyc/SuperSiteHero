import { test, expect } from '@playwright/test';

/**
 * Visual Regression E2E Tests
 *
 * Captures screenshots for visual comparison testing.
 * Baseline images are stored in tests/e2e/visual-regression.spec.ts-snapshots/
 *
 * Run with: npx playwright test visual-regression.spec.ts --update-snapshots
 * to update baselines.
 */
test.describe('Visual Regression - Public Pages', () => {
  test('login page screenshot', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('signup page screenshot', async ({ page }) => {
    await page.goto('/signup');

    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('signup-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('forgot password page screenshot', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('forgot-password-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Visual Regression - Authenticated Pages', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('dashboard screenshot', async ({ page }) => {
    await page.goto('/');

    // Wait for data to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Extra time for animations

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('projects page screenshot', async ({ page }) => {
    await page.goto('/projects');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('projects-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('daily reports page screenshot', async ({ page }) => {
    await page.goto('/daily-reports');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('daily-reports-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('RFIs page screenshot', async ({ page }) => {
    await page.goto('/rfis');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('rfis-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('change orders page screenshot', async ({ page }) => {
    await page.goto('/change-orders');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('change-orders-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('tasks page screenshot', async ({ page }) => {
    await page.goto('/tasks');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('tasks-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('punch lists page screenshot', async ({ page }) => {
    await page.goto('/punch-lists');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('punch-lists-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Visual Regression - Components', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('sidebar navigation screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot just the sidebar
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();

    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar-navigation.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('create dialog screenshot', async ({ page }) => {
    await page.goto('/daily-reports');
    await page.waitForLoadState('networkidle');

    // Open create dialog
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    await createBtn.click();

    // Wait for dialog to appear
    const dialog = page.locator('[role="dialog"], .modal, form');
    await expect(dialog).toBeVisible();

    await expect(dialog).toHaveScreenshot('create-dialog.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('empty state screenshot', async ({ page }) => {
    // Navigate to a page that might have empty state
    await page.goto('/rfis?status=archived');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // If empty state is visible, screenshot it
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, text=/no.*found|empty/i');

    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(emptyState.first()).toHaveScreenshot('empty-state.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});

test.describe('Visual Regression - Mobile Views', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 375, height: 667 },
  });

  test('mobile dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('mobile navigation screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    const menuToggle = page.locator('[aria-label="Menu"], [aria-label="Toggle menu"]').first();
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await page.waitForTimeout(300); // Animation time

      await expect(page).toHaveScreenshot('mobile-navigation-open.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('mobile projects list screenshot', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-projects.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Visual Regression - Tablet Views', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 768, height: 1024 },
  });

  test('tablet dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('tablet-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('tablet daily reports screenshot', async ({ page }) => {
    await page.goto('/daily-reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('tablet-daily-reports.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    colorScheme: 'dark',
  });

  test('dark mode dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dark-mode-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dark mode login screenshot', async ({ page }) => {
    // Clear auth for login page
    await page.context().clearCookies();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dark-mode-login.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
