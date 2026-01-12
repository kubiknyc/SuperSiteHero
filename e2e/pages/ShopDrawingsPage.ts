/**
 * Shop Drawings Page Object Model
 *
 * Page object for the Shop Drawings feature including:
 * - List view with filtering, sorting, and statistics
 * - Detail view with status transitions
 * - Revision history management
 * - Create/edit dialogs
 */

import { Page, Locator, expect } from '@playwright/test'

export type ShopDrawingStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_gc_review'
  | 'under_review'
  | 'submitted_to_architect'
  | 'approved'
  | 'approved_as_noted'
  | 'revise_resubmit'
  | 'rejected'
  | 'void'

export type ShopDrawingDiscipline =
  | 'Structural'
  | 'Mechanical'
  | 'Electrical'
  | 'Plumbing'
  | 'Fire Protection'
  | 'Architectural'
  | 'Civil'
  | 'Other'

export type ShopDrawingPriority = 'critical_path' | 'standard' | 'non_critical'

export class ShopDrawingsPage {
  readonly page: Page

  // === Page Header ===
  readonly pageTitle: Locator
  readonly pageSubtitle: Locator
  readonly projectSelector: Locator
  readonly newShopDrawingButton: Locator

  // === Statistics Cards ===
  readonly totalCard: Locator
  readonly pendingReviewCard: Locator
  readonly approvedCard: Locator
  readonly criticalPathCard: Locator
  readonly overdueCard: Locator

  // === View Tabs ===
  readonly listViewTab: Locator
  readonly statisticsViewTab: Locator

  // === Filter Controls ===
  readonly statusFilter: Locator
  readonly disciplineFilter: Locator
  readonly priorityFilter: Locator
  readonly subcontractorFilter: Locator
  readonly longLeadOnlyCheckbox: Locator
  readonly overdueOnlyCheckbox: Locator
  readonly clearFiltersButton: Locator
  readonly resultsCount: Locator

  // === Shop Drawings Table ===
  readonly shopDrawingsTable: Locator
  readonly tableHeader: Locator
  readonly tableBody: Locator
  readonly tableRows: Locator
  readonly sortByDrawingNumber: Locator
  readonly sortByTitle: Locator
  readonly sortByDiscipline: Locator
  readonly sortByStatus: Locator
  readonly sortByPriority: Locator
  readonly sortByRequiredDate: Locator
  readonly emptyState: Locator

  // === Statistics View ===
  readonly statusDistributionCard: Locator
  readonly priorityDistributionCard: Locator
  readonly longLeadItemsCard: Locator
  readonly quickSummaryCard: Locator

  // === Detail Page Header ===
  readonly backButton: Locator
  readonly drawingTitle: Locator
  readonly statusBadge: Locator
  readonly priorityBadge: Locator
  readonly longLeadIndicator: Locator
  readonly projectName: Locator
  readonly specSection: Locator
  readonly revisionLabel: Locator

  // === Detail Page Main Content ===
  readonly descriptionSection: Locator
  readonly disciplineInfo: Locator
  readonly subcontractorInfo: Locator
  readonly submittedByInfo: Locator
  readonly reviewerInfo: Locator
  readonly reviewCommentsSection: Locator
  readonly approvalCodeDisplay: Locator

  // === Detail Page Tabs ===
  readonly revisionsTab: Locator
  readonly attachmentsTab: Locator
  readonly historyTab: Locator

  // === Important Dates Card ===
  readonly createdDate: Locator
  readonly submittedDate: Locator
  readonly requiredDate: Locator
  readonly returnedDate: Locator
  readonly daysInReview: Locator
  readonly overdueIndicator: Locator

  // === Review Settings Card ===
  readonly daysForReview: Locator
  readonly ballInCourt: Locator

  // === Status Transition ===
  readonly statusTransitionCard: Locator
  readonly lockedStatusMessage: Locator
  readonly statusActionButtons: Locator
  readonly statusDropdown: Locator

  // === Status Transition Dialog ===
  readonly statusTransitionDialog: Locator
  readonly transitionFromStatus: Locator
  readonly transitionToStatus: Locator
  readonly transitionApprovalCode: Locator
  readonly transitionWarning: Locator
  readonly transitionCommentsInput: Locator
  readonly cancelTransitionButton: Locator
  readonly confirmTransitionButton: Locator

