/**
 * Cost Estimates Page Object Model
 *
 * Page object for cost estimates list, detail pages, and estimation workflows.
 * Provides reusable methods for interacting with cost estimation UI.
 */

import { Page, Locator, expect } from '@playwright/test'

export class CostEstimatesPage {
  readonly page: Page

  // Main locators - Estimates List
  readonly pageHeading: Locator
  readonly searchInput: Locator
  readonly statusFilter: Locator
  readonly createEstimateButton: Locator

  // Filter and sort
  readonly clearFiltersButton: Locator
  readonly sortDropdown: Locator

  // Estimate detail locators
  readonly estimateTitle: Locator
  readonly estimateStatus: Locator
  readonly estimateDescription: Locator
  readonly laborRate: Locator
  readonly markupPercentage: Locator
  readonly contingencyPercentage: Locator
  readonly totalEstimate: Locator

  // Line items management
  readonly addLineItemButton: Locator
  readonly lineItemsList: Locator

  // Cost breakdown
  readonly laborCostTotal: Locator
  readonly materialCostTotal: Locator
  readonly equipmentCostTotal: Locator
  readonly subtotal: Locator

  // Actions
  readonly generateReportButton: Locator
  readonly compareEstimatesButton: Locator
  readonly convertToBudgetButton: Locator
  readonly duplicateEstimateButton: Locator

