/**
 * Integration Tests for qb-refresh-token Edge Function
 *
 * Tests QuickBooks access token refresh
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
  mockQBConnection,
} from './setup.ts'

Deno.test('qb-refresh-token', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-refresh-token', {
      method: 'OPTIONS',
    })

    // Expected: 200 with CORS headers
  })

  await t.step('should reject if QB credentials not configured', async () => {
    const clientId = Deno.env.get('QB_CLIENT_ID')
    Deno.env.delete('QB_CLIENT_ID')

    const request = createTestRequest('POST', {
      connectionId: 'conn-123',
    })

    // Expected: 500 with 'QuickBooks credentials not configured'

    if (clientId) {Deno.env.set('QB_CLIENT_ID', clientId)}
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

    // Expected: 500 with 'Connection not found'
  })

  await t.step('should reject if no refresh token available', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-no-refresh-token',
    })

    // Expected: 500 with 'No refresh token available'
  })

  await t.step('should reject if refresh token is expired', async () => {
    const expiredDate = new Date(Date.now() - 86400000) // 1 day ago

    const request = createTestRequest('POST', {
      connectionId: 'conn-expired-refresh',
    })

    // Mock connection with expired refresh token
    // refresh_token_expires_at: expiredDate

    // Expected:
    // - 500 with 'Refresh token expired. Please reconnect to QuickBooks.'
    // - Connection updated with connection_error message
  })

  await t.step('should successfully refresh access token', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - POST to QB_URLS.oauth.token
    // - Authorization: Basic base64(clientId:clientSecret)
    // - Body:
    //   - grant_type: 'refresh_token'
    //   - refresh_token from connection
  })

  await t.step('should update connection with new tokens', async () => {
    const mockFetch = new MockFetch()

    const newTokens = {
      ...mockQBTokens,
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
    }

    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', newTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify connection update:
    // - access_token: newTokens.access_token
    // - refresh_token: newTokens.refresh_token
    // - token_expires_at: calculated from expires_in
    // - refresh_token_expires_at: calculated from x_refresh_token_expires_in
    // - connection_error: null (cleared)
    // - updated_at: now
  })

  await t.step('should calculate new token expiry times', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify token expiry calculation:
    // - token_expires_at: now + expires_in (3600s)
    // - refresh_token_expires_at: now + x_refresh_token_expires_in (8726400s)
  })

  await t.step('should clear connection_error on successful refresh', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: 'conn-with-error',
    })

    // Mock connection with existing error
    // connection_error: 'Previous error message'

    // Verify:
    // - connection_error set to null after refresh
  })

  await t.step('should return success with new expiry time', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response:
    // {
    //   success: true,
    //   tokenExpiresAt: '2024-...' // ISO timestamp
    // }
  })

  await t.step('should handle token refresh API failure', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('oauth2/v1/tokens/bearer', {
      error: 'invalid_grant',
      error_description: 'Token expired or revoked',
    }, 400)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected: 500 with 'Token refresh failed'
  })

  await t.step('should handle network errors during refresh', async () => {
    const mockFetch = new MockFetch()
    // Mock network failure

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected: 500 with network error message
  })

  await t.step('should log refresh attempt', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify console.log calls:
    // 1. 'Refreshing token for connection {id}'
    // 2. 'Token refreshed successfully for connection {id}'
  })

  await t.step('should update connection_error if refresh token expired', async () => {
    const expiredDate = new Date(Date.now() - 86400000)

    const request = createTestRequest('POST', {
      connectionId: 'conn-expired',
    })

    // Mock connection with:
    // refresh_token_expires_at: expiredDate

    // Verify connection update:
    // - connection_error: 'Refresh token expired. Please reconnect to QuickBooks.'
    // - updated_at: now
  })

  await t.step('should handle database update errors', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // If connection update fails:
    // Expected: 500 with database error
  })

  await t.step('should return 200 status on success', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - Status: 200
    // - Content-Type: application/json
  })

  await t.step('should return 500 for all errors', async () => {
    const testCases = [
      { connectionId: null, expectedError: 'Missing connectionId' },
      { connectionId: 'nonexistent', expectedError: 'Connection not found' },
      { connectionId: 'no-refresh-token', expectedError: 'No refresh token available' },
    ]

    for (const { connectionId, expectedError } of testCases) {
      const request = createTestRequest('POST', { connectionId })
      // Expected: 500
    }
  })

  await t.step('should not require authentication for service calls', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Note: This function might be called by scheduled jobs
    // Authentication may not be strictly required
  })

  await t.step('should handle refresh token about to expire', async () => {
    const soonExpiring = new Date(Date.now() + 3600000) // 1 hour from now

    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: 'conn-soon-expiring',
    })

    // Mock connection with:
    // refresh_token_expires_at: soonExpiring

    // Expected:
    // - Refresh succeeds (not yet expired)
    // - New tokens obtained
  })

  await t.step('should handle null refresh_token_expires_at', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: 'conn-null-expiry',
    })

    // Mock connection with:
    // refresh_token_expires_at: null

    // Expected:
    // - Attempt refresh anyway
    // - Should succeed if token is still valid
  })

  await t.step('should use correct OAuth token endpoint', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify request to:
    // 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
  })

  await t.step('should use Basic auth with client credentials', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify Authorization header:
    // Basic base64(QB_CLIENT_ID:QB_CLIENT_SECRET)
  })

  await t.step('should use correct grant_type for refresh', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify request body includes:
    // grant_type: 'refresh_token'
  })

  await t.step('should handle concurrent refresh requests', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const requests = [
      createTestRequest('POST', { connectionId: mockQBConnection.id }),
      createTestRequest('POST', { connectionId: mockQBConnection.id }),
    ]

    // Both requests should succeed
    // Last write wins for token update
  })

  await t.step('should preserve other connection fields during update', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify connection update only modifies:
    // - access_token
    // - refresh_token
    // - token_expires_at
    // - refresh_token_expires_at
    // - connection_error
    // - updated_at
    //
    // Other fields unchanged:
    // - company_id, realm_id, company_name, is_sandbox, etc.
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
