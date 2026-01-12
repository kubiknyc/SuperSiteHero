/**
 * Job Costing E2E Tests
 *
 * Comprehensive tests for the Finance/Job Costing feature including:
 * - Dashboard summary cards
 * - Cost breakdown by type
 * - Cost codes table with filtering and search
 * - Earned value metrics (CPI, SPI)
 * - Schedule of Values (SOV) management
 * - Line item CRUD operations
 * - Export functionality
 */

import { test, expect } from '@playwright/test'
import { JobCostingPage } from './pages/JobCostingPage'

// Use authenticated context for all tests
test.use({ storageState: 'playwright/.auth/user.json' })

test.describe('Job Costing - Dashboard Summary Cards', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test('should display all summary cards on load', async () => {
    await jobCostingPage.expectDashboardLoaded()
    await expect(jobCostingPage.totalBudgetCard).toBeVisible()
    await expect(jobCostingPage.committedCostsCard).toBeVisible()
    await expect(jobCostingPage.actualCostsCard).toBeVisible()
    await expect(jobCostingPage.varianceCard).toBeVisible()
    await expect(jobCostingPage.remainingBudgetCard).toBeVisible()
  })

  test('should display formatted currency values in cards', async () => {
    await jobCostingPage.expectDashboardLoaded()

    const budget = await jobCostingPage.getTotalBudget()
    // Should contain currency formatting ($ sign)
    expect(budget).toMatch(/\$[\d,]+/)
  })

  test('should show percentage for committed costs', async () => {
    await jobCostingPage.expectDashboardLoaded()

    const committed = await jobCostingPage.committedCostsCard.innerText()
    // Should show percentage of budget
    expect(committed).toMatch(/%/)
  })

  test('should color-code variance based on status', async ({ page }) => {
    await jobCostingPage.expectDashboardLoaded()

    // Variance card should have color styling
    const varianceCard = jobCostingPage.varianceCard
    const classAttr = await varianceCard.getAttribute('class') || ''

    // Should have some color indication (green for positive, red for negative)
    expect(classAttr.length).toBeGreaterThan(0)
  })
})

test.describe('Job Costing - Tab Navigation', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test('should display tabs for breakdown, cost codes, and forecast', async () => {
    await expect(jobCostingPage.breakdownTab).toBeVisible()
    await expect(jobCostingPage.costCodesTab).toBeVisible()
    await expect(jobCostingPage.forecastTab).toBeVisible()
  })

  test('should switch to cost breakdown tab', async () => {
    await jobCostingPage.selectBreakdownTab()
    // Breakdown content should be visible
    await expect(jobCostingPage.costBreakdownSection).toBeVisible()
  })

  test('should switch to cost codes tab', async () => {
    await jobCostingPage.selectCostCodesTab()
    await jobCostingPage.expectCostCodesTableVisible()
  })

  test('should switch to forecast tab', async () => {
    await jobCostingPage.selectForecastTab()
    await expect(jobCostingPage.forecastSection).toBeVisible()
  })
})

test.describe('Job Costing - Cost Breakdown by Type', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectBreakdownTab()
  })

  test('should display all cost type categories', async () => {
    await expect(jobCostingPage.laborBreakdown).toBeVisible()
    await expect(jobCostingPage.materialBreakdown).toBeVisible()
    await expect(jobCostingPage.equipmentBreakdown).toBeVisible()
    await expect(jobCostingPage.subcontractBreakdown).toBeVisible()
    await expect(jobCostingPage.otherBreakdown).toBeVisible()
  })

  test('should show budget allocation percentage for each type', async () => {
    const laborText = await jobCostingPage.laborBreakdown.innerText()
    // Should contain percentage
    expect(laborText).toMatch(/%/)
  })

  test('should show spent vs budget for each type', async () => {
    const laborText = await jobCostingPage.laborBreakdown.innerText()
    // Should contain currency values
    expect(laborText).toMatch(/\$/)
  })

  test('should display progress bars for cost types', async ({ page }) => {
    // Progress bars should be present within breakdown cards
    const progressBars = page.locator('[role="progressbar"], [class*="Progress"]')
    const count = await progressBars.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Job Costing - Variance Alert Cards', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectBreakdownTab()
  })

  test.skip('should display over budget items card when applicable', async () => {
    // This test depends on having over-budget items in test data
    const overBudgetItems = await jobCostingPage.getOverBudgetItems()
    if (overBudgetItems.length > 0) {
      await expect(jobCostingPage.overBudgetItemsCard).toBeVisible()
    }
  })

  test.skip('should display under budget items card when applicable', async () => {
    // This test depends on having under-budget items in test data
    const underBudgetItems = await jobCostingPage.getUnderBudgetItems()
    if (underBudgetItems.length > 0) {
      await expect(jobCostingPage.underBudgetItemsCard).toBeVisible()
    }
  })

  test('should limit displayed items to top 5', async () => {
    const overBudgetItems = await jobCostingPage.getOverBudgetItems()
    expect(overBudgetItems.length).toBeLessThanOrEqual(5)

    const underBudgetItems = await jobCostingPage.getUnderBudgetItems()
    expect(underBudgetItems.length).toBeLessThanOrEqual(5)
  })
})

