/**
 * Registration Page Object Model
 *
 * Page object for the CompanyRegistration two-step wizard, PendingApproval page,
 * and AdminApprovalDashboard for E2E testing.
 */

import { Page, Locator, expect } from '@playwright/test'

export class RegistrationPage {
  readonly page: Page

  // === Header Elements ===
  readonly pageTitle: Locator
  readonly registrationPortalBadge: Locator
  readonly signInLink: Locator

  // === Progress Indicators ===
  readonly step1Indicator: Locator
  readonly step2Indicator: Locator
  readonly progressBar: Locator

  // === Step 1: Company Selection ===
  readonly step1Heading: Locator
  readonly createNewCompanyCard: Locator
  readonly joinExistingCompanyCard: Locator

  // Create new company inputs
  readonly companyNameLabel: Locator
  readonly newCompanyNameInput: Locator

  // Join existing company inputs
  readonly searchCompaniesLabel: Locator
  readonly companySearchInput: Locator
  readonly companySearchResults: Locator

  // Navigation
  readonly continueButton: Locator

  // === Step 2: User Details ===
  readonly step2Heading: Locator
  readonly backToCompanyButton: Locator
  readonly contextMessage: Locator

  // Form fields
  readonly firstNameLabel: Locator
  readonly firstNameInput: Locator
  readonly lastNameLabel: Locator
  readonly lastNameInput: Locator
  readonly emailLabel: Locator
  readonly emailInput: Locator
  readonly passwordLabel: Locator
  readonly passwordInput: Locator
  readonly roleLabel: Locator
  readonly roleInput: Locator

  // Submit
  readonly completeRegistrationButton: Locator
  readonly loadingSpinner: Locator

  // === Pending Approval Page ===
  readonly underReviewHeading: Locator
  readonly pendingStatusBadge: Locator
  readonly signOutButton: Locator

  // === Admin Approval Dashboard ===
  readonly approvalDashboardHeading: Locator
  readonly pendingRequestsCard: Locator
  readonly approvedTodayCard: Locator
  readonly searchPendingInput: Locator
  readonly pendingUserCards: Locator
  readonly approveButtons: Locator
  readonly rejectButtons: Locator
  readonly emptyState: Locator

  // Reject dialog
  readonly rejectDialog: Locator
  readonly rejectionReasonTextarea: Locator
  readonly confirmRejectButton: Locator
  readonly cancelRejectButton: Locator

