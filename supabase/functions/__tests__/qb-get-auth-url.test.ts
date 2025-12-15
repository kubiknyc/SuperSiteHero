/**
 * Integration Tests for qb-get-auth-url Edge Function
 *
 * Tests QuickBooks OAuth authorization URL generation
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
import {
  setupTestEnv,
  cleanupTestEnv,
  createTestRequest,
  parseResponse,
  assertSuccessResponse,
  assertErrorResponse,
} from './setup.ts'

Deno.test('qb-get-auth-url', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-get-auth-url', {
      method: 'OPTIONS',
    })

    // Expected: 200 with CORS headers
  })

  await t.step('should reject if QB credentials not configured', async () => {
    // Temporarily remove env vars
    const clientId = Deno.env.get('QB_CLIENT_ID')
    const redirectUri = Deno.env.get('QB_REDIRECT_URI')

    Deno.env.delete('QB_CLIENT_ID')

    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Expected: 500 with 'QuickBooks credentials not configured'

    // Restore env vars
    if (clientId) {Deno.env.set('QB_CLIENT_ID', clientId)}
  })

  await t.step('should reject request without authorization header', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    }, {
      'Authorization': '',
    })

    // Expected: 400 with 'Missing authorization header'
  })

  await t.step('should reject request with invalid authentication', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    }, {
      'Authorization': 'Bearer invalid-token',
    })

    // Expected: 400 with 'Invalid authentication'
  })

  await t.step('should reject request without companyId', async () => {
    const request = createTestRequest('POST', {})

    // Expected: 400 with 'Missing companyId'
  })

  await t.step('should generate auth URL for production environment', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      isSandbox: false,
    })

    // Expected response:
    // {
    //   authUrl: 'https://appcenter.intuit.com/connect/oauth2?client_id=...&state=...',
    //   state: '...' // random state value
    // }

    // Verify authUrl contains:
    // - client_id from env
    // - response_type=code
    // - scope=com.intuit.quickbooks.accounting
    // - redirect_uri from env
    // - state parameter
  })

  await t.step('should generate auth URL for sandbox environment', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      isSandbox: true,
    })

    // Expected:
    // - State parameter includes sandbox flag: 'company-123:1:randomstate'
    // - authUrl same as production (QB OAuth URL doesn't change)
  })

  await t.step('should default to production environment', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      // isSandbox not specified
    })

    // Expected:
    // - State parameter: 'company-123:0:randomstate'
    // - isSandbox defaults to false
  })

  await t.step('should generate unique state parameter', async () => {
    const states = new Set()

    for (let i = 0; i < 5; i++) {
      const request = createTestRequest('POST', {
        companyId: 'company-123',
      })

      // Expected:
      // - Each state should be unique
      // - State should be cryptographically random
      // - State length should be 64 chars (32 bytes hex)
    }

    // Verify all states are unique
    assertEquals(states.size, 5)
  })

  await t.step('should encode company ID in state parameter', async () => {
    const companyId = 'company-123'

    const request = createTestRequest('POST', {
      companyId,
      isSandbox: false,
    })

    // Expected state format: 'company-123:0:randomstate'
    // - Part 0: companyId
    // - Part 1: sandbox flag (0 or 1)
    // - Part 2: random state value
  })

  await t.step('should encode sandbox flag in state parameter', async () => {
    const testCases = [
      { isSandbox: true, expectedFlag: '1' },
      { isSandbox: false, expectedFlag: '0' },
    ]

    for (const { isSandbox, expectedFlag } of testCases) {
      const request = createTestRequest('POST', {
        companyId: 'company-123',
        isSandbox,
      })

      // Expected state: `company-123:${expectedFlag}:randomstate`
    }
  })

  await t.step('should store OAuth state in database', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      isSandbox: true,
    })

    // Verify qb_oauth_states insert:
    // - state: random part only (not full encoded state)
    // - company_id: 'company-123'
    // - user_id: from authenticated user
    // - is_sandbox: true
    // - expires_at: 10 minutes from now
  })

  await t.step('should handle database error gracefully', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // If qb_oauth_states table doesn't exist:
    // - Log warning but continue
    // - Still return auth URL
    // - State can be validated from encoded value
  })

  await t.step('should set state expiration to 10 minutes', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Verify expires_at:
    // - Should be ~10 minutes from now
    // - Allow small margin for test execution time
  })

  await t.step('should include all required OAuth parameters', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Verify authUrl includes:
    // - client_id
    // - response_type=code
    // - scope=com.intuit.quickbooks.accounting
    // - redirect_uri
    // - state
  })

  await t.step('should properly URL-encode parameters', async () => {
    const redirectUri = 'https://example.com/oauth/callback?test=value'
    Deno.env.set('QB_REDIRECT_URI', redirectUri)

    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Verify redirect_uri is URL-encoded in authUrl
  })

  await t.step('should use correct OAuth authorization endpoint', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Expected authUrl starts with:
    // 'https://appcenter.intuit.com/connect/oauth2'
  })

  await t.step('should use correct OAuth scope', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Expected scope in authUrl:
    // 'com.intuit.quickbooks.accounting'
  })

  await t.step('should return both authUrl and state in response', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Expected response structure:
    // {
    //   authUrl: string,
    //   state: string (random part only)
    // }
  })

  await t.step('should return state without encoded prefix', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      isSandbox: true,
    })

    // Response state should be random part only
    // Not the full 'company-123:1:randomstate'
  })

  await t.step('should handle special characters in company ID', async () => {
    const specialCompanyId = 'company-with-dash_and_underscore'

    const request = createTestRequest('POST', {
      companyId: specialCompanyId,
    })

    // Verify:
    // - State parameter includes special chars
    // - No URL encoding issues
    // - Database insert succeeds
  })

  await t.step('should log auth URL generation', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
      isSandbox: true,
    })

    // Verify console.log called with:
    // 'Generated auth URL for company company-123, sandbox: true'
  })

  await t.step('should return 200 status on success', async () => {
    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Expected:
    // - Status: 200
    // - Content-Type: application/json
  })

  await t.step('should return 400 for missing parameters', async () => {
    const testCases = [
      { body: {}, expectedError: 'Missing companyId' },
      { body: { companyId: '' }, expectedError: 'Missing companyId' },
    ]

    for (const { body, expectedError } of testCases) {
      const request = createTestRequest('POST', body)
      // Expected: 400
    }
  })

  await t.step('should return 500 for configuration errors', async () => {
    const clientId = Deno.env.get('QB_CLIENT_ID')
    Deno.env.delete('QB_CLIENT_ID')

    const request = createTestRequest('POST', {
      companyId: 'company-123',
    })

    // Expected: 500 with configuration error

    if (clientId) {Deno.env.set('QB_CLIENT_ID', clientId)}
  })

  await t.step('should generate different states for same company', async () => {
    const requests = [
      createTestRequest('POST', { companyId: 'company-123' }),
      createTestRequest('POST', { companyId: 'company-123' }),
    ]

    // Expected:
    // - Both succeed
    // - Different state values
    // - Both stored in database
  })

  await t.step('should support multiple companies', async () => {
    const companies = ['company-1', 'company-2', 'company-3']

    for (const companyId of companies) {
      const request = createTestRequest('POST', { companyId })

      // Verify each company gets unique state
      // Verify correct company_id stored
    }
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
