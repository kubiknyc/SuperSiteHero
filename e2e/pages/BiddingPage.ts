/**
 * Bidding Module Page Object Model
 *
 * Page object for bid packages list, detail pages, and bidding workflows.
 * Provides reusable methods for interacting with bidding UI.
 */

import { Page, Locator, expect } from '@playwright/test'

export class BiddingPage {
  readonly page: Page

  // Main locators - Bid Packages List
  readonly pageHeading: Locator
  readonly searchInput: Locator
  readonly statusFilter: Locator
  readonly bidTypeFilter: Locator
  readonly divisionFilter: Locator
  readonly createPackageButton: Locator

  // Filter and sort
  readonly clearFiltersButton: Locator
  readonly sortDropdown: Locator

  // Package detail locators
  readonly packageTitle: Locator
  readonly packageStatus: Locator
  readonly packageDescription: Locator
  readonly bidDueDate: Locator
  readonly estimatedValue: Locator

  // Bidders management
  readonly addBidderButton: Locator
  readonly biddersList: Locator

  // Bid submission
  readonly submitBidButton: Locator
  readonly baseBidInput: Locator
  readonly alternatesInput: Locator

  // Bid comparison
  readonly compareBidsButton: Locator
  readonly comparisonTable: Locator

  // Award bid
  readonly awardBidButton: Locator

