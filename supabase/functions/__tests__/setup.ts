/**
 * Test Setup and Utilities for Edge Function Integration Tests
 *
 * Provides mock clients, fixtures, and test helpers for QuickBooks edge functions
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts'

// =============================================
// MOCK SUPABASE CLIENT
// =============================================

export interface MockSupabaseUser {
  id: string
  email: string
}

export interface MockSupabaseQueryBuilder<T = any> {
  select: (columns?: string) => MockSupabaseQueryBuilder<T>
  insert: (data: any) => MockSupabaseQueryBuilder<T>
  update: (data: any) => MockSupabaseQueryBuilder<T>
  delete: () => MockSupabaseQueryBuilder<T>
  eq: (column: string, value: any) => MockSupabaseQueryBuilder<T>
  single: () => Promise<{ data: T | null; error: any }>
  maybeSingle: () => Promise<{ data: T | null; error: any }>
  limit: (count: number) => MockSupabaseQueryBuilder<T>
}

export interface MockSupabaseAuth {
  getUser: (token: string) => Promise<{ data: { user: MockSupabaseUser | null }; error: any }>
}

export interface MockSupabaseClient {
  from: <T = any>(table: string) => MockSupabaseQueryBuilder<T>
  auth: MockSupabaseAuth
}

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient(config: {
  user?: MockSupabaseUser
  authError?: Error
  queryData?: any
  queryError?: Error
}): MockSupabaseClient {
  const mockQueryBuilder: MockSupabaseQueryBuilder = {
    select: () => mockQueryBuilder,
    insert: () => mockQueryBuilder,
    update: () => mockQueryBuilder,
    delete: () => mockQueryBuilder,
    eq: () => mockQueryBuilder,
    single: async () => ({ data: config.queryData || null, error: config.queryError || null }),
    maybeSingle: async () => ({ data: config.queryData || null, error: config.queryError || null }),
    limit: () => mockQueryBuilder,
  }

  return {
    from: () => mockQueryBuilder,
    auth: {
      getUser: async () => ({
        data: { user: config.user || null },
        error: config.authError || null,
      }),
    },
  }
}

// =============================================
// QUICKBOOKS API MOCK FIXTURES
// =============================================

/**
 * Mock QuickBooks OAuth token response
 */
export const mockQBTokens = {
  access_token: 'mock_access_token_12345',
  refresh_token: 'mock_refresh_token_67890',
  token_type: 'Bearer' as const,
  expires_in: 3600,
  x_refresh_token_expires_in: 8726400,
}

/**
 * Mock QuickBooks connection
 */
export const mockQBConnection = {
  id: 'conn-123',
  company_id: 'company-456',
  realm_id: 'realm-789',
  company_name: 'Test Construction Co',
  access_token: 'encrypted_access_token',
  refresh_token: 'encrypted_refresh_token',
  token_expires_at: new Date(Date.now() + 3600000).toISOString(),
  refresh_token_expires_at: new Date(Date.now() + 8726400000).toISOString(),
  is_sandbox: true,
  is_active: true,
  last_connected_at: new Date().toISOString(),
  last_sync_at: null,
  connection_error: null,
  auto_sync_enabled: true,
  sync_frequency_hours: 24,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'user-123',
}

/**
 * Mock QuickBooks vendor (subcontractor) response
 */
export const mockQBVendor = {
  Vendor: {
    Id: 'qb-vendor-123',
    DisplayName: 'ABC Subcontractors',
    CompanyName: 'ABC Subcontractors',
    SyncToken: '1',
    Active: true,
    PrimaryPhone: { FreeFormNumber: '555-1234' },
    PrimaryEmailAddr: { Address: 'contact@abc.com' },
  },
}

/**
 * Mock QuickBooks invoice (payment application) response
 */
export const mockQBInvoice = {
  Invoice: {
    Id: 'qb-invoice-456',
    DocNumber: '001',
    SyncToken: '1',
    TxnDate: '2024-01-15',
    DueDate: '2024-02-15',
    TotalAmt: 50000,
    CustomerRef: { value: 'customer-123' },
  },
}

/**
 * Mock QuickBooks bill (change order) response
 */
export const mockQBBill = {
  Bill: {
    Id: 'qb-bill-789',
    DocNumber: 'CO-001',
    SyncToken: '1',
    TxnDate: '2024-01-15',
    TotalAmt: 15000,
    VendorRef: { value: 'vendor-123' },
  },
}

/**
 * Mock QuickBooks customer (project) response
 */
export const mockQBCustomer = {
  Customer: {
    Id: 'qb-customer-321',
    DisplayName: 'Main Street Project',
    CompanyName: 'Main Street Development',
    SyncToken: '1',
    Active: true,
  },
}

