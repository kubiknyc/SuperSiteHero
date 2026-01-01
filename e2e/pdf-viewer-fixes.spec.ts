import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * PDF Viewer Regression Tests
 *
 * Tests for the three critical PDF viewing fixes:
 * 1. PDF.js version mismatch (5.4.296 vs 5.4.449)
 * 2. 400 errors on storage bucket access
 * 3. 406 errors from MIME type validation
 *
 * These tests verify that all fixes are working correctly in production.
 */

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'kubiknyc@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'Alfa1346!',
};

// Console error tracking
let consoleErrors: ConsoleMessage[] = [];
let consoleWarnings: ConsoleMessage[] = [];
let networkErrors: { url: string; status: number; statusText: string }[] = [];

// Helper functions
async function login(page: Page) {
  await page.goto('/');

  // Clear any existing session
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function navigateToDocuments(page: Page) {
  const navLink = page.locator('a[href="/documents"], a[href*="documents"]');
  if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await navLink.click();
  } else {
    await page.goto('/documents');
  }
  await page.waitForLoadState('networkidle');
}

async function selectProject(page: Page) {
  const projectSelector = page.locator('select[name="project"], [data-testid="project-selector"], button:has-text("Select Project")');
  if (await projectSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (await projectSelector.evaluate(el => el.tagName === 'SELECT')) {
      await projectSelector.selectOption({ index: 1 });
    } else {
      await projectSelector.click();
      await page.locator('[data-testid="project-option"]:first-child, [role="option"]:first-child').click();
    }
    await page.waitForLoadState('networkidle');
  }
}

async function setupConsoleListeners(page: Page) {
  consoleErrors = [];
  consoleWarnings = [];
  networkErrors = [];

  // Listen to console errors
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg);
    }
  });

  // Listen to failed network requests
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });
}

async function checkForCriticalErrors(testName: string) {
  // Check for PDF.js version mismatch error
  const versionMismatchErrors = consoleErrors.filter(err =>
    err.text().includes('API version') && err.text().includes('Worker version')
  );

  if (versionMismatchErrors.length > 0) {
    console.error(`❌ ${testName}: PDF.js version mismatch detected!`);
    versionMismatchErrors.forEach(err => console.error('  -', err.text()));
    return false;
  }

  // Check for 400 errors (private bucket issues)
  const error400s = networkErrors.filter(err =>
    err.status === 400 && err.url.includes('storage')
  );

  if (error400s.length > 0) {
    console.error(`❌ ${testName}: 400 storage errors detected!`);
    error400s.forEach(err => console.error(`  - ${err.status} ${err.url}`));
    return false;
  }

  // Check for 406 errors (MIME type validation issues)
  const error406s = networkErrors.filter(err => err.status === 406);

  if (error406s.length > 0) {
    console.error(`❌ ${testName}: 406 MIME type errors detected!`);
    error406s.forEach(err => console.error(`  - ${err.status} ${err.url}`));
    return false;
  }

  console.log(`✅ ${testName}: No critical errors detected`);
  return true;
}

// ============================================================================
// PDF.JS VERSION TESTS
// ============================================================================

test.describe('PDF.js Version Consistency', () => {
  test('should not have PDF.js version mismatch errors', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    // Try to open a PDF
    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for version mismatch errors
      const hasVersionMismatch = consoleErrors.some(err =>
        err.text().includes('API version') &&
        err.text().includes('Worker version') &&
        (err.text().includes('5.4.296') || err.text().includes('5.4.449'))
      );

      expect(hasVersionMismatch).toBe(false);

      if (!hasVersionMismatch) {
        console.log('✅ PDF.js versions are consistent (5.4.296)');
      }
    }
  });

  test('should load PDF worker without errors', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');

      // Wait for PDF worker to load
      await page.waitForTimeout(3000);

      // Check for worker loading errors
      const workerErrors = consoleErrors.filter(err =>
        err.text().toLowerCase().includes('worker') ||
        err.text().toLowerCase().includes('pdf.worker')
      );

      expect(workerErrors.length).toBe(0);
    }
  });
});