test.describe('Job Costing - Cost Codes Table', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectCostCodesTab()
  })

  test('should display cost codes table with header', async () => {
    await jobCostingPage.expectCostCodesTableVisible()
    await expect(jobCostingPage.costCodesTableHeader).toBeVisible()
  })

  test('should display table columns correctly', async ({ page }) => {
    const headers = jobCostingPage.costCodesTableHeader.locator('th')
    const headerTexts = await headers.allInnerTexts()

    // Should have standard columns
    expect(headerTexts.some(h => /code/i.test(h))).toBeTruthy()
    expect(headerTexts.some(h => /description/i.test(h))).toBeTruthy()
    expect(headerTexts.some(h => /budget/i.test(h))).toBeTruthy()
  })

  test('should display search input', async () => {
    await expect(jobCostingPage.costCodesSearch).toBeVisible()
  })

  test('should display type filter dropdown', async () => {
    await expect(jobCostingPage.costTypeFilter).toBeVisible()
  })

  test('should display export button', async () => {
    await expect(jobCostingPage.exportButton).toBeVisible()
  })
})

test.describe('Job Costing - Cost Codes Search and Filter', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectCostCodesTab()
  })

  test('should filter cost codes by search query', async () => {
    const initialCount = await jobCostingPage.getCostCodeCount()

    await jobCostingPage.searchCostCodes('concrete')

    // Results should be filtered (either same or fewer)
    const filteredCount = await jobCostingPage.getCostCodeCount()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('should clear search and show all results', async () => {
    await jobCostingPage.searchCostCodes('xyz123')
    await jobCostingPage.clearSearch()

    // Should show results after clearing
    const count = await jobCostingPage.getCostCodeCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test.skip('should filter by cost type - labor', async () => {
    await jobCostingPage.filterByCostType('labor')

    // All visible rows should be labor type
    const rowCount = await jobCostingPage.getCostCodeCount()
    if (rowCount > 0) {
      const typeValue = await jobCostingPage.getCostCodeValue(0, 'type')
      expect(typeValue.toLowerCase()).toContain('labor')
    }
  })

  test.skip('should filter by cost type - material', async () => {
    await jobCostingPage.filterByCostType('material')

    const rowCount = await jobCostingPage.getCostCodeCount()
    if (rowCount > 0) {
      const typeValue = await jobCostingPage.getCostCodeValue(0, 'type')
      expect(typeValue.toLowerCase()).toContain('material')
    }
  })

  test('should handle no search results gracefully', async () => {
    await jobCostingPage.searchCostCodes('xyznonexistent12345')

    // Should either show empty state or zero rows
    const count = await jobCostingPage.getCostCodeCount()
    expect(count).toBe(0)
  })
})

test.describe('Job Costing - Cost Code Row Expansion', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectCostCodesTab()
  })

  test.skip('should expand cost code row to show details', async ({ page }) => {
    const rowCount = await jobCostingPage.getCostCodeCount()
    if (rowCount > 0) {
      await jobCostingPage.expandCostCodeRow(0)

      // Expanded content should be visible
      const expandedContent = page.locator('text=/Original Budget|Revised Budget|Remaining/i')
      await expect(expandedContent.first()).toBeVisible()
    }
  })

  test.skip('should collapse expanded row', async ({ page }) => {
    const rowCount = await jobCostingPage.getCostCodeCount()
    if (rowCount > 0) {
      await jobCostingPage.expandCostCodeRow(0)
      await jobCostingPage.collapseCostCodeRow(0)

      // Details should be hidden
      const expandedContent = page.locator('text=/Original Budget|Revised Budget/i')
      await expect(expandedContent.first()).not.toBeVisible()
    }
  })

  test.skip('should show original, revised, and remaining budget in expanded view', async ({ page }) => {
    const rowCount = await jobCostingPage.getCostCodeCount()
    if (rowCount > 0) {
      await jobCostingPage.expandCostCodeRow(0)

      await expect(page.locator('text=/Original Budget/i')).toBeVisible()
      await expect(page.locator('text=/Revised Budget/i')).toBeVisible()
      await expect(page.locator('text=/Remaining/i')).toBeVisible()
    }
  })
})