/**
 * Mock QuickBooks account response
 */
export const mockQBAccount = {
  Id: 'qb-account-999',
  Name: 'Construction Expenses',
  AccountType: 'Expense',
  AccountSubType: 'ConstructionExpense',
  AcctNum: '6100',
  Active: true,
  FullyQualifiedName: 'Expenses:Construction Expenses',
}

/**
 * Mock QuickBooks Chart of Accounts query response
 */
export const mockQBAccountsResponse = {
  QueryResponse: {
    Account: [
      mockQBAccount,
      {
        Id: 'qb-account-888',
        Name: 'Labor Costs',
        AccountType: 'Expense',
        AccountSubType: 'Labor',
        AcctNum: '6200',
        Active: true,
        FullyQualifiedName: 'Expenses:Labor Costs',
      },
      {
        Id: 'qb-account-777',
        Name: 'Materials',
        AccountType: 'Expense',
        AccountSubType: 'SuppliesMaterials',
        AcctNum: '6300',
        Active: true,
        FullyQualifiedName: 'Expenses:Materials',
      },
    ],
    maxResults: 3,
  },
}

/**
 * Mock QuickBooks company info response
 */
export const mockQBCompanyInfo = {
  CompanyInfo: {
    CompanyName: 'Test Construction Co',
    LegalName: 'Test Construction Company LLC',
    CompanyAddr: {
      Line1: '123 Main St',
      City: 'Anytown',
      CountrySubDivisionCode: 'CA',
      PostalCode: '12345',
    },
  },
}

/**
 * Mock QuickBooks error response
 */
export const mockQBErrorResponse = {
  Fault: {
    Error: [
      {
        Message: 'Authentication failed',
        Detail: 'Invalid access token',
        code: '3200',
        element: '',
      },
    ],
    type: 'AUTHENTICATION',
  },
}

/**
 * Mock QuickBooks validation error (stale SyncToken)
 */
export const mockQBSyncTokenError = {
  Fault: {
    Error: [
      {
        Message: 'Stale object error',
        Detail: 'You must provide the current SyncToken',
        code: '5010',
        element: '',
      },
    ],
    type: 'VALIDATION',
  },
}

/**
 * Mock QuickBooks rate limit error
 */
export const mockQBRateLimitError = {
  Fault: {
    Error: [
      {
        Message: 'Rate limit exceeded',
        Detail: 'Too many requests',
        code: '3001',
        element: '',
      },
    ],
    type: 'RATE_LIMIT',
  },
}

// =============================================
// LOCAL ENTITY FIXTURES
// =============================================

/**
 * Mock subcontractor entity
 */
export const mockSubcontractor = {
  id: 'sub-123',
  company_id: 'company-456',
  company_name: 'ABC Subcontractors',
  contact_phone: '555-1234',
  contact_email: 'contact@abc.com',
  address: '123 Contractor St',
  city: 'Anytown',
  state: 'CA',
  zip: '12345',
}

/**
 * Mock payment application entity
 */
export const mockPaymentApplication = {
  id: 'pa-456',
  company_id: 'company-456',
  project_id: 'project-123',
  project_name: 'Main Street Project',
  app_number: 1,
  period_to: '2024-01-31',
  due_date: '2024-02-15',
  amount_due: 50000,
  qb_customer_id: 'customer-123',
}

/**
 * Mock change order entity
 */
export const mockChangeOrder = {
  id: 'co-789',
  company_id: 'company-456',
  project_id: 'project-123',
  co_number: 1,
  description: 'Additional foundation work',
  requested_amount: 15000,
  approved_amount: 15000,
  submitted_date: '2024-01-15',
  qb_vendor_id: 'vendor-123',
  qb_account_id: '1',
}

/**
 * Mock project entity
 */
export const mockProject = {
  id: 'project-123',
  company_id: 'company-456',
  name: 'Main Street Project',
  client_name: 'Main Street Development',
  address: '456 Main St',
  city: 'Anytown',
  state: 'CA',
  zip: '12345',
}

/**
 * Mock entity mapping
 */