  // === Revision History ===
  readonly revisionHistorySection: Locator
  readonly revisionTimeline: Locator
  readonly revisionItems: Locator
  readonly newRevisionButton: Locator
  readonly currentRevisionTag: Locator

  // === Create Revision Dialog ===
  readonly createRevisionDialog: Locator
  readonly revisionDescriptionInput: Locator
  readonly cancelRevisionButton: Locator
  readonly createRevisionConfirmButton: Locator

  // === Create Shop Drawing Dialog ===
  readonly createDialog: Locator
  readonly titleInput: Locator
  readonly disciplineSelect: Locator
  readonly descriptionTextarea: Locator
  readonly specSectionPicker: Locator
  readonly prioritySelect: Locator
  readonly dateRequiredInput: Locator
  readonly daysForReviewInput: Locator
  readonly longLeadItemCheckbox: Locator
  readonly subcontractorSelect: Locator
  readonly reviewerSelect: Locator
  readonly cancelCreateButton: Locator
  readonly submitCreateButton: Locator

  // === Loading & States ===
  readonly loadingSpinner: Locator
  readonly loadingSkeleton: Locator
  readonly errorState: Locator

  constructor(page: Page) {
    this.page = page

    // Page header
    this.pageTitle = page.locator('h1').filter({ hasText: /Shop Drawings/i })
    this.pageSubtitle = page.locator('p').filter({ hasText: /Manage shop drawing/i })
    this.projectSelector = page.locator('select').filter({ hasText: /Select a project/i }).first()
    this.newShopDrawingButton = page.locator('button').filter({ hasText: /New Shop Drawing/i })

    // Statistics cards
    this.totalCard = page.locator('[class*="rounded"]').filter({ hasText: /^Total$/i })
    this.pendingReviewCard = page.locator('[class*="rounded"]').filter({ hasText: /Pending Review/i })
    this.approvedCard = page.locator('[class*="rounded"]').filter({ hasText: /^Approved$/i })
    this.criticalPathCard = page.locator('[class*="rounded"]').filter({ hasText: /Critical Path/i })
    this.overdueCard = page.locator('[class*="rounded"]').filter({ hasText: /^Overdue$/i })

    // View tabs
    this.listViewTab = page.locator('[role="tab"]').filter({ has: page.locator('svg[class*="list"]') }).first()
    this.statisticsViewTab = page.locator('[role="tab"]').filter({ has: page.locator('svg[class*="chart"]') }).first()

    // Filter controls
    this.statusFilter = page.locator('select#status-filter, [id="status-filter"]')
    this.disciplineFilter = page.locator('select#discipline-filter, [id="discipline-filter"]')
    this.priorityFilter = page.locator('select#priority-filter, [id="priority-filter"]')
    this.subcontractorFilter = page.locator('select#subcontractor-filter, [id="subcontractor-filter"]')
    this.longLeadOnlyCheckbox = page.locator('input#long-lead-filter, [id="long-lead-filter"]')
    this.overdueOnlyCheckbox = page.locator('input#overdue-filter, [id="overdue-filter"]')
    this.clearFiltersButton = page.locator('button').filter({ hasText: /Clear/i })
    this.resultsCount = page.locator('text=/\\d+\\s*shop drawing/i')

    // Shop drawings table
    this.shopDrawingsTable = page.locator('table').first()
    this.tableHeader = this.shopDrawingsTable.locator('thead')
    this.tableBody = this.shopDrawingsTable.locator('tbody')
    this.tableRows = this.tableBody.locator('tr')
    this.sortByDrawingNumber = this.tableHeader.locator('button').filter({ hasText: /Drawing|#/i })
    this.sortByTitle = this.tableHeader.locator('button').filter({ hasText: /Title/i })
    this.sortByDiscipline = this.tableHeader.locator('button').filter({ hasText: /Discipline/i })
    this.sortByStatus = this.tableHeader.locator('button').filter({ hasText: /Status/i })
    this.sortByPriority = this.tableHeader.locator('button').filter({ hasText: /Priority/i })
    this.sortByRequiredDate = this.tableHeader.locator('button').filter({ hasText: /Required/i })
    this.emptyState = page.locator('text=/No shop drawings found|No results/i')

    // Statistics view
    this.statusDistributionCard = page.locator('[class*="rounded"]').filter({ hasText: /Status Distribution/i })
    this.priorityDistributionCard = page.locator('[class*="rounded"]').filter({ hasText: /Priority Distribution/i })
    this.longLeadItemsCard = page.locator('[class*="rounded"]').filter({ hasText: /Long Lead Items/i })
    this.quickSummaryCard = page.locator('[class*="rounded"]').filter({ hasText: /Quick Summary/i })

    // Detail page header
    this.backButton = page.locator('button').filter({ has: page.locator('svg[class*="arrow-left"]') }).first()
    this.drawingTitle = page.locator('h1').first()
    this.statusBadge = page.locator('[class*="Badge"]').filter({ hasText: /submitted|approved|rejected|review/i }).first()
    this.priorityBadge = page.locator('[class*="Badge"]').filter({ hasText: /critical|standard|non/i }).first()
    this.longLeadIndicator = page.locator('span').filter({ hasText: /Long Lead/i })
    this.projectName = page.locator('span').filter({ has: page.locator('svg[class*="building"]') })
    this.specSection = page.locator('span').filter({ has: page.locator('svg[class*="file-text"]') })
    this.revisionLabel = page.locator('[class*="monospace"], [class*="font-mono"]').filter({ hasText: /Rev|Original/i })

    // Detail page main content
    this.descriptionSection = page.locator('h4').filter({ hasText: /Description/i }).locator('..')
    this.disciplineInfo = page.locator('h4').filter({ hasText: /Discipline/i }).locator('..')
    this.subcontractorInfo = page.locator('h4').filter({ hasText: /Subcontractor/i }).locator('..')
    this.submittedByInfo = page.locator('h4').filter({ hasText: /Submitted By/i }).locator('..')
    this.reviewerInfo = page.locator('h4').filter({ hasText: /Reviewer/i }).locator('..')
    this.reviewCommentsSection = page.locator('h4').filter({ hasText: /Review Comments/i }).locator('..')
    this.approvalCodeDisplay = page.locator('text=/Approval Code:/i')

    // Detail page tabs
    this.revisionsTab = page.locator('[role="tab"]').filter({ hasText: /Revisions/i })
    this.attachmentsTab = page.locator('[role="tab"]').filter({ hasText: /Attachments/i })
    this.historyTab = page.locator('[role="tab"]').filter({ hasText: /History/i })

    // Important dates
    this.createdDate = page.locator('text=/Created/i').locator('..')
    this.submittedDate = page.locator('text=/Submitted/i').locator('..')
    this.requiredDate = page.locator('text=/Required/i').locator('..')
    this.returnedDate = page.locator('text=/Returned/i').locator('..')
    this.daysInReview = page.locator('text=/Days in Review/i').locator('..')
    this.overdueIndicator = page.locator('text=/Overdue/i')

    // Review settings
    this.daysForReview = page.locator('text=/Days for Review/i').locator('..')
    this.ballInCourt = page.locator('text=/Ball in Court/i').locator('..')

    // Status transition
    this.statusTransitionCard = page.locator('[class*="Card"]').filter({ has: page.locator('button').filter({ hasText: /Submit|Approve|Reject/i }) })
    this.lockedStatusMessage = page.locator('text=/locked|approved/i').filter({ has: page.locator('svg[class*="lock"]') })
    this.statusActionButtons = page.locator('button').filter({ hasText: /Submit|Approve|Reject|Revise/i })
    this.statusDropdown = page.locator('[role="combobox"], select').filter({ hasText: /Status/i })

    // Status transition dialog
    this.statusTransitionDialog = page.locator('[role="dialog"]').filter({ hasText: /Confirm Status Change/i })
    this.transitionFromStatus = this.statusTransitionDialog.locator('text=/from/i').locator('..')
    this.transitionToStatus = this.statusTransitionDialog.locator('text=/to/i').locator('..')
    this.transitionApprovalCode = this.statusTransitionDialog.locator('text=/Approval Code/i')
    this.transitionWarning = this.statusTransitionDialog.locator('[class*="warning"], [class*="alert"]')
    this.transitionCommentsInput = this.statusTransitionDialog.locator('textarea#transition-comments, textarea')
    this.cancelTransitionButton = this.statusTransitionDialog.locator('button').filter({ hasText: /Cancel/i })
    this.confirmTransitionButton = this.statusTransitionDialog.locator('button').filter({ hasText: /Confirm/i })

    // Revision history
    this.revisionHistorySection = page.locator('[class*="Card"]').filter({ hasText: /Revision History/i })
    this.revisionTimeline = page.locator('[class*="timeline"], [class*="border-l"]')
    this.revisionItems = page.locator('[class*="revision-item"], [class*="timeline-item"]')
    this.newRevisionButton = page.locator('button').filter({ hasText: /New Revision/i })
    this.currentRevisionTag = page.locator('span, [class*="Badge"]').filter({ hasText: /Current/i })

    // Create revision dialog
    this.createRevisionDialog = page.locator('[role="dialog"]').filter({ hasText: /Create New Revision/i })
    this.revisionDescriptionInput = this.createRevisionDialog.locator('textarea#change-description, textarea')
    this.cancelRevisionButton = this.createRevisionDialog.locator('button').filter({ hasText: /Cancel/i })
    this.createRevisionConfirmButton = this.createRevisionDialog.locator('button').filter({ hasText: /Create Revision/i })

    // Create shop drawing dialog
    this.createDialog = page.locator('[role="dialog"]').filter({ hasText: /New Shop Drawing|Create Shop Drawing/i })
    this.titleInput = page.locator('input#title, input[name="title"]')
    this.disciplineSelect = page.locator('select#discipline, [id="discipline"]')
    this.descriptionTextarea = page.locator('textarea#description, textarea[name="description"]')
    this.specSectionPicker = page.locator('[class*="CSISpecPicker"], [class*="spec-section"]')
    this.prioritySelect = page.locator('select#priority, [id="priority"]')
    this.dateRequiredInput = page.locator('input#date-required, input[type="date"]')
    this.daysForReviewInput = page.locator('input#days-for-review, input[name="days_for_review"]')
    this.longLeadItemCheckbox = page.locator('input#long-lead-item, [id="long-lead-item"]')
    this.subcontractorSelect = page.locator('select#subcontractor, [id="subcontractor"]')
    this.reviewerSelect = page.locator('select#reviewer, [id="reviewer"]')
    this.cancelCreateButton = this.createDialog.locator('button').filter({ hasText: /Cancel/i })
    this.submitCreateButton = this.createDialog.locator('button').filter({ hasText: /Create/i })

    // Loading & states
    this.loadingSpinner = page.locator('.animate-spin, [role="progressbar"]')
    this.loadingSkeleton = page.locator('[class*="Skeleton"], [class*="animate-pulse"]')
    this.errorState = page.locator('[role="alert"], [class*="destructive"]')
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/shop-drawings')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoDetail(shopDrawingId: string): Promise<void> {
    await this.page.goto(`/shop-drawings/${shopDrawingId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async goBack(): Promise<void> {
    await this.backButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  // ============================================================================
  // List View Methods
  // ============================================================================

  async selectProject(projectName: string): Promise<void> {
    await this.projectSelector.selectOption({ label: projectName })
    await this.page.waitForTimeout(500)
  }

  async getShopDrawingCount(): Promise<number> {
    await this.page.waitForTimeout(300)
    return await this.tableRows.count()
  }

  async clickShopDrawingRow(index: number): Promise<void> {
    await this.tableRows.nth(index).click()
    await this.page.waitForLoadState('networkidle')
  }

  async getRowText(index: number): Promise<string> {
    return await this.tableRows.nth(index).innerText()
  }

  getTableRow(index: number): Locator {
    return this.tableRows.nth(index)
  }

  // ============================================================================
  // Filter Methods
  // ============================================================================

  async filterByStatus(status: ShopDrawingStatus | 'all'): Promise<void> {
    await this.statusFilter.selectOption(status === 'all' ? '' : status)
    await this.page.waitForTimeout(500)
  }

  async filterByDiscipline(discipline: ShopDrawingDiscipline | 'all'): Promise<void> {
    await this.disciplineFilter.selectOption(discipline === 'all' ? '' : discipline)
    await this.page.waitForTimeout(500)
  }

  async filterByPriority(priority: ShopDrawingPriority | 'all'): Promise<void> {
    await this.priorityFilter.selectOption(priority === 'all' ? '' : priority)
    await this.page.waitForTimeout(500)
  }

  async filterBySubcontractor(subcontractorName: string): Promise<void> {
    await this.subcontractorFilter.selectOption({ label: subcontractorName })
    await this.page.waitForTimeout(500)
  }

  async toggleLongLeadOnly(): Promise<void> {
    await this.longLeadOnlyCheckbox.click()
    await this.page.waitForTimeout(500)
  }

  async toggleOverdueOnly(): Promise<void> {
    await this.overdueOnlyCheckbox.click()
    await this.page.waitForTimeout(500)
  }

  async clearAllFilters(): Promise<void> {
    await this.clearFiltersButton.click()
    await this.page.waitForTimeout(500)
  }

  async isFilterActive(): Promise<boolean> {
    return await this.clearFiltersButton.isVisible()
  }

  // ============================================================================
  // Sort Methods
  // ============================================================================

  async sortByColumn(column: 'drawingNumber' | 'title' | 'discipline' | 'status' | 'priority' | 'requiredDate'): Promise<void> {
    const sortLocators = {
      drawingNumber: this.sortByDrawingNumber,
      title: this.sortByTitle,
      discipline: this.sortByDiscipline,
      status: this.sortByStatus,
      priority: this.sortByPriority,
      requiredDate: this.sortByRequiredDate,
    }
    await sortLocators[column].click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // View Toggle Methods
  // ============================================================================

  async switchToListView(): Promise<void> {
    await this.listViewTab.click()
    await this.page.waitForTimeout(300)
  }

  async switchToStatisticsView(): Promise<void> {
    await this.statisticsViewTab.click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // Create Shop Drawing Methods
  // ============================================================================

  async openCreateDialog(): Promise<void> {
    await this.newShopDrawingButton.click()
    await this.createDialog.waitFor({ state: 'visible', timeout: 5000 })
  }

  async fillCreateForm(data: {
    title: string
    discipline: ShopDrawingDiscipline
    description?: string
    specSection?: string
    priority?: ShopDrawingPriority
    dateRequired?: string
    daysForReview?: number
    longLeadItem?: boolean
    subcontractor?: string
    reviewer?: string
  }): Promise<void> {
    await this.titleInput.fill(data.title)
    await this.disciplineSelect.selectOption(data.discipline)

    if (data.description) {
      await this.descriptionTextarea.fill(data.description)
    }

    if (data.priority) {
      await this.prioritySelect.selectOption(data.priority)
    }

    if (data.dateRequired) {
      await this.dateRequiredInput.fill(data.dateRequired)
    }

    if (data.daysForReview) {
      await this.daysForReviewInput.fill(data.daysForReview.toString())
    }

    if (data.longLeadItem) {
      await this.longLeadItemCheckbox.click()
    }

    if (data.subcontractor) {
      await this.subcontractorSelect.selectOption({ label: data.subcontractor })
    }

    if (data.reviewer) {
      await this.reviewerSelect.selectOption({ label: data.reviewer })
    }
  }

  async submitCreate(): Promise<void> {
    await this.submitCreateButton.click()
    await this.page.waitForTimeout(1000)
  }

  async cancelCreate(): Promise<void> {
    await this.cancelCreateButton.click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // Status Transition Methods
  // ============================================================================

  async clickStatusAction(action: string): Promise<void> {
    const button = this.page.locator('button').filter({ hasText: new RegExp(action, 'i') })
    await button.click()
    await this.page.waitForTimeout(300)
  }

  async confirmStatusTransition(comments?: string): Promise<void> {
    await this.statusTransitionDialog.waitFor({ state: 'visible', timeout: 5000 })

    if (comments) {
      await this.transitionCommentsInput.fill(comments)
    }

    await this.confirmTransitionButton.click()
    await this.page.waitForTimeout(1000)
  }

  async cancelStatusTransition(): Promise<void> {
    await this.cancelTransitionButton.click()
    await this.page.waitForTimeout(300)
  }

  async getCurrentStatus(): Promise<string> {
    return await this.statusBadge.innerText()
  }

  async isStatusLocked(): Promise<boolean> {
    return await this.lockedStatusMessage.isVisible()
  }

  // ============================================================================
  // Revision Methods
  // ============================================================================

  async selectRevisionsTab(): Promise<void> {
    await this.revisionsTab.click()
    await this.page.waitForTimeout(300)
  }

  async getRevisionCount(): Promise<number> {
    await this.page.waitForTimeout(300)
    return await this.revisionItems.count()
  }

  async openCreateRevisionDialog(): Promise<void> {
    await this.newRevisionButton.click()
    await this.createRevisionDialog.waitFor({ state: 'visible', timeout: 5000 })
  }

  async createRevision(changeDescription?: string): Promise<void> {
    if (changeDescription) {
      await this.revisionDescriptionInput.fill(changeDescription)
    }
    await this.createRevisionConfirmButton.click()
    await this.page.waitForTimeout(1000)
  }

  async cancelCreateRevision(): Promise<void> {
    await this.cancelRevisionButton.click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // Detail Page Methods
  // ============================================================================

  async getDrawingNumber(): Promise<string> {
    return await this.drawingTitle.innerText()
  }

  async getDescription(): Promise<string> {
    const descSection = await this.descriptionSection.locator('p').innerText()
    return descSection
  }

  async getDiscipline(): Promise<string> {
    return await this.disciplineInfo.locator('[class*="Badge"]').innerText()
  }

  async getSubcontractor(): Promise<string> {
    return await this.subcontractorInfo.locator('p').innerText()
  }

  async getRequiredDate(): Promise<string> {
    return await this.requiredDate.innerText()
  }

  async isOverdue(): Promise<boolean> {
    return await this.overdueIndicator.isVisible()
  }

  async isLongLeadItem(): Promise<boolean> {
    return await this.longLeadIndicator.isVisible()
  }

  // ============================================================================
  // Statistics Methods
  // ============================================================================

  async getTotalCount(): Promise<number> {
    const text = await this.totalCard.innerText()
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  async getPendingReviewCount(): Promise<number> {
    const text = await this.pendingReviewCard.innerText()
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  async getApprovedCount(): Promise<number> {
    const text = await this.approvedCard.innerText()
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  async getOverdueCount(): Promise<number> {
    const text = await this.overdueCard.innerText()
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  async expectListPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 })
  }

  async expectDetailPageLoaded(): Promise<void> {
    await expect(this.drawingTitle).toBeVisible({ timeout: 10000 })
  }

  async expectCreateDialogVisible(): Promise<void> {
    await expect(this.createDialog).toBeVisible({ timeout: 5000 })
  }

  async expectCreateDialogHidden(): Promise<void> {
    await expect(this.createDialog).not.toBeVisible({ timeout: 3000 })
  }

  async expectStatusTransitionDialogVisible(): Promise<void> {
    await expect(this.statusTransitionDialog).toBeVisible({ timeout: 5000 })
  }

  async expectStatusTransitionDialogHidden(): Promise<void> {
    await expect(this.statusTransitionDialog).not.toBeVisible({ timeout: 3000 })
  }

  async expectStatus(status: ShopDrawingStatus): Promise<void> {
    await expect(this.statusBadge).toContainText(status.replace('_', ' '), { ignoreCase: true })
  }

  async expectLockedStatus(): Promise<void> {
    await expect(this.lockedStatusMessage).toBeVisible()
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

  async expectTableVisible(): Promise<void> {
    await expect(this.shopDrawingsTable).toBeVisible({ timeout: 5000 })
  }

  async expectStatisticsVisible(): Promise<void> {
    await expect(this.statusDistributionCard).toBeVisible({ timeout: 5000 })
  }

  async expectRevisionHistoryVisible(): Promise<void> {
    await expect(this.revisionHistorySection).toBeVisible({ timeout: 5000 })
  }

  async expectCurrentRevisionMarked(): Promise<void> {
    await expect(this.currentRevisionTag).toBeVisible()
  }

  async expectSuccessToast(): Promise<void> {
    const toast = this.page.locator('[role="alert"], [data-testid="toast"]').filter({ hasText: /success/i })
    await expect(toast.first()).toBeVisible({ timeout: 5000 })
  }

  async expectErrorToast(): Promise<void> {
    const toast = this.page.locator('[role="alert"], [data-testid="toast"]').filter({ hasText: /error|failed/i })
    await expect(toast.first()).toBeVisible({ timeout: 5000 })
  }

  async expectWarningInTransitionDialog(): Promise<void> {
    await expect(this.transitionWarning).toBeVisible()
  }

  async expectApprovalCode(code: 'A' | 'B' | 'C' | 'D'): Promise<void> {
    await expect(this.approvalCodeDisplay).toContainText(code)
  }
}
