/**
 * E2E Phase 2 Test Fixtures
 *
 * Comprehensive fixtures for Phase 2 E2E tests including:
 * - API mocking utilities for error scenarios
 * - Test data cleanup routines
 * - Page object helpers
 * - Custom test context
 */

import { test as base, Page, Route, BrowserContext } from '@playwright/test'
import { test as authTest, TEST_USERS, UserRole } from './auth'

// ============================================================================
// Types
// ============================================================================

export interface ApiMockOptions {
  /** HTTP status code to return */
  status?: number
  /** Response body */
  body?: unknown
  /** Response headers */
  headers?: Record<string, string>
  /** Delay in milliseconds before responding */
  delay?: number
  /** Whether to abort the request (simulates network failure) */
  abort?: boolean
  /** Abort reason */
  abortReason?: 'failed' | 'timedout' | 'connectionreset'
}

export interface CleanupItem {
  table: string
  id: string
}

export interface E2EPhase2Fixtures {
  /** API mocker for simulating errors and custom responses */
  apiMocker: ApiMocker
  /** Cleanup tracker for test data */
  cleanupTracker: CleanupTracker
  /** Helper to wait for Supabase operations */
  waitForSupabase: (timeout?: number) => Promise<void>
}

// ============================================================================
// API Mocker Class
// ============================================================================

export class ApiMocker {
  private page: Page
  private activeRoutes: string[] = []

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Mock a specific API endpoint
   */
  async mockEndpoint(
    urlPattern: string | RegExp,
    options: ApiMockOptions = {}
  ): Promise<void> {
    const pattern = typeof urlPattern === 'string' ? `**${urlPattern}**` : urlPattern

    await this.page.route(pattern, async (route: Route) => {
      if (options.abort) {
        await route.abort(options.abortReason || 'failed')
        return
      }

      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay))
      }

      await route.fulfill({
        status: options.status || 200,
        contentType: 'application/json',
        headers: options.headers,
        body: JSON.stringify(options.body || {}),
      })
    })

    this.activeRoutes.push(typeof urlPattern === 'string' ? urlPattern : urlPattern.source)
  }

  /**
   * Mock Supabase REST API with error response
   */
  async mockSupabaseError(
    table: string,
    error: { message: string; code?: string },
    statusCode: number = 500
  ): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      status: statusCode,
      body: { error: error.message, code: error.code || 'INTERNAL_ERROR' },
    })
  }

  /**
   * Mock network failure for Supabase REST API
   */
  async mockNetworkFailure(table: string): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      abort: true,
      abortReason: 'failed',
    })
  }

  /**
   * Mock timeout for Supabase REST API
   */
  async mockTimeout(table: string, delayMs: number = 30000): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      abort: true,
      abortReason: 'timedout',
    })
  }

  /**
   * Mock rate limiting response
   */
  async mockRateLimit(table: string): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      status: 429,
      body: { error: 'Rate limit exceeded', retryAfter: 60 },
      headers: { 'Retry-After': '60' },
    })
  }

  /**
   * Mock authentication error
   */
  async mockAuthError(): Promise<void> {
    await this.mockEndpoint('/auth/v1/', {
      status: 401,
      body: { error: 'Invalid credentials', code: 'UNAUTHORIZED' },
    })
  }

  /**
   * Mock forbidden response
   */
  async mockForbidden(table: string): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      status: 403,
      body: { error: 'Access denied', code: 'FORBIDDEN' },
    })
  }

  /**
   * Mock empty response (no data found)
   */
  async mockEmptyResponse(table: string): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      status: 200,
      body: [],
    })
  }

  /**
   * Mock successful response with custom data
   */
  async mockSuccessResponse(table: string, data: unknown): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      status: 200,
      body: data,
    })
  }

  /**
   * Mock validation error
   */
  async mockValidationError(table: string, field: string, message: string): Promise<void> {
    await this.mockEndpoint(`/rest/v1/${table}`, {
      status: 400,
      body: {
        error: 'Validation failed',
        details: [{ field, message }],
      },
    })
  }

  /**
   * Clear all active mocks
   */
  async clearAllMocks(): Promise<void> {
    for (const route of this.activeRoutes) {
      await this.page.unroute(`**${route}**`)
    }
    this.activeRoutes = []
  }

  /**
   * Clear mock for specific endpoint
   */
  async clearMock(urlPattern: string): Promise<void> {
    await this.page.unroute(`**${urlPattern}**`)
    this.activeRoutes = this.activeRoutes.filter(r => r !== urlPattern)
  }
}