export const mockEntityMapping = {
  id: 'mapping-123',
  company_id: 'company-456',
  connection_id: 'conn-123',
  local_entity_type: 'subcontractors',
  local_entity_id: 'sub-123',
  qb_entity_type: 'vendor',
  qb_entity_id: 'qb-vendor-123',
  qb_sync_token: '1',
  sync_status: 'synced',
  last_synced_at: new Date().toISOString(),
  last_sync_error: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock sync log
 */
export const mockSyncLog = {
  id: 'log-123',
  company_id: 'company-456',
  connection_id: 'conn-123',
  sync_type: 'manual',
  direction: 'to_quickbooks',
  entity_type: 'vendor',
  status: 'syncing',
  records_processed: 1,
  records_created: 0,
  records_updated: 0,
  records_failed: 0,
  started_at: new Date().toISOString(),
  initiated_by: 'user-123',
}

/**
 * Mock pending sync
 */
export const mockPendingSync = {
  id: 'pending-123',
  company_id: 'company-456',
  connection_id: 'conn-123',
  local_entity_type: 'subcontractors',
  local_entity_id: 'sub-123',
  direction: 'to_quickbooks',
  priority: 5,
  scheduled_at: new Date().toISOString(),
  attempt_count: 0,
  max_attempts: 3,
  status: 'pending',
  created_by: 'user-123',
}

// =============================================
// ENVIRONMENT SETUP
// =============================================

/**
 * Set up test environment variables
 */
export function setupTestEnv() {
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  Deno.env.set('QB_CLIENT_ID', 'test-qb-client-id')
  Deno.env.set('QB_CLIENT_SECRET', 'test-qb-client-secret')
  Deno.env.set('QB_REDIRECT_URI', 'https://test.example.com/oauth/callback')
}

/**
 * Clean up test environment
 */
export function cleanupTestEnv() {
  Deno.env.delete('SUPABASE_URL')
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY')
  Deno.env.delete('QB_CLIENT_ID')
  Deno.env.delete('QB_CLIENT_SECRET')
  Deno.env.delete('QB_REDIRECT_URI')
}

// =============================================
// TEST HELPERS
// =============================================

/**
 * Create a test HTTP request
 */
export function createTestRequest(
  method: string,
  body?: any,
  headers?: Record<string, string>
): Request {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token-123',
    ...headers,
  }

  return new Request('http://localhost:8000/test', {
    method,
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Parse response body
 */
export async function parseResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

/**
 * Assert response is successful
 */
export async function assertSuccessResponse(response: Response, expectedStatus = 200) {
  assertEquals(response.status, expectedStatus, `Expected status ${expectedStatus}`)
  assertEquals(response.headers.get('Content-Type'), 'application/json')
}

/**
 * Assert response is an error
 */
export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedErrorMessage?: string
) {
  assertEquals(response.status, expectedStatus, `Expected error status ${expectedStatus}`)

  const body = await parseResponse(response)
  assertExists(body.error, 'Error message should exist')

  if (expectedErrorMessage) {
    assertEquals(
      body.error.includes(expectedErrorMessage),
      true,
      `Error message should contain "${expectedErrorMessage}"`
    )
  }
}

/**
 * Mock fetch for QuickBooks API responses
 */
export class MockFetch {
  private responses: Map<string, Response> = new Map()
  private callHistory: Array<{ url: string; options?: RequestInit }> = []

  /**
   * Set up a mock response for a URL pattern
   */
  mockResponse(urlPattern: string | RegExp, response: Response) {
    const key = typeof urlPattern === 'string' ? urlPattern : urlPattern.source
    this.responses.set(key, response)
  }

  /**
   * Mock a successful QuickBooks API response
   */
  mockQBSuccess(endpoint: string, data: any) {
    const pattern = new RegExp(endpoint)
    this.mockResponse(pattern, new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  }

  /**
   * Mock a QuickBooks API error
   */
  mockQBError(endpoint: string, errorData: any, status: number) {
    const pattern = new RegExp(endpoint)
    this.mockResponse(pattern, new Response(JSON.stringify(errorData), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }))
  }

  /**
   * Get the mock fetch function
   */
  getFetchFn(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

      this.callHistory.push({ url, options: init })

      // Find matching response
      for (const [pattern, response] of this.responses) {
        if (url.includes(pattern) || url.match(new RegExp(pattern))) {
          return response.clone()
        }
      }

      // Default 404 response
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  /**
   * Get call history
   */
  getCallHistory() {
    return this.callHistory
  }

  /**
   * Reset mock
   */
  reset() {
    this.responses.clear()
    this.callHistory = []
  }
}

/**
 * Wait for a promise to reject
 */
export async function expectToThrow(fn: () => Promise<any>, expectedError?: string): Promise<void> {
  let didThrow = false
  try {
    await fn()
  } catch (error) {
    didThrow = true
    if (expectedError && error instanceof Error) {
      assertEquals(
        error.message.includes(expectedError),
        true,
        `Expected error to contain "${expectedError}", got "${error.message}"`
      )
    }
  }
  assertEquals(didThrow, true, 'Expected function to throw')
}
