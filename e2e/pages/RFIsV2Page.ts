/**
 * RFIs V2 Page Object Model
 *
 * Page object for RFIs V2 dashboard and detail pages.
 * Provides reusable methods for interacting with RFI V2 UI.
 */

import { Page, Locator, expect } from '@playwright/test'

export class RFIsV2Page {
  readonly page: Page

  // Main locators
  readonly pageHeading: Locator
  readonly searchInput: Locator
  readonly createButton: Locator

  // Filter locators
  readonly statusFilter: Locator
  readonly priorityFilter: Locator
  readonly ballInCourtFilter: Locator

  // Tab locators (if applicable)
  readonly allTab: Locator
  readonly draftTab: Locator
  readonly submittedTab: Locator
  readonly overdueTab: Locator

  // Summary card locators
  readonly totalRFIsCard: Locator
  readonly overdueRFIsCard: Locator
  readonly pendingResponseCard: Locator
  readonly myCourtCard: Locator

  // Filter and action locators
  readonly filterButton: Locator
  readonly clearFiltersButton: Locator
  readonly exportButton: Locator

  constructor(page: Page) {
    this.page = page

    // Main page elements
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /rfi/i }).first()
    this.searchInput = page.getByRole('textbox', { name: /search.*rfi/i })
      .or(page.locator('input[placeholder*="search" i]'))
    this.createButton = page.locator('button, a').filter({ hasText: /new.*rfi|create.*rfi|add.*rfi/i }).first()

    // Filters
    this.statusFilter = page.locator('[role="combobox"], select').filter({ hasText: /status/i }).first()
    this.priorityFilter = page.locator('[role="combobox"], select').filter({ hasText: /priority/i }).first()
    this.ballInCourtFilter = page.locator('[role="combobox"], select').filter({ hasText: /ball.*court|responsible/i }).first()

    // Tabs
    this.allTab = page.getByRole('tab').filter({ hasText: /^all/i })
    this.draftTab = page.getByRole('tab').filter({ hasText: /draft/i })
    this.submittedTab = page.getByRole('tab').filter({ hasText: /submitted/i })
    this.overdueTab = page.getByRole('tab').filter({ hasText: /overdue/i })

    // Summary cards
    this.totalRFIsCard = page.locator('[data-testid="total-rfis"], p').filter({ hasText: /total.*rfi/i })
    this.overdueRFIsCard = page.locator('[data-testid="overdue-rfis"], p').filter({ hasText: /overdue/i })
    this.pendingResponseCard = page.locator('[data-testid="pending-response"], p').filter({ hasText: /pending/i })
    this.myCourtCard = page.locator('[data-testid="my-court"], p').filter({ hasText: /my.*court|assigned.*me/i })

    // Action buttons
    this.filterButton = page.locator('button').filter({ hasText: /filter/i }).first()
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear.*filter/i }).first()
    this.exportButton = page.locator('button').filter({ hasText: /export/i }).first()
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/rfis-v2')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoRFIDetail(rfiId: string) {
    await this.page.goto(`/rfis-v2/${rfiId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/rfis-v2`)
    await this.page.waitForLoadState('networkidle')
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

  async filterByStatus(status: 'all' | 'draft' | 'submitted' | 'under_review' | 'responded' | 'approved' | 'rejected' | 'closed') {
    const statusFilterSelect = this.page.locator('[role="combobox"], select').filter({ hasText: /status/i }).first()
    if (await statusFilterSelect.isVisible()) {
      await statusFilterSelect.click()
      await this.page.waitForTimeout(300)
      await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(status.replace('_', ' '), 'i') }).click()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByPriority(priority: 'all' | 'low' | 'normal' | 'high' | 'critical') {
    const priorityFilterSelect = this.page.locator('[role="combobox"], select').filter({ hasText: /priority/i }).first()
    if (await priorityFilterSelect.isVisible()) {
      await priorityFilterSelect.click()
      await this.page.waitForTimeout(300)
      await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(priority, 'i') }).click()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByBallInCourt(role: 'all' | 'gc' | 'architect' | 'engineer' | 'subcontractor' | 'owner' | 'consultant') {
    const ballInCourtFilterSelect = this.page.locator('[role="combobox"], select').filter({ hasText: /ball.*court|responsible/i }).first()
    if (await ballInCourtFilterSelect.isVisible()) {
      await ballInCourtFilterSelect.click()
      await this.page.waitForTimeout(300)
      await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(role, 'i') }).click()
      await this.page.waitForTimeout(500)
    }
  }

  async clearFilters() {
    if (await this.clearFiltersButton.isVisible({ timeout: 2000 })) {
      await this.clearFiltersButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  // Tab navigation
  async switchToTab(tab: 'all' | 'draft' | 'submitted' | 'overdue') {
    switch (tab) {
      case 'all':
        await this.allTab.click()
        break
      case 'draft':
        await this.draftTab.click()
        break
      case 'submitted':
        await this.submittedTab.click()
        break
      case 'overdue':
        await this.overdueTab.click()
        break
    }
    await this.page.waitForTimeout(500)
  }

  // RFI list methods
  getRFIRow(index: number = 0): Locator {
    return this.page.locator('[data-testid*="rfi-"], .rfi-row, .rfi-card, [role="article"]').nth(index)
  }

  getRFIByNumber(rfiNumber: string): Locator {
    return this.page.locator('[data-testid*="rfi-"], .rfi-row, .rfi-card, [role="article"]').filter({ hasText: new RegExp(`RFI.*${rfiNumber}`, 'i') })
  }

  getRFIBySubject(subject: string): Locator {
    return this.page.locator('[data-testid*="rfi-"], .rfi-row, .rfi-card, [role="article"]').filter({ hasText: subject })
  }

  async getRFICount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.page.locator('[data-testid*="rfi-"], .rfi-row, .rfi-card, [role="article"]').count()
  }

  async clickRFI(index: number = 0) {
    const rfi = this.getRFIRow(index)
    await rfi.click()
    await this.page.waitForLoadState('networkidle')
  }

  // Create RFI
  async clickCreateButton() {
    await this.createButton.click()
    await this.page.waitForTimeout(500)
  }

  async createRFI(data: {
    subject: string
    description: string
    priority?: 'low' | 'normal' | 'high' | 'critical'
    ballInCourt?: 'gc' | 'architect' | 'engineer' | 'subcontractor' | 'owner' | 'consultant'
    dueDate?: string
    assignedTo?: string
    relatedDocuments?: string[]
  }) {
    await this.clickCreateButton()

    // Fill in form
    const subjectInput = this.page.locator('input[name="subject"], input[placeholder*="subject" i]')
    await subjectInput.fill(data.subject)

    const descriptionInput = this.page.locator('textarea[name="description"], textarea[placeholder*="description" i], textarea[name="question"]')
    await descriptionInput.fill(data.description)

    if (data.priority) {
      const prioritySelect = this.page.locator('select[name="priority"], [role="combobox"]').filter({ hasText: /priority/i }).first()
      if (await prioritySelect.isVisible({ timeout: 2000 })) {
        await prioritySelect.click()
        await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(data.priority, 'i') }).click()
      }
    }

    if (data.ballInCourt) {
      const ballInCourtSelect = this.page.locator('select[name="ball_in_court"], [role="combobox"]').filter({ hasText: /ball.*court|responsible/i }).first()
      if (await ballInCourtSelect.isVisible({ timeout: 2000 })) {
        await ballInCourtSelect.click()
        await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(data.ballInCourt, 'i') }).click()
      }
    }

    if (data.dueDate) {
      const dueDateInput = this.page.locator('input[name="due_date"], input[type="date"]')
      if (await dueDateInput.isVisible({ timeout: 2000 })) {
        await dueDateInput.fill(data.dueDate)
      }
    }

    if (data.assignedTo) {
      const assigneeField = this.page.locator('input[name="assigned_to"], select[name="assigned_to"]').first()
      if (await assigneeField.isVisible({ timeout: 2000 })) {
        await assigneeField.fill(data.assignedTo)
      }
    }

    // Submit as draft or submit directly
    const submitButton = this.page.locator('button[type="submit"], button').filter({ hasText: /create|save|submit/i }).first()
    await submitButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async saveDraft(data: {
    subject: string
    description?: string
  }) {
    await this.clickCreateButton()

    const subjectInput = this.page.locator('input[name="subject"], input[placeholder*="subject" i]')
    await subjectInput.fill(data.subject)

    if (data.description) {
      const descriptionInput = this.page.locator('textarea[name="description"], textarea[placeholder*="description" i]')
      await descriptionInput.fill(data.description)
    }

    // Save as draft
    const saveDraftButton = this.page.locator('button').filter({ hasText: /save.*draft|draft/i }).first()
    if (await saveDraftButton.isVisible({ timeout: 2000 })) {
      await saveDraftButton.click()
    } else {
      // If no explicit draft button, just save
      await this.page.locator('button[type="submit"], button').filter({ hasText: /save/i }).first().click()
    }
    await this.page.waitForLoadState('networkidle')
  }

  // RFI detail page actions
  async respondToRFI(response: string) {
    const respondButton = this.page.locator('button').filter({ hasText: /respond|add.*response/i }).first()
    await respondButton.click()
    await this.page.waitForTimeout(500)

    const responseTextarea = this.page.locator('textarea[name="response"], textarea[placeholder*="response" i]')
    await responseTextarea.fill(response)

    const submitResponseButton = this.page.locator('button').filter({ hasText: /submit.*response|send.*response/i }).first()
    await submitResponseButton.click()
    await this.page.waitForTimeout(500)
  }

  async changeStatus(newStatus: 'submitted' | 'under_review' | 'responded' | 'approved' | 'rejected' | 'closed') {
    const statusDropdown = this.page.locator('select[name="status"], [role="combobox"]').filter({ hasText: /status/i }).first()

    if (await statusDropdown.isVisible({ timeout: 2000 })) {
      await statusDropdown.click()
      await this.page.waitForTimeout(300)
      await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(newStatus.replace('_', ' '), 'i') }).click()
      await this.page.waitForTimeout(500)
    } else {
      // Look for status action buttons
      const statusButton = this.page.locator('button').filter({ hasText: new RegExp(newStatus.replace('_', ' '), 'i') }).first()
      if (await statusButton.isVisible({ timeout: 2000 })) {
        await statusButton.click()
        await this.page.waitForTimeout(500)
      }
    }
  }

  async updateBallInCourt(role: 'gc' | 'architect' | 'engineer' | 'subcontractor' | 'owner' | 'consultant') {
    const ballInCourtDropdown = this.page.locator('select[name="ball_in_court"], [role="combobox"]').filter({ hasText: /ball.*court/i }).first()

    if (await ballInCourtDropdown.isVisible({ timeout: 2000 })) {
      await ballInCourtDropdown.click()
      await this.page.waitForTimeout(300)
      await this.page.locator('[role="option"], option').filter({ hasText: new RegExp(role, 'i') }).click()
      await this.page.waitForTimeout(500)
    }
  }

  async attachDocument(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    await this.page.waitForTimeout(1000)
  }

  async viewAttachment(index: number = 0) {
    const attachment = this.page.locator('[data-testid*="attachment"], .attachment, a[href*="download"]').nth(index)
    await attachment.click()
    await this.page.waitForTimeout(500)
  }

  async editRFI() {
    const editButton = this.page.locator('button, a').filter({ hasText: /edit/i }).first()
    await editButton.click()
    await this.page.waitForTimeout(500)
  }

  async updateRFI(data: Partial<{
    subject: string
    description: string
    priority: string
    dueDate: string
    ballInCourt: string
  }>) {
    if (data.subject) {
      const subjectInput = this.page.locator('input[name="subject"]')
      await subjectInput.clear()
      await subjectInput.fill(data.subject)
    }

    if (data.description) {
      const descriptionInput = this.page.locator('textarea[name="description"]')
      await descriptionInput.clear()
      await descriptionInput.fill(data.description)
    }

    if (data.priority) {
      const prioritySelect = this.page.locator('select[name="priority"]').first()
      if (await prioritySelect.isVisible({ timeout: 2000 })) {
        await prioritySelect.selectOption(data.priority)
      }
    }

    if (data.dueDate) {
      const dueDateInput = this.page.locator('input[name="due_date"]')
      await dueDateInput.fill(data.dueDate)
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /save|update/i }).first().click()
    await this.page.waitForLoadState('networkidle')
  }

  async deleteRFI() {
    const deleteButton = this.page.locator('button').filter({ hasText: /delete/i }).first()
    if (await deleteButton.isVisible({ timeout: 2000 })) {
      await deleteButton.click()

      // Confirm deletion if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|delete|yes/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click()
      }
      await this.page.waitForTimeout(500)
    }
  }

  // Assertions
  async expectRFIVisible(subject: string) {
    await expect(this.getRFIBySubject(subject)).toBeVisible()
  }

  async expectRFICount(count: number) {
    const actualCount = await this.getRFICount()
    expect(actualCount).toBe(count)
  }

  async expectRFIStatus(index: number, status: string) {
    const rfi = this.getRFIRow(index)
    const statusBadge = rfi.locator('[data-testid="status-badge"], .status-badge, .badge').filter({ hasText: new RegExp(status, 'i') })
    await expect(statusBadge).toBeVisible()
  }

  async expectRFIPriority(index: number, priority: string) {
    const rfi = this.getRFIRow(index)
    const priorityBadge = rfi.locator('[data-testid="priority-badge"], .priority-badge, .badge').filter({ hasText: new RegExp(priority, 'i') })
    await expect(priorityBadge).toBeVisible()
  }

  async expectBallInCourt(index: number, role: string) {
    const rfi = this.getRFIRow(index)
    const ballInCourtBadge = rfi.locator('[data-testid="ball-in-court"], .ball-in-court, .badge').filter({ hasText: new RegExp(role, 'i') })
    await expect(ballInCourtBadge).toBeVisible()
  }

  async expectOverdueAlert(index: number) {
    const rfi = this.getRFIRow(index)
    const overdueIndicator = rfi.locator('.overdue, [data-testid*="overdue"], .badge').filter({ hasText: /overdue/i })
    await expect(overdueIndicator).toBeVisible()
  }

  async expectNoRFIs() {
    const emptyMessage = this.page.locator('text=/no rfis|no items found|empty/i')
    await expect(emptyMessage).toBeVisible()
  }

  async expectResponseVisible(responseText: string) {
    const response = this.page.locator('[data-testid*="response"], .response-item, .comment').filter({ hasText: responseText })
    await expect(response).toBeVisible()
  }

  async expectAttachmentCount(count: number) {
    const attachments = this.page.locator('[data-testid*="attachment"], .attachment, a[href*="download"]')
    await expect(attachments).toHaveCount(count)
  }

  // Sorting
  async sortBy(column: string) {
    const columnHeader = this.page.locator('[role="columnheader"], th').filter({ hasText: new RegExp(column, 'i') })
    if (await columnHeader.isVisible({ timeout: 2000 })) {
      await columnHeader.click()
      await this.page.waitForTimeout(500)
    }
  }

  // Export
  async exportRFIs(format: 'pdf' | 'excel' | 'csv' = 'pdf') {
    if (await this.exportButton.isVisible({ timeout: 2000 })) {
      await this.exportButton.click()
      await this.page.waitForTimeout(300)

      const formatOption = this.page.locator('[role="menuitem"], button, a').filter({ hasText: new RegExp(format, 'i') })
      if (await formatOption.isVisible({ timeout: 2000 })) {
        await formatOption.click()
        await this.page.waitForTimeout(1000)
      }
    }
  }

  // Dashboard metrics
  async getTotalRFICount(): Promise<string | null> {
    if (await this.totalRFIsCard.isVisible({ timeout: 2000 })) {
      return await this.totalRFIsCard.textContent()
    }
    return null
  }

  async getOverdueCount(): Promise<string | null> {
    if (await this.overdueRFIsCard.isVisible({ timeout: 2000 })) {
      return await this.overdueRFIsCard.textContent()
    }
    return null
  }
}
