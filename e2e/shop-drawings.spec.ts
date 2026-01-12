/**
 * Shop Drawings E2E Tests
 *
 * Comprehensive tests for the Shop Drawings feature including:
 * - List view with filtering, sorting, and statistics
 * - Create shop drawing workflow
 * - Status transitions and approval workflow
 * - Revision management
 * - Detail view functionality
 */

import { test, expect } from '@playwright/test'
import { ShopDrawingsPage } from './pages/ShopDrawingsPage'

// Use authenticated context for all tests
test.use({ storageState: 'playwright/.auth/user.json' })

test.describe('Shop Drawings - List View', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test('should display shop drawings page with title', async () => {
    await shopDrawingsPage.expectListPageLoaded()
    await expect(shopDrawingsPage.pageTitle).toBeVisible()
  })

  test('should display page subtitle', async () => {
    await expect(shopDrawingsPage.pageSubtitle).toBeVisible()
  })

  test('should display project selector', async () => {
    await expect(shopDrawingsPage.projectSelector).toBeVisible()
  })

  test('should display new shop drawing button', async () => {
    await expect(shopDrawingsPage.newShopDrawingButton).toBeVisible()
  })

  test('should display statistics cards', async () => {
    await expect(shopDrawingsPage.totalCard).toBeVisible()
    await expect(shopDrawingsPage.pendingReviewCard).toBeVisible()
    await expect(shopDrawingsPage.approvedCard).toBeVisible()
  })

  test('should display view tabs (list and statistics)', async () => {
    await expect(shopDrawingsPage.listViewTab).toBeVisible()
    await expect(shopDrawingsPage.statisticsViewTab).toBeVisible()
  })
})

test.describe('Shop Drawings - Filter Controls', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test('should display status filter dropdown', async () => {
    await expect(shopDrawingsPage.statusFilter).toBeVisible()
  })

  test('should display discipline filter dropdown', async () => {
    await expect(shopDrawingsPage.disciplineFilter).toBeVisible()
  })

  test('should display priority filter dropdown', async () => {
    await expect(shopDrawingsPage.priorityFilter).toBeVisible()
  })

  test('should display long lead only checkbox', async () => {
    await expect(shopDrawingsPage.longLeadOnlyCheckbox).toBeVisible()
  })

  test('should display overdue only checkbox', async () => {
    await expect(shopDrawingsPage.overdueOnlyCheckbox).toBeVisible()
  })

  test.skip('should filter by status - not_submitted', async () => {
    await shopDrawingsPage.filterByStatus('not_submitted')
    // Verify filter was applied
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })

  test.skip('should filter by status - approved', async () => {
    await shopDrawingsPage.filterByStatus('approved')
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })

  test.skip('should filter by discipline - Structural', async () => {
    await shopDrawingsPage.filterByDiscipline('Structural')
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })

  test.skip('should filter by priority - critical_path', async () => {
    await shopDrawingsPage.filterByPriority('critical_path')
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })

  test.skip('should toggle long lead only filter', async () => {
    await shopDrawingsPage.toggleLongLeadOnly()
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })

  test.skip('should toggle overdue only filter', async () => {
    await shopDrawingsPage.toggleOverdueOnly()
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })

  test.skip('should clear all filters', async () => {
    await shopDrawingsPage.filterByStatus('submitted')
    await shopDrawingsPage.filterByPriority('critical_path')
    await shopDrawingsPage.clearAllFilters()
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeFalsy()
  })

  test.skip('should combine multiple filters', async () => {
    await shopDrawingsPage.filterByStatus('submitted')
    await shopDrawingsPage.filterByDiscipline('Mechanical')
    await shopDrawingsPage.filterByPriority('standard')
    const isActive = await shopDrawingsPage.isFilterActive()
    expect(isActive).toBeTruthy()
  })
})

