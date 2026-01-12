/**
 * Quality Control Page Object Model
 *
 * Page object for Quality Control (NCR and Inspection) pages.
 * Provides reusable methods for interacting with QC UI.
 */

import { Page, Locator, expect } from '@playwright/test';

export class QualityControlPage {
  readonly page: Page;

  // Main page locators
  readonly pageHeading: Locator;
  readonly ncrTab: Locator;
  readonly inspectionsTab: Locator;
  readonly createNCRButton: Locator;
  readonly createInspectionButton: Locator;
  readonly searchInput: Locator;

  // Filter locators
  readonly statusFilter: Locator;
  readonly categoryFilter: Locator;
  readonly severityFilter: Locator;
  readonly priorityFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Stats card locators
  readonly openNCRsCard: Locator;
  readonly underInvestigationCard: Locator;
  readonly awaitingVerificationCard: Locator;
  readonly closedThisMonthCard: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageHeading = page.locator('h1:has-text("Quality Control"), h1:has-text("NCR")');
    this.ncrTab = page.getByRole('tab', { name: /NCR|Non-Conformance/i });
    this.inspectionsTab = page.getByRole('tab', { name: /Inspection/i });
    this.createNCRButton = page.locator('button, a').filter({ hasText: /new.*ncr|create.*ncr|add.*ncr/i }).first();
    this.createInspectionButton = page.locator('button, a').filter({ hasText: /new.*inspection|create.*inspection/i }).first();
    this.searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    // Filters
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();
    this.categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"]').first();
    this.severityFilter = page.locator('select[name="severity"], [data-testid="severity-filter"]').first();
    this.priorityFilter = page.locator('select[name="priority"], [data-testid="priority-filter"]').first();
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear.*filter|reset/i }).first();

    // Stats cards
    this.openNCRsCard = page.locator('[data-testid="open-ncrs-card"], .stat-card').filter({ hasText: /open/i }).first();
    this.underInvestigationCard = page.locator('[data-testid="investigation-card"], .stat-card').filter({ hasText: /investigation/i }).first();
    this.awaitingVerificationCard = page.locator('[data-testid="verification-card"], .stat-card').filter({ hasText: /verification/i }).first();
    this.closedThisMonthCard = page.locator('[data-testid="closed-card"], .stat-card').filter({ hasText: /closed/i }).first();
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/quality-control');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/quality-control`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async switchToNCRTab() {
    if (await this.ncrTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.ncrTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async switchToInspectionsTab() {
    if (await this.inspectionsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.inspectionsTab.click();
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

  async filterByStatus(status: string) {
    if (await this.statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.statusFilter.selectOption(status);
      await this.page.waitForTimeout(500);
    }
  }

  async filterByCategory(category: string) {
    if (await this.categoryFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.categoryFilter.selectOption(category);
      await this.page.waitForTimeout(500);
    }
  }

  async filterBySeverity(severity: string) {
    if (await this.severityFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.severityFilter.selectOption(severity);
      await this.page.waitForTimeout(500);
    }
  }

  async clearFilters() {
    if (await this.clearFiltersButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.clearFiltersButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  // NCR list methods
  getNCRRow(index: number = 0): Locator {
    return this.page.locator('[data-testid*="ncr-"], .ncr-row, [role="article"], tr[data-ncr-id]').nth(index);
  }

  getNCRByTitle(title: string): Locator {
    return this.page.locator('[data-testid*="ncr-"], .ncr-row, [role="article"]').filter({ hasText: title });
  }

  getNCRByNumber(ncrNumber: string): Locator {
    return this.page.locator('[data-testid*="ncr-"], .ncr-row').filter({ hasText: ncrNumber });
  }

  async getNCRCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.page.locator('[data-testid*="ncr-"], .ncr-row, [role="article"], tr[data-ncr-id]').count();
  }

  async clickNCR(index: number = 0) {
    const ncr = this.getNCRRow(index);
    await ncr.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Create NCR
  async clickCreateNCRButton() {
    await this.createNCRButton.click();
    await this.page.waitForTimeout(1000);
  }

  async createNCR(data: {
    title: string;
    description: string;
    category?: string;
    severity?: string;
    priority?: string;
    ncrType?: string;
    building?: string;
    floor?: string;
    area?: string;
    specSection?: string;
    responsiblePartyType?: string;
  }) {
    await this.clickCreateNCRButton();

    // Wait for dialog or form
    await this.page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill title
    const titleInput = this.page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(data.title);

    // Fill description
    const descInput = this.page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    await descInput.fill(data.description);

    // Select category if provided
    if (data.category) {
      const categorySelect = this.page.locator('select[name="category"], [data-testid="category-select"]').first();
      if (await categorySelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await categorySelect.selectOption(data.category);
      }
    }

    // Select severity if provided
    if (data.severity) {
      const severitySelect = this.page.locator('select[name="severity"], [data-testid="severity-select"]').first();
      if (await severitySelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await severitySelect.selectOption(data.severity);
      }
    }

    // Select priority if provided
    if (data.priority) {
      const prioritySelect = this.page.locator('select[name="priority"], [data-testid="priority-select"]').first();
      if (await prioritySelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await prioritySelect.selectOption(data.priority);
      }
    }

    // Select NCR type if provided
    if (data.ncrType) {
      const typeSelect = this.page.locator('select[name="ncr_type"], [data-testid="ncr-type-select"]').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption(data.ncrType);
      }
    }

    // Fill location fields if provided
    if (data.building) {
      const buildingInput = this.page.locator('input[name="building"]').first();
      if (await buildingInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await buildingInput.fill(data.building);
      }
    }

    if (data.floor) {
      const floorInput = this.page.locator('input[name="floor"]').first();
      if (await floorInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await floorInput.fill(data.floor);
      }
    }

    if (data.area) {
      const areaInput = this.page.locator('input[name="area"]').first();
      if (await areaInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await areaInput.fill(data.area);
      }
    }

    if (data.specSection) {
      const specInput = this.page.locator('input[name="spec_section"]').first();
      if (await specInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await specInput.fill(data.specSection);
      }
    }

    // Submit form
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  // NCR workflow actions
  async startInvestigation(index: number = 0) {
    await this.clickNCR(index);
    const startButton = this.page.locator('button').filter({ hasText: /start.*investigation/i }).first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async addCorrectiveAction(ncrIndex: number = 0, action: string) {
    await this.clickNCR(ncrIndex);

    const addButton = this.page.locator('button').filter({ hasText: /add.*corrective|add.*action/i }).first();
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      await this.page.waitForTimeout(500);

      // Fill action description
      const actionInput = this.page.locator('textarea[name="description"], textarea[name="action"], textarea').first();
      await actionInput.fill(action);

      // Submit
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Save")').first();
      await submitButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async submitForVerification(index: number = 0) {
    await this.clickNCR(index);
    const submitButton = this.page.locator('button').filter({ hasText: /submit.*verification|request.*verification/i }).first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async verifyNCR(index: number = 0, approved: boolean = true) {
    await this.clickNCR(index);
    const verifyButton = this.page.locator('button').filter({
      hasText: approved ? /verify|approve|close/i : /reject/i
    }).first();
    if (await verifyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verifyButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async voidNCR(index: number = 0, reason: string) {
    await this.clickNCR(index);
    const voidButton = this.page.locator('button').filter({ hasText: /void/i }).first();
    if (await voidButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await voidButton.click();
      await this.page.waitForTimeout(500);

      // Fill reason if dialog appears
      const reasonInput = this.page.locator('textarea[name="reason"], textarea').first();
      if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonInput.fill(reason);

        const confirmButton = this.page.locator('button').filter({ hasText: /confirm|void/i }).first();
        await confirmButton.click();
      }
      await this.page.waitForTimeout(1000);
    }
  }

  // Inspection methods
  async createInspection(data: {
    title: string;
    description: string;
    inspectionType?: string;
    category?: string;
    location?: string;
    specSection?: string;
    drawingReference?: string;
    inspectionDate?: string;
  }) {
    await this.createInspectionButton.click();
    await this.page.waitForTimeout(1000);

    // Fill title
    const titleInput = this.page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(data.title);

    // Fill description
    const descInput = this.page.locator('textarea[name="description"]').first();
    await descInput.fill(data.description);

    // Select inspection type if provided
    if (data.inspectionType) {
      const typeSelect = this.page.locator('select[name="inspection_type"]').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption(data.inspectionType);
      }
    }

    // Fill location if provided
    if (data.location) {
      const locationInput = this.page.locator('input[name="location"]').first();
      if (await locationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await locationInput.fill(data.location);
      }
    }

    // Fill spec section if provided
    if (data.specSection) {
      const specInput = this.page.locator('input[name="spec_section"]').first();
      if (await specInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await specInput.fill(data.specSection);
      }
    }

    // Fill inspection date if provided
    if (data.inspectionDate) {
      const dateInput = this.page.locator('input[name="inspection_date"], input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dateInput.fill(data.inspectionDate);
      }
    }

    // Submit
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  // Assertions
  async expectNCRVisible(title: string) {
    await expect(this.getNCRByTitle(title)).toBeVisible();
  }

  async expectNCRCount(count: number) {
    const actualCount = await this.getNCRCount();
    expect(actualCount).toBe(count);
  }

  async expectNCRStatus(index: number, status: string) {
    const ncr = this.getNCRRow(index);
    const statusBadge = ncr.locator('[data-testid="status-badge"], .badge, .status').filter({ hasText: new RegExp(status, 'i') });
    await expect(statusBadge).toBeVisible();
  }

  async expectNoNCRs() {
    const emptyMessage = this.page.locator('text=/no ncr|no non-conformance|empty/i');
    await expect(emptyMessage.first()).toBeVisible();
  }

  async expectStatsCardValue(cardType: 'open' | 'investigation' | 'verification' | 'closed', expectedValue: string | number) {
    let card: Locator;
    switch (cardType) {
      case 'open':
        card = this.openNCRsCard;
        break;
      case 'investigation':
        card = this.underInvestigationCard;
        break;
      case 'verification':
        card = this.awaitingVerificationCard;
        break;
      case 'closed':
        card = this.closedThisMonthCard;
        break;
    }
    await expect(card).toContainText(expectedValue.toString());
  }

  async expectSeverityBadge(index: number, severity: string) {
    const ncr = this.getNCRRow(index);
    const severityBadge = ncr.locator('.badge, [data-testid*="severity"]').filter({ hasText: new RegExp(severity, 'i') });
    await expect(severityBadge).toBeVisible();
  }
}