// ============================================================================
// Cleanup Tracker Class
// ============================================================================

export class CleanupTracker {
  private items: CleanupItem[] = []
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Track an item for cleanup
   */
  track(table: string, id: string): void {
    this.items.push({ table, id })
  }

  /**
   * Track multiple items for cleanup
   */
  trackMany(table: string, ids: string[]): void {
    ids.forEach(id => this.track(table, id))
  }

  /**
   * Get all tracked items
   */
  getTrackedItems(): CleanupItem[] {
    return [...this.items]
  }

  /**
   * Clear tracked items (without deleting from database)
   */
  clear(): void {
    this.items = []
  }

  /**
   * Execute cleanup via API calls
   * Note: This requires appropriate permissions
   */
  async executeCleanup(): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    // Group items by table for batch operations
    const groupedItems = this.items.reduce((acc, item) => {
      if (!acc[item.table]) {
        acc[item.table] = []
      }
      acc[item.table].push(item.id)
      return acc
    }, {} as Record<string, string[]>)

    // Note: Actual deletion would require authenticated API calls
    // This is a placeholder - in production, use Supabase admin client
    console.log('Would cleanup:', groupedItems)

    this.clear()
    return { success, failed }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wait for Supabase realtime or REST operations to complete
 */
export async function waitForSupabase(page: Page, timeout: number = 2000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Wait for toast/notification to appear and optionally dismiss
 */
export async function waitForToast(
  page: Page,
  options: {
    type?: 'success' | 'error' | 'any'
    dismiss?: boolean
    timeout?: number
  } = {}
): Promise<string | null> {
  const { type = 'any', dismiss = false, timeout = 5000 } = options

  const toastSelector = type === 'any'
    ? '[role="alert"], [data-testid="toast"]'
    : type === 'success'
    ? '[role="alert"]:has-text("success"), [data-testid="toast"]:has-text("success")'
    : '[role="alert"]:has-text("error"), [data-testid="toast"]:has-text("error")'

  try {
    const toast = page.locator(toastSelector).first()
    await toast.waitFor({ state: 'visible', timeout })

    const text = await toast.textContent()

    if (dismiss) {
      const dismissButton = toast.locator('button, [aria-label="close"], [aria-label="dismiss"]')
      if (await dismissButton.isVisible()) {
        await dismissButton.click()
      }
    }

    return text
  } catch {
    return null
  }
}

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Wait for table to have specific number of rows
 */
export async function waitForTableRows(
  page: Page,
  tableSelector: string,
  minRows: number,
  timeout: number = 5000
): Promise<boolean> {
  const table = page.locator(tableSelector)
  const rows = table.locator('tbody tr')

  try {
    await page.waitForFunction(
      ({ selector, min }) => {
        const table = document.querySelector(selector)
        if (!table) {return false}
        const rows = table.querySelectorAll('tbody tr')
        return rows.length >= min
      },
      { selector: tableSelector, min: minRows },
      { timeout }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Scroll to element and ensure it's in view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first()
  await element.scrollIntoViewIfNeeded()
}

/**
 * Wait for dialog to open
 */
export async function waitForDialog(page: Page, timeout: number = 5000): Promise<boolean> {
  try {
    await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({
      state: 'visible',
      timeout,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Wait for dialog to close
 */
export async function waitForDialogClose(page: Page, timeout: number = 5000): Promise<boolean> {
  try {
    await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({
      state: 'hidden',
      timeout,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Check if element has specific class
 */
export async function hasClass(page: Page, selector: string, className: string): Promise<boolean> {
  const element = page.locator(selector).first()
  const classes = await element.getAttribute('class')
  return classes?.includes(className) || false
}

/**
 * Get computed style property
 */
export async function getComputedStyle(
  page: Page,
  selector: string,
  property: string
): Promise<string | null> {
  return await page.evaluate(
    ({ sel, prop }) => {
      const element = document.querySelector(sel)
      if (!element) {return null}
      return window.getComputedStyle(element).getPropertyValue(prop)
    },
    { sel: selector, prop: property }
  )
}

// ============================================================================
// Extended Test Fixtures
// ============================================================================

/**
 * Base test with Phase 2 fixtures only (no auth)
 * Use this for tests that handle their own authentication
 */
export const test = base.extend<E2EPhase2Fixtures>({
  apiMocker: async ({ page }, use) => {
    const mocker = new ApiMocker(page)
    await use(mocker)
    await mocker.clearAllMocks()
  },

  cleanupTracker: async ({ page }, use) => {
    const tracker = new CleanupTracker(page)
    await use(tracker)
    // Note: In a real implementation, we'd call tracker.executeCleanup() here
    tracker.clear()
  },

  waitForSupabase: async ({ page }, use) => {
    const wait = async (timeout?: number) => {
      await waitForSupabase(page, timeout)
    }
    await use(wait)
  },
})

// ============================================================================
// Combined Fixtures (Auth + Phase 2)
// ============================================================================

/**
 * Extended fixtures combining auth and Phase 2 capabilities
 */
interface CombinedFixtures extends E2EPhase2Fixtures {
  /** Regular authenticated user context */
  authenticatedPage: Page
  /** Admin authenticated user context */
  adminPage: Page
  /** Project Manager authenticated user context */
  projectManagerPage: Page
  /** Superintendent authenticated user context */
  superintendentPage: Page
  /** Subcontractor authenticated user context */
  subcontractorPage: Page
}

/**
 * Combined test fixture with both auth and Phase 2 capabilities
 * Use this for tests that need role-based authentication + API mocking
 */
export const testWithAuth = authTest.extend<E2EPhase2Fixtures>({
  apiMocker: async ({ page }, use) => {
    const mocker = new ApiMocker(page)
    await use(mocker)
    await mocker.clearAllMocks()
  },

  cleanupTracker: async ({ page }, use) => {
    const tracker = new CleanupTracker(page)
    await use(tracker)
    tracker.clear()
  },

  waitForSupabase: async ({ page }, use) => {
    const wait = async (timeout?: number) => {
      await waitForSupabase(page, timeout)
    }
    await use(wait)
  },
})

// Export auth types and test users for convenience
export { TEST_USERS, type UserRole }

export { expect } from '@playwright/test'

// ============================================================================
// Shop Drawing Specific Helpers
// ============================================================================

export const SHOP_DRAWING_STATUSES = [
  'not_submitted',
  'submitted',
  'under_gc_review',
  'submitted_to_architect',
  'approved',
  'approved_as_noted',
  'revise_resubmit',
  'rejected',
] as const

export const SHOP_DRAWING_PRIORITIES = [
  'critical_path',
  'standard',
  'non_critical',
] as const

export const SHOP_DRAWING_DISCIPLINES = [
  'Structural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Fire Protection',
  'Architectural',
  'Civil',
  'Other',
] as const

/**
 * Generate test shop drawing data
 */
export function generateShopDrawingData(overrides: Partial<{
  title: string
  discipline: typeof SHOP_DRAWING_DISCIPLINES[number]
  priority: typeof SHOP_DRAWING_PRIORITIES[number]
  specSection: string
}> = {}) {
  const id = generateTestId('sd')
  return {
    title: overrides.title || `E2E Test Shop Drawing ${id}`,
    discipline: overrides.discipline || 'Structural',
    priority: overrides.priority || 'standard',
    specSection: overrides.specSection || '05 12 00',
    description: `Test description for ${id}`,
  }
}

// ============================================================================
// Job Costing Specific Helpers
// ============================================================================

export const COST_TYPES = [
  'labor',
  'material',
  'equipment',
  'subcontract',
  'other',
] as const

/**
 * Generate test cost code data
 */
export function generateCostCodeData(overrides: Partial<{
  code: string
  name: string
  costType: typeof COST_TYPES[number]
  budget: number
}> = {}) {
  const id = generateTestId('cc')
  return {
    code: overrides.code || `99-${Date.now().toString().slice(-4)}`,
    name: overrides.name || `E2E Test Cost Code ${id}`,
    costType: overrides.costType || 'material',
    budget: overrides.budget || 100000,
  }
}

/**
 * Format currency for assertions
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace(/[$,]/g, ''))
}