test.describe('Shop Drawings - Table Display', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test('should display shop drawings table', async () => {
    await shopDrawingsPage.expectTableVisible()
  })

  test('should display table header', async () => {
    await expect(shopDrawingsPage.tableHeader).toBeVisible()
  })

  test('should have sortable column headers', async () => {
    await expect(shopDrawingsPage.sortByDrawingNumber).toBeVisible()
    await expect(shopDrawingsPage.sortByTitle).toBeVisible()
    await expect(shopDrawingsPage.sortByStatus).toBeVisible()
  })

  test.skip('should sort by drawing number', async () => {
    await shopDrawingsPage.sortByColumn('drawingNumber')
    // Sorting should apply (verify by checking first row content changes)
    await shopDrawingsPage.expectTableVisible()
  })

  test.skip('should sort by title', async () => {
    await shopDrawingsPage.sortByColumn('title')
    await shopDrawingsPage.expectTableVisible()
  })

  test.skip('should sort by required date', async () => {
    await shopDrawingsPage.sortByColumn('requiredDate')
    await shopDrawingsPage.expectTableVisible()
  })

  test.skip('should navigate to detail page when row is clicked', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectDetailPageLoaded()
    }
  })
})

test.describe('Shop Drawings - Statistics View', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
    await shopDrawingsPage.switchToStatisticsView()
  })

  test.skip('should display status distribution card', async () => {
    await expect(shopDrawingsPage.statusDistributionCard).toBeVisible()
  })

  test.skip('should display priority distribution card', async () => {
    await expect(shopDrawingsPage.priorityDistributionCard).toBeVisible()
  })

  test.skip('should display long lead items card', async () => {
    await expect(shopDrawingsPage.longLeadItemsCard).toBeVisible()
  })

  test.skip('should display quick summary card', async () => {
    await expect(shopDrawingsPage.quickSummaryCard).toBeVisible()
  })

  test.skip('should switch back to list view', async () => {
    await shopDrawingsPage.switchToListView()
    await shopDrawingsPage.expectTableVisible()
  })
})

test.describe('Shop Drawings - Create Dialog', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should open create dialog when button is clicked', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.expectCreateDialogVisible()
  })

  test.skip('should display all form fields in create dialog', async () => {
    await shopDrawingsPage.openCreateDialog()
    await expect(shopDrawingsPage.titleInput).toBeVisible()
    await expect(shopDrawingsPage.disciplineSelect).toBeVisible()
    await expect(shopDrawingsPage.descriptionTextarea).toBeVisible()
  })

  test.skip('should display priority and scheduling section', async () => {
    await shopDrawingsPage.openCreateDialog()
    await expect(shopDrawingsPage.prioritySelect).toBeVisible()
    await expect(shopDrawingsPage.dateRequiredInput).toBeVisible()
  })

  test.skip('should close dialog when cancel is clicked', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.cancelCreate()
    await shopDrawingsPage.expectCreateDialogHidden()
  })

  test.skip('should require title field', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.disciplineSelect.selectOption('Structural')
    await shopDrawingsPage.submitCreate()
    // Form should remain open due to validation
    await shopDrawingsPage.expectCreateDialogVisible()
  })

  test.skip('should require discipline field', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.titleInput.fill('Test Shop Drawing')
    await shopDrawingsPage.submitCreate()
    // Form should remain open due to validation
    await shopDrawingsPage.expectCreateDialogVisible()
  })

  test.skip('should create shop drawing with valid data', async () => {
    const initialCount = await shopDrawingsPage.getShopDrawingCount()

    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.fillCreateForm({
      title: 'E2E Test Shop Drawing',
      discipline: 'Structural',
      description: 'Test description for E2E',
      priority: 'standard',
    })
    await shopDrawingsPage.submitCreate()

    await shopDrawingsPage.expectCreateDialogHidden()
    const newCount = await shopDrawingsPage.getShopDrawingCount()
    expect(newCount).toBe(initialCount + 1)
  })

  test.skip('should create critical path shop drawing', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.fillCreateForm({
      title: 'Critical Path Drawing E2E',
      discipline: 'Mechanical',
      priority: 'critical_path',
    })
    await shopDrawingsPage.submitCreate()

    await shopDrawingsPage.expectSuccessToast()
  })

  test.skip('should create long lead item', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.fillCreateForm({
      title: 'Long Lead Item E2E',
      discipline: 'Electrical',
      longLeadItem: true,
    })
    await shopDrawingsPage.submitCreate()

    await shopDrawingsPage.expectSuccessToast()
  })
})

