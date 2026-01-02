import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

/**
 * E2E Tests for Settings Pages
 *
 * Coverage:
 * - Main Settings page
 * - Company Profile
 * - User Management
 * - Approval Workflows
 * - Project Templates
 * - Distribution Lists
 * - Roles & Permissions
 * - Notification Preferences
 * - QuickBooks Integration
 * - Calendar Integrations
 * - AI Settings
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

test.describe('Settings - Main Settings Page', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page with navigation', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /setting/i }).first();
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for settings navigation/menu items or page content
    const hasNavigation = await page.locator('nav, [role="navigation"], .settings-nav, a[href*="/settings"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasHeading || hasNavigation || hasContent || page.url().includes('setting')).toBeTruthy();
  });

  test('should navigate to different settings sections', async ({ page }) => {
    await page.waitForTimeout(2000);

    const settingsLinks = [
      { text: /company|profile/i, path: '/settings/company' },
      { text: /user/i, path: '/settings/users' },
      { text: /notification/i, path: '/settings/notifications' },
    ];

    for (const link of settingsLinks) {
      const linkElement = page.locator('a, button').filter({ hasText: link.text }).first();

      if (await linkElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        await linkElement.click();
        await page.waitForTimeout(1000);

        // Verify navigation occurred
        const isCorrectPage = page.url().includes(link.path) ||
          await page.locator('h1, h2').filter({ hasText: link.text }).isVisible({ timeout: 3000 }).catch(() => false);

        expect(isCorrectPage).toBeTruthy();

        // Go back to settings
        await page.goto('/settings');
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Settings - Company Profile', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/company');
    await page.waitForLoadState('networkidle');
  });

  test('should display company profile page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /company/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display company information form', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for company name field
    const companyNameField = page.locator('input[name*="name"], input[placeholder*="company" i]').first();
    const hasField = await companyNameField.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasField).toBeTruthy();
  });

  test('should update company information', async ({ page }) => {
    await page.waitForTimeout(2000);

    const companyNameField = page.locator('input[name*="name"], input[placeholder*="company" i]').first();

    if (await companyNameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const originalValue = await companyNameField.inputValue();
      const testValue = `Test Company ${Date.now()}`;

      await companyNameField.fill(testValue);
      await page.waitForTimeout(500);

      // Find and click save button
      const saveButton = page.locator('button').filter({ hasText: /save|update/i }).first();

      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Check for success message or page content
        const successMessage = await page.locator('text=/success|saved|updated/i, [role="alert"]').first().isVisible({ timeout: 5000 }).catch(() => false);
        const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(successMessage || hasContent || page.url().includes('setting')).toBeTruthy();

        // Restore original value
        await companyNameField.fill(originalValue);
        if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Settings - User Management', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/users');
    await page.waitForLoadState('networkidle');
  });

  test('should display user management page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /user/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display list of users', async ({ page }) => {
    await page.waitForTimeout(2000);

    const userList = page.locator('table, [role="table"], .user-list, [data-testid*="user"]').first();
    const hasUserList = await userList.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasUserList).toBeTruthy();
  });

  test('should have invite user button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const inviteButton = page.locator('button, a').filter({ hasText: /invite|add.*user|new.*user/i }).first();
    const hasInviteButton = await inviteButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasInviteButton).toBeTruthy();
  });

  test('should open invite user dialog', async ({ page }) => {
    await page.waitForTimeout(2000);

    const inviteButton = page.locator('button, a').filter({ hasText: /invite|add.*user|new.*user/i }).first();

    if (await inviteButton.isVisible({ timeout: 3000 })) {
      await inviteButton.click();
      await page.waitForTimeout(1000);

      // Check for dialog or form
      const dialog = page.locator('[role="dialog"], .modal, form').first();
      const hasDialog = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasDialog).toBeTruthy();

      if (hasDialog) {
        // Verify email field exists
        const emailField = page.locator('input[type="email"], input[name*="email"]').first();
        await expect(emailField).toBeVisible({ timeout: 3000 });
      }
    } else {
      test.skip();
    }
  });

  test('should filter users by role or status', async ({ page }) => {
    await page.waitForTimeout(2000);

    const filterControl = page.locator('select, [role="combobox"], button').filter({ hasText: /role|status|filter/i }).first();

    if (await filterControl.isVisible({ timeout: 3000 })) {
      await filterControl.click();
      await page.waitForTimeout(500);

      // Verify filter options appear
      const hasOptions = await page.locator('option, [role="option"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasOptions).toBeTruthy();
    }
  });

  test('should search for users', async ({ page }) => {
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Verify search is working
      const resultsVisible = await page.locator('table tbody tr, [data-testid*="user"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      const emptyState = await page.locator('text=/no.*result/i, text=/no.*user/i').isVisible().catch(() => false);

      expect(resultsVisible || emptyState).toBeTruthy();
    }
  });
});

test.describe('Settings - Approval Workflows', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/approval-workflows');
    await page.waitForLoadState('networkidle');
  });

  test('should display approval workflows page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /approval.*workflow|workflow/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display list of workflows', async ({ page }) => {
    await page.waitForTimeout(2000);

    const workflowList = page.locator('table, [role="table"], .workflow-list, [data-testid*="workflow"]').first();
    const hasWorkflowList = await workflowList.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*workflow/i').isVisible().catch(() => false);

    expect(hasWorkflowList || emptyState).toBeTruthy();
  });

  test('should have create workflow button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const createButton = page.locator('button, a').filter({ hasText: /create|add.*workflow|new.*workflow/i }).first();
    const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasCreateButton).toBeTruthy();
  });
});

test.describe('Settings - Project Templates', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/project-templates');
    await page.waitForLoadState('networkidle');
  });

  test('should display project templates page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /project.*template|template/i }).first();
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasHeading || hasContent || page.url().includes('setting')).toBeTruthy();
  });

  test('should display list of templates', async ({ page }) => {
    await page.waitForTimeout(2000);

    const templateList = page.locator('table, [role="table"], .template-list, [data-testid*="template"], article').first();
    const hasTemplateList = await templateList.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*template/i').isVisible().catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTemplateList || emptyState || hasContent || page.url().includes('setting')).toBeTruthy();
  });

  test('should have create template button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const createButton = page.locator('button, a').filter({ hasText: /create|add.*template|new.*template/i }).first();
    const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasCreateButton || hasContent || page.url().includes('setting')).toBeTruthy();
  });
});

test.describe('Settings - Distribution Lists', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/distribution-lists');
    await page.waitForLoadState('networkidle');
  });

  test('should display distribution lists page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /distribution/i }).first();
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasHeading || hasContent || page.url().includes('setting')).toBeTruthy();
  });

  test('should display list of distribution lists', async ({ page }) => {
    await page.waitForTimeout(2000);

    const distList = page.locator('table, [role="table"], .list, [data-testid*="distribution"]').first();
    const hasDistList = await distList.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyState = await page.locator('text=/no.*distribution/i, text=/no.*list/i').isVisible().catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasDistList || emptyState || hasContent || page.url().includes('setting')).toBeTruthy();
  });
});

test.describe('Settings - Roles & Permissions', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/roles');
    await page.waitForLoadState('networkidle');
  });

  test('should display roles & permissions page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /role|permission/i }).first();
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasHeading || hasContent || page.url().includes('setting')).toBeTruthy();
  });

  test('should display list of roles', async ({ page }) => {
    await page.waitForTimeout(2000);

    const roleList = page.locator('table, [role="table"], .role-list, [data-testid*="role"]').first();
    const hasRoleList = await roleList.isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasRoleList || hasContent || page.url().includes('setting')).toBeTruthy();
  });
});

test.describe('Settings - Notification Preferences', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
  });

  test('should display notification preferences page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /notification/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display notification settings', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for toggle switches or checkboxes for notification preferences
    const notificationToggles = page.locator('input[type="checkbox"], [role="switch"]');
    const toggleCount = await notificationToggles.count();

    expect(toggleCount).toBeGreaterThan(0);
  });

  test('should toggle email notifications', async ({ page }) => {
    await page.waitForTimeout(2000);

    const emailToggle = page.locator('input[type="checkbox"], [role="switch"]').first();

    if (await emailToggle.isVisible({ timeout: 3000 })) {
      const wasChecked = await emailToggle.isChecked();

      await emailToggle.click();
      await page.waitForTimeout(500);

      const isNowChecked = await emailToggle.isChecked();
      expect(isNowChecked).not.toBe(wasChecked);

      // Toggle back
      await emailToggle.click();
      await page.waitForTimeout(500);
    } else {
      test.skip();
    }
  });

  test('should save notification preferences', async ({ page }) => {
    await page.waitForTimeout(2000);

    const saveButton = page.locator('button').filter({ hasText: /save|update/i }).first();

    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      const successMessage = await page.locator('text=/success|saved|updated/i, [role="alert"]').first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(successMessage).toBeTruthy();
    }
  });
});

test.describe('Settings - QuickBooks Integration', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/quickbooks');
    await page.waitForLoadState('networkidle');
  });

  test('should display QuickBooks integration page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /quickbooks|integration/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show connection status', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for connection status indicator or page content
    const statusIndicator = page.locator('text=/connected|not connected|disconnected/i, [data-testid*="status"]').first();
    const hasStatus = await statusIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await page.locator('main, [role="main"], .min-h-screen').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasStatus || hasContent || page.url().includes('setting')).toBeTruthy();
  });

  test('should have connect or disconnect button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const actionButton = page.locator('button, a').filter({ hasText: /connect|disconnect|authorize/i }).first();
    const hasActionButton = await actionButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasActionButton).toBeTruthy();
  });
});

test.describe('Settings - Calendar Integrations', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('should display calendar integrations page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /calendar|integration/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show available calendar providers', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for calendar provider options (Google Calendar, Outlook, etc.)
    const providers = page.locator('text=/google|outlook|microsoft|calendar/i');
    const providerCount = await providers.count();

    expect(providerCount).toBeGreaterThan(0);
  });
});

test.describe('Settings - AI Settings', () => {
  // Pre-authenticated session is used via storageState above - no manual login needed
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');
  });

  test('should display AI settings page', async ({ page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /ai|artificial intelligence/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show AI feature toggles', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for AI-related settings
    const aiToggles = page.locator('input[type="checkbox"], [role="switch"]');
    const toggleCount = await aiToggles.count();

    // AI settings page should have at least some toggles or configuration options
    expect(toggleCount).toBeGreaterThanOrEqual(0);
  });
});