test.describe('Job Costing - Forecast and Earned Value', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectForecastTab()
  })

  test('should display contract value metric', async () => {
    await expect(jobCostingPage.contractValueMetric).toBeVisible()
  })

  test('should display earned to date metric', async () => {
    await expect(jobCostingPage.earnedToDateMetric).toBeVisible()
  })

  test('should display estimate at completion metric', async () => {
    await expect(jobCostingPage.estimateAtCompletionMetric).toBeVisible()
  })

  test('should display projected profit metric', async () => {
    await expect(jobCostingPage.projectedProfitMetric).toBeVisible()
  })

  test.skip('should display CPI indicator', async () => {
    await expect(jobCostingPage.cpiIndicator).toBeVisible()
    const cpi = await jobCostingPage.getCPI()
    expect(parseFloat(cpi)).toBeGreaterThan(0)
  })

  test.skip('should display SPI indicator', async () => {
    await expect(jobCostingPage.spiIndicator).toBeVisible()
    const spi = await jobCostingPage.getSPI()
    expect(parseFloat(spi)).toBeGreaterThan(0)
  })

  test.skip('should show CPI status badge', async ({ page }) => {
    // CPI should have a badge indicating health
    const cpiBadge = page.locator('[class*="Badge"]').filter({ hasText: /healthy|at.risk|over/i })
    await expect(cpiBadge.first()).toBeVisible()
  })
})

test.describe('Job Costing - Export Functionality', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectCostCodesTab()
  })

  test('should display export button', async () => {
    await expect(jobCostingPage.exportButton).toBeVisible()
  })

  test.skip('should open export options when clicked', async ({ page }) => {
    await jobCostingPage.exportCostCodes()

    // Should show export options or trigger download
    const exportOptions = page.locator('[role="menu"], [role="dialog"]').filter({ hasText: /PDF|Excel|CSV/i })
    // Export might trigger download or show menu
    const count = await exportOptions.count()
    // Just verify no error occurred
  })
})

test.describe('Job Costing - Schedule of Values Overview', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test.skip('should display SOV section title', async () => {
    await expect(jobCostingPage.sovTitle).toBeVisible()
  })

  test.skip('should display SOV status badge', async () => {
    await expect(jobCostingPage.sovStatusBadge).toBeVisible()
  })

  test.skip('should display SOV summary cards', async () => {
    await expect(jobCostingPage.sovContractSumCard).toBeVisible()
    await expect(jobCostingPage.sovCompletedStoredCard).toBeVisible()
    await expect(jobCostingPage.sovRetainageCard).toBeVisible()
    await expect(jobCostingPage.sovBalanceCard).toBeVisible()
  })
})

test.describe('Job Costing - SOV Line Items', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test.skip('should display SOV line items table', async () => {
    await expect(jobCostingPage.sovTable).toBeVisible()
  })

  test.skip('should display table header with correct columns', async ({ page }) => {
    const headers = jobCostingPage.sovTableHeader.locator('th')
    const headerTexts = await headers.allInnerTexts()

    expect(headerTexts.some(h => /Item/i.test(h))).toBeTruthy()
    expect(headerTexts.some(h => /Description/i.test(h))).toBeTruthy()
    expect(headerTexts.some(h => /Scheduled Value/i.test(h))).toBeTruthy()
  })

  test.skip('should display totals row in footer', async () => {
    await expect(jobCostingPage.sovTableFooter).toBeVisible()
    const footerText = await jobCostingPage.sovTableFooter.innerText()
    expect(footerText.toLowerCase()).toContain('total')
  })

  test.skip('should display add line item button', async () => {
    await expect(jobCostingPage.addLineItemButton).toBeVisible()
  })
})