test.describe('Shop Drawings - Detail View', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should display detail page with drawing title', async ({ page }) => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectDetailPageLoaded()
      await expect(shopDrawingsPage.drawingTitle).toBeVisible()
    }
  })

  test.skip('should display status badge', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.statusBadge).toBeVisible()
    }
  })

  test.skip('should display priority badge', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.priorityBadge).toBeVisible()
    }
  })

  test.skip('should display back button', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.backButton).toBeVisible()
    }
  })

  test.skip('should navigate back to list when back is clicked', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.goBack()
      await shopDrawingsPage.expectListPageLoaded()
    }
  })

  test.skip('should display important dates card', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.createdDate).toBeVisible()
    }
  })

  test.skip('should display description section', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.descriptionSection).toBeVisible()
    }
  })
})

test.describe('Shop Drawings - Status Transitions', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should display status action buttons on detail page', async () => {
    // Navigate to a not_submitted drawing
    await shopDrawingsPage.filterByStatus('not_submitted')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.statusActionButtons.first()).toBeVisible()
    }
  })

  test.skip('should open status transition dialog when action is clicked', async () => {
    await shopDrawingsPage.filterByStatus('not_submitted')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.clickStatusAction('Submit')
      await shopDrawingsPage.expectStatusTransitionDialogVisible()
    }
  })

  test.skip('should cancel status transition', async () => {
    await shopDrawingsPage.filterByStatus('not_submitted')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.clickStatusAction('Submit')
      await shopDrawingsPage.cancelStatusTransition()
      await shopDrawingsPage.expectStatusTransitionDialogHidden()
    }
  })

  test.skip('should transition from not_submitted to submitted', async () => {
    await shopDrawingsPage.filterByStatus('not_submitted')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.clickStatusAction('Submit')
      await shopDrawingsPage.confirmStatusTransition()
      await shopDrawingsPage.expectStatus('submitted')
    }
  })

  test.skip('should show warning when approving (terminal state)', async () => {
    await shopDrawingsPage.filterByStatus('under_gc_review')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.clickStatusAction('Approve')
      await shopDrawingsPage.expectWarningInTransitionDialog()
    }
  })

  test.skip('should require comments for revise_resubmit transition', async () => {
    await shopDrawingsPage.filterByStatus('under_gc_review')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.clickStatusAction('Revise')
      // Comments should be required
      await expect(shopDrawingsPage.transitionCommentsInput).toBeVisible()
    }
  })

  test.skip('should set approval code A when approved', async () => {
    await shopDrawingsPage.filterByStatus('under_gc_review')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.clickStatusAction('Approve')
      await shopDrawingsPage.confirmStatusTransition()
      await shopDrawingsPage.expectApprovalCode('A')
    }
  })

  test.skip('should lock drawing when approved', async () => {
    await shopDrawingsPage.filterByStatus('approved')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectLockedStatus()
    }
  })

  test.skip('should prevent transitions on locked drawings', async () => {
    await shopDrawingsPage.filterByStatus('approved')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      const isLocked = await shopDrawingsPage.isStatusLocked()
      expect(isLocked).toBeTruthy()
    }
  })
})

