/**
 * Photo Progress Page Object Model
 *
 * Page object for Photo Progress feature pages.
 * Provides reusable methods for interacting with photo locations,
 * progress photos, comparisons, and reports.
 */

import { Page, Locator, expect } from '@playwright/test';

export class PhotoProgressPage {
  readonly page: Page;

  // Main page locators
  readonly pageHeading: Locator;
  readonly locationsTab: Locator;
  readonly photosTab: Locator;
  readonly comparisonsTab: Locator;
  readonly reportsTab: Locator;

  // Create buttons
  readonly createLocationButton: Locator;
  readonly capturePhotoButton: Locator;
  readonly createComparisonButton: Locator;
  readonly generateReportButton: Locator;

  // Search and filter
  readonly searchInput: Locator;
  readonly buildingFilter: Locator;
  readonly floorFilter: Locator;
  readonly dateRangeFilter: Locator;

  // Stats cards
  readonly totalLocationsCard: Locator;
  readonly totalPhotosCard: Locator;
  readonly comparisonsCard: Locator;
  readonly reportsCard: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageHeading = page.locator('h1:has-text("Photo Progress"), h1:has-text("Progress Photos")');
    this.locationsTab = page.getByRole('tab', { name: /location/i });
    this.photosTab = page.getByRole('tab', { name: /photo/i });
    this.comparisonsTab = page.getByRole('tab', { name: /comparison/i });
    this.reportsTab = page.getByRole('tab', { name: /report/i });

    // Create buttons
    this.createLocationButton = page.locator('button, a').filter({ hasText: /new.*location|add.*location|create.*location/i }).first();
    this.capturePhotoButton = page.locator('button, a').filter({ hasText: /capture|take.*photo|add.*photo/i }).first();
    this.createComparisonButton = page.locator('button, a').filter({ hasText: /new.*comparison|create.*comparison/i }).first();
    this.generateReportButton = page.locator('button, a').filter({ hasText: /generate.*report|new.*report|create.*report/i }).first();