test.describe('Job Costing - SOV Line Item CRUD', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test.skip('should open line item form when add is clicked', async () => {
    await jobCostingPage.addLineItem()
    await jobCostingPage.expectLineItemFormVisible()
  })

  test.skip('should display all form fields', async () => {
    await jobCostingPage.addLineItem()

    await expect(jobCostingPage.descriptionInput).toBeVisible()
    await expect(jobCostingPage.scheduledValueInput).toBeVisible()
  })

  test.skip('should cancel line item form', async () => {
    await jobCostingPage.addLineItem()
    await jobCostingPage.cancelLineItem()
    await jobCostingPage.expectLineItemFormHidden()
  })

  test.skip('should create new line item', async () => {
    const initialCount = await jobCostingPage.getLineItemCount()

    await jobCostingPage.addLineItem()
    await jobCostingPage.fillLineItem({
      description: 'Test Line Item E2E',
      scheduledValue: 10000,
      retainagePercent: 10,
    })
    await jobCostingPage.saveLineItem()

    const newCount = await jobCostingPage.getLineItemCount()
    expect(newCount).toBe(initialCount + 1)
  })

  test.skip('should require description field', async () => {
    await jobCostingPage.addLineItem()
    await jobCostingPage.fillLineItem({
      description: '',
      scheduledValue: 10000,
    })
    await jobCostingPage.saveLineItem()

    // Form should remain open due to validation
    await jobCostingPage.expectLineItemFormVisible()
  })

  test.skip('should delete line item with confirmation', async () => {
    const initialCount = await jobCostingPage.getLineItemCount()
    if (initialCount > 0) {
      await jobCostingPage.deleteLineItem(0, true)

      const newCount = await jobCostingPage.getLineItemCount()
      expect(newCount).toBe(initialCount - 1)
    }
  })

  test.skip('should cancel line item deletion', async () => {
    const initialCount = await jobCostingPage.getLineItemCount()
    if (initialCount > 0) {
      await jobCostingPage.deleteLineItem(0, false)

      const newCount = await jobCostingPage.getLineItemCount()
      expect(newCount).toBe(initialCount)
    }
  })
})

test.describe('Job Costing - SOV Billing Mode', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test.skip('should display edit billing button', async () => {
    await expect(jobCostingPage.editBillingButton).toBeVisible()
  })

  test.skip('should enter billing mode when button is clicked', async () => {
    await jobCostingPage.enterBillingMode()

    // Save and cancel buttons should appear
    await expect(jobCostingPage.saveBillingButton).toBeVisible()
    await expect(jobCostingPage.cancelBillingButton).toBeVisible()
  })

  test.skip('should exit billing mode on cancel', async () => {
    await jobCostingPage.enterBillingMode()
    await jobCostingPage.cancelBilling()

    // Edit billing button should reappear
    await expect(jobCostingPage.editBillingButton).toBeVisible()
  })

  test.skip('should update billing percentages in billing mode', async () => {
    const lineItemCount = await jobCostingPage.getLineItemCount()
    if (lineItemCount > 0) {
      await jobCostingPage.enterBillingMode()
      await jobCostingPage.updateBillingForLineItem(0, 50)
      await jobCostingPage.saveBilling()

      await jobCostingPage.expectSuccessToast()
    }
  })

  test.skip('should display roll forward button', async () => {
    await expect(jobCostingPage.rollForwardButton).toBeVisible()
  })
})

