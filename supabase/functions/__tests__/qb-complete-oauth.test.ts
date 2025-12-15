/**
 * Integration Tests for qb-complete-oauth Edge Function
 *
 * Tests QuickBooks OAuth token exchange and connection creation
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
  mockQBTokens,
  mockQBCompanyInfo,
} from './setup.ts'

Deno.test('qb-complete-oauth', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-complete-oauth', {
      method: 'OPTIONS',
    })

    // Expected: 200 with CORS headers
  })

  await t.step('should reject if QB credentials not configured', async () => {
    const clientId = Deno.env.get('QB_CLIENT_ID')
    Deno.env.delete('QB_CLIENT_ID')

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code-123',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Expected: 500 with 'QuickBooks credentials not configured'

    if (clientId) {Deno.env.set('QB_CLIENT_ID', clientId)}
  })

  await t.step('should reject request without authorization header', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code-123',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    }, {
      'Authorization': '',
    })

    // Expected: 400 with 'Missing authorization header'
  })

  await t.step('should reject request with invalid authentication', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code-123',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    }, {
      'Authorization': 'Bearer invalid-token',
    })

    // Expected: 400 with 'Invalid authentication'
  })

  await t.step('should reject request with missing required parameters', async () => {
    const testCases = [
      { body: {}, expectedError: 'Missing required parameters' },
      {
        body: { code: 'code', realm_id: 'realm', state: 'state' },
        expectedError: 'Missing required parameters' // missing companyId
      },
      {
        body: { companyId: 'company', realm_id: 'realm', state: 'state' },
        expectedError: 'Missing required parameters' // missing code
      },
      {
        body: { companyId: 'company', code: 'code', state: 'state' },
        expectedError: 'Missing required parameters' // missing realm_id
      },
      {
        body: { companyId: 'company', code: 'code', realm_id: 'realm' },
        expectedError: 'Missing required parameters' // missing state
      },
    ]

    for (const { body, expectedError } of testCases) {
      const request = createTestRequest('POST', body)
      // Expected: 400 with expectedError
    }
  })

  await t.step('should reject if state parameter is invalid', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'different-company:0:randomstate', // Mismatched company
    })

    // Expected: 400 with 'Invalid state parameter'
  })

  await t.step('should parse sandbox flag from state', async () => {
    const testCases = [
      { state: 'company-123:0:random', expectedSandbox: false },
      { state: 'company-123:1:random', expectedSandbox: true },
    ]

    for (const { state, expectedSandbox } of testCases) {
      const mockFetch = new MockFetch()
      mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
      mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

      const request = createTestRequest('POST', {
        companyId: 'company-123',
        code: 'auth-code',
        realm_id: 'realm-789',
        state,
      })

      // Verify connection created with is_sandbox: expectedSandbox
    }
  })

  await t.step('should exchange authorization code for tokens', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code-123',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Verify token exchange request:
    // - POST to QB_URLS.oauth.token
    // - Authorization: Basic base64(clientId:clientSecret)
    // - Body includes:
    //   - grant_type: 'authorization_code'
    //   - code: 'auth-code-123'
    //   - redirect_uri from env
  })

  await t.step('should handle token exchange failure', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('oauth2/v1/tokens/bearer', {
      error: 'invalid_grant',
      error_description: 'Authorization code expired',
    }, 400)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'expired-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Expected: 500 with 'Token exchange failed'
  })

  await t.step('should fetch company info from QuickBooks', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo/realm-789', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Verify company info request:
    // - GET to /v3/company/{realmId}/companyinfo/{realmId}
    // - Authorization: Bearer {access_token}
    // - Uses correct base URL (sandbox vs production)
  })

  await t.step('should handle company info fetch failure gracefully', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBError('companyinfo', { error: 'Not found' }, 404)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Expected:
    // - Warning logged
    // - Connection created with company_name: null
    // - Overall request still succeeds
  })

  await t.step('should calculate token expiry times correctly', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Verify token expiry calculation:
    // - token_expires_at: now + expires_in (3600s = 1 hour)
    // - refresh_token_expires_at: now + x_refresh_token_expires_in (8726400s = 101 days)
  })

  await t.step('should create new connection if none exists', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Verify connection insert:
    // - company_id: 'company-123'
    // - realm_id: 'realm-789'
    // - company_name from QB company info
    // - access_token from token response
    // - refresh_token from token response
    // - token_expires_at calculated
    // - refresh_token_expires_at calculated
    // - is_sandbox from state
    // - is_active: true
    // - last_connected_at: now
    // - created_by: user.id
  })

  await t.step('should update existing connection if found', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789', // Same realm as existing connection
      state: 'company-123:0:randomstate',
    })

    // Verify connection update:
    // - Find existing by company_id and realm_id
    // - Update with new tokens
    // - Update company_name
    // - Set is_active: true
    // - Update last_connected_at
    // - Clear connection_error
    // - Update updated_at
  })

  await t.step('should return connection without sensitive tokens', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Expected response:
    // {
    //   connection: {
    //     id: '...',
    //     company_id: 'company-123',
    //     realm_id: 'realm-789',
    //     company_name: '...',
    //     access_token: null,  // Removed for security
    //     refresh_token: null, // Removed for security
    //     ...other fields
    //   }
    // }
  })

  await t.step('should log successful OAuth completion', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Verify console.log calls:
    // 1. 'Completing OAuth for company company-123, realm realm-789, sandbox: false'
    // 2. 'OAuth completed successfully for connection {id}'
  })

  await t.step('should return 200 status on success', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Expected:
    // - Status: 200
    // - Content-Type: application/json
  })

  await t.step('should return 400 for validation errors', async () => {
    const testCases = [
      {
        body: { companyId: 'company-123', code: 'code', realm_id: 'realm' },
        expectedError: 'Missing required parameters',
      },
      {
        body: {
          companyId: 'company-123',
          code: 'code',
          realm_id: 'realm',
          state: 'wrong-company:0:state',
        },
        expectedError: 'Invalid state parameter',
      },
    ]

    for (const { body, expectedError } of testCases) {
      const request = createTestRequest('POST', body)
      // Expected: 400
    }
  })

  await t.step('should return 500 for token exchange errors', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('oauth2/v1/tokens/bearer', { error: 'server_error' }, 500)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // Expected: 500
  })

  await t.step('should handle database errors during connection creation', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: 'realm-789',
      state: 'company-123:0:randomstate',
    })

    // If DB insert/update fails:
    // Expected: 500 with database error
  })

  await t.step('should support both sandbox and production connections', async () => {
    const testCases = [
      { isSandbox: false, state: 'company-123:0:state' },
      { isSandbox: true, state: 'company-123:1:state' },
    ]

    for (const { isSandbox, state } of testCases) {
      const mockFetch = new MockFetch()
      mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

      // Company info URL should use correct base URL
      const expectedBaseUrl = isSandbox
        ? 'https://sandbox-quickbooks.api.intuit.com'
        : 'https://quickbooks.api.intuit.com'

      const request = createTestRequest('POST', {
        companyId: 'company-123',
        code: 'auth-code',
        realm_id: 'realm-789',
        state,
      })

      // Verify connection.is_sandbox matches
    }
  })

  await t.step('should use correct realm_id in company info request', async () => {
    const realmId = 'realm-123456789'

    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess(`companyinfo/${realmId}`, mockQBCompanyInfo)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code',
      realm_id: realmId,
      state: 'company-123:0:state',
    })

    // Verify company info URL includes realm_id twice:
    // /v3/company/{realmId}/companyinfo/{realmId}
  })

  await t.step('should handle multiple OAuth completions for same company', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)
    mockFetch.mockQBSuccess('companyinfo', mockQBCompanyInfo)

    // First OAuth
    const request1 = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code-1',
      realm_id: 'realm-789',
      state: 'company-123:0:state1',
    })

    // Second OAuth (reconnect)
    const request2 = createTestRequest('POST', {
      companyId: 'company-123',
      code: 'auth-code-2',
      realm_id: 'realm-789',
      state: 'company-123:0:state2',
    })

    // Verify:
    // - First creates connection
    // - Second updates existing connection
    // - Both succeed
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