    // Filters
    this.searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    this.buildingFilter = page.locator('select[name="building"], [data-testid="building-filter"]').first();
    this.floorFilter = page.locator('select[name="floor"], [data-testid="floor-filter"]').first();
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]').first();

    // Stats cards
    this.totalLocationsCard = page.locator('[data-testid="locations-card"], .stat-card').filter({ hasText: /location/i }).first();
    this.totalPhotosCard = page.locator('[data-testid="photos-card"], .stat-card').filter({ hasText: /photo/i }).first();
    this.comparisonsCard = page.locator('[data-testid="comparisons-card"], .stat-card').filter({ hasText: /comparison/i }).first();
    this.reportsCard = page.locator('[data-testid="reports-card"], .stat-card').filter({ hasText: /report/i }).first();
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/photo-progress');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/photo-progress`);
    await this.page.waitForLoadState('networkidle');
  }

  async switchToLocationsTab() {
    if (await this.locationsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.locationsTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async switchToPhotosTab() {
    if (await this.photosTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.photosTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async switchToComparisonsTab() {
    if (await this.comparisonsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.comparisonsTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async switchToReportsTab() {
    if (await this.reportsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.reportsTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  // Search and filter methods
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async filterByBuilding(building: string) {
    if (await this.buildingFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.buildingFilter.selectOption(building);
      await this.page.waitForTimeout(500);
    }
  }

  async filterByFloor(floor: string) {
    if (await this.floorFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.floorFilter.selectOption(floor);
      await this.page.waitForTimeout(500);
    }
  }

  // Photo Location methods
  getLocationCard(index: number = 0): Locator {
    return this.page.locator('[data-testid*="location-card"], .location-card, [role="article"]').nth(index);
  }

  getLocationByName(name: string): Locator {
    return this.page.locator('[data-testid*="location-card"], .location-card').filter({ hasText: name });
  }

  async getLocationCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.page.locator('[data-testid*="location-card"], .location-card, [role="article"]').count();
  }

  async clickLocation(index: number = 0) {
    const location = this.getLocationCard(index);
    await location.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createLocation(data: {
    name: string;
    locationCode: string;
    description?: string;
    building?: string;
    floor?: string;
    captureFrequency?: string;
    cameraDirection?: string;
    cameraHeight?: string;
  }) {
    await this.createLocationButton.click();
    await this.page.waitForTimeout(1000);

    // Wait for dialog or form
    await this.page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill name
    const nameInput = this.page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.fill(data.name);

    // Fill location code
    const codeInput = this.page.locator('input[name="location_code"], input[placeholder*="code" i]').first();
    await codeInput.fill(data.locationCode);

    // Fill description if provided
    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]').first();
      if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await descInput.fill(data.description);
      }
    }

    // Fill building if provided
    if (data.building) {
      const buildingInput = this.page.locator('input[name="building"], select[name="building"]').first();
      if (await buildingInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await buildingInput.fill(data.building);
      }
    }

    // Fill floor if provided
    if (data.floor) {
      const floorInput = this.page.locator('input[name="floor"], select[name="floor"]').first();
      if (await floorInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await floorInput.fill(data.floor);
      }
    }

    // Select capture frequency if provided
    if (data.captureFrequency) {
      const freqSelect = this.page.locator('select[name="capture_frequency"]').first();
      if (await freqSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await freqSelect.selectOption(data.captureFrequency);
      }
    }

    // Select camera direction if provided
    if (data.cameraDirection) {
      const dirSelect = this.page.locator('select[name="camera_direction"]').first();
      if (await dirSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dirSelect.selectOption(data.cameraDirection);
      }
    }

    // Submit
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  // Progress Photo methods
  getPhotoCard(index: number = 0): Locator {
    return this.page.locator('[data-testid*="photo-card"], .photo-card, .progress-photo').nth(index);
  }

  async getPhotoCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.page.locator('[data-testid*="photo-card"], .photo-card, .progress-photo').count();
  }

  async clickPhoto(index: number = 0) {
    const photo = this.getPhotoCard(index);
    await photo.click();
    await this.page.waitForTimeout(500);
  }

  async capturePhoto(locationIndex: number = 0) {
    // First select a location if not already on location detail
    if (await this.getLocationCard(locationIndex).isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.clickLocation(locationIndex);
    }

    // Click capture button
    const captureButton = this.page.locator('button').filter({ hasText: /capture|take.*photo/i }).first();
    if (await captureButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Photo Comparison methods
  getComparisonCard(index: number = 0): Locator {
    return this.page.locator('[data-testid*="comparison-card"], .comparison-card').nth(index);
  }

  getComparisonByTitle(title: string): Locator {
    return this.page.locator('[data-testid*="comparison-card"], .comparison-card').filter({ hasText: title });
  }

  async getComparisonCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.page.locator('[data-testid*="comparison-card"], .comparison-card').count();
  }

  async clickComparison(index: number = 0) {
    const comparison = this.getComparisonCard(index);
    await comparison.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createComparison(data: {
    title: string;
    description?: string;
    comparisonType?: string;
    isPublic?: boolean;
  }) {
    await this.createComparisonButton.click();
    await this.page.waitForTimeout(1000);

    // Wait for dialog or form
    await this.page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill title
    const titleInput = this.page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(data.title);

    // Fill description if provided
    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]').first();
      if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await descInput.fill(data.description);
      }
    }

    // Select comparison type if provided
    if (data.comparisonType) {
      const typeSelect = this.page.locator('select[name="comparison_type"]').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption(data.comparisonType);
      }
    }

    // Toggle public if provided
    if (data.isPublic !== undefined) {
      const publicToggle = this.page.locator('input[name="is_public"], [data-testid="public-toggle"]').first();
      if (await publicToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        const isChecked = await publicToggle.isChecked();
        if (isChecked !== data.isPublic) {
          await publicToggle.click();
        }
      }
    }

    // Submit
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async shareComparison(index: number = 0) {
    await this.clickComparison(index);

    const shareButton = this.page.locator('button').filter({ hasText: /share/i }).first();
    if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Before/After Slider interaction
  async interactWithSlider() {
    const slider = this.page.locator('[data-testid="before-after-slider"], .before-after-slider');
    if (await slider.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await slider.boundingBox();
      if (box) {
        // Click and drag from center to left
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
        await this.page.mouse.up();
        await this.page.waitForTimeout(500);
      }
    }
  }

  // Photo Report methods
  getReportCard(index: number = 0): Locator {
    return this.page.locator('[data-testid*="report-card"], .report-card').nth(index);
  }

  getReportByTitle(title: string): Locator {
    return this.page.locator('[data-testid*="report-card"], .report-card').filter({ hasText: title });
  }

  async getReportCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.page.locator('[data-testid*="report-card"], .report-card').count();
  }

  async clickReport(index: number = 0) {
    const report = this.getReportCard(index);
    await report.click();
    await this.page.waitForLoadState('networkidle');
  }

  async generateReport(data: {
    title: string;
    description?: string;
    reportType?: string;
    periodStart?: string;
    periodEnd?: string;
  }) {
    await this.generateReportButton.click();
    await this.page.waitForTimeout(1000);

    // Wait for dialog or form
    await this.page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill title
    const titleInput = this.page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(data.title);

    // Fill description if provided
    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]').first();
      if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await descInput.fill(data.description);
      }
    }

    // Select report type if provided
    if (data.reportType) {
      const typeSelect = this.page.locator('select[name="report_type"]').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption(data.reportType);
      }
    }

    // Fill period start if provided
    if (data.periodStart) {
      const startInput = this.page.locator('input[name="period_start"], input[type="date"]').first();
      if (await startInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await startInput.fill(data.periodStart);
      }
    }

    // Fill period end if provided
    if (data.periodEnd) {
      const endInput = this.page.locator('input[name="period_end"]').first();
      if (await endInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await endInput.fill(data.periodEnd);
      }
    }

    // Submit
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create")').first();
    await submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async downloadReport(index: number = 0) {
    await this.clickReport(index);

    const downloadButton = this.page.locator('button, a').filter({ hasText: /download|export/i }).first();
    if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await downloadButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Photo Lightbox interaction
  async openLightbox(photoIndex: number = 0) {
    await this.clickPhoto(photoIndex);

    // Wait for lightbox to open
    const lightbox = this.page.locator('[data-testid="photo-lightbox"], .lightbox, [role="dialog"]');
    await expect(lightbox).toBeVisible({ timeout: 3000 });
  }

  async closeLightbox() {
    // Press Escape or click close button
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  async navigateLightboxNext() {
    await this.page.keyboard.press('ArrowRight');
    await this.page.waitForTimeout(300);
  }

  async navigateLightboxPrevious() {
    await this.page.keyboard.press('ArrowLeft');
    await this.page.waitForTimeout(300);
  }

  async zoomLightbox(zoomIn: boolean = true) {
    await this.page.keyboard.press(zoomIn ? '+' : '-');
    await this.page.waitForTimeout(300);
  }

  async rotateLightbox() {
    await this.page.keyboard.press('r');
    await this.page.waitForTimeout(300);
  }

  // Assertions
  async expectLocationVisible(name: string) {
    await expect(this.getLocationByName(name)).toBeVisible();
  }

  async expectLocationCount(count: number) {
    const actualCount = await this.getLocationCount();
    expect(actualCount).toBe(count);
  }

  async expectComparisonVisible(title: string) {
    await expect(this.getComparisonByTitle(title)).toBeVisible();
  }

  async expectReportVisible(title: string) {
    await expect(this.getReportByTitle(title)).toBeVisible();
  }

  async expectNoLocations() {
    const emptyMessage = this.page.locator('text=/no.*location|no.*photo.*location|empty/i');
    await expect(emptyMessage.first()).toBeVisible();
  }

  async expectNoComparisons() {
    const emptyMessage = this.page.locator('text=/no.*comparison|empty/i');
    await expect(emptyMessage.first()).toBeVisible();
  }

  async expectSliderVisible() {
    const slider = this.page.locator('[data-testid="before-after-slider"], .before-after-slider');
    await expect(slider).toBeVisible();
  }

  async expectLightboxOpen() {
    const lightbox = this.page.locator('[data-testid="photo-lightbox"], .lightbox, [role="dialog"]');
    await expect(lightbox).toBeVisible();
  }
}