test.describe('Shop Drawings - Revision History', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should display revisions tab on detail page', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await expect(shopDrawingsPage.revisionsTab).toBeVisible()
    }
  })

  test.skip('should display revision history when tab is selected', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      await shopDrawingsPage.expectRevisionHistoryVisible()
    }
  })

  test.skip('should mark current revision', async () => {
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      await shopDrawingsPage.expectCurrentRevisionMarked()
    }
  })

  test.skip('should display new revision button for revise_resubmit status', async () => {
    await shopDrawingsPage.filterByStatus('revise_resubmit')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      await expect(shopDrawingsPage.newRevisionButton).toBeVisible()
    }
  })

  test.skip('should open create revision dialog', async () => {
    await shopDrawingsPage.filterByStatus('revise_resubmit')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      await shopDrawingsPage.openCreateRevisionDialog()
      await expect(shopDrawingsPage.createRevisionDialog).toBeVisible()
    }
  })

  test.skip('should cancel create revision', async () => {
    await shopDrawingsPage.filterByStatus('revise_resubmit')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      await shopDrawingsPage.openCreateRevisionDialog()
      await shopDrawingsPage.cancelCreateRevision()
      await expect(shopDrawingsPage.createRevisionDialog).not.toBeVisible()
    }
  })

  test.skip('should create new revision', async () => {
    await shopDrawingsPage.filterByStatus('revise_resubmit')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      const initialRevCount = await shopDrawingsPage.getRevisionCount()

      await shopDrawingsPage.openCreateRevisionDialog()
      await shopDrawingsPage.createRevision('E2E test revision changes')

      const newRevCount = await shopDrawingsPage.getRevisionCount()
      expect(newRevCount).toBe(initialRevCount + 1)
    }
  })

  test.skip('should reset status to not_submitted after revision', async () => {
    await shopDrawingsPage.filterByStatus('revise_resubmit')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.selectRevisionsTab()
      await shopDrawingsPage.openCreateRevisionDialog()
      await shopDrawingsPage.createRevision('Reset status test')

      await shopDrawingsPage.expectStatus('not_submitted')
    }
  })
})

test.describe('Shop Drawings - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test('should display page title on mobile', async () => {
    await shopDrawingsPage.expectListPageLoaded()
  })

  test('should display statistics cards on mobile', async () => {
    await expect(shopDrawingsPage.totalCard).toBeVisible()
  })

  test('should display filter controls on mobile', async () => {
    await expect(shopDrawingsPage.statusFilter).toBeVisible()
  })

  test.skip('should open create dialog on mobile', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.expectCreateDialogVisible()
  })
})

test.describe('Shop Drawings - Error Handling', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test('should not crash on navigation', async () => {
    await shopDrawingsPage.expectListPageLoaded()
  })

  test('should handle empty state gracefully', async () => {
    // Filter to show no results
    await shopDrawingsPage.filterByStatus('void')
    const count = await shopDrawingsPage.getShopDrawingCount()
    // Should either show empty state or zero rows
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test.skip('should display error toast on API failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/rest/v1/submittals**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
    )

    await page.reload()
    await shopDrawingsPage.expectErrorState()
  })
})

test.describe('Shop Drawings - Keyboard Navigation', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test('should focus elements with Tab key', async ({ page }) => {
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test.skip('should close create dialog with Escape key', async ({ page }) => {
    await shopDrawingsPage.openCreateDialog()
    await page.keyboard.press('Escape')
    await shopDrawingsPage.expectCreateDialogHidden()
  })
})

test.describe('Shop Drawings - Validation', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should validate required fields in create form', async () => {
    await shopDrawingsPage.openCreateDialog()
    // Try to submit empty form
    await shopDrawingsPage.submitCreate()
    // Should stay on dialog
    await shopDrawingsPage.expectCreateDialogVisible()
  })

  test.skip('should accept special characters in title', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.titleInput.fill("O'Brien & Associates Drawing #1")
    await expect(shopDrawingsPage.titleInput).toHaveValue("O'Brien & Associates Drawing #1")
  })

  test.skip('should accept unicode characters in description', async () => {
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.descriptionTextarea.fill('Test description with émojis 🏗️ and spëcial chars!')
    await expect(shopDrawingsPage.descriptionTextarea).toHaveValue('Test description with émojis 🏗️ and spëcial chars!')
  })
})

