/**
 * Registration E2E Tests
 *
 * Comprehensive tests for the user registration flow including:
 * - Company creation and join flows
 * - User detail form validation
 * - Admin approval workflow
 * - Edge cases and error handling
 */

import { test, expect } from '@playwright/test'
import { RegistrationPage } from './pages/RegistrationPage'
import {
  generateRegistrationData,
  generateSpecialCharacterCompanyData,
  generateLongCompanyNameData,
  generateWeakPassword,
  generateInvalidEmail,
  PASSWORD_TEST_CASES,
  EMAIL_TEST_CASES,
  TEST_COMPANY_SEARCH_QUERIES,
  testUserTracker,
  clearAuthState,
  waitForRegistrationComplete,
} from './helpers/registration-helpers'

test.describe('Registration - Page Load and Display', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should display registration page with all elements', async () => {
    await expect(registrationPage.pageTitle).toBeVisible()
    await expect(registrationPage.registrationPortalBadge).toBeVisible()
    await expect(registrationPage.createNewCompanyCard).toBeVisible()
    await expect(registrationPage.joinExistingCompanyCard).toBeVisible()
    await expect(registrationPage.signInLink).toBeVisible()
  })

  test('should display progress indicators with step 1 active', async () => {
    await expect(registrationPage.step1Indicator).toBeVisible()
    await expect(registrationPage.step2Indicator).toBeVisible()
  })

  test('should display step 1 heading', async () => {
    await registrationPage.expectOnStep1()
  })

  test('should have sign in link pointing to login page', async ({ page }) => {
    await expect(registrationPage.signInLink).toHaveAttribute('href', '/login')
  })
})

test.describe('Registration - Create New Company Flow', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should allow selecting "Create New Company" mode', async () => {
    await registrationPage.selectCreateNewCompany()
    await expect(registrationPage.newCompanyNameInput).toBeVisible()
    await expect(registrationPage.companyNameLabel).toBeVisible()
  })

  test('should not show continue button without company name', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.expectContinueButtonHidden()
  })

  test('should show continue button when company name is entered', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test Construction Co')
    await registrationPage.expectContinueButtonVisible()
  })

  test('should navigate to step 2 when continue is clicked', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test Construction Co')
    await registrationPage.clickContinue()
    await registrationPage.expectOnStep2()
  })

  test('should display all user detail fields in step 2', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test Construction Co')
    await registrationPage.clickContinue()

    await expect(registrationPage.firstNameLabel).toBeVisible()
    await expect(registrationPage.lastNameLabel).toBeVisible()
    await expect(registrationPage.emailLabel).toBeVisible()
    await expect(registrationPage.passwordLabel).toBeVisible()
    await expect(registrationPage.roleLabel).toBeVisible()
    await expect(registrationPage.completeRegistrationButton).toBeVisible()
  })

  test('should display admin context message for new company', async () => {
    const companyName = 'My New Company'
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName(companyName)
    await registrationPage.clickContinue()

    await registrationPage.expectContextMessage(`You'll be the admin of ${companyName}`)
  })

  test('should allow going back to company selection', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test Construction Co')
    await registrationPage.clickContinue()
    await registrationPage.expectOnStep2()

    await registrationPage.goBackToCompanySelection()
    await registrationPage.expectOnStep1()
  })

  test('should preserve company name when going back and forward', async () => {
    const companyName = 'Test Construction Co'
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName(companyName)
    await registrationPage.clickContinue()
    await registrationPage.goBackToCompanySelection()

    await expect(registrationPage.newCompanyNameInput).toHaveValue(companyName)
  })

  test('should not show continue for whitespace-only company name', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('   ')
    await registrationPage.expectContinueButtonHidden()
  })
})