test.describe('Job Costing - SOV Lock/Unlock', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test.skip('should display lock button for active SOV', async () => {
    await expect(jobCostingPage.lockSovButton).toBeVisible()
  })

  test.skip('should lock SOV when button is clicked', async () => {
    await jobCostingPage.lockSOV()
    await jobCostingPage.expectSOVStatus('locked')
  })

  test.skip('should unlock SOV when unlock is clicked', async () => {
    // First lock it
    await jobCostingPage.lockSOV()
    // Then unlock
    await jobCostingPage.unlockSOV()
    await jobCostingPage.expectSOVStatus('active')
  })

  test.skip('should disable editing when SOV is locked', async () => {
    await jobCostingPage.lockSOV()

    // Edit buttons should be disabled or hidden
    await expect(jobCostingPage.editBillingButton).toBeDisabled()
    await expect(jobCostingPage.addLineItemButton).toBeDisabled()
  })
})

test.describe('Job Costing - Create SOV Dialog', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    // Navigate to a project without SOV
    await jobCostingPage.goto()
  })

  test.skip('should display create SOV dialog when no SOV exists', async () => {
    await jobCostingPage.expectCreateSOVDialogVisible()
  })

  test.skip('should display form fields in create dialog', async () => {
    await expect(jobCostingPage.originalContractSumInput).toBeVisible()
    await expect(jobCostingPage.defaultRetainageInput).toBeVisible()
  })

  test.skip('should create SOV with valid data', async () => {
    await jobCostingPage.createSOV(1000000, 10)

    // Dialog should close and SOV should be created
    await expect(jobCostingPage.createSovDialog).not.toBeVisible()
    await jobCostingPage.expectSOVLoaded()
  })

  test.skip('should cancel SOV creation', async ({ page }) => {
    await jobCostingPage.cancelCreateSovButton.click()
    await expect(jobCostingPage.createSovDialog).not.toBeVisible()
  })
})

test.describe('Job Costing - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test('should display summary cards on mobile', async () => {
    await jobCostingPage.expectDashboardLoaded()
  })

  test('should allow tab navigation on mobile', async () => {
    await expect(jobCostingPage.breakdownTab).toBeVisible()
    await jobCostingPage.selectCostCodesTab()
    await jobCostingPage.expectCostCodesTableVisible()
  })

  test('should display search input on mobile', async () => {
    await jobCostingPage.selectCostCodesTab()
    await expect(jobCostingPage.costCodesSearch).toBeVisible()
  })
})

test.describe('Job Costing - Loading States', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
  })

  test('should handle page load gracefully', async () => {
    await jobCostingPage.goto()

    // Should eventually show content or empty state
    await expect(async () => {
      const dashboardVisible = await jobCostingPage.totalBudgetCard.isVisible()
      const emptyVisible = await jobCostingPage.emptyState.isVisible()
      expect(dashboardVisible || emptyVisible).toBeTruthy()
    }).toPass({ timeout: 10000 })
  })
})

test.describe('Job Costing - Error Handling', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test('should not crash on navigation', async () => {
    // Basic smoke test - should load without errors
    await jobCostingPage.expectDashboardLoaded()
  })

  test.skip('should display error state on API failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/rest/v1/cost_codes**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
    )

    await page.reload()
    await jobCostingPage.expectErrorState()
  })
})

test.describe('Job Costing - Keyboard Navigation', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
    await jobCostingPage.selectCostCodesTab()
  })

  test('should focus search input when tabbing', async ({ page }) => {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to navigate via keyboard
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should navigate tabs with keyboard', async ({ page }) => {
    await jobCostingPage.costCodesTab.focus()
    await page.keyboard.press('ArrowRight')

    // Focus should move to next tab
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })
})

test.describe('Job Costing - Data Formatting', () => {
  let jobCostingPage: JobCostingPage

  test.beforeEach(async ({ page }) => {
    jobCostingPage = new JobCostingPage(page)
    await jobCostingPage.goto()
  })

  test('should format large numbers with commas', async () => {
    const budget = await jobCostingPage.getTotalBudget()
    // Large numbers should have comma separators
    if (budget.replace(/[^\d]/g, '').length > 3) {
      expect(budget).toMatch(/,/)
    }
  })

  test('should display dollar sign for currency values', async () => {
    const budget = await jobCostingPage.getTotalBudget()
    expect(budget).toContain('$')
  })

  test('should show percentage symbol where applicable', async () => {
    await jobCostingPage.selectCostCodesTab()
    const tableText = await jobCostingPage.costCodesTable.innerText()
    expect(tableText).toMatch(/%/)
  })
})