  constructor(page: Page) {
    this.page = page

    // List page elements
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /cost estimates?|estimat/i }).first()
    this.searchInput = page.getByRole('textbox', { name: /search/i })
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first()
    this.createEstimateButton = page.locator('button, a').filter({ hasText: /new|create.*estimate/i }).first()
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear.*filter/i }).first()
    this.sortDropdown = page.locator('select[name="sort"], [data-testid="sort-dropdown"]').first()

    // Detail page elements
    this.estimateTitle = page.locator('[data-testid="estimate-title"], h1, h2').first()
    this.estimateStatus = page.locator('[data-testid="estimate-status"], .badge, .status-badge').first()
    this.estimateDescription = page.locator('[data-testid="estimate-description"]')
    this.laborRate = page.locator('[data-testid="labor-rate"], input[name="labor_rate"]')
    this.markupPercentage = page.locator('[data-testid="markup-percentage"], input[name="markup_percentage"]')
    this.contingencyPercentage = page.locator('[data-testid="contingency-percentage"], input[name="contingency_percentage"]')
    this.totalEstimate = page.locator('[data-testid="total-estimate"]').first()

    // Line items section
    this.addLineItemButton = page.locator('button').filter({ hasText: /add.*item|add.*line/i }).first()
    this.lineItemsList = page.locator('[data-testid="line-items-list"], .line-items-list, [data-testid="estimate-items"]')

    // Cost totals
    this.laborCostTotal = page.locator('[data-testid="labor-cost-total"]').first()
    this.materialCostTotal = page.locator('[data-testid="material-cost-total"]').first()
    this.equipmentCostTotal = page.locator('[data-testid="equipment-cost-total"]').first()
    this.subtotal = page.locator('[data-testid="subtotal"]').first()

    // Action buttons
    this.generateReportButton = page.locator('button').filter({ hasText: /generate.*report|export.*report/i }).first()
    this.compareEstimatesButton = page.locator('button').filter({ hasText: /compare.*estimate/i }).first()
    this.convertToBudgetButton = page.locator('button').filter({ hasText: /convert.*budget|create.*budget/i }).first()
    this.duplicateEstimateButton = page.locator('button').filter({ hasText: /duplicate|copy/i }).first()
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/cost-estimates')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoEstimateDetail(estimateId: string) {
    await this.page.goto(`/cost-estimates/${estimateId}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoFromProject(projectId: string) {
    await this.page.goto(`/projects/${projectId}/cost-estimates`)
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

  // Estimate list methods
  getEstimateRow(index: number = 0): Locator {
    return this.page.locator('[data-testid*="estimate-"], [data-testid*="cost-estimate-"], .estimate-card, [role="article"]').nth(index)
  }

  getEstimateByName(name: string): Locator {
    return this.page.locator('[data-testid*="estimate-"], .estimate-card').filter({ hasText: name })
  }

  async getEstimateCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.page.locator('[data-testid*="estimate-"], [data-testid*="cost-estimate-"], .estimate-card, [role="article"]').count()
  }

  async clickEstimate(index: number = 0) {
    const estimateRow = this.getEstimateRow(index)
    await estimateRow.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Create estimate
  async clickCreateEstimateButton() {
    await this.createEstimateButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async createEstimate(data: {
    name: string
    description?: string
    laborRate?: string
    markupPercentage?: string
    contingencyPercentage?: string
  }) {
    await this.clickCreateEstimateButton()

    // Fill in form
    await this.page.locator('input[name="name"], input[placeholder*="name" i]').fill(data.name)

    if (data.description) {
      await this.page.locator('textarea[name="description"], textarea[placeholder*="description" i]').fill(data.description)
    }

    if (data.laborRate) {
      const laborRateInput = this.page.locator('input[name="labor_rate"], input[name="laborRate"]')
      if (await laborRateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await laborRateInput.fill(data.laborRate)
      }
    }

    if (data.markupPercentage) {
      const markupInput = this.page.locator('input[name="markup_percentage"], input[name="markupPercentage"]')
      if (await markupInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await markupInput.fill(data.markupPercentage)
      }
    }

    if (data.contingencyPercentage) {
      const contingencyInput = this.page.locator('input[name="contingency_percentage"], input[name="contingencyPercentage"]')
      if (await contingencyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await contingencyInput.fill(data.contingencyPercentage)
      }
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /create|save/i }).first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // Update estimate
  async updateEstimate(data: Partial<{
    name: string
    description: string
    laborRate: string
    markupPercentage: string
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

    if (data.laborRate) {
      const rateInput = this.page.locator('input[name="labor_rate"]')
      await rateInput.clear()
      await rateInput.fill(data.laborRate)
    }

    if (data.markupPercentage) {
      const markupInput = this.page.locator('input[name="markup_percentage"]')
      await markupInput.clear()
      await markupInput.fill(data.markupPercentage)
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

  // Line items management
  async addLineItem(data: {
    name: string
    measurementType: string
    quantity: string
    unitCost: string
    laborHours?: string
    laborRate?: string
  }) {
    if (await this.addLineItemButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.addLineItemButton.click()
      await this.page.waitForTimeout(500)
    }

    await this.page.locator('input[name="name"], input[placeholder*="name" i]').fill(data.name)

    const measurementTypeInput = this.page.locator('input[name="measurement_type"], select[name="measurement_type"]')
    if (await measurementTypeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tagName = await measurementTypeInput.evaluate(el => el.tagName)
      if (tagName === 'SELECT') {
        await measurementTypeInput.selectOption(data.measurementType)
      } else {
        await measurementTypeInput.fill(data.measurementType)
      }
    }

    await this.page.locator('input[name="quantity"]').fill(data.quantity)
    await this.page.locator('input[name="unit_cost"], input[name="unitCost"]').fill(data.unitCost)

    if (data.laborHours) {
      const laborHoursInput = this.page.locator('input[name="labor_hours"], input[name="laborHours"]')
      if (await laborHoursInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await laborHoursInput.fill(data.laborHours)
      }
    }

    if (data.laborRate) {
      const laborRateInput = this.page.locator('input[name="labor_rate"], input[name="laborRate"]')
      if (await laborRateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await laborRateInput.fill(data.laborRate)
      }
    }

    // Submit
    await this.page.locator('button[type="submit"], button').filter({ hasText: /add|save|create/i }).first().click()
    await this.page.waitForTimeout(1000)
  }

  async getLineItemCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    if (await this.lineItemsList.isVisible({ timeout: 2000 }).catch(() => false)) {
      return await this.lineItemsList.locator('[data-testid*="line-item-"], [data-testid*="item-"], tr, .line-item').count()
    }
    return 0
  }

  async editLineItem(index: number, updates: Partial<{
    quantity: string
    unitCost: string
    laborHours: string
  }>) {
    const items = this.lineItemsList.locator('[data-testid*="line-item-"], tr, .line-item')
    const item = items.nth(index)
    const editButton = item.locator('button').filter({ hasText: /edit/i }).first()

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click()
      await this.page.waitForTimeout(500)

      if (updates.quantity) {
        const quantityInput = this.page.locator('input[name="quantity"]')
        await quantityInput.clear()
        await quantityInput.fill(updates.quantity)
      }

      if (updates.unitCost) {
        const unitCostInput = this.page.locator('input[name="unit_cost"], input[name="unitCost"]')
        await unitCostInput.clear()
        await unitCostInput.fill(updates.unitCost)
      }

      if (updates.laborHours) {
        const laborHoursInput = this.page.locator('input[name="labor_hours"], input[name="laborHours"]')
        if (await laborHoursInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await laborHoursInput.clear()
          await laborHoursInput.fill(updates.laborHours)
        }
      }

      // Submit
      await this.page.locator('button[type="submit"], button').filter({ hasText: /save|update/i }).first().click()
      await this.page.waitForTimeout(500)
    }
  }

  async deleteLineItem(index: number) {
    const items = this.lineItemsList.locator('[data-testid*="line-item-"], tr, .line-item')
    const item = items.nth(index)
    const deleteButton = item.locator('button').filter({ hasText: /delete|remove/i }).first()

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click()

      // Confirm if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|yes|delete/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await this.page.waitForTimeout(500)
    }
  }

  // Cost category methods
  async addLaborCost(data: {
    description: string
    hours: string
    rate: string
  }) {
    const addLaborButton = this.page.locator('button').filter({ hasText: /add.*labor/i }).first()

    if (await addLaborButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addLaborButton.click()
      await this.page.waitForTimeout(500)

      await this.page.locator('input[name="description"], textarea[name="description"]').fill(data.description)
      await this.page.locator('input[name="hours"], input[name="labor_hours"]').fill(data.hours)
      await this.page.locator('input[name="rate"], input[name="labor_rate"]').fill(data.rate)

      await this.page.locator('button[type="submit"], button').filter({ hasText: /add|save/i }).first().click()
      await this.page.waitForTimeout(500)
    }
  }

  async addMaterialCost(data: {
    description: string
    quantity: string
    unitCost: string
  }) {
    const addMaterialButton = this.page.locator('button').filter({ hasText: /add.*material/i }).first()

    if (await addMaterialButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addMaterialButton.click()
      await this.page.waitForTimeout(500)

      await this.page.locator('input[name="description"], textarea[name="description"]').fill(data.description)
      await this.page.locator('input[name="quantity"]').fill(data.quantity)
      await this.page.locator('input[name="unit_cost"], input[name="unitCost"]').fill(data.unitCost)

      await this.page.locator('button[type="submit"], button').filter({ hasText: /add|save/i }).first().click()
      await this.page.waitForTimeout(500)
    }
  }

  async addEquipmentCost(data: {
    description: string
    quantity: string
    rate: string
  }) {
    const addEquipmentButton = this.page.locator('button').filter({ hasText: /add.*equipment/i }).first()

    if (await addEquipmentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addEquipmentButton.click()
      await this.page.waitForTimeout(500)

      await this.page.locator('input[name="description"], textarea[name="description"]').fill(data.description)
      await this.page.locator('input[name="quantity"]').fill(data.quantity)
      await this.page.locator('input[name="rate"], input[name="equipment_rate"]').fill(data.rate)

      await this.page.locator('button[type="submit"], button').filter({ hasText: /add|save/i }).first().click()
      await this.page.waitForTimeout(500)
    }
  }

  // Markup and contingency
  async applyMarkup(percentage: string) {
    const markupInput = this.page.locator('input[name="markup_percentage"], input[name="markupPercentage"]')

    if (await markupInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await markupInput.clear()
      await markupInput.fill(percentage)
      await markupInput.blur() // Trigger calculation
      await this.page.waitForTimeout(500)
    }
  }

  async applyContingency(percentage: string) {
    const contingencyInput = this.page.locator('input[name="contingency_percentage"], input[name="contingencyPercentage"]')

    if (await contingencyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contingencyInput.clear()
      await contingencyInput.fill(percentage)
      await contingencyInput.blur() // Trigger calculation
      await this.page.waitForTimeout(500)
    }
  }

  // Report generation
  async generateReport(format: 'pdf' | 'excel' = 'pdf') {
    if (await this.generateReportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.generateReportButton.click()
      await this.page.waitForTimeout(500)

      // Select format if option appears
      const formatOption = this.page.locator(`button, [role="menuitem"]`).filter({ hasText: new RegExp(format, 'i') })
      if (await formatOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await formatOption.click()
      }

      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  // Compare estimates
  async compareEstimates(estimateIds?: string[]) {
    if (await this.compareEstimatesButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.compareEstimatesButton.click()
      await this.page.waitForTimeout(500)

      if (estimateIds && estimateIds.length > 0) {
        // Select estimates to compare
        for (const id of estimateIds) {
          const checkbox = this.page.locator(`input[type="checkbox"][value="${id}"]`)
          if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            await checkbox.check()
          }
        }

        // Click compare button in dialog
        await this.page.locator('button').filter({ hasText: /compare|view comparison/i }).first().click()
      }

      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  async getComparisonCount(): Promise<number> {
    const comparisonTable = this.page.locator('[data-testid="comparison-table"], table').first()
    if (await comparisonTable.isVisible({ timeout: 2000 }).catch(() => false)) {
      const rows = comparisonTable.locator('tbody tr, [data-testid*="estimate-row"]')
      return await rows.count()
    }
    return 0
  }

  // Convert to budget
  async convertToBudget() {
    if (await this.convertToBudgetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.convertToBudgetButton.click()
      await this.page.waitForTimeout(500)

      // Confirm if dialog appears
      const confirmButton = this.page.locator('button').filter({ hasText: /confirm|convert|create/i }).first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  // Duplicate estimate
  async duplicateEstimate(newName?: string) {
    if (await this.duplicateEstimateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.duplicateEstimateButton.click()
      await this.page.waitForTimeout(500)

      if (newName) {
        const nameInput = this.page.locator('input[name="name"], input[placeholder*="name" i]')
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.clear()
          await nameInput.fill(newName)
        }
      }

      // Confirm
      await this.page.locator('button[type="submit"], button').filter({ hasText: /duplicate|copy|create/i }).first().click()
      await this.page.waitForLoadState('domcontentloaded')
    }
  }

  // Assertions
  async expectEstimateVisible(name: string) {
    await expect(this.getEstimateByName(name)).toBeVisible({ timeout: 5000 })
  }

  async expectEstimateCount(count: number) {
    const actualCount = await this.getEstimateCount()
    expect(actualCount).toBe(count)
  }

  async expectEstimateStatus(status: string) {
    const statusBadge = this.estimateStatus.filter({ hasText: new RegExp(status, 'i') })
    await expect(statusBadge).toBeVisible({ timeout: 5000 })
  }

  async expectNoEstimates() {
    const emptyMessage = this.page.locator('text=/no.*estimates?|empty/i, [data-testid="empty-state"]')
    await expect(emptyMessage.first()).toBeVisible({ timeout: 5000 })
  }

  async expectLineItemVisible(name: string) {
    const lineItem = this.page.locator('[data-testid*="line-item-"], tr, .line-item').filter({ hasText: name })
    await expect(lineItem.first()).toBeVisible({ timeout: 5000 })
  }

  async expectTotalEstimate(amount: string) {
    await expect(this.totalEstimate).toContainText(amount)
  }

  async expectStatusApproved() {
    const approvedStatus = this.estimateStatus.filter({ hasText: /approved/i })
    await expect(approvedStatus).toBeVisible({ timeout: 5000 })
  }
}