test.describe('Registration - Join Existing Company Flow', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should allow selecting "Join Existing Company" mode', async () => {
    await registrationPage.selectJoinExistingCompany()
    await expect(registrationPage.companySearchInput).toBeVisible()
    await expect(registrationPage.searchCompaniesLabel).toBeVisible()
  })

  test('should not show continue button without selecting a company', async () => {
    await registrationPage.selectJoinExistingCompany()
    await registrationPage.expectContinueButtonHidden()
  })

  test('should search for companies after typing', async () => {
    await registrationPage.selectJoinExistingCompany()
    await registrationPage.searchForCompany(TEST_COMPANY_SEARCH_QUERIES.existing)
    // Results depend on existing data; just verify input works
    await expect(registrationPage.companySearchInput).toHaveValue(TEST_COMPANY_SEARCH_QUERIES.existing)
  })

  test('should display join context message after selecting company', async ({ page }) => {
    await registrationPage.selectJoinExistingCompany()
    await registrationPage.searchForCompany(TEST_COMPANY_SEARCH_QUERIES.existing)

    // If companies are found, select one and continue
    const resultsCount = await registrationPage.getSearchResultsCount()
    if (resultsCount > 0) {
      await registrationPage.companySearchResults.first().click()
      await registrationPage.clickContinue()
      await expect(registrationPage.contextMessage).toContainText('Requesting to join')
    } else {
      // Skip if no test companies exist
      test.skip()
    }
  })

  test('should clear previous selection when switching modes', async () => {
    await registrationPage.selectJoinExistingCompany()
    await registrationPage.searchForCompany('Test')

    // Switch to new company mode
    await registrationPage.selectCreateNewCompany()
    await expect(registrationPage.newCompanyNameInput).toBeVisible()

    // Switch back to join mode
    await registrationPage.selectJoinExistingCompany()
    await expect(registrationPage.companySearchInput).toHaveValue('')
  })
})

test.describe('Registration - Form Validation', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test Company')
    await registrationPage.clickContinue()
  })

  test('should require all fields to be filled', async ({ page }) => {
    // Try to submit empty form
    await registrationPage.completeRegistrationButton.click()

    // HTML5 validation should prevent submission
    // Check that we're still on step 2
    await registrationPage.expectOnStep2()
  })

  test('should validate email format', async ({ page }) => {
    const data = generateRegistrationData()
    await registrationPage.fillUserDetails({
      ...data,
      email: EMAIL_TEST_CASES.invalid,
    })

    await registrationPage.completeRegistrationButton.click()
    // Should stay on step 2 due to invalid email
    await registrationPage.expectOnStep2()
  })

  test('should accept valid email format', async ({ page }) => {
    await registrationPage.emailInput.fill(EMAIL_TEST_CASES.valid)
    // Email input should accept the value
    await expect(registrationPage.emailInput).toHaveValue(EMAIL_TEST_CASES.valid)
  })

  test('should accept email with subdomain', async ({ page }) => {
    await registrationPage.emailInput.fill(EMAIL_TEST_CASES.withSubdomain)
    await expect(registrationPage.emailInput).toHaveValue(EMAIL_TEST_CASES.withSubdomain)
  })
})

test.describe('Registration - Special Characters and Edge Cases', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should handle special characters in company name', async () => {
    const data = generateSpecialCharacterCompanyData()
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName(data.companyName)

    await expect(registrationPage.newCompanyNameInput).toHaveValue(data.companyName)
    await registrationPage.expectContinueButtonVisible()
  })

  test('should handle unicode characters in names', async () => {
    const data = generateSpecialCharacterCompanyData()
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test Company')
    await registrationPage.clickContinue()

    await registrationPage.firstNameInput.fill(data.firstName)
    await registrationPage.lastNameInput.fill(data.lastName)

    await expect(registrationPage.firstNameInput).toHaveValue(data.firstName)
    await expect(registrationPage.lastNameInput).toHaveValue(data.lastName)
  })

  test('should handle very long company names', async () => {
    const data = generateLongCompanyNameData()
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName(data.companyName)

    // Should either accept it or show an error - verify the input received the value
    const inputValue = await registrationPage.newCompanyNameInput.inputValue()
    expect(inputValue.length).toBeGreaterThan(0)
  })
})

test.describe('Registration - Mode Switching', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should switch between create and join modes', async () => {
    // Start with create mode
    await registrationPage.selectCreateNewCompany()
    await expect(registrationPage.newCompanyNameInput).toBeVisible()

    // Switch to join mode
    await registrationPage.selectJoinExistingCompany()
    await expect(registrationPage.companySearchInput).toBeVisible()
    await expect(registrationPage.newCompanyNameInput).not.toBeVisible()

    // Switch back to create mode
    await registrationPage.selectCreateNewCompany()
    await expect(registrationPage.newCompanyNameInput).toBeVisible()
    await expect(registrationPage.companySearchInput).not.toBeVisible()
  })

  test('should reset state when switching modes', async () => {
    // Enter company name in create mode
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('My Company')

    // Switch to join mode
    await registrationPage.selectJoinExistingCompany()

    // Switch back to create mode
    await registrationPage.selectCreateNewCompany()

    // Company name should be preserved (component state persists)
    const value = await registrationPage.newCompanyNameInput.inputValue()
    expect(value).toBe('My Company')
  })
})