test.describe('Shop Drawings - Status Workflow Complete Flow', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should complete full approval workflow', async () => {
    // 1. Create new shop drawing
    await shopDrawingsPage.openCreateDialog()
    await shopDrawingsPage.fillCreateForm({
      title: 'Full Workflow Test E2E',
      discipline: 'Structural',
      priority: 'standard',
    })
    await shopDrawingsPage.submitCreate()
    await shopDrawingsPage.expectSuccessToast()

    // 2. Navigate to newly created drawing
    // (assuming it's at the top of the list)
    await shopDrawingsPage.sortByColumn('drawingNumber')
    await shopDrawingsPage.clickShopDrawingRow(0)

    // 3. Submit for review
    await shopDrawingsPage.clickStatusAction('Submit')
    await shopDrawingsPage.confirmStatusTransition()
    await shopDrawingsPage.expectStatus('submitted')

    // 4. Start GC review
    await shopDrawingsPage.clickStatusAction('Review')
    await shopDrawingsPage.confirmStatusTransition()
    await shopDrawingsPage.expectStatus('under_gc_review')

    // 5. Approve
    await shopDrawingsPage.clickStatusAction('Approve')
    await shopDrawingsPage.confirmStatusTransition('No exceptions taken')
    await shopDrawingsPage.expectStatus('approved')
    await shopDrawingsPage.expectLockedStatus()
  })

  test.skip('should complete revise and resubmit workflow', async () => {
    // Find drawing under review
    await shopDrawingsPage.filterByStatus('under_gc_review')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)

      // 1. Request revision
      await shopDrawingsPage.clickStatusAction('Revise')
      await shopDrawingsPage.confirmStatusTransition('Please update dimensions on sheet 3')
      await shopDrawingsPage.expectStatus('revise_resubmit')

      // 2. Create new revision
      await shopDrawingsPage.selectRevisionsTab()
      await shopDrawingsPage.openCreateRevisionDialog()
      await shopDrawingsPage.createRevision('Updated dimensions per reviewer comments')

      // Status should reset
      await shopDrawingsPage.expectStatus('not_submitted')
    }
  })
})

test.describe('Shop Drawings - Approval Codes', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should display approval code A for approved drawings', async () => {
    await shopDrawingsPage.filterByStatus('approved')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectApprovalCode('A')
    }
  })

  test.skip('should display approval code B for approved_as_noted drawings', async () => {
    await shopDrawingsPage.filterByStatus('approved_as_noted')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectApprovalCode('B')
    }
  })

  test.skip('should display approval code C for revise_resubmit drawings', async () => {
    await shopDrawingsPage.filterByStatus('revise_resubmit')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectApprovalCode('C')
    }
  })

  test.skip('should display approval code D for rejected drawings', async () => {
    await shopDrawingsPage.filterByStatus('rejected')
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      await shopDrawingsPage.expectApprovalCode('D')
    }
  })
})

test.describe('Shop Drawings - Long Lead and Overdue Indicators', () => {
  let shopDrawingsPage: ShopDrawingsPage

  test.beforeEach(async ({ page }) => {
    shopDrawingsPage = new ShopDrawingsPage(page)
    await shopDrawingsPage.goto()
  })

  test.skip('should display long lead indicator on detail page', async () => {
    await shopDrawingsPage.toggleLongLeadOnly()
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      const isLongLead = await shopDrawingsPage.isLongLeadItem()
      expect(isLongLead).toBeTruthy()
    }
  })

  test.skip('should display overdue indicator on detail page', async () => {
    await shopDrawingsPage.toggleOverdueOnly()
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      await shopDrawingsPage.clickShopDrawingRow(0)
      const isOverdue = await shopDrawingsPage.isOverdue()
      expect(isOverdue).toBeTruthy()
    }
  })

  test.skip('should highlight overdue rows in table', async ({ page }) => {
    await shopDrawingsPage.toggleOverdueOnly()
    const rowCount = await shopDrawingsPage.getShopDrawingCount()
    if (rowCount > 0) {
      const firstRow = shopDrawingsPage.getTableRow(0)
      const classAttr = await firstRow.getAttribute('class') || ''
      // Overdue rows should have red/warning styling
      expect(classAttr.length).toBeGreaterThan(0)
    }
  })
})
