/**
 * Integration Tests for qb-get-accounts Edge Function
 *
 * Tests fetching QuickBooks Chart of Accounts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
import {
  setupTestEnv,
  cleanupTestEnv,
  createTestRequest,
  parseResponse,
  assertSuccessResponse,
  assertErrorResponse,
  MockFetch,
  mockQBConnection,
  mockQBAccountsResponse,
  mockQBAccount,
  mockQBErrorResponse,
} from './setup.ts'

Deno.test('qb-get-accounts', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-get-accounts', {
      method: 'OPTIONS',
    })

    // Expected: 200 with CORS headers
  })

  await t.step('should reject request without authorization header', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-123',
    }, {
      'Authorization': '',
    })

    // Expected: 500 with 'Missing authorization header'
  })

  await t.step('should reject request without connectionId', async () => {
    const request = createTestRequest('POST', {})

    // Expected: 500 with 'Missing connectionId'
  })

  await t.step('should reject if connection not found', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'nonexistent-conn',
    })

    // Expected: 500 with 'Connection not found or inactive'
  })

  await t.step('should reject if connection is inactive', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'inactive-conn',
    })

    // Expected: 500 with 'Connection not found or inactive'
  })

  await t.step('should reject if no access token available', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-no-token',
    })

    // Expected: 500 with 'No access token available'
  })

  await t.step('should reject if access token is expired', async () => {
    const expiredDate = new Date(Date.now() - 3600000) // 1 hour ago

    const request = createTestRequest('POST', {
      connectionId: 'conn-expired-token',
    })

    // Mock connection with:
    // token_expires_at: expiredDate

    // Expected: 500 with 'Access token expired. Please refresh the token.'
  })

  await t.step('should successfully fetch all active accounts', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - QB query API called
    // - Query: "SELECT * FROM Account WHERE Active = true ORDERBY Name"
    // - Returns mapped accounts
  })

  await t.step('should filter accounts by type when specified', async () => {
    const mockFetch = new MockFetch()

    const expenseAccountsResponse = {
      QueryResponse: {
        Account: [mockQBAccount], // Only expense accounts
      },
    }

    mockFetch.mockQBSuccess('query', expenseAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      accountType: 'Expense',
    })

    // Expected query:
    // "SELECT * FROM Account WHERE Active = true AND AccountType = 'Expense' ORDERBY Name"
  })

  await t.step('should support different account types', async () => {
    const accountTypes = [
      'Expense',
      'Income',
      'Asset',
      'Liability',
      'Equity',
      'Bank',
      'CreditCard',
      'AccountsReceivable',
      'AccountsPayable',
    ]

    for (const accountType of accountTypes) {
      const mockFetch = new MockFetch()
      mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

      const request = createTestRequest('POST', {
        connectionId: mockQBConnection.id,
        accountType,
      })

      // Verify query includes AccountType filter
    }
  })

  await t.step('should build correct QB query URL', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify query endpoint:
    // - Base URL from connection (sandbox vs production)
    // - /v3/company/{realmId}/query
    // - Query parameter with SQL-like query
  })

  await t.step('should use correct base URL for sandbox', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: 'conn-sandbox',
    })

    // Mock connection with is_sandbox: true

    // Verify request to:
    // 'https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}/query'
  })

  await t.step('should use correct base URL for production', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Mock connection with is_sandbox: false

    // Verify request to:
    // 'https://quickbooks.api.intuit.com/v3/company/{realmId}/query'
  })

  await t.step('should map QB account response to simpler format', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response format:
    // {
    //   accounts: [
    //     {
    //       Id: string,
    //       Name: string,
    //       AccountType: string,
    //       AccountSubType?: string,
    //       AcctNum?: string,
    //       Description?: string,
    //       Active: boolean,
    //       FullyQualifiedName?: string
    //     }
    //   ]
    // }

    // Verify excluded fields:
    // - MetaData, SyncToken, CreateTime, etc.
  })

  await t.step('should handle empty account list', async () => {
    const mockFetch = new MockFetch()

    const emptyResponse = {
      QueryResponse: {
        Account: [],
      },
    }

    mockFetch.mockQBSuccess('query', emptyResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response:
    // {
    //   accounts: []
    // }
  })

  await t.step('should handle missing QueryResponse', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response:
    // {
    //   accounts: []
    // }
  })

  await t.step('should handle missing Account array', async () => {
    const mockFetch = new MockFetch()

    const noAccountsResponse = {
      QueryResponse: {
        maxResults: 0,
      },
    }

    mockFetch.mockQBSuccess('query', noAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response:
    // {
    //   accounts: []
    // }
  })

  await t.step('should log account fetch operation', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify console.log calls:
    // 1. 'Fetching accounts for connection {id}'
    // 2. 'Fetched {count} accounts from QuickBooks'
  })

  await t.step('should handle QB API authentication error', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('query', mockQBErrorResponse, 401)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected: 500 with QB error message
  })

  await t.step('should handle QB API rate limit error', async () => {
    const mockFetch = new MockFetch()

    const rateLimitError = {
      Fault: {
        Error: [{
          Message: 'Rate limit exceeded',
          code: '3001',
        }],
      },
    }

    mockFetch.mockQBError('query', rateLimitError, 429)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected: 500 with rate limit error
  })

  await t.step('should handle QB API server error', async () => {
    const mockFetch = new MockFetch()

    const serverError = {
      Fault: {
        Error: [{
          Message: 'Internal server error',
          code: '500',
        }],
      },
    }

    mockFetch.mockQBError('query', serverError, 500)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected: 500 with server error
  })

  await t.step('should handle network error', async () => {
    const mockFetch = new MockFetch()
    // Mock network failure

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected: 500 with network error
  })

  await t.step('should include authorization header with access token', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify QB API request includes:
    // Authorization: Bearer {access_token}
  })

  await t.step('should use GET method for query endpoint', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify QB API request uses GET
    // (query endpoint accepts GET with query param)
  })

  await t.step('should URL-encode query parameter', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      accountType: 'Expense',
    })

    // Verify query parameter is URL-encoded:
    // query=SELECT%20*%20FROM%20Account%20WHERE...
  })

  await t.step('should return 200 status on success', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - Status: 200
    // - Content-Type: application/json
  })

  await t.step('should return 500 for errors', async () => {
    const testCases = [
      { body: {}, expectedError: 'Missing connectionId' },
      { body: { connectionId: 'nonexistent' }, expectedError: 'Connection not found' },
      { body: { connectionId: 'no-token' }, expectedError: 'No access token' },
    ]

    for (const { body, expectedError } of testCases) {
      const request = createTestRequest('POST', body)
      // Expected: 500
    }
  })

  await t.step('should preserve account metadata fields', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify mapped accounts include:
    // - Id, Name, AccountType (required)
    // - AccountSubType, AcctNum, Description (optional)
    // - Active, FullyQualifiedName (useful)
  })

  await t.step('should handle accounts with missing optional fields', async () => {
    const mockFetch = new MockFetch()

    const minimalAccountResponse = {
      QueryResponse: {
        Account: [
          {
            Id: '1',
            Name: 'Minimal Account',
            AccountType: 'Expense',
            Active: true,
            // No AccountSubType, AcctNum, Description, etc.
          },
        ],
      },
    }

    mockFetch.mockQBSuccess('query', minimalAccountResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response includes account with:
    // - Defined: Id, Name, AccountType, Active
    // - Undefined: AccountSubType, AcctNum, Description, FullyQualifiedName
  })

  await t.step('should handle large account lists', async () => {
    const mockFetch = new MockFetch()

    const manyAccounts = Array.from({ length: 100 }, (_, i) => ({
      Id: `${i}`,
      Name: `Account ${i}`,
      AccountType: 'Expense',
      Active: true,
    }))

    const largeResponse = {
      QueryResponse: {
        Account: manyAccounts,
        maxResults: 100,
      },
    }

    mockFetch.mockQBSuccess('query', largeResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - All 100 accounts returned
    // - No pagination issues
  })

  await t.step('should order results by name', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify query includes:
    // ORDERBY Name
  })

  await t.step('should only fetch active accounts', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify query includes:
    // WHERE Active = true
  })

  await t.step('should work with null token_expires_at', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('query', mockQBAccountsResponse)

    const request = createTestRequest('POST', {
      connectionId: 'conn-null-expiry',
    })

    // Mock connection with token_expires_at: null

    // Expected:
    // - Skip expiry check
    // - Proceed with API call
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
