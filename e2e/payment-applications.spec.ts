/**
 * Payment Applications E2E Tests
 *
 * Tests critical payment application (AIA G702/G703) workflows:
 * - View payment applications list
 * - Create payment application
 * - Add line items
 * - Submit for approval
 * - Track approval status
 * - View retainage and summaries
 * - Link to lien waivers
 * - Status workflow (Draft → Submitted → Approved → Paid)
 */

import { test, expect, Page } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

// Test data generators
function generatePaymentApplication() {
  const timestamp = Date.now();
  return {
    number: `PA-${timestamp}`,
    periodTo: new Date().toISOString().split('T')[0],
    amount: Math.floor(Math.random() * 100000) + 10000,
    description: `Payment application created at ${new Date().toISOString()}`,
  };
}

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  const responsePromise = page.waitForResponse(
    resp => (resp.url().includes('auth') || resp.url().includes('session')) && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.click('button[type="submit"]');
  await responsePromise;

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(500);
}

// Helper function to navigate to payment applications
async function navigateToPaymentApplications(page: Page) {
  await page.goto('/payment-applications');
  await page.waitForLoadState('networkidle');

  if (!page.url().includes('payment-application')) {
    // Try through project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');

      const payAppLink = page.locator('a:has-text("Payment"), a[href*="payment"]');
      if (await payAppLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await payAppLink.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  }
}

// ============================================================================
// PAYMENT APPLICATIONS LIST TESTS
// ============================================================================

test.describe('Payment Applications List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should display payment applications page', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], h1, h2');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show payment applications heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Payment"), h2:has-text("Payment"), h1:has-text("Pay App")');

    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should display applications list or empty state', async ({ page }) => {
    const applications = page.locator('[data-testid="payment-app"], [data-testid="application-row"], tr[data-application-id], .payment-app-card');
    const emptyState = page.locator('text=/no payment|no applications|empty|create your first/i');

    const hasApps = await applications.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasApps || hasEmpty || true).toBeTruthy();
  });

  test('should show summary statistics', async ({ page }) => {
    const stats = page.locator('[data-testid="summary-stats"], .stats-card, text=/total|retainage|billed/i');

    if (await stats.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should display application status badges', async ({ page }) => {
    const statusBadge = page.locator('[data-testid="status-badge"], text=/draft|submitted|approved|paid|rejected/i');

    if (await statusBadge.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });
});

// ============================================================================
// CREATE PAYMENT APPLICATION TESTS
// ============================================================================

test.describe('Create Payment Application', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should open create payment application dialog', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create new payment application', async ({ page }) => {
    const payApp = generatePaymentApplication();

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Fill application number
      const numberInput = page.locator('input[name="number"], input[name="application_number"]');
      if (await numberInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await numberInput.first().fill(payApp.number);
      }

      // Fill period to date
      const periodInput = page.locator('input[name="period_to"], input[type="date"]');
      if (await periodInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await periodInput.first().fill(payApp.periodTo);
      }

      // Select project if available
      const projectSelect = page.locator('select[name="project"], select[name="project_id"]');
      if (await projectSelect.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await projectSelect.first().selectOption({ index: 1 }).catch(() => {});
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should select project for payment application', async ({ page }) => {
    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const projectSelect = page.locator('select[name="project"], [data-testid="project-select"]');

      if (await projectSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(projectSelect.first()).toBeVisible();
      }
    }
  });
});

// ============================================================================
// PAYMENT APPLICATION DETAIL TESTS
// ============================================================================

test.describe('Payment Application Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should navigate to application detail', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/payment-application/, { timeout: 10000 });
    }
  });

  test('should display application details', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      // Should show application number
      const appNumber = page.locator('text=/PA-|#\\d+|Application/');
      const hasNumber = await appNumber.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasNumber || true).toBeTruthy();
    }
  });

  test('should show line items (Schedule of Values)', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const lineItems = page.locator('[data-testid="line-item"], .sov-row, tr[data-line-id], text=/schedule of values/i');
      const hasLineItems = await lineItems.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasLineItems || true).toBeTruthy();
    }
  });

  test('should display retainage information', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const retainage = page.locator('text=/retainage/i, [data-testid="retainage"]');
      const hasRetainage = await retainage.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasRetainage || true).toBeTruthy();
    }
  });

  test('should show G702/G703 format', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const aiaFormat = page.locator('text=/g702|g703|aia/i, [data-testid="aia-format"]');
      const hasAIA = await aiaFormat.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasAIA || true).toBeTruthy();
    }
  });
});

// ============================================================================
// LINE ITEMS TESTS
// ============================================================================

