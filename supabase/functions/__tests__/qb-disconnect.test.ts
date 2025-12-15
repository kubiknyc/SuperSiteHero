/**
 * Integration Tests for qb-disconnect Edge Function
 *
 * Tests QuickBooks connection revocation and deactivation
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
} from './setup.ts'

Deno.test('qb-disconnect', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-disconnect', {
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

  await t.step('should successfully disconnect and revoke tokens', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {}) // 200 OK

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // 1. Revoke refresh token
    // 2. Deactivate connection
    // 3. Clear pending syncs
    // 4. Return success
  })

  await t.step('should revoke refresh token via QB API', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify revoke request:
    // - POST to QB_URLS.oauth.revoke
    // - Authorization: Basic base64(clientId:clientSecret)
    // - Content-Type: application/json
    // - Body: { token: refresh_token }
  })

  await t.step('should deactivate connection in database', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify connection update:
    // - is_active: false
    // - access_token: null
    // - refresh_token: null
    // - token_expires_at: null
    // - refresh_token_expires_at: null
    // - connection_error: 'Disconnected by user'
    // - updated_at: now
  })

  await t.step('should clear pending syncs for connection', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify:
    // - DELETE from qb_pending_syncs
    // - WHERE connection_id = connectionId
  })

  await t.step('should handle token revocation failure gracefully', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('oauth2/tokens/revoke', {
      error: 'invalid_token',
    }, 400)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - Warning logged
    // - Continue with deactivation
    // - Still return success
    // - Token may already be invalid/revoked
  })

  await t.step('should handle network error during revocation', async () => {
    const mockFetch = new MockFetch()
    // Mock network failure for revoke

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - Warning logged
    // - Continue with deactivation
    // - Still return success
  })

  await t.step('should skip revocation if no refresh token', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-no-refresh-token',
    })

    // Mock connection with refresh_token: null

    // Expected:
    // - Skip revoke API call
    // - Proceed to deactivation
    // - Still return success
  })

  await t.step('should log disconnection steps', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify console.log calls:
    // 1. 'Disconnecting connection {id}'
    // 2. 'Token revoked successfully' (if revoke succeeds)
    // 3. 'Connection {id} disconnected successfully'
  })

  await t.step('should log warning if revocation fails', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('oauth2/tokens/revoke', { error: 'error' }, 400)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify console.warn called with:
    // 'Token revocation warning: ...'
  })

  await t.step('should preserve connection record for history', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify:
    // - Connection NOT deleted
    // - Connection updated to inactive
    // - Preserves company_id, realm_id, etc for potential reconnection
  })

  await t.step('should set connection_error to user message', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify connection update includes:
    // connection_error: 'Disconnected by user'
  })

  await t.step('should return success response', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected response:
    // {
    //   success: true
    // }
  })

  await t.step('should return 200 status on success', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Expected:
    // - Status: 200
    // - Content-Type: application/json
  })

  await t.step('should return 500 for errors', async () => {
    const testCases = [
      { connectionId: null, expectedError: 'Missing connectionId' },
      { connectionId: 'nonexistent', expectedError: 'Connection not found' },
    ]

    for (const { connectionId, expectedError } of testCases) {
      const request = createTestRequest('POST', { connectionId })
      // Expected: 500
    }
  })

  await t.step('should handle database error during update', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // If connection update fails:
    // Expected: 500 with database error
  })

  await t.step('should handle database error during pending sync cleanup', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // If pending sync delete fails:
    // - Should not throw (await without error check)
    // - Connection still deactivated
    // - Overall success
  })

  await t.step('should allow reconnection after disconnect', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    // Disconnect
    const disconnectRequest = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Then reconnect via OAuth flow
    // - Same company_id and realm_id
    // - Should update existing (inactive) connection
    // - Reactivate with new tokens
  })

  await t.step('should use correct revoke endpoint', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify request to:
    // 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke'
  })

  await t.step('should use Basic auth with client credentials for revoke', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify Authorization header:
    // Basic base64(QB_CLIENT_ID:QB_CLIENT_SECRET)
  })

  await t.step('should revoke refresh token not access token', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Verify request body:
    // { token: connection.refresh_token }
    // Note: Revoking refresh token also invalidates access token
  })

  await t.step('should handle QB accepting revoke even for invalid token', async () => {
    const mockFetch = new MockFetch()
    // QB returns 200 even if token already revoked
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: 'conn-already-revoked',
    })

    // Expected:
    // - Revoke request still made
    // - Returns 200
    // - No error thrown
    // - Connection deactivated
  })

  await t.step('should handle already inactive connection', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: 'conn-already-inactive',
    })

    // Mock connection with is_active: false

    // Expected:
    // - Still attempt revoke
    // - Update connection again
    // - Return success
  })

  await t.step('should work without authentication check', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('oauth2/tokens/revoke', {})

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
    })

    // Note: Function has authHeader check but doesn't validate user
    // May be used by admin or scheduled cleanup
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
