/**
 * Insurance Page Object Model
 *
 * Page object for insurance certificate tracking pages.
 * Provides reusable methods for interacting with insurance tracking UI.
 */

import { Page, Locator, expect } from '@playwright/test';

export class InsurancePage {
  readonly page: Page;

  // Main locators
  readonly pageHeading: Locator;
  readonly uploadButton: Locator;
  readonly requestButton: Locator;
  readonly searchInput: Locator;

  // Filter locators
  readonly statusFilter: Locator;
  readonly contractorFilter: Locator;
  readonly insuranceTypeFilter: Locator;
  readonly dateRangeFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Tab locators
  readonly allTab: Locator;
  readonly validTab: Locator;
  readonly expiringTab: Locator;
  readonly expiredTab: Locator;
  readonly pendingTab: Locator;

  // Summary card locators
  readonly complianceRateCard: Locator;
  readonly validCertificatesCard: Locator;
  readonly expiringCertificatesCard: Locator;
  readonly expiredCertificatesCard: Locator;

  // Project selector
  readonly projectSelector: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main page elements
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /insurance|certificate/i }).first();
    this.uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Certificate"), [data-testid="upload-certificate"]').first();
    this.requestButton = page.locator('button:has-text("Request"), button:has-text("Request Certificate"), [data-testid="request-certificate"]').first();
    this.searchInput = page.locator('input[placeholder*="search" i], input[name="search"]').first();

    // Filters
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();
    this.contractorFilter = page.locator('select[name="contractor"], [data-testid="contractor-filter"]').first();
    this.insuranceTypeFilter = page.locator('select[name="insurance_type"], [data-testid="type-filter"]').first();
    this.dateRangeFilter = page.locator('input[type="date"], [data-testid="date-filter"]').first();
    this.clearFiltersButton = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();

    // Tabs
    this.allTab = page.getByRole('tab', { name: /all/i });
    this.validTab = page.getByRole('tab', { name: /valid/i });
    this.expiringTab = page.getByRole('tab', { name: /expiring/i });
    this.expiredTab = page.getByRole('tab', { name: /expired/i });
    this.pendingTab = page.getByRole('tab', { name: /pending|requested/i });

    // Summary cards
    this.complianceRateCard = page.locator('[data-testid="compliance-rate"], .compliance-card').first();
    this.validCertificatesCard = page.locator('[data-testid="valid-count"], text=/valid.*certificate/i').first();
    this.expiringCertificatesCard = page.locator('[data-testid="expiring-count"], text=/expiring/i').first();
    this.expiredCertificatesCard = page.locator('[data-testid="expired-count"], text=/expired/i').first();

    // Project selector
    this.projectSelector = page.locator('select[name="project"], [data-testid="project-selector"]').first();
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/insurance');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/insurance`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectProject(index: number = 1) {
    if (await this.projectSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.projectSelector.selectOption({ index });
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  // Search and filter methods
  async search(query: string) {
    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.fill(query);
      await this.page.waitForTimeout(1000); // Debounce
    }
  }

  async clearSearch() {
    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.clear();
      await this.page.waitForTimeout(500);
    }
  }

  async filterByStatus(status: 'all' | 'valid' | 'expiring' | 'expired' | 'pending') {
    if (await this.statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.statusFilter.selectOption({ value: status }).catch(() => {
        this.statusFilter.selectOption({ label: status });
      });
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByContractor(contractorName: string) {
    if (await this.contractorFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.contractorFilter.selectOption({ label: contractorName });
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByContractorIndex(index: number) {
    if (await this.contractorFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.contractorFilter.selectOption({ index });
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByInsuranceType(type: 'general_liability' | 'workers_comp' | 'umbrella' | 'auto' | 'professional') {
    if (await this.insuranceTypeFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.insuranceTypeFilter.selectOption({ value: type });
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByDateRange(date: string) {
    if (await this.dateRangeFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.dateRangeFilter.fill(date);
      await this.page.waitForTimeout(1000);
    }
  }

  async clearAllFilters() {
    if (await this.clearFiltersButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.clearFiltersButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Tab navigation
  async switchToTab(tab: 'all' | 'valid' | 'expiring' | 'expired' | 'pending') {
    switch (tab) {
      case 'all':
        if (await this.allTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await this.allTab.click();
        }
        break;
      case 'valid':
        if (await this.validTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await this.validTab.click();
        }
        break;
      case 'expiring':
        if (await this.expiringTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await this.expiringTab.click();
        }
        break;
      case 'expired':
        if (await this.expiredTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await this.expiredTab.click();
        }
        break;
      case 'pending':
        if (await this.pendingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await this.pendingTab.click();
        }
        break;
    }
    await this.page.waitForTimeout(500);
  }

  // Certificate list methods
  getCertificateRow(index: number = 0): Locator {
    return this.page.locator('[data-testid*="certificate-"], .certificate-row, .certificate-card').nth(index);
  }

  getCertificateByContractor(contractorName: string): Locator {
    return this.page.locator('[data-testid*="certificate-"], .certificate-row, .certificate-card').filter({ hasText: contractorName });
  }

  async getCertificateCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.page.locator('[data-testid*="certificate-"], .certificate-row, .certificate-card').count();
  }

  async clickCertificate(index: number = 0) {
    const certificate = this.getCertificateRow(index);
    if (await certificate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await certificate.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  // Upload certificate
  async clickUploadButton() {
    if (await this.uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.uploadButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async uploadCertificate(data: {
    contractor?: string;
    certificateNumber?: string;
    policyNumber?: string;
    insuranceType?: string;
    coverageAmount?: string;
    expirationDate?: string;
    issueDate?: string;
    filePath?: string;
  }) {
    await this.clickUploadButton();

    // Fill in form fields
    if (data.contractor) {
      const contractorField = this.page.locator('input[name="contractor"], select[name="contractor_id"]').first();
      if (await contractorField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await contractorField.fill(data.contractor).catch(() => {});
      }
    }

    if (data.certificateNumber) {
      const certNumberField = this.page.locator('input[name="certificate_number"]').first();
      if (await certNumberField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await certNumberField.fill(data.certificateNumber);
      }
    }

    if (data.policyNumber) {
      const policyField = this.page.locator('input[name="policy_number"]').first();
      if (await policyField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await policyField.fill(data.policyNumber);
      }
    }

    if (data.insuranceType) {
      const typeField = this.page.locator('select[name="insurance_type"]').first();
      if (await typeField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeField.selectOption({ value: data.insuranceType });
      }
    }

    if (data.coverageAmount) {
      const amountField = this.page.locator('input[name="coverage_amount"]').first();
      if (await amountField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountField.fill(data.coverageAmount);
      }
    }

    if (data.expirationDate) {
      const expirationField = this.page.locator('input[name="expiration_date"], input[type="date"]').first();
      if (await expirationField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expirationField.fill(data.expirationDate);
      }
    }

    if (data.issueDate) {
      const issueField = this.page.locator('input[name="issue_date"]').first();
      if (await issueField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await issueField.fill(data.issueDate);
      }
    }

    if (data.filePath) {
      const fileInput = this.page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(data.filePath);
      }
    }

    // Submit form
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Save")').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  async cancelUpload() {
    const cancelButton = this.page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first();
    if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  // Request certificate
  async clickRequestButton() {
    if (await this.requestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.requestButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async requestCertificate(data: {
    subcontractor?: string;
    insuranceType?: string;
    message?: string;
    dueDate?: string;
  }) {
    await this.clickRequestButton();

    if (data.subcontractor) {
      const subcontractorField = this.page.locator('select[name="subcontractor"], [data-testid="subcontractor-select"]').first();
      if (await subcontractorField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await subcontractorField.selectOption({ label: data.subcontractor });
      }
    }

    if (data.insuranceType) {
      const typeField = this.page.locator('select[name="insurance_type"]').first();
      if (await typeField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeField.selectOption({ value: data.insuranceType });
      }
    }

    if (data.message) {
      const messageField = this.page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();
      if (await messageField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await messageField.fill(data.message);
      }
    }

    if (data.dueDate) {
      const dueDateField = this.page.locator('input[name="due_date"], input[type="date"]').first();
      if (await dueDateField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dueDateField.fill(data.dueDate);
      }
    }

    // Submit request
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Request")').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  // Certificate detail methods
  async viewCertificateDetail(index: number = 0) {
    await this.clickCertificate(index);
  }

  async downloadCertificate() {
    const downloadButton = this.page.locator('a:has-text("Download"), button:has-text("Download")').first();
    if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = this.page.waitForEvent('download');
      await downloadButton.click();
      return await downloadPromise;
    }
  }

  async setExpirationReminder(daysBeforeExpiration: number) {
    const reminderButton = this.page.locator('button:has-text("Set Reminder"), button:has-text("Alert")').first();
    if (await reminderButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reminderButton.click();
      await this.page.waitForTimeout(500);

      const daysInput = this.page.locator('input[name="reminder_days"], input[type="number"]').first();
      if (await daysInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await daysInput.fill(daysBeforeExpiration.toString());
      }

      const saveButton = this.page.locator('button:has-text("Save"), button:has-text("Set")').first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async editCertificate(data: Partial<{
    certificateNumber: string;
    policyNumber: string;
    expirationDate: string;
    coverageAmount: string;
  }>) {
    const editButton = this.page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
      await this.page.waitForTimeout(500);

      if (data.certificateNumber) {
        const certField = this.page.locator('input[name="certificate_number"]').first();
        if (await certField.isVisible({ timeout: 3000 }).catch(() => false)) {
          await certField.clear();
          await certField.fill(data.certificateNumber);
        }
      }

      if (data.policyNumber) {
        const policyField = this.page.locator('input[name="policy_number"]').first();
        if (await policyField.isVisible({ timeout: 3000 }).catch(() => false)) {
          await policyField.clear();
          await policyField.fill(data.policyNumber);
        }
      }

      if (data.expirationDate) {
        const expirationField = this.page.locator('input[name="expiration_date"]').first();
        if (await expirationField.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expirationField.fill(data.expirationDate);
        }
      }

      if (data.coverageAmount) {
        const amountField = this.page.locator('input[name="coverage_amount"]').first();
        if (await amountField.isVisible({ timeout: 3000 }).catch(() => false)) {
          await amountField.clear();
          await amountField.fill(data.coverageAmount);
        }
      }

      const saveButton = this.page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await this.page.waitForLoadState('domcontentloaded');
      }
    }
  }

  async deleteCertificate() {
    const deleteButton = this.page.locator('button:has-text("Delete"), [data-testid="delete-certificate"]').first();
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await this.page.waitForLoadState('domcontentloaded');
      }
    }
  }

  // Assertions
  async expectCertificateVisible(contractorName: string) {
    await expect(this.getCertificateByContractor(contractorName)).toBeVisible();
  }

  async expectCertificateCount(count: number) {
    const actualCount = await this.getCertificateCount();
    expect(actualCount).toBe(count);
  }

  async expectCertificateStatus(index: number, status: 'valid' | 'expiring' | 'expired') {
    const certificate = this.getCertificateRow(index);
    const statusBadge = certificate.locator('[data-testid="status-badge"], .badge, .status').filter({ hasText: new RegExp(status, 'i') });
    await expect(statusBadge.first()).toBeVisible();
  }

  async expectNoCertificates() {
    const emptyMessage = this.page.locator('text=/no certificates|no insurance|upload.*first/i');
    await expect(emptyMessage.first()).toBeVisible();
  }

  async expectComplianceRate(rate: string) {
    await expect(this.complianceRateCard).toContainText(rate);
  }

  async expectExpiringCertificatesHighlight(index: number) {
    const certificate = this.getCertificateRow(index);
    const expiringBadge = certificate.locator('.badge, [data-testid="status-badge"]').filter({ hasText: /expiring|warning/i });
    await expect(expiringBadge.first()).toBeVisible();
  }

  async expectExpiredCertificatesHighlight(index: number) {
    const certificate = this.getCertificateRow(index);
    const expiredBadge = certificate.locator('.badge, [data-testid="status-badge"]').filter({ hasText: /expired|danger/i });
    await expect(expiredBadge.first()).toBeVisible();
  }

  // Compliance dashboard methods
  async getComplianceRate(): Promise<string> {
    if (await this.complianceRateCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await this.complianceRateCard.textContent();
      return text || '';
    }
    return '';
  }

  async getValidCertificatesCount(): Promise<number> {
    const validCertificates = this.page.locator('[data-testid*="certificate-"]').filter({
      has: this.page.locator('.badge').filter({ hasText: /valid/i })
    });
    return await validCertificates.count();
  }

  async getExpiringCertificatesCount(): Promise<number> {
    const expiringCertificates = this.page.locator('[data-testid*="certificate-"]').filter({
      has: this.page.locator('.badge').filter({ hasText: /expiring/i })
    });
    return await expiringCertificates.count();
  }

  async getExpiredCertificatesCount(): Promise<number> {
    const expiredCertificates = this.page.locator('[data-testid*="certificate-"]').filter({
      has: this.page.locator('.badge').filter({ hasText: /expired/i })
    });
    return await expiredCertificates.count();
  }
}