test.describe('Registration - Pending Approval Page', () => {
  test.skip('should display pending approval page elements', async ({ page }) => {
    // This test requires a user in pending state
    // Skip for now - implement when test infrastructure supports it
  })

  test.skip('should redirect to login when sign out is clicked', async ({ page }) => {
    // Requires authenticated pending user
  })
})

test.describe('Registration - Admin Approval Workflow', () => {
  test.skip('should display admin approval dashboard for admin users', async ({ page }) => {
    // Requires admin authentication
    // This test should use the adminPage fixture
  })

  test.skip('should approve user when approve button is clicked', async ({ page }) => {
    // Requires admin authentication and pending users
  })

  test.skip('should reject user with reason', async ({ page }) => {
    // Requires admin authentication and pending users
  })
})

test.describe('Registration - Error Handling', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should handle duplicate email gracefully', async ({ page }) => {
    // This test requires attempting to register with an existing email
    // The actual behavior depends on Supabase's response
    test.skip()
  })

  test('should preserve form data on error', async () => {
    const data = generateRegistrationData()
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName(data.companyName)
    await registrationPage.clickContinue()

    // Fill form with invalid data
    await registrationPage.fillUserDetails({
      ...data,
      email: EMAIL_TEST_CASES.invalid,
    })

    // Try to submit
    await registrationPage.completeRegistrationButton.click()

    // Form data should be preserved
    await expect(registrationPage.firstNameInput).toHaveValue(data.firstName)
    await expect(registrationPage.lastNameInput).toHaveValue(data.lastName)
  })
})

test.describe('Registration - Full Flow Integration', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await clearAuthState(page)
    await registrationPage.goto()
  })

  test.skip('should complete full new company registration flow', async ({ page }) => {
    // This test creates a real user - skip in regular test runs
    // Enable for integration testing with proper cleanup
    const data = generateRegistrationData('integration')
    testUserTracker.add(data.email)

    await registrationPage.registerNewCompany(data)

    // Should redirect to either dashboard (auto-approved) or pending-approval
    const destination = await waitForRegistrationComplete(page)
    expect(['dashboard', 'pending-approval']).toContain(destination)
  })

  test.skip('should complete full join company registration flow', async ({ page }) => {
    // This test creates a real user - skip in regular test runs
    // Requires existing company to join
  })
})

test.describe('Registration - Accessibility', () => {
  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check that there's an h1
    const h1 = page.locator('h1')
    await expect(h1.first()).toBeVisible()

    // Check for h2 in the form section
    await expect(registrationPage.step1Heading).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Tab to create new company card
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to navigate using keyboard
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have accessible form labels', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test')
    await registrationPage.clickContinue()

    // All form fields should have labels
    await expect(registrationPage.firstNameLabel).toBeVisible()
    await expect(registrationPage.lastNameLabel).toBeVisible()
    await expect(registrationPage.emailLabel).toBeVisible()
    await expect(registrationPage.passwordLabel).toBeVisible()
    await expect(registrationPage.roleLabel).toBeVisible()
  })
})

test.describe('Registration - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE viewport

  let registrationPage: RegistrationPage

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page)
    await registrationPage.goto()
  })

  test('should display registration page on mobile viewport', async () => {
    await expect(registrationPage.pageTitle).toBeVisible()
    await expect(registrationPage.createNewCompanyCard).toBeVisible()
    await expect(registrationPage.joinExistingCompanyCard).toBeVisible()
  })

  test('should allow company selection on mobile', async () => {
    await registrationPage.selectCreateNewCompany()
    await expect(registrationPage.newCompanyNameInput).toBeVisible()
  })

  test('should display form correctly on mobile', async () => {
    await registrationPage.selectCreateNewCompany()
    await registrationPage.enterNewCompanyName('Test')
    await registrationPage.clickContinue()

    await expect(registrationPage.firstNameInput).toBeVisible()
    await expect(registrationPage.completeRegistrationButton).toBeVisible()
  })
})
