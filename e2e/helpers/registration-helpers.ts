/**
 * Registration Test Helpers
 *
 * Utility functions for registration E2E tests including test data generation,
 * cleanup utilities, and common registration flows.
 */

import { Page } from '@playwright/test'

export interface TestRegistrationData {
  companyName: string
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
}

/**
 * Generate unique registration test data with timestamp to ensure uniqueness
 */
export function generateRegistrationData(prefix: string = 'test'): TestRegistrationData {
  const timestamp = Date.now()
  return {
    companyName: `${prefix} Company ${timestamp}`,
    firstName: 'Test',
    lastName: `User ${timestamp}`,
    email: `${prefix}-${timestamp}@e2e.test.local`,
    password: 'TestPassword123!',
    role: 'Project Manager',
  }
}

/**
 * Generate registration data with a specific email domain
 */
export function generateRegistrationDataWithDomain(domain: string): TestRegistrationData {
  const timestamp = Date.now()
  return {
    companyName: `Test Company ${timestamp}`,
    firstName: 'Test',
    lastName: `User ${timestamp}`,
    email: `test-${timestamp}@${domain}`,
    password: 'TestPassword123!',
    role: 'Superintendent',
  }
}

/**
 * Generate registration data with custom overrides
 */
export function generateCustomRegistrationData(
  overrides: Partial<TestRegistrationData> = {}
): TestRegistrationData {
  const timestamp = Date.now()
  const base: TestRegistrationData = {
    companyName: `Test Company ${timestamp}`,
    firstName: 'Test',
    lastName: `User ${timestamp}`,
    email: `test-${timestamp}@e2e.test.local`,
    password: 'TestPassword123!',
    role: 'Project Manager',
  }
  return { ...base, ...overrides }
}

/**
 * Generate a weak password for validation testing
 */
export function generateWeakPassword(): string {
  return '123'
}

/**
 * Generate an invalid email for validation testing
 */
export function generateInvalidEmail(): string {
  return 'invalid-email-format'
}

/**
 * Generate test data with special characters in company name
 */
export function generateSpecialCharacterCompanyData(): TestRegistrationData {
  const timestamp = Date.now()
  return {
    companyName: `O'Brien & Associates, LLC ${timestamp}`,
    firstName: 'José',
    lastName: `García ${timestamp}`,
    email: `special-${timestamp}@e2e.test.local`,
    password: 'TestPassword123!',
    role: 'Project Manager',
  }
}

/**
 * Generate test data with very long company name
 */
export function generateLongCompanyNameData(): TestRegistrationData {
  const timestamp = Date.now()
  const longName = 'A'.repeat(200) + ` ${timestamp}`
  return {
    companyName: longName,
    firstName: 'Test',
    lastName: `User ${timestamp}`,
    email: `long-${timestamp}@e2e.test.local`,
    password: 'TestPassword123!',
    role: 'Project Manager',
  }
}

/**
 * Wait for registration to complete (redirects to either dashboard or pending-approval)
 */
export async function waitForRegistrationComplete(page: Page): Promise<'dashboard' | 'pending-approval'> {
  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 15000 }),
    page.waitForURL('**/pending-approval', { timeout: 15000 }),
  ])

  if (page.url().includes('pending-approval')) {
    return 'pending-approval'
  }
  return 'dashboard'
}

/**
 * Check if user is in pending approval state
 */
export async function isUserPendingApproval(page: Page): Promise<boolean> {
  return page.url().includes('pending-approval')
}

/**
 * Clear auth state to start fresh
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    // Clear cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
    })
  })
}

/**
 * Track created test users for cleanup
 */
export class TestUserTracker {
  private createdEmails: string[] = []

  add(email: string): void {
    this.createdEmails.push(email)
  }

  getAll(): string[] {
    return [...this.createdEmails]
  }

  clear(): void {
    this.createdEmails = []
  }

  /**
   * Cleanup all tracked users (requires admin API access)
   * This is a placeholder - actual implementation depends on test infrastructure
   */
  async cleanup(): Promise<void> {
    // In a real implementation, this would call Supabase Admin API to delete users
    // For now, just clear the tracker
    console.log(`Would cleanup ${this.createdEmails.length} test users:`, this.createdEmails)
    this.clear()
  }
}

/**
 * Singleton tracker instance for use across tests
 */
export const testUserTracker = new TestUserTracker()

/**
 * Company search test data
 */
export const TEST_COMPANY_SEARCH_QUERIES = {
  existing: 'Test', // Should find existing test companies
  nonExistent: 'xyznonexistent123', // Should find nothing
  partial: 'Co', // Partial match
  special: "O'Brien", // Special characters
}

/**
 * Password strength test cases
 */
export const PASSWORD_TEST_CASES = {
  tooShort: '123',
  noUppercase: 'testpassword123!',
  noLowercase: 'TESTPASSWORD123!',
  noNumber: 'TestPassword!!',
  noSpecial: 'TestPassword123',
  valid: 'TestPassword123!',
  strong: 'MyV3ryStr0ng!P@ssw0rd',
}

/**
 * Email validation test cases
 */
export const EMAIL_TEST_CASES = {
  invalid: 'not-an-email',
  missingAt: 'testemail.com',
  missingDomain: 'test@',
  missingLocal: '@example.com',
  valid: 'test@example.com',
  withSubdomain: 'test@mail.example.com',
}

/**
 * Common test scenarios for registration validation
 */
export const VALIDATION_SCENARIOS = {
  emptyCompanyName: {
    companyName: '',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'PM',
  },
  emptyFirstName: {
    companyName: 'Test Company',
    firstName: '',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'PM',
  },
  emptyLastName: {
    companyName: 'Test Company',
    firstName: 'Test',
    lastName: '',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'PM',
  },
  emptyEmail: {
    companyName: 'Test Company',
    firstName: 'Test',
    lastName: 'User',
    email: '',
    password: 'TestPassword123!',
    role: 'PM',
  },
  emptyPassword: {
    companyName: 'Test Company',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: '',
    role: 'PM',
  },
  emptyRole: {
    companyName: 'Test Company',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: '',
  },
}