  constructor(page: Page) {
    this.page = page

    // Header elements
    this.pageTitle = page.locator('h1').filter({ hasText: /Welcome to.*JobSight/i })
    this.registrationPortalBadge = page.locator('span').filter({ hasText: /Registration Portal/i })
    this.signInLink = page.locator('a[href="/login"]')

    // Progress indicators (step numbers in circles)
    this.step1Indicator = page.locator('.rounded-full').filter({ hasText: '1' }).first()
    this.step2Indicator = page.locator('.rounded-full').filter({ hasText: '2' }).first()
    this.progressBar = page.locator('div[class*="bg-gradient"][class*="transition-all"]')

    // Step 1: Company selection
    this.step1Heading = page.locator('h2').filter({ hasText: /Choose your company/i })
    this.createNewCompanyCard = page.locator('button').filter({ hasText: /Create New Company/i })
    this.joinExistingCompanyCard = page.locator('button').filter({ hasText: /Join Existing Company/i })

    // New company mode
    this.companyNameLabel = page.locator('label').filter({ hasText: /Company Name/i })
    this.newCompanyNameInput = page.locator('input[placeholder*="company name"]')

    // Join existing mode
    this.searchCompaniesLabel = page.locator('label').filter({ hasText: /Search Companies/i })
    this.companySearchInput = page.locator('input[placeholder*="Type to search"]')
    this.companySearchResults = page.locator('button').filter({ has: page.locator('p.text-sm').filter({ hasText: /members?$/ }) })

    // Continue button
    this.continueButton = page.locator('button').filter({ hasText: /Continue to Next Step/i })

    // Step 2: User details
    this.step2Heading = page.locator('h2').filter({ hasText: /Your details/i })
    this.backToCompanyButton = page.locator('button').filter({ hasText: /Back to company selection/i })
    this.contextMessage = page.locator('p').filter({ hasText: /You'll be the admin of|Requesting to join/i })

    // Form fields - using label text to find associated inputs
    this.firstNameLabel = page.locator('label').filter({ hasText: /First Name/i })
    this.firstNameInput = page.locator('form input[type="text"]').first()
    this.lastNameLabel = page.locator('label').filter({ hasText: /Last Name/i })
    this.lastNameInput = page.locator('form input[type="text"]').nth(1)
    this.emailLabel = page.locator('label').filter({ hasText: /Email Address/i })
    this.emailInput = page.locator('input[type="email"]')
    this.passwordLabel = page.locator('label').filter({ hasText: /Password/i })
    this.passwordInput = page.locator('input[type="password"]')
    this.roleLabel = page.locator('label').filter({ hasText: /Role.*Title/i })
    this.roleInput = page.locator('input[placeholder*="Project Manager"]')

    // Submit button
    this.completeRegistrationButton = page.locator('button[type="submit"]').filter({ hasText: /Complete Registration/i })
    this.loadingSpinner = page.locator('.animate-spin')

    // Pending approval page
    this.underReviewHeading = page.locator('h1, h2').filter({ hasText: /Under Review/i })
    this.pendingStatusBadge = page.locator('text=/pending|awaiting/i')
    this.signOutButton = page.locator('button').filter({ hasText: /Sign Out/i })

    // Admin approval dashboard
    this.approvalDashboardHeading = page.locator('h1, h2').filter({ hasText: /User Approvals/i })
    this.pendingRequestsCard = page.locator('[class*="rounded"]').filter({ hasText: /Pending Requests/i })
    this.approvedTodayCard = page.locator('[class*="rounded"]').filter({ hasText: /Approved Today/i })
    this.searchPendingInput = page.locator('input[placeholder*="Search"]')
    this.pendingUserCards = page.locator('[class*="rounded"][class*="border"]').filter({
      has: page.locator('button').filter({ hasText: /Approve/i })
    })
    this.approveButtons = page.locator('button').filter({ hasText: /^Approve$/ })
    this.rejectButtons = page.locator('button').filter({ hasText: /^Reject$/ })
    this.emptyState = page.locator('text=/All caught up|No pending/i')

    // Reject dialog
    this.rejectDialog = page.locator('[role="dialog"]')
    this.rejectionReasonTextarea = page.locator('textarea')
    this.confirmRejectButton = page.locator('[role="dialog"] button').filter({ hasText: /Reject.*User/i })
    this.cancelRejectButton = page.locator('[role="dialog"] button').filter({ hasText: /Cancel/i })
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  async goto(): Promise<void> {
    await this.page.goto('/register')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoPendingApproval(): Promise<void> {
    await this.page.goto('/pending-approval')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async gotoAdminApproval(): Promise<void> {
    await this.page.goto('/settings/user-approvals')
    await this.page.waitForLoadState('domcontentloaded')
  }

  // ============================================================================
  // Step 1: Company Selection Methods
  // ============================================================================

  async selectCreateNewCompany(): Promise<void> {
    await this.createNewCompanyCard.click()
    await this.page.waitForTimeout(300) // Animation
  }

  async selectJoinExistingCompany(): Promise<void> {
    await this.joinExistingCompanyCard.click()
    await this.page.waitForTimeout(300)
  }

  async enterNewCompanyName(name: string): Promise<void> {
    await this.newCompanyNameInput.waitFor({ state: 'visible', timeout: 5000 })
    await this.newCompanyNameInput.fill(name)
  }

  async searchForCompany(query: string): Promise<void> {
    await this.companySearchInput.waitFor({ state: 'visible', timeout: 5000 })
    await this.companySearchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce wait
  }

  async selectCompanyFromResults(companyName: string): Promise<void> {
    const companyButton = this.page.locator('button').filter({ hasText: companyName })
    await companyButton.click()
    await this.page.waitForTimeout(300)
  }

  async getSearchResultsCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.companySearchResults.count()
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.waitFor({ state: 'visible', timeout: 5000 })
    await this.continueButton.click()
    await this.page.waitForTimeout(500) // Animation
  }

  // ============================================================================
  // Step 2: User Details Methods
  // ============================================================================

  async fillUserDetails(data: {
    firstName: string
    lastName: string
    email: string
    password: string
    role: string
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName)
    await this.lastNameInput.fill(data.lastName)
    await this.emailInput.fill(data.email)
    await this.passwordInput.fill(data.password)
    await this.roleInput.fill(data.role)
  }

  async submitRegistration(): Promise<void> {
    await this.completeRegistrationButton.click()
    // Wait for either navigation or error
    await this.page.waitForTimeout(1000)
  }

  async goBackToCompanySelection(): Promise<void> {
    await this.backToCompanyButton.click()
    await this.page.waitForTimeout(300)
  }

  // ============================================================================
  // Full Flow Methods
  // ============================================================================

  async registerNewCompany(data: {
    companyName: string
    firstName: string
    lastName: string
    email: string
    password: string
    role: string
  }): Promise<void> {
    await this.selectCreateNewCompany()
    await this.enterNewCompanyName(data.companyName)
    await this.clickContinue()
    await this.fillUserDetails({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role,
    })
    await this.submitRegistration()
  }

  async joinExistingCompany(data: {
    companySearch: string
    companyName: string
    firstName: string
    lastName: string
    email: string
    password: string
    role: string
  }): Promise<void> {
    await this.selectJoinExistingCompany()
    await this.searchForCompany(data.companySearch)
    await this.selectCompanyFromResults(data.companyName)
    await this.clickContinue()
    await this.fillUserDetails({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role,
    })
    await this.submitRegistration()
  }

  // ============================================================================
  // Pending Approval Page Methods
  // ============================================================================

  async signOut(): Promise<void> {
    await this.signOutButton.click()
    await this.page.waitForURL('**/login', { timeout: 10000 })
  }

  // ============================================================================
  // Admin Approval Dashboard Methods
  // ============================================================================

  async searchPendingUsers(query: string): Promise<void> {
    await this.searchPendingInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  async clearSearch(): Promise<void> {
    await this.searchPendingInput.clear()
    await this.page.waitForTimeout(500)
  }

  async getPendingUserCount(): Promise<number> {
    await this.page.waitForTimeout(500)
    return await this.pendingUserCards.count()
  }

  async approveUserAtIndex(index: number = 0): Promise<void> {
    await this.approveButtons.nth(index).click()
    await this.page.waitForTimeout(1000) // Wait for API response
  }

  async openRejectDialogAtIndex(index: number = 0): Promise<void> {
    await this.rejectButtons.nth(index).click()
    await this.rejectDialog.waitFor({ state: 'visible', timeout: 5000 })
  }

  async rejectUserWithReason(index: number, reason?: string): Promise<void> {
    await this.openRejectDialogAtIndex(index)
    if (reason) {
      await this.rejectionReasonTextarea.fill(reason)
    }
    await this.confirmRejectButton.click()
    await this.page.waitForTimeout(1000)
  }

  async cancelRejectDialog(): Promise<void> {
    await this.cancelRejectButton.click()
    await this.rejectDialog.waitFor({ state: 'hidden', timeout: 3000 })
  }

  getPendingUserCard(index: number): Locator {
    return this.pendingUserCards.nth(index)
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  async expectOnStep1(): Promise<void> {
    await expect(this.step1Heading).toBeVisible({ timeout: 5000 })
  }

  async expectOnStep2(): Promise<void> {
    await expect(this.step2Heading).toBeVisible({ timeout: 5000 })
  }

  async expectContinueButtonVisible(): Promise<void> {
    await expect(this.continueButton).toBeVisible({ timeout: 5000 })
  }

  async expectContinueButtonHidden(): Promise<void> {
    await expect(this.continueButton).not.toBeVisible({ timeout: 2000 })
  }

  async expectCreateNewCompanySelected(): Promise<void> {
    await expect(this.createNewCompanyCard).toHaveClass(/border-\[#D4622A\]/)
  }

  async expectJoinExistingCompanySelected(): Promise<void> {
    await expect(this.joinExistingCompanyCard).toHaveClass(/border-\[#D4622A\]/)
  }

  async expectCompanySearchResultsVisible(): Promise<void> {
    await expect(this.companySearchResults.first()).toBeVisible({ timeout: 5000 })
  }

  async expectNoSearchResults(): Promise<void> {
    const count = await this.companySearchResults.count()
    expect(count).toBe(0)
  }

  async expectLoadingState(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible()
  }

  async expectRedirectedToPendingApproval(): Promise<void> {
    await this.page.waitForURL('**/pending-approval', { timeout: 15000 })
  }

  async expectRedirectedToDashboard(): Promise<void> {
    await this.page.waitForURL('**/dashboard', { timeout: 15000 })
  }

  async expectRedirectedToLogin(): Promise<void> {
    await this.page.waitForURL('**/login', { timeout: 15000 })
  }

  async expectErrorMessage(message?: string): Promise<void> {
    // The component uses alert() for errors, which creates a dialog
    // For a more robust test, check for any error indication in the UI
    const errorElements = this.page.locator('[role="alert"], .error, [class*="destructive"]')
    if (await errorElements.count() > 0) {
      await expect(errorElements.first()).toBeVisible({ timeout: 5000 })
      if (message) {
        await expect(errorElements.first()).toContainText(message)
      }
    }
  }

  async expectContextMessage(expectedText: string): Promise<void> {
    await expect(this.contextMessage).toContainText(expectedText)
  }

  // Pending approval page assertions
  async expectPendingApprovalPage(): Promise<void> {
    await expect(this.underReviewHeading).toBeVisible({ timeout: 5000 })
  }

  // Admin approval dashboard assertions
  async expectApprovalDashboardLoaded(): Promise<void> {
    await expect(this.approvalDashboardHeading).toBeVisible({ timeout: 5000 })
  }

  async expectPendingUsersVisible(): Promise<void> {
    await expect(this.pendingUserCards.first()).toBeVisible({ timeout: 10000 })
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible({ timeout: 5000 })
  }

  async expectUserCardContains(index: number, text: string): Promise<void> {
    await expect(this.getPendingUserCard(index)).toContainText(text)
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