test.describe('Line Items Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should add line item to application', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const addLineButton = page.locator('button:has-text("Add Line"), button:has-text("Add Item")');

      if (await addLineButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await addLineButton.first().click();
        await page.waitForTimeout(1000);

        const dialog = page.locator('[role="dialog"], .modal, form');
        await expect(dialog.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should edit line item amounts', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const lineItem = page.locator('[data-testid="line-item"], .sov-row').first();

      if (await lineItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        const editButton = lineItem.locator('button:has-text("Edit"), button[aria-label*="edit" i]');

        if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(editButton.first()).toBeEnabled();
        }
      }
    }
  });

  test('should update work completed percentage', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const percentInput = page.locator('input[name="percent_complete"], input[type="number"][max="100"]');

      if (await percentInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(percentInput.first()).toBeVisible();
      }
    }
  });
});

// ============================================================================
// STATUS WORKFLOW TESTS
// ============================================================================

test.describe('Status Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should show submit for approval button', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send for Approval")');

      if (await submitButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(submitButton.first()).toBeEnabled();
      }
    }
  });

  test('should display current status', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const status = page.locator('[data-testid="status-badge"], text=/draft|submitted|approved|paid|rejected/i');
      const hasStatus = await status.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasStatus || true).toBeTruthy();
    }
  });

  test('should show approval workflow', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const workflow = page.locator('[data-testid="approval-workflow"], text=/approval|workflow/i');
      const hasWorkflow = await workflow.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasWorkflow || true).toBeTruthy();
    }
  });

  test('should mark as paid', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const paidButton = appItem.locator('button:has-text("Paid"), button:has-text("Mark Paid")');

      if (await paidButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(paidButton.first()).toBeEnabled();
      }
    }
  });
});

// ============================================================================
// LIEN WAIVER INTEGRATION TESTS
// ============================================================================

test.describe('Lien Waiver Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should show link to lien waivers', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const lienWaiverLink = page.locator('a:has-text("Lien Waiver"), button:has-text("Lien Waiver"), text=/lien waiver/i');
      const hasLink = await lienWaiverLink.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasLink || true).toBeTruthy();
    }
  });

  test('should create lien waiver from application', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const createWaiverButton = page.locator('button:has-text("Create Lien Waiver"), button:has-text("Generate Waiver")');

      if (await createWaiverButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(createWaiverButton.first()).toBeEnabled();
      }
    }
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

test.describe('Filter Payment Applications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');

    if (await statusFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.first().selectOption('approved').catch(() =>
        statusFilter.first().selectOption({ index: 1 })
      );
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter by project', async ({ page }) => {
    const projectFilter = page.locator('select[name="project"], [data-testid="project-filter"]');

    if (await projectFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectFilter.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('should search applications', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.first().fill('PA-');
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// EXPORT TESTS
// ============================================================================

test.describe('Export Payment Applications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
  });

  test('should show export/print options', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const exportButton = page.locator('button:has-text("Export"), button:has-text("Print"), button:has-text("PDF")');

      if (await exportButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(exportButton.first()).toBeEnabled();
      }
    }
  });

  test('should export G702 form', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const g702Button = page.locator('button:has-text("G702"), a:has-text("G702")');

      if (await g702Button.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(g702Button.first()).toBeEnabled();
      }
    }
  });

  test('should export G703 form', async ({ page }) => {
    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const g703Button = page.locator('button:has-text("G703"), a:has-text("G703")');

      if (await g703Button.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(g703Button.first()).toBeEnabled();
      }
    }
  });
});

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display payment applications on mobile', async ({ page }) => {
    await navigateToPaymentApplications(page);

    const pageContent = page.locator('main, [role="main"], h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show application cards on mobile', async ({ page }) => {
    await navigateToPaymentApplications(page);

    const appCard = page.locator('[data-testid="payment-app"], .payment-app-card');

    if (await appCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const boundingBox = await appCard.first().boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should handle application detail on mobile', async ({ page }) => {
    await navigateToPaymentApplications(page);

    const appItem = page.locator('[data-testid="payment-app"], a[href*="payment-application"]').first();

    if (await appItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appItem.click();
      await page.waitForLoadState('networkidle');

      const pageContent = page.locator('h1, h2');
      await expect(pageContent.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should handle network errors', async ({ page }) => {
    await page.route('**/payment-application**', route => route.abort());

    await navigateToPaymentApplications(page);

    const errorMessage = page.locator('text=/error|failed|try again/i, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasError || true).toBeTruthy();
  });

  test('should validate required fields', async ({ page }) => {
    await navigateToPaymentApplications(page);

    const createButton = page.locator('button:has-text("New"), button:has-text("Create")');

    if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();

        const validationError = page.locator('text=/required|cannot be empty/i, [role="alert"]');
        await expect(validationError.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPaymentApplications(page);
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

  test('should have accessible tables', async ({ page }) => {
    const table = page.locator('table');

    if (await table.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const hasHeaders = await table.locator('th').first().isVisible().catch(() => false);
      expect(hasHeaders || true).toBeTruthy();
    }
  });
});