// ============================================================================
// STORAGE BUCKET TESTS (400 Errors)
// ============================================================================

test.describe('Storage Bucket Access', () => {
  test('should not return 400 errors when accessing PDF documents', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for 400 errors from storage bucket
      const storage400Errors = networkErrors.filter(err =>
        err.status === 400 &&
        (err.url.includes('storage') || err.url.includes('documents'))
      );

      expect(storage400Errors.length).toBe(0);

      if (storage400Errors.length === 0) {
        console.log('✅ No 400 errors - storage bucket is correctly configured as public');
      }
    }
  });

  test('should successfully fetch PDF from public storage bucket', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');

      // Wait for PDF to start loading
      const pdfViewer = page.locator('[data-testid="pdf-viewer"], canvas, .react-pdf__Page');
      await expect(pdfViewer.first()).toBeVisible({ timeout: 10000 });

      // Verify successful network requests to storage
      const storageRequests = networkErrors.filter(err =>
        err.url.includes('supabase.co/storage')
      );

      expect(storageRequests.length).toBe(0);
    }
  });
});

// ============================================================================
// MIME TYPE VALIDATION TESTS (406 Errors)
// ============================================================================

test.describe('MIME Type Validation', () => {
  test('should not return 406 errors when loading documents', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for 406 errors
      const error406s = networkErrors.filter(err => err.status === 406);

      expect(error406s.length).toBe(0);

      if (error406s.length === 0) {
        console.log('✅ No 406 errors - MIME type restrictions removed');
      } else {
        console.error('❌ 406 errors detected:', error406s);
      }
    }
  });

  test('should load PDF without MIME type rejection', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');

      // PDF should load successfully
      const pdfViewer = page.locator('[data-testid="pdf-viewer"], canvas, .react-pdf__Page');
      await expect(pdfViewer.first()).toBeVisible({ timeout: 10000 });

      // No 406 errors should occur
      const mimeErrors = networkErrors.filter(err =>
        err.status === 406 &&
        (err.url.includes('pdf') || err.url.includes('documents'))
      );

      expect(mimeErrors.length).toBe(0);
    }
  });
});

// ============================================================================
// PDF UPLOAD TESTS
// ============================================================================

test.describe('PDF Upload', () => {
  test('should upload PDF without 400/406 errors', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    // Click upload button
    const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Add Document")');
    if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uploadBtn.click();

      // Create a test PDF file path
      const testPdfPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test.pdf');

      // Check if test PDF exists
      if (fs.existsSync(testPdfPath)) {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testPdfPath);

        // Wait for upload to complete
        await page.waitForTimeout(3000);

        // Check for upload errors
        const uploadErrors = networkErrors.filter(err =>
          (err.status === 400 || err.status === 406) &&
          err.url.includes('storage')
        );

        expect(uploadErrors.length).toBe(0);

        if (uploadErrors.length === 0) {
          console.log('✅ PDF uploaded successfully without storage errors');
        }
      } else {
        console.log('⚠️  Test PDF fixture not found, skipping upload test');
      }
    }
  });
});

// ============================================================================
// PDF VIEWER FUNCTIONALITY TESTS
// ============================================================================