  constructor(page: Page) {
    this.page = page

    // List page elements
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /bid packages|bidding/i }).first()
    this.searchInput = page.getByRole('textbox', { name: /search/i })
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first()
    this.bidTypeFilter = page.locator('select[name="bid_type"], [data-testid="bid-type-filter"]').first()
    this.divisionFilter = page.locator('select[name="division"], [data-testid="division-filter"]').first()
    this.createPackageButton = page.locator('button, a').filter({ hasText: /new|create.*package/i }).first()
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear.*filter/i }).first()
    this.sortDropdown = page.locator('select[name="sort"], [data-testid="sort-dropdown"]').first()

    // Detail page elements
    this.packageTitle = page.locator('[data-testid="package-title"], h1, h2').first()
    this.packageStatus = page.locator('[data-testid="package-status"], .badge, .status-badge').first()
    this.packageDescription = page.locator('[data-testid="package-description"]')
    this.bidDueDate = page.locator('[data-testid="bid-due-date"], text=/due date/i')
    this.estimatedValue = page.locator('[data-testid="estimated-value"], text=/estimated value/i')

    // Bidders section
    this.addBidderButton = page.locator('button').filter({ hasText: /add.*bidder|invite/i }).first()
    this.biddersList = page.locator('[data-testid="bidders-list"], .bidders-list')

    // Bid submission elements
    this.submitBidButton = page.locator('button').filter({ hasText: /submit.*bid/i }).first()
    this.baseBidInput = page.locator('input[name="base_bid_amount"], input[name="baseBid"]')
    this.alternatesInput = page.locator('input[name="alternates_total"], input[name="alternates"]')

    // Comparison elements
    this.compareBidsButton = page.locator('button').filter({ hasText: /compare.*bids?/i }).first()
    this.comparisonTable = page.locator('[data-testid="bid-comparison"], table').first()

    // Award elements
    this.awardBidButton = page.locator('button').filter({ hasText: /award/i }).first()
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/bidding')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoPackageDetail(packageId: string) {
    await this.page.goto(`/bidding/${packageId}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/bidding`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Search and filter methods
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(500)
  }

  async filterByStatus(status: string) {
    if (await this.statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.statusFilter.selectOption(status)
      await this.page.waitForTimeout(500)
    }
  }

  async filterByBidType(bidType: string) {
    if (await this.bidTypeFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.bidTypeFilter.selectOption(bidType)
      await this.page.waitForTimeout(500)
    }
  }

  async filterByDivision(division: string) {
    if (await this.divisionFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.divisionFilter.selectOption(division)
      await this.page.waitForTimeout(500)
    }
  }

  async clearFilters() {
    if (await this.clearFiltersButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.clearFiltersButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async sortBy(sortOption: string) {
    if (await this.sortDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.sortDropdown.selectOption(sortOption)
      await this.page.waitForTimeout(500)
    }
  }

  // Package list methods
  getBidPackageRow(index: number = 0): Locator {
    return this.page.locator('[data-testid*="bid-package-"], [data-testid*="package-"], .package-card, [role="article"]').nth(index)
  }

  getBidPackageByName(name: string): Locator {
    return this.page.locator('[data-testid*="bid-package-"], [data-testid*="package-"], .package-card').filter({ hasText: name })
  }

  async getBidPackageCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.page.locator('[data-testid*="bid-package-"], [data-testid*="package-"], .package-card, [role="article"]').count()
  }

  async clickBidPackage(index: number = 0) {
    const packageRow = this.getBidPackageRow(index)
    await packageRow.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Create bid package
  async clickCreatePackageButton() {
    await this.createPackageButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async createBidPackage(data: {
    packageNumber: string
    name: string
    description?: string
    division?: string
    estimatedValue?: string
    bidDueDate: string
    bidDueTime?: string
    bidType?: string
  }) {
    await this.clickCreatePackageButton()

    // Fill in form
    await this.page.locator('input[name="package_number"], input[name="packageNumber"]').fill(data.packageNumber)
    await this.page.locator('input[name="name"], input[placeholder*="name" i]').fill(data.name)

    if (data.description) {
      await this.page.locator('textarea[name="description"], textarea[placeholder*="description" i]').fill(data.description)
    }

    if (data.division) {
      const divisionSelect = this.page.locator('select[name="division"]')
      if (await divisionSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await divisionSelect.selectOption(data.division)
      }
    }

    if (data.estimatedValue) {
      await this.page.locator('input[name="estimated_value"], input[name="estimatedValue"]').fill(data.estimatedValue)
    }

    await this.page.locator('input[name="bid_due_date"], input[type="date"]').fill(data.bidDueDate)

    if (data.bidDueTime) {
      await this.page.locator('input[name="bid_due_time"], input[type="time"]').fill(data.bidDueTime)
    }

    if (data.bidType) {
      const bidTypeSelect = this.page.locator('select[name="bid_type"]')
      if (await bidTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bidTypeSelect.selectOption(data.bidType)
      }
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /create|save/i }).first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Update bid package
  async updateBidPackage(data: Partial<{
    name: string
    description: string
    estimatedValue: string
    bidDueDate: string
    status: string
  }>) {
    const editButton = this.page.locator('button, a').filter({ hasText: /edit/i }).first()
    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click()
      await this.page.waitForTimeout(500)
    }

    if (data.name) {
      const nameInput = this.page.locator('input[name="name"]')
      await nameInput.clear()
      await nameInput.fill(data.name)
    }

    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]')
      await descInput.clear()
      await descInput.fill(data.description)
    }

    if (data.estimatedValue) {
      const valueInput = this.page.locator('input[name="estimated_value"]')
      await valueInput.clear()
      await valueInput.fill(data.estimatedValue)
    }

    if (data.bidDueDate) {
      await this.page.locator('input[name="bid_due_date"]').fill(data.bidDueDate)
    }

    if (data.status) {
      const statusSelect = this.page.locator('select[name="status"]')
      if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusSelect.selectOption(data.status)
      }
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /save|update/i }).first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Bidder management
  async addBidder(data: {
    companyName: string
    contactName?: string
    contactEmail: string
    contactPhone?: string
  }) {
    await this.addBidderButton.click()
    await this.page.waitForTimeout(500)

    await this.page.locator('input[name="company_name"], input[name="companyName"]').fill(data.companyName)
    await this.page.locator('input[name="contact_email"], input[type="email"]').fill(data.contactEmail)

    if (data.contactName) {
      await this.page.locator('input[name="contact_name"], input[name="contactName"]').fill(data.contactName)
    }

    if (data.contactPhone) {
      await this.page.locator('input[name="contact_phone"], input[type="tel"]').fill(data.contactPhone)
    }

    // Submit
    await this.page.locator('button').filter({ hasText: /add|invite|send/i }).first().click()
    await this.page.waitForTimeout(1000)
  }

  async getBidderCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    if (await this.biddersList.isVisible({ timeout: 2000 }).catch(() => false)) {
      return await this.biddersList.locator('[data-testid*="bidder-"], .bidder-item, tr').count()
    }
    return 0
  }

  async removeBidder(index: number = 0) {
    const bidders = this.biddersList.locator('[data-testid*="bidder-"], .bidder-item, tr')
    const bidder = bidders.nth(index)
    const removeButton = bidder.locator('button').filter({ hasText: /remove|delete/i }).first()

    if (await removeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await removeButton.click()

      // Confirm if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|yes|remove/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await this.page.waitForTimeout(500)
    }
  }

  // Bid submission
  async submitBid(data: {
    baseBidAmount: string
    alternatesTotal?: string
    bidderCompanyName?: string
    bidderEmail?: string
    exclusions?: string
    clarifications?: string
  }) {
    if (await this.submitBidButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.submitBidButton.click()
      await this.page.waitForTimeout(500)
    }

    if (data.bidderCompanyName) {
      await this.page.locator('input[name="bidder_company_name"], input[name="companyName"]').fill(data.bidderCompanyName)
    }

    if (data.bidderEmail) {
      await this.page.locator('input[name="bidder_email"], input[type="email"]').fill(data.bidderEmail)
    }

    await this.baseBidInput.fill(data.baseBidAmount)

    if (data.alternatesTotal) {
      await this.alternatesInput.fill(data.alternatesTotal)
    }

    if (data.exclusions) {
      await this.page.locator('textarea[name="exclusions"]').fill(data.exclusions)
    }

    if (data.clarifications) {
      await this.page.locator('textarea[name="clarifications"]').fill(data.clarifications)
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /submit.*bid|send.*bid/i }).first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async getBidSubmissionCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    const submissionsList = this.page.locator('[data-testid="bids-list"], [data-testid="submissions-list"]')
    if (await submissionsList.isVisible({ timeout: 2000 }).catch(() => false)) {
      return await submissionsList.locator('[data-testid*="bid-"], [data-testid*="submission-"], tr, .bid-item').count()
    }
    return 0
  }

  // Bid comparison
  async compareBids() {
    if (await this.compareBidsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.compareBidsButton.click()
      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  async expectComparisonTableVisible() {
    await expect(this.comparisonTable).toBeVisible({ timeout: 5000 })
  }

  async getComparedBidsCount(): Promise<number> {
    if (await this.comparisonTable.isVisible({ timeout: 2000 }).catch(() => false)) {
      const rows = this.comparisonTable.locator('tbody tr, [data-testid*="bid-row"]')
      return await rows.count()
    }
    return 0
  }

  async expectLowBidHighlighted() {
    const lowBidRow = this.page.locator('tr, .bid-row').filter({ hasText: /low bid|lowest/i }).or(
      this.page.locator('[data-testid*="low-bid"], .highlight, .bg-green')
    )
    const visible = await lowBidRow.first().isVisible({ timeout: 3000 }).catch(() => false)
    expect(visible).toBeTruthy()
  }

  // Award bid
  async awardBid(data: {
    submissionIndex?: number
    awardAmount?: string
    notes?: string
  }) {
    const submissionIndex = data.submissionIndex ?? 0

    // Click award button for specific submission or general award button
    if (submissionIndex !== undefined) {
      const submissions = this.page.locator('[data-testid*="bid-"], [data-testid*="submission-"], tr, .bid-item')
      const submission = submissions.nth(submissionIndex)
      const awardButton = submission.locator('button').filter({ hasText: /award/i }).first()

      if (await awardButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await awardButton.click()
      }
    } else if (await this.awardBidButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.awardBidButton.click()
    }

    await this.page.waitForTimeout(500)

    if (data.awardAmount) {
      await this.page.locator('input[name="award_amount"], input[name="awardAmount"]').fill(data.awardAmount)
    }

    if (data.notes) {
      await this.page.locator('textarea[name="award_notes"], textarea[name="notes"]').fill(data.notes)
    }

    // Confirm award
    await this.page.locator('button').filter({ hasText: /confirm|award/i }).first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async expectPackageAwarded() {
    const awardedStatus = this.page.locator('[data-testid="package-status"], .badge, .status').filter({ hasText: /awarded/i })
    await expect(awardedStatus.first()).toBeVisible({ timeout: 5000 })
  }

  // Status workflow
  async changePackageStatus(status: string) {
    const statusSelect = this.page.locator('select[name="status"], [data-testid="status-select"]').first()

    if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusSelect.selectOption(status)
      await this.page.waitForTimeout(500)

      // Save if separate save button exists
      const saveButton = this.page.locator('button').filter({ hasText: /save|update/i }).first()
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click()
        await this.page.waitForLoadState('domcontentloaded')
      }
    }
  }

  async publishPackage() {
    const publishButton = this.page.locator('button').filter({ hasText: /publish/i }).first()

    if (await publishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await publishButton.click()

      // Confirm if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|yes|publish/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  async cancelPackage() {
    const cancelButton = this.page.locator('button').filter({ hasText: /cancel.*package/i }).first()

    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelButton.click()

      // Confirm if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|yes|cancel/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  // Assertions
  async expectBidPackageVisible(name: string) {
    await expect(this.getBidPackageByName(name)).toBeVisible({ timeout: 5000 })
  }

  async expectBidPackageCount(count: number) {
    const actualCount = await this.getBidPackageCount()
    expect(actualCount).toBe(count)
  }

  async expectPackageStatus(status: string) {
    const statusBadge = this.packageStatus.filter({ hasText: new RegExp(status, 'i') })
    await expect(statusBadge).toBeVisible({ timeout: 5000 })
  }

  async expectNoBidPackages() {
    const emptyMessage = this.page.locator('text=/no.*packages?|no.*bids?/i, [data-testid="empty-state"]')
    await expect(emptyMessage.first()).toBeVisible({ timeout: 5000 })
  }

  async expectBidderInvited(email: string) {
    const bidderRow = this.page.locator('[data-testid*="bidder-"], .bidder-item, tr').filter({ hasText: email })
    await expect(bidderRow.first()).toBeVisible({ timeout: 5000 })
  }

  async expectBidSubmitted(companyName: string) {
    const bidRow = this.page.locator('[data-testid*="bid-"], [data-testid*="submission-"], tr, .bid-item').filter({ hasText: companyName })
    await expect(bidRow.first()).toBeVisible({ timeout: 5000 })
  }

  async expectSubmissionStatus(index: number, status: string) {
    const submissions = this.page.locator('[data-testid*="bid-"], [data-testid*="submission-"], tr, .bid-item')
    const submission = submissions.nth(index)
    const statusBadge = submission.locator('.badge, .status, [data-testid*="status"]').filter({ hasText: new RegExp(status, 'i') })
    await expect(statusBadge.first()).toBeVisible({ timeout: 5000 })
  }
}
