/**
 * Job Costing Page Object Model
 *
 * Page object for the Finance/Job Costing dashboard including:
 * - Summary cards (budget, committed, actual, variance, remaining)
 * - Cost breakdown by type
 * - Cost codes table with expandable rows
 * - Forecast and earned value metrics
 * - Schedule of Values (SOV) management
 */

import { Page, Locator, expect } from '@playwright/test'

export class JobCostingPage {
  readonly page: Page

  // === Summary Cards ===
  readonly totalBudgetCard: Locator
  readonly totalBudgetValue: Locator
  readonly committedCostsCard: Locator
  readonly committedCostsValue: Locator
  readonly committedCostsPercent: Locator
  readonly actualCostsCard: Locator
  readonly actualCostsValue: Locator
  readonly varianceCard: Locator
  readonly varianceValue: Locator
  readonly remainingBudgetCard: Locator
  readonly remainingBudgetValue: Locator

  // === Tabs Navigation ===
  readonly tabsList: Locator
  readonly breakdownTab: Locator
  readonly costCodesTab: Locator
  readonly forecastTab: Locator

  // === Cost Breakdown by Type ===
  readonly costBreakdownSection: Locator
  readonly laborBreakdown: Locator
  readonly materialBreakdown: Locator
  readonly equipmentBreakdown: Locator
  readonly subcontractBreakdown: Locator
  readonly otherBreakdown: Locator

  // === Variance Alert Cards ===
  readonly overBudgetItemsCard: Locator
  readonly underBudgetItemsCard: Locator

  // === Cost Codes Table ===
  readonly costCodesSearch: Locator
  readonly costTypeFilter: Locator
  readonly exportButton: Locator
  readonly costCodesTable: Locator
  readonly costCodesTableHeader: Locator
  readonly costCodesTableBody: Locator
  readonly costCodeRows: Locator
  readonly expandButtons: Locator

  // === Forecast Panel ===
  readonly forecastSection: Locator
  readonly contractValueMetric: Locator
  readonly earnedToDateMetric: Locator
  readonly estimateAtCompletionMetric: Locator
  readonly projectedProfitMetric: Locator
  readonly cpiIndicator: Locator
  readonly spiIndicator: Locator

  // === Schedule of Values ===
  readonly sovSection: Locator
  readonly sovTitle: Locator
  readonly sovStatusBadge: Locator
  readonly sovContractSumCard: Locator
  readonly sovCompletedStoredCard: Locator
  readonly sovRetainageCard: Locator
  readonly sovBalanceCard: Locator

  // SOV Actions
  readonly lockSovButton: Locator
  readonly unlockSovButton: Locator
  readonly createPayAppButton: Locator
  readonly editBillingButton: Locator
  readonly saveBillingButton: Locator
  readonly cancelBillingButton: Locator
  readonly rollForwardButton: Locator
  readonly addLineItemButton: Locator

  // SOV Table
  readonly sovTable: Locator
  readonly sovTableHeader: Locator
  readonly sovTableBody: Locator
  readonly sovLineItemRows: Locator
  readonly sovTableFooter: Locator

  // SOV Line Item Form
  readonly lineItemForm: Locator
  readonly itemNumberInput: Locator
  readonly descriptionInput: Locator
  readonly scheduledValueInput: Locator
  readonly retainagePercentInput: Locator
  readonly costCodeSelect: Locator
  readonly specSectionInput: Locator
  readonly saveLineItemButton: Locator
  readonly cancelLineItemButton: Locator

  // SOV Dialogs
  readonly createSovDialog: Locator
  readonly originalContractSumInput: Locator
  readonly defaultRetainageInput: Locator
  readonly createSovButton: Locator
  readonly cancelCreateSovButton: Locator

  readonly deleteLineItemDialog: Locator
  readonly confirmDeleteButton: Locator
  readonly cancelDeleteButton: Locator

  // === Loading and Empty States ===
  readonly loadingSpinner: Locator
  readonly emptyState: Locator
  readonly errorState: Locator

