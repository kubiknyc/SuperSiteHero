/**
 * Action Items Page Object Model
 *
 * Page object for action items dashboard and detail pages.
 * Provides reusable methods for interacting with action item UI.
 */

import { Page, Locator, expect } from '@playwright/test'

export class ActionItemsPage {
  readonly page: Page

  // Main locators
  readonly pageHeading: Locator
  readonly searchInput: Locator
  readonly statusFilter: Locator
  readonly categoryFilter: Locator
  readonly createButton: Locator

  // Tab locators
  readonly allTab: Locator
  readonly overdueTab: Locator
  readonly dueSoonTab: Locator
  readonly escalatedTab: Locator

  // Summary card locators
  readonly openItemsCard: Locator
  readonly overdueItemsCard: Locator
  readonly completionRateCard: Locator
  readonly escalatedItemsCard: Locator

  // Filter and action locators
  readonly filterButton: Locator
  readonly clearFiltersButton: Locator

  constructor(page: Page) {
    this.page = page

    // Main page elements
    this.pageHeading = page.getByRole('textbox', { name: /search action items/i }) // Using search box as page identifier
    this.searchInput = page.getByRole('textbox', { name: /search action items/i })
    this.statusFilter = page.getByRole('combobox').filter({ hasText: /status/i })
    this.categoryFilter = page.getByRole('combobox').filter({ hasText: /categor/i })
    this.createButton = page.locator('button, a').filter({ hasText: /new|create|add.*action/i }).first()

    // Tabs - using specific patterns to match tab text like "All (0)", not dropdown filters
    this.allTab = page.getByRole('tab', { name: /^All \(\d+\)$/ })
    this.overdueTab = page.getByRole('tab', { name: /^Overdue \(\d+\)$/ })
    this.dueSoonTab = page.getByRole('tab', { name: /^Due Soon \(\d+\)$/ })
    this.escalatedTab = page.getByRole('tab', { name: /^Escalated \(\d+\)$/ })

    // Summary cards - targeting the paragraph text since cards don't have data-testid
    this.openItemsCard = page.locator('p').filter({ hasText: /^Open Items$/i })
    this.overdueItemsCard = page.locator('p').filter({ hasText: /^Overdue$/i })
    this.completionRateCard = page.locator('p').filter({ hasText: /^Completion Rate$/i })
    this.escalatedItemsCard = page.locator('p').filter({ hasText: /^Escalated$/i })

    // Action buttons
    this.filterButton = page.locator('button').filter({ hasText: /filter/i }).first()
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear.*filter/i }).first()
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/action-items')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/action-items`)
    await this.page.waitForLoadState('networkidle')
  }

  async gotoFromMeeting(meetingId: string) {
    await this.page.goto(`/meetings/${meetingId}/action-items`)
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

  async filterByStatus(status: 'all' | 'open' | 'in_progress' | 'completed' | 'deferred') {
    const statusFilterSelect = this.page.locator('[role="combobox"]').filter({ hasText: /status/i }).first()
    if (await statusFilterSelect.isVisible()) {
      await statusFilterSelect.click()
      await this.page.locator('[role="option"]').filter({ hasText: new RegExp(status.replace('_', ' '), 'i') }).click()
    }
  }

  async filterByPriority(priority: 'all' | 'low' | 'normal' | 'high' | 'critical') {
    const priorityFilter = this.page.locator('[role="combobox"]').filter({ hasText: /priority/i }).first()
    if (await priorityFilter.isVisible()) {
      await priorityFilter.click()
      await this.page.locator('[role="option"]').filter({ hasText: new RegExp(priority, 'i') }).click()
    }
  }

  async filterByCategory(category: string) {
    const categoryFilterSelect = this.page.locator('[role="combobox"]').filter({ hasText: /category/i }).first()
    if (await categoryFilterSelect.isVisible()) {
      await categoryFilterSelect.click()
      await this.page.locator('[role="option"]').filter({ hasText: new RegExp(category, 'i') }).click()
    }
  }

  // Tab navigation
  async switchToTab(tab: 'all' | 'overdue' | 'due-soon' | 'escalated') {
    switch (tab) {
      case 'all':
        await this.allTab.click()
        break
      case 'overdue':
        await this.overdueTab.click()
        break
      case 'due-soon':
        await this.dueSoonTab.click()
        break
      case 'escalated':
        await this.escalatedTab.click()
        break
    }
    await this.page.waitForTimeout(500)
  }

  // Action item list methods
  getActionItemRow(index: number = 0): Locator {
    return this.page.locator('[data-testid*="action-item-"], .action-item-row, [role="article"]').nth(index)
  }

  getActionItemByTitle(title: string): Locator {
    return this.page.locator('[data-testid*="action-item-"], .action-item-row, [role="article"]').filter({ hasText: title })
  }

  async getActionItemCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.page.locator('[data-testid*="action-item-"], .action-item-row, [role="article"]').count()
  }

  async clickActionItem(index: number = 0) {
    const item = this.getActionItemRow(index)
    await item.click()
    await this.page.waitForLoadState('networkidle')
  }

  // Action item actions (from dropdown menu)
  async openActionMenu(index: number = 0) {
    const item = this.getActionItemRow(index)
    const menuButton = item.locator('button').filter({ hasText: /more|menu|actions/i }).or(
      item.locator('[aria-label*="menu" i], [aria-label*="actions" i]')
    ).first()
    await menuButton.click()
    await this.page.waitForTimeout(300)
  }

  async markAsInProgress(index: number = 0) {
    await this.openActionMenu(index)
    const startButton = this.page.locator('[role="menuitem"]').filter({ hasText: /start|in progress/i }).first()
    await startButton.click()
    await this.page.waitForTimeout(500)
  }

  async markAsComplete(index: number = 0) {
    await this.openActionMenu(index)
    const completeButton = this.page.locator('[role="menuitem"]').filter({ hasText: /complete|done/i }).first()
    await completeButton.click()
    await this.page.waitForTimeout(500)
  }

  async deferActionItem(index: number = 0) {
    await this.openActionMenu(index)
    const deferButton = this.page.locator('[role="menuitem"]').filter({ hasText: /defer/i }).first()
    if (await deferButton.isVisible()) {
      await deferButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async deleteActionItem(index: number = 0) {
    await this.openActionMenu(index)
    const deleteButton = this.page.locator('[role="menuitem"]').filter({ hasText: /delete/i }).first()
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      // Confirm deletion if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|delete|yes/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click()
      }
      await this.page.waitForTimeout(500)
    }
  }

  async convertToTask(index: number = 0) {
    await this.openActionMenu(index)
    const convertButton = this.page.locator('[role="menuitem"]').filter({ hasText: /convert.*task/i }).first()
    if (await convertButton.isVisible()) {
      await convertButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async linkToRFI(index: number = 0, rfiId?: string) {
    await this.openActionMenu(index)
    const linkButton = this.page.locator('[role="menuitem"]').filter({ hasText: /link.*rfi/i }).first()
    if (await linkButton.isVisible()) {
      await linkButton.click()
      // If RFI selection dialog appears
      if (rfiId) {
        await this.page.locator(`[data-rfi-id="${rfiId}"]`).click()
      }
      await this.page.waitForTimeout(500)
    }
  }

  async linkToConstraint(index: number = 0) {
    await this.openActionMenu(index)
    const linkButton = this.page.locator('[role="menuitem"]').filter({ hasText: /link.*constraint/i }).first()
    if (await linkButton.isVisible()) {
      await linkButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async linkToChangeOrder(index: number = 0) {
    await this.openActionMenu(index)
    const linkButton = this.page.locator('[role="menuitem"]').filter({ hasText: /link.*change.*order/i }).first()
    if (await linkButton.isVisible()) {
      await linkButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async carryOverToMeeting(index: number = 0) {
    await this.openActionMenu(index)
    const carryButton = this.page.locator('[role="menuitem"]').filter({ hasText: /carry.*over/i }).first()
    if (await carryButton.isVisible()) {
      await carryButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async assignToTeamMember(index: number = 0, memberName: string) {
    await this.openActionMenu(index)
    const assignButton = this.page.locator('[role="menuitem"]').filter({ hasText: /assign/i }).first()
    if (await assignButton.isVisible()) {
      await assignButton.click()
      await this.page.locator('[role="option"]').filter({ hasText: memberName }).click()
      await this.page.waitForTimeout(500)
    }
  }

  // Create action item
  async clickCreateButton() {
    await this.createButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async createActionItem(data: {
    title: string
    description?: string
    assignedTo?: string
    dueDate?: string
    priority?: string
    category?: string
  }) {
    await this.clickCreateButton()

    // Fill in form
    await this.page.locator('input[name="title"], input[placeholder*="title" i]').fill(data.title)

    if (data.description) {
      await this.page.locator('textarea[name="description"], textarea[placeholder*="description" i]').fill(data.description)
    }

    if (data.assignedTo) {
      const assigneeField = this.page.locator('input[name="assigned_to"], select[name="assigned_to"]').first()
      await assigneeField.fill(data.assignedTo)
    }

    if (data.dueDate) {
      await this.page.locator('input[name="due_date"], input[type="date"]').fill(data.dueDate)
    }

    if (data.priority) {
      const prioritySelect = this.page.locator('select[name="priority"]').first()
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(data.priority)
      }
    }

    if (data.category) {
      const categorySelect = this.page.locator('select[name="category"]').first()
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption(data.category)
      }
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /create|save/i }).first().click()
    await this.page.waitForLoadState('networkidle')
  }

  // Edit action item
  async navigateToEdit(index: number = 0) {
    const item = this.getActionItemRow(index)
    const editButton = item.locator('button, a').filter({ hasText: /edit/i }).first()
    await editButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async updateActionItem(data: Partial<{
    title: string
    description: string
    assignedTo: string
    dueDate: string
    priority: string
    category: string
    status: string
  }>) {
    if (data.title) {
      const titleInput = this.page.locator('input[name="title"]')
      await titleInput.clear()
      await titleInput.fill(data.title)
    }

    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]')
      await descInput.clear()
      await descInput.fill(data.description)
    }

    if (data.status) {
      const statusSelect = this.page.locator('select[name="status"]').first()
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption(data.status)
      }
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /save|update/i }).first().click()
    await this.page.waitForLoadState('networkidle')
  }

  // View action item detail
  async viewDetail(index: number = 0) {
    await this.clickActionItem(index)
  }

  async resolveWithNotes(notes: string) {
    const resolveButton = this.page.locator('button').filter({ hasText: /resolve/i }).first()
    if (await resolveButton.isVisible()) {
      await resolveButton.click()

      // Fill in resolution notes
      const notesField = this.page.locator('textarea[name="resolution_notes"], textarea[placeholder*="notes" i]')
      if (await notesField.isVisible()) {
        await notesField.fill(notes)
      }

      // Confirm
      await this.page.locator('button').filter({ hasText: /confirm|resolve/i }).first().click()
      await this.page.waitForTimeout(500)
    }
  }

  // Assertions
  async expectActionItemVisible(title: string) {
    await expect(this.getActionItemByTitle(title)).toBeVisible()
  }

  async expectActionItemCount(count: number) {
    const actualCount = await this.getActionItemCount()
    expect(actualCount).toBe(count)
  }

  async expectActionItemStatus(index: number, status: string) {
    const item = this.getActionItemRow(index)
    const statusBadge = item.locator('[data-testid="status-badge"], .status-badge, .badge').filter({ hasText: new RegExp(status, 'i') })
    await expect(statusBadge).toBeVisible()
  }

  async expectSummaryCardValue(cardType: 'open' | 'overdue' | 'completion' | 'escalated', expectedValue: string | number) {
    let card: Locator
    switch (cardType) {
      case 'open':
        card = this.openItemsCard
        break
      case 'overdue':
        card = this.overdueItemsCard
        break
      case 'completion':
        card = this.completionRateCard
        break
      case 'escalated':
        card = this.escalatedItemsCard
        break
    }
    await expect(card).toContainText(expectedValue.toString())
  }

  async expectNoActionItems() {
    const emptyMessage = this.page.locator('text=/no action items|no items found/i')
    await expect(emptyMessage).toBeVisible()
  }

  async expectOverdueHighlight(index: number) {
    const item = this.getActionItemRow(index)
    await expect(item).toHaveClass(/overdue|red|danger/)
  }

  async expectEscalationBadge(index: number, level?: number) {
    const item = this.getActionItemRow(index)
    const escalationBadge = item.locator('[data-testid="escalation-badge"], .badge').filter({ hasText: /escalated/i })
    await expect(escalationBadge).toBeVisible()
    if (level !== undefined) {
      await expect(escalationBadge).toContainText(`L${level}`)
    }
  }

  async expectLinkedEntity(index: number, entityType: 'task' | 'rfi' | 'constraint' | 'change_order') {
    const item = this.getActionItemRow(index)
    const linkBadge = item.locator('[data-testid*="link"], .badge').filter({ hasText: new RegExp(entityType, 'i') })
    await expect(linkBadge).toBeVisible()
  }

  // Sorting
  async sortBy(column: string) {
    const columnHeader = this.page.locator('[role="columnheader"], th').filter({ hasText: new RegExp(column, 'i') })
    if (await columnHeader.isVisible()) {
      await columnHeader.click()
      await this.page.waitForTimeout(500)
    }
  }

  // Dashboard features
  async getAssigneeCount(): Promise<number> {
    const assigneeSection = this.page.locator('[data-testid="by-assignee"], .assignee-list').first()
    if (await assigneeSection.isVisible()) {
      return await assigneeSection.locator('[data-testid*="assignee-"], .assignee-item').count()
    }
    return 0
  }

  async clickAssigneeFilter(assigneeName: string) {
    const assigneeItem = this.page.locator('[data-testid*="assignee-"], .assignee-item').filter({ hasText: assigneeName })
    if (await assigneeItem.isVisible()) {
      await assigneeItem.click()
      await this.page.waitForTimeout(500)
    }
  }
}