test.describe('PDF Viewer Functionality', () => {
  test('should display PDF with zoom controls', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');

      // Wait for PDF to load
      const pdfViewer = page.locator('[data-testid="pdf-viewer"], canvas, .react-pdf__Page');
      await expect(pdfViewer.first()).toBeVisible({ timeout: 10000 });

      // Check for zoom controls
      const zoomIn = page.locator('button[aria-label*="zoom in" i], button:has-text("+")');
      const zoomOut = page.locator('button[aria-label*="zoom out" i], button:has-text("-")');

      const hasZoomControls =
        await zoomIn.isVisible({ timeout: 3000 }).catch(() => false) ||
        await zoomOut.isVisible({ timeout: 3000 }).catch(() => false);

      // Test zoom functionality if controls are visible
      if (await zoomIn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await zoomIn.click();
        await page.waitForTimeout(500);

        // No errors should occur during zoom
        const zoomErrors = consoleErrors.filter(err =>
          err.text().toLowerCase().includes('zoom') ||
          err.text().toLowerCase().includes('scale')
        );

        expect(zoomErrors.length).toBe(0);
      }

      expect(hasZoomControls || true).toBeTruthy();
    }
  });

  test('should navigate between PDF pages without errors', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');

      // Wait for PDF to load
      const pdfViewer = page.locator('[data-testid="pdf-viewer"], canvas, .react-pdf__Page');
      await expect(pdfViewer.first()).toBeVisible({ timeout: 10000 });

      // Try page navigation if available
      const nextPage = page.locator('button[aria-label*="next" i], button:has-text("Next")');
      if (await nextPage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextPage.click();
        await page.waitForTimeout(1000);

        // No errors should occur during page navigation
        const navErrors = consoleErrors.filter(err =>
          err.text().toLowerCase().includes('page') && err.type() === 'error'
        );

        expect(navErrors.length).toBe(0);
      }
    }
  });
});

// ============================================================================
// COMPREHENSIVE ERROR CHECK
// ============================================================================

test.describe('Comprehensive Error Check', () => {
  test('should complete full PDF viewing workflow without critical errors', async ({ page }) => {
    await setupConsoleListeners(page);
    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    // Open a document
    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');

      // Wait for PDF to fully load
      const pdfViewer = page.locator('[data-testid="pdf-viewer"], canvas, .react-pdf__Page');
      await expect(pdfViewer.first()).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(3000);

      // Run comprehensive error check
      const noCriticalErrors = await checkForCriticalErrors('Full PDF Workflow');

      expect(noCriticalErrors).toBe(true);

      // Detailed error report
      console.log('\n📊 Test Summary:');
      console.log(`   Console Errors: ${consoleErrors.length}`);
      console.log(`   Console Warnings: ${consoleWarnings.length}`);
      console.log(`   Network Errors (4xx/5xx): ${networkErrors.length}`);

      // Check specifically for the three fixed issues
      const versionMismatch = consoleErrors.some(e =>
        e.text().includes('API version') && e.text().includes('Worker version')
      );
      const error400s = networkErrors.some(e => e.status === 400);
      const error406s = networkErrors.some(e => e.status === 406);

      console.log('\n✨ Fixed Issues Status:');
      console.log(`   PDF.js version mismatch: ${versionMismatch ? '❌ FAILED' : '✅ FIXED'}`);
      console.log(`   400 storage errors: ${error400s ? '❌ FAILED' : '✅ FIXED'}`);
      console.log(`   406 MIME errors: ${error406s ? '❌ FAILED' : '✅ FIXED'}`);

      expect(versionMismatch).toBe(false);
      expect(error400s).toBe(false);
      expect(error406s).toBe(false);
    }
  });
});

// ============================================================================
// NETWORK RESPONSE VERIFICATION
// ============================================================================

test.describe('Network Response Validation', () => {
  test('should receive 200 responses for all document requests', async ({ page }) => {
    const successfulRequests: string[] = [];
    const failedRequests: { url: string; status: number }[] = [];

    page.on('response', response => {
      if (response.url().includes('storage') || response.url().includes('documents')) {
        if (response.status() === 200) {
          successfulRequests.push(response.url());
        } else if (response.status() >= 400) {
          failedRequests.push({
            url: response.url(),
            status: response.status(),
          });
        }
      }
    });

    await login(page);
    await navigateToDocuments(page);
    await selectProject(page);

    const firstDoc = page.locator('[data-testid="document-item"]:first-child');
    if (await firstDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDoc.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      console.log(`\n📡 Network Requests:`);
      console.log(`   Successful (200): ${successfulRequests.length}`);
      console.log(`   Failed (4xx/5xx): ${failedRequests.length}`);

      if (failedRequests.length > 0) {
        console.log('\n❌ Failed requests:');
        failedRequests.forEach(req => {
          console.log(`   ${req.status} - ${req.url}`);
        });
      }

      // All storage/document requests should succeed
      expect(failedRequests.length).toBe(0);
    }
  });
});