  constructor(page: Page) {
    this.page = page

    // Summary cards - using text filters for card identification
    this.totalBudgetCard = page.locator('[class*="rounded"]').filter({ hasText: /Total Budget/i }).first()
    this.totalBudgetValue = this.totalBudgetCard.locator('[class*="font-bold"], [class*="text-2xl"]').first()

    this.committedCostsCard = page.locator('[class*="rounded"]').filter({ hasText: /Committed/i }).first()
    this.committedCostsValue = this.committedCostsCard.locator('[class*="font-bold"], [class*="text-2xl"]').first()
    this.committedCostsPercent = this.committedCostsCard.locator('text=/%/')

    this.actualCostsCard = page.locator('[class*="rounded"]').filter({ hasText: /Actual Costs?/i }).first()
    this.actualCostsValue = this.actualCostsCard.locator('[class*="font-bold"], [class*="text-2xl"]').first()

    this.varianceCard = page.locator('[class*="rounded"]').filter({ hasText: /Variance/i }).first()
    this.varianceValue = this.varianceCard.locator('[class*="font-bold"], [class*="text-2xl"]').first()

    this.remainingBudgetCard = page.locator('[class*="rounded"]').filter({ hasText: /Remaining/i }).first()
    this.remainingBudgetValue = this.remainingBudgetCard.locator('[class*="font-bold"], [class*="text-2xl"]').first()

    // Tabs navigation
    this.tabsList = page.locator('[role="tablist"]')
    this.breakdownTab = page.locator('[role="tab"]').filter({ hasText: /Breakdown|Cost Breakdown/i })
    this.costCodesTab = page.locator('[role="tab"]').filter({ hasText: /Cost Codes/i })
    this.forecastTab = page.locator('[role="tab"]').filter({ hasText: /Forecast/i })

    // Cost breakdown by type
    this.costBreakdownSection = page.locator('[class*="grid"]').filter({ has: page.locator('text=/Labor|Material|Equipment/i') })
    this.laborBreakdown = page.locator('[class*="rounded"]').filter({ hasText: /^Labor/i })
    this.materialBreakdown = page.locator('[class*="rounded"]').filter({ hasText: /^Material/i })
    this.equipmentBreakdown = page.locator('[class*="rounded"]').filter({ hasText: /^Equipment/i })
    this.subcontractBreakdown = page.locator('[class*="rounded"]').filter({ hasText: /^Subcontract/i })
    this.otherBreakdown = page.locator('[class*="rounded"]').filter({ hasText: /^Other/i })

    // Variance alert cards
    this.overBudgetItemsCard = page.locator('[class*="border-red"], [class*="destructive"]').filter({ hasText: /Over Budget/i })
    this.underBudgetItemsCard = page.locator('[class*="border-green"]').filter({ hasText: /Under Budget/i })

    // Cost codes table
    this.costCodesSearch = page.locator('input[placeholder*="Search"]').first()
    this.costTypeFilter = page.locator('select, [role="combobox"]').filter({ hasText: /All Types|Type/i }).first()
    this.exportButton = page.locator('button').filter({ hasText: /Export/i })
    this.costCodesTable = page.locator('table').filter({ has: page.locator('text=/Code|Description|Budget/i') })
    this.costCodesTableHeader = this.costCodesTable.locator('thead')
    this.costCodesTableBody = this.costCodesTable.locator('tbody')
    this.costCodeRows = this.costCodesTableBody.locator('tr')
    this.expandButtons = this.costCodesTableBody.locator('button').filter({ has: page.locator('svg') })

    // Forecast panel
    this.forecastSection = page.locator('[class*="grid"]').filter({ has: page.locator('text=/Contract Value|Earned/i') })
    this.contractValueMetric = page.locator('[class*="rounded"]').filter({ hasText: /Contract Value/i })
    this.earnedToDateMetric = page.locator('[class*="rounded"]').filter({ hasText: /Earned/i })
    this.estimateAtCompletionMetric = page.locator('[class*="rounded"]').filter({ hasText: /Estimate at Completion|EAC/i })
    this.projectedProfitMetric = page.locator('[class*="rounded"]').filter({ hasText: /Projected Profit|Profit/i })
    this.cpiIndicator = page.locator('text=/CPI|Cost Performance/i').locator('..')
    this.spiIndicator = page.locator('text=/SPI|Schedule Performance/i').locator('..')

    // Schedule of Values section
    this.sovSection = page.locator('[class*="Card"]').filter({ hasText: /Schedule of Values/i })
    this.sovTitle = page.locator('h2, h3').filter({ hasText: /Schedule of Values/i })
    this.sovStatusBadge = page.locator('[class*="Badge"]').filter({ hasText: /draft|active|locked|archived/i })

    // SOV summary cards
    this.sovContractSumCard = page.locator('[class*="rounded"]').filter({ hasText: /Contract Sum/i })
    this.sovCompletedStoredCard = page.locator('[class*="rounded"]').filter({ hasText: /Completed.*Stored/i })
    this.sovRetainageCard = page.locator('[class*="rounded"]').filter({ hasText: /Retainage/i })
    this.sovBalanceCard = page.locator('[class*="rounded"]').filter({ hasText: /Balance.*Finish/i })

    // SOV action buttons
    this.lockSovButton = page.locator('button').filter({ hasText: /Lock/i })
    this.unlockSovButton = page.locator('button').filter({ hasText: /Unlock/i })
    this.createPayAppButton = page.locator('button').filter({ hasText: /Create Pay App|Payment Application/i })
    this.editBillingButton = page.locator('button').filter({ hasText: /Edit Billing/i })
    this.saveBillingButton = page.locator('button').filter({ hasText: /Save Billing/i })
    this.cancelBillingButton = page.locator('button').filter({ hasText: /Cancel/i }).first()
    this.rollForwardButton = page.locator('button').filter({ hasText: /Roll Forward/i })
    this.addLineItemButton = page.locator('button').filter({ hasText: /Add Item|Add Line/i })

    // SOV table
    this.sovTable = page.locator('table').filter({ has: page.locator('text=/Item.*#|Scheduled Value/i') })
    this.sovTableHeader = this.sovTable.locator('thead')
    this.sovTableBody = this.sovTable.locator('tbody')
    this.sovLineItemRows = this.sovTableBody.locator('tr')
    this.sovTableFooter = this.sovTable.locator('tfoot, tr').filter({ hasText: /Total/i })

    // SOV line item form
    this.lineItemForm = page.locator('[class*="border-blue"], form').filter({ has: page.locator('input') })
    this.itemNumberInput = page.locator('input').filter({ has: page.locator('label:has-text("Item")') }).first()
    this.descriptionInput = page.locator('input, textarea').filter({ has: page.locator('label:has-text("Description")') }).first()
    this.scheduledValueInput = page.locator('input[type="number"], input').filter({ has: page.locator('label:has-text("Scheduled Value")') }).first()
    this.retainagePercentInput = page.locator('input[type="number"], input').filter({ has: page.locator('label:has-text("Retainage")') }).first()
    this.costCodeSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Cost Code/i })
    this.specSectionInput = page.locator('input').filter({ has: page.locator('label:has-text("Spec")') }).first()
    this.saveLineItemButton = page.locator('button').filter({ hasText: /Save|Update/i }).filter({ has: page.locator('svg') })
    this.cancelLineItemButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /Cancel|X/i })

    // Create SOV dialog
    this.createSovDialog = page.locator('[role="dialog"]').filter({ hasText: /Create.*Schedule of Values/i })
    this.originalContractSumInput = this.createSovDialog.locator('input[type="number"]').first()
    this.defaultRetainageInput = this.createSovDialog.locator('input[type="number"]').last()
    this.createSovButton = this.createSovDialog.locator('button').filter({ hasText: /Create/i })
    this.cancelCreateSovButton = this.createSovDialog.locator('button').filter({ hasText: /Cancel/i })

    // Delete confirmation dialog
    this.deleteLineItemDialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /Delete/i })
    this.confirmDeleteButton = this.deleteLineItemDialog.locator('button').filter({ hasText: /Delete|Confirm/i })
    this.cancelDeleteButton = this.deleteLineItemDialog.locator('button').filter({ hasText: /Cancel/i })

    // Loading and empty states
    this.loadingSpinner = page.locator('.animate-spin, [role="progressbar"]')
    this.emptyState = page.locator('text=/No cost codes|No data|No line items/i')
    this.errorState = page.locator('[role="alert"], [class*="destructive"]')
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  async goto(projectId?: string): Promise<void> {
    if (projectId) {
      await this.page.goto(`/projects/${projectId}/cost-tracking`)
    } else {
      await this.page.goto('/cost-tracking')
    }
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoPaymentApplications(projectId?: string): Promise<void> {
    if (projectId) {
      await this.page.goto(`/projects/${projectId}/payment-applications`)
    } else {
      await this.page.goto('/payment-applications')
    }
    await this.page.waitForLoadState('domcontentloaded')
  }

  // ============================================================================
  // Tab Navigation
  // ============================================================================

  async selectBreakdownTab(): Promise<void> {
    await this.breakdownTab.click()
    await this.page.waitForTimeout(300)
  }

  async selectCostCodesTab(): Promise<void> {
    await this.costCodesTab.click()
    await this.page.waitForTimeout(300)
  }

  async selectForecastTab(): Promise<void> {
    await this.forecastTab.click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // Cost Codes Table Methods
  // ============================================================================

  async searchCostCodes(query: string): Promise<void> {
    await this.costCodesSearch.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  async clearSearch(): Promise<void> {
    await this.costCodesSearch.clear()
    await this.page.waitForTimeout(500)
  }

  async filterByCostType(type: 'all' | 'labor' | 'material' | 'equipment' | 'subcontract' | 'other'): Promise<void> {
    await this.costTypeFilter.click()
    await this.page.locator(`[role="option"]:has-text("${type}")`).click()
    await this.page.waitForTimeout(300)
  }

  async getCostCodeCount(): Promise<number> {
    await this.page.waitForTimeout(300)
    return await this.costCodeRows.count()
  }

  async expandCostCodeRow(index: number = 0): Promise<void> {
    const expandButton = this.costCodeRows.nth(index).locator('button').first()
    await expandButton.click()
    await this.page.waitForTimeout(300)
  }

  async collapseCostCodeRow(index: number = 0): Promise<void> {
    // Same button toggles expand/collapse
    await this.expandCostCodeRow(index)
  }

  getCostCodeRow(index: number): Locator {
    return this.costCodeRows.nth(index)
  }

  async getCostCodeValue(index: number, column: 'code' | 'description' | 'type' | 'budget' | 'committed' | 'actual' | 'variance'): Promise<string> {
    const row = this.costCodeRows.nth(index)
    const columnIndex: Record<string, number> = {
      code: 1,
      description: 2,
      type: 3,
      budget: 4,
      committed: 5,
      actual: 6,
      variance: 7,
    }
    const cell = row.locator('td').nth(columnIndex[column])
    return await cell.innerText()
  }

  async exportCostCodes(): Promise<void> {
    await this.exportButton.click()
    await this.page.waitForTimeout(500)
  }

  // ============================================================================
  // Summary Card Methods
  // ============================================================================

  async getTotalBudget(): Promise<string> {
    return await this.totalBudgetValue.innerText()
  }

  async getCommittedCosts(): Promise<string> {
    return await this.committedCostsValue.innerText()
  }

  async getActualCosts(): Promise<string> {
    return await this.actualCostsValue.innerText()
  }

  async getVariance(): Promise<string> {
    return await this.varianceValue.innerText()
  }

  async getRemainingBudget(): Promise<string> {
    return await this.remainingBudgetValue.innerText()
  }

  // ============================================================================
  // Variance Alert Methods
  // ============================================================================

  async getOverBudgetItems(): Promise<string[]> {
    if (await this.overBudgetItemsCard.count() === 0) {return []}
    const items = this.overBudgetItemsCard.locator('li, [class*="item"]')
    const count = await items.count()
    const results: string[] = []
    for (let i = 0; i < count; i++) {
      results.push(await items.nth(i).innerText())
    }
    return results
  }

  async getUnderBudgetItems(): Promise<string[]> {
    if (await this.underBudgetItemsCard.count() === 0) {return []}
    const items = this.underBudgetItemsCard.locator('li, [class*="item"]')
    const count = await items.count()
    const results: string[] = []
    for (let i = 0; i < count; i++) {
      results.push(await items.nth(i).innerText())
    }
    return results
  }

  // ============================================================================
  // Forecast Methods
  // ============================================================================

  async getContractValue(): Promise<string> {
    return await this.contractValueMetric.locator('[class*="font-bold"], [class*="text-2xl"]').innerText()
  }

  async getEarnedToDate(): Promise<string> {
    return await this.earnedToDateMetric.locator('[class*="font-bold"], [class*="text-2xl"]').innerText()
  }

  async getCPI(): Promise<string> {
    const cpiText = await this.cpiIndicator.innerText()
    const match = cpiText.match(/[\d.]+/)
    return match ? match[0] : ''
  }

  async getSPI(): Promise<string> {
    const spiText = await this.spiIndicator.innerText()
    const match = spiText.match(/[\d.]+/)
    return match ? match[0] : ''
  }

  // ============================================================================
  // Schedule of Values Methods
  // ============================================================================

  async createSOV(contractSum: number, retainagePercent: number = 10): Promise<void> {
    // Wait for and fill create dialog
    await this.createSovDialog.waitFor({ state: 'visible', timeout: 5000 })
    await this.originalContractSumInput.fill(contractSum.toString())
    await this.defaultRetainageInput.fill(retainagePercent.toString())
    await this.createSovButton.click()
    await this.page.waitForTimeout(1000)
  }

  async lockSOV(): Promise<void> {
    await this.lockSovButton.click()
    await this.page.waitForTimeout(500)
  }

  async unlockSOV(): Promise<void> {
    await this.unlockSovButton.click()
    await this.page.waitForTimeout(500)
  }

  async enterBillingMode(): Promise<void> {
    await this.editBillingButton.click()
    await this.page.waitForTimeout(300)
  }

  async saveBilling(): Promise<void> {
    await this.saveBillingButton.click()
    await this.page.waitForTimeout(1000)
  }

  async cancelBilling(): Promise<void> {
    await this.cancelBillingButton.click()
    await this.page.waitForTimeout(300)
  }

  async rollForwardBilling(): Promise<void> {
    await this.rollForwardButton.click()
    await this.page.waitForTimeout(500)
  }

  async addLineItem(): Promise<void> {
    await this.addLineItemButton.click()
    await this.page.waitForTimeout(300)
  }

  async fillLineItem(data: {
    itemNumber?: string
    description: string
    scheduledValue: number
    retainagePercent?: number
    specSection?: string
  }): Promise<void> {
    if (data.itemNumber) {
      await this.itemNumberInput.fill(data.itemNumber)
    }
    await this.descriptionInput.fill(data.description)
    await this.scheduledValueInput.fill(data.scheduledValue.toString())
    if (data.retainagePercent !== undefined) {
      await this.retainagePercentInput.fill(data.retainagePercent.toString())
    }
    if (data.specSection) {
      await this.specSectionInput.fill(data.specSection)
    }
  }

  async saveLineItem(): Promise<void> {
    await this.saveLineItemButton.click()
    await this.page.waitForTimeout(500)
  }

  async cancelLineItem(): Promise<void> {
    await this.cancelLineItemButton.click()
    await this.page.waitForTimeout(300)
  }

  async getLineItemCount(): Promise<number> {
    await this.page.waitForTimeout(300)
    return await this.sovLineItemRows.count()
  }

  getLineItemRow(index: number): Locator {
    return this.sovLineItemRows.nth(index)
  }

  async editLineItem(index: number): Promise<void> {
    const row = this.sovLineItemRows.nth(index)
    await row.hover()
    const editButton = row.locator('button').filter({ has: this.page.locator('svg[class*="edit"], svg[class*="pencil"]') })
    await editButton.click()
    await this.page.waitForTimeout(300)
  }

  async deleteLineItem(index: number, confirm: boolean = true): Promise<void> {
    const row = this.sovLineItemRows.nth(index)
    await row.hover()
    const deleteButton = row.locator('button').filter({ has: this.page.locator('svg[class*="trash"], svg[class*="delete"]') })
    await deleteButton.click()

    await this.deleteLineItemDialog.waitFor({ state: 'visible', timeout: 3000 })

    if (confirm) {
      await this.confirmDeleteButton.click()
    } else {
      await this.cancelDeleteButton.click()
    }
    await this.page.waitForTimeout(500)
  }

  async expandLineItemRow(index: number): Promise<void> {
    const row = this.sovLineItemRows.nth(index)
    const expandButton = row.locator('button').first()
    await expandButton.click()
    await this.page.waitForTimeout(300)
  }

  async updateBillingForLineItem(index: number, percentComplete: number): Promise<void> {
    const row = this.sovLineItemRows.nth(index)
    const percentInput = row.locator('input[type="number"]')
    await percentInput.fill(percentComplete.toString())
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  async expectDashboardLoaded(): Promise<void> {
    await expect(this.totalBudgetCard).toBeVisible({ timeout: 10000 })
  }

  async expectSOVLoaded(): Promise<void> {
    await expect(this.sovTitle).toBeVisible({ timeout: 10000 })
  }

  async expectCostCodesTableVisible(): Promise<void> {
    await expect(this.costCodesTable).toBeVisible({ timeout: 5000 })
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible({ timeout: 5000 })
  }

  async expectLoadingState(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible()
  }

  async expectErrorState(): Promise<void> {
    await expect(this.errorState).toBeVisible({ timeout: 5000 })
  }

  async expectVariancePositive(): Promise<void> {
    // Positive variance should have green styling
    await expect(this.varianceCard).toHaveClass(/green|positive/i)
  }

  async expectVarianceNegative(): Promise<void> {
    // Negative variance should have red styling
    await expect(this.varianceCard).toHaveClass(/red|negative|destructive/i)
  }

  async expectSOVStatus(status: 'draft' | 'active' | 'locked' | 'archived'): Promise<void> {
    await expect(this.sovStatusBadge).toContainText(status, { ignoreCase: true })
  }

  async expectLineItemFormVisible(): Promise<void> {
    await expect(this.lineItemForm).toBeVisible({ timeout: 3000 })
  }

  async expectLineItemFormHidden(): Promise<void> {
    await expect(this.lineItemForm).not.toBeVisible({ timeout: 3000 })
  }

  async expectCreateSOVDialogVisible(): Promise<void> {
    await expect(this.createSovDialog).toBeVisible({ timeout: 5000 })
  }

  async expectDeleteDialogVisible(): Promise<void> {
    await expect(this.deleteLineItemDialog).toBeVisible({ timeout: 3000 })
  }

  async expectTabSelected(tab: 'breakdown' | 'codes' | 'forecast'): Promise<void> {
    const tabLocator = tab === 'breakdown' ? this.breakdownTab :
                       tab === 'codes' ? this.costCodesTab : this.forecastTab
    await expect(tabLocator).toHaveAttribute('data-state', 'active')
  }

  async expectCPIHealthy(): Promise<void> {
    const cpi = parseFloat(await this.getCPI())
    expect(cpi).toBeGreaterThanOrEqual(1.0)
  }

  async expectSPIHealthy(): Promise<void> {
    const spi = parseFloat(await this.getSPI())
    expect(spi).toBeGreaterThanOrEqual(1.0)
  }

  async expectSuccessToast(): Promise<void> {
    const toast = this.page.locator('[role="alert"], [data-testid="toast"]').filter({ hasText: /success/i })
    await expect(toast.first()).toBeVisible({ timeout: 5000 })
  }

  async expectErrorToast(): Promise<void> {
    const toast = this.page.locator('[role="alert"], [data-testid="toast"]').filter({ hasText: /error|failed/i })
    await expect(toast.first()).toBeVisible({ timeout: 5000 })
  }
}
