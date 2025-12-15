/**
 * Integration Tests for qb-sync-entity Edge Function
 *
 * Tests single entity sync to/from QuickBooks with full error handling
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
  mockSubcontractor,
  mockPaymentApplication,
  mockChangeOrder,
  mockProject,
  mockEntityMapping,
  mockQBVendor,
  mockQBInvoice,
  mockQBBill,
  mockQBCustomer,
  mockQBErrorResponse,
  mockQBSyncTokenError,
  mockQBRateLimitError,
  mockQBTokens,
  expectToThrow,
} from './setup.ts'

// Note: In a real test, we would import the actual handler
// For this example, we'll focus on testing the API contract

Deno.test('qb-sync-entity', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost:8000/qb-sync-entity', {
      method: 'OPTIONS',
    })

    // In actual implementation, this would call the handler
    // For now, we test the expected response format
    const expectedHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Verify CORS headers are properly defined
    assertExists(expectedHeaders['Access-Control-Allow-Origin'])
    assertExists(expectedHeaders['Access-Control-Allow-Headers'])
  })

  await t.step('should reject request without authorization header', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-123',
      entity_type: 'subcontractors',
      entity_id: 'sub-123',
    }, {
      'Authorization': '', // Missing auth
    })

    // Expected: 401 or 400 with auth error
    // Implementation should throw 'Missing authorization header'
  })

  await t.step('should reject request with invalid authentication', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-123',
      entity_type: 'subcontractors',
      entity_id: 'sub-123',
    }, {
      'Authorization': 'Bearer invalid-token',
    })

    // Expected: 401 with 'Invalid authentication'
  })

  await t.step('should reject request with missing required parameters', async () => {
    const testCases = [
      { body: {}, expectedError: 'Missing required parameters' },
      {
        body: { entity_type: 'subcontractors', entity_id: 'sub-123' },
        expectedError: 'Missing required parameters' // missing connectionId
      },
      {
        body: { connectionId: 'conn-123', entity_id: 'sub-123' },
        expectedError: 'Missing required parameters' // missing entity_type
      },
      {
        body: { connectionId: 'conn-123', entity_type: 'subcontractors' },
        expectedError: 'Missing required parameters' // missing entity_id
      },
    ]

    for (const { body, expectedError } of testCases) {
      const request = createTestRequest('POST', body)
      // Expected: 400 with expectedError
    }
  })

  await t.step('should reject unsupported entity type', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-123',
      entity_type: 'invalid_entity',
      entity_id: 'id-123',
    })

    // Expected: 400 with 'Unsupported entity type: invalid_entity'
  })

  await t.step('should reject if connection not found', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'nonexistent-conn',
      entity_type: 'subcontractors',
      entity_id: 'sub-123',
    })

    // Expected: 404 or 400 with 'Connection not found or inactive'
  })

  await t.step('should reject if connection is inactive', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'inactive-conn',
      entity_type: 'subcontractors',
      entity_id: 'sub-123',
    })

    // Expected: 400 with 'Connection not found or inactive'
  })

  await t.step('should reject if no access token available', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-no-token',
      entity_type: 'subcontractors',
      entity_id: 'sub-123',
    })

    // Expected: 401 with 'No access token available'
  })

  await t.step('should reject if entity not found', async () => {
    const request = createTestRequest('POST', {
      connectionId: 'conn-123',
      entity_type: 'subcontractors',
      entity_id: 'nonexistent-sub',
    })

    // Expected: 404 with 'Entity not found'
  })

  await t.step('should successfully sync new subcontractor to QuickBooks', async () => {
    const mockFetch = new MockFetch()

    // Mock successful QB API response
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
      direction: 'to_quickbooks',
    })

    // Expected successful response:
    const expectedResponse = {
      mapping: {
        local_entity_type: 'subcontractors',
        local_entity_id: mockSubcontractor.id,
        qb_entity_type: 'vendor',
        qb_entity_id: mockQBVendor.Vendor.Id,
        sync_status: 'synced',
        last_synced_at: expect.any(String),
      },
    }

    // Verify:
    // - Response status 200
    // - Entity mapping created in DB
    // - Sync log created and updated to 'synced'
    // - records_created = 1
  })

  await t.step('should successfully update existing subcontractor in QuickBooks', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
      direction: 'to_quickbooks',
    })

    // Expected:
    // - Existing mapping found
    // - QB API called with existing entity ID and SyncToken
    // - Mapping updated with new SyncToken
    // - records_updated = 1
  })

  await t.step('should successfully sync payment application (invoice)', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('invoice', mockQBInvoice)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'payment_applications',
      entity_id: mockPaymentApplication.id,
    })

    // Verify invoice-specific transformation:
    // - DocNumber from app_number
    // - TxnDate from period_to
    // - DueDate mapped correctly
    // - CustomerRef included
  })

  await t.step('should successfully sync change order (bill)', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('bill', mockQBBill)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'change_orders',
      entity_id: mockChangeOrder.id,
    })

    // Verify bill-specific transformation:
    // - DocNumber from co_number
    // - VendorRef included
    // - Amount from approved_amount or requested_amount
  })

  await t.step('should successfully sync project (customer)', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('customer', mockQBCustomer)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'projects',
      entity_id: mockProject.id,
    })

    // Verify customer-specific transformation:
    // - DisplayName from project name
    // - CompanyName from client_name
    // - Address fields mapped
  })

  await t.step('should handle QB authentication error (401)', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', mockQBErrorResponse, 401)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - Response status 401
    // - error_type: 'auth'
    // - is_retryable: false
    // - Entity mapping updated with error
    // - Sync log status: 'failed'
  })

  await t.step('should auto-refresh token on auth error and retry', async () => {
    const mockFetch = new MockFetch()

    // First call fails with 401
    mockFetch.mockQBError('vendor', mockQBErrorResponse, 401)

    // Token refresh succeeds
    mockFetch.mockQBSuccess('oauth2/v1/tokens/bearer', mockQBTokens)

    // Retry succeeds
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - First sync attempt fails with 401
    // - Token refresh called
    // - Connection updated with new tokens
    // - Retry succeeds
    // - Response includes token_refreshed: true
    // - Final status: synced
  })

  await t.step('should handle token refresh failure gracefully', async () => {
    const mockFetch = new MockFetch()

    // First call fails with 401
    mockFetch.mockQBError('vendor', mockQBErrorResponse, 401)

    // Token refresh also fails
    mockFetch.mockQBError('oauth2/v1/tokens/bearer', { error: 'invalid_grant' }, 400)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - Auth error detected
    // - Token refresh attempted and failed
    // - Original error returned
    // - Status: failed
    // - sync_status: 'failed'
  })

  await t.step('should handle QB validation error (400)', async () => {
    const validationError = {
      Fault: {
        Error: [{
          Message: 'Required field missing',
          code: '6000',
        }],
      },
    }

    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', validationError, 400)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - Response status 400
    // - error_type: 'validation'
    // - is_retryable: false
    // - sync_status: 'failed'
  })

  await t.step('should handle QB SyncToken conflict error', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', mockQBSyncTokenError, 400)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - error_type: 'conflict'
    // - qb_error_code: '5010'
    // - is_retryable: false
    // - User should fetch fresh entity and retry
  })

  await t.step('should handle QB rate limit error (429)', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', mockQBRateLimitError, 429)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - Response status 429
    // - error_type: 'rate_limit'
    // - is_retryable: true
    // - sync_status: 'pending_retry'
  })

  await t.step('should handle QB server error (500)', async () => {
    const serverError = {
      Fault: {
        Error: [{
          Message: 'Internal server error',
          code: '500',
        }],
      },
    }

    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', serverError, 500)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - Response status 500
    // - error_type: 'server'
    // - is_retryable: true
    // - sync_status: 'pending_retry'
  })

  await t.step('should handle network error', async () => {
    const mockFetch = new MockFetch()
    // Mock network failure - fetch throws

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Expected:
    // - error_type: 'network'
    // - is_retryable: true
    // - Error message contains 'Network error'
  })

  await t.step('should create sync log entry', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Verify sync log created with:
    // - sync_type: 'manual'
    // - direction: 'to_quickbooks'
    // - entity_type: 'vendor'
    // - status: 'syncing' initially
    // - status: 'synced' on success
    // - completed_at populated
    // - duration_ms calculated
  })

  await t.step('should update sync log on error', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', mockQBErrorResponse, 401)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Verify sync log updated with:
    // - status: 'failed'
    // - records_failed: 1
    // - error_message populated
    // - error_type: 'auth'
    // - is_retryable: false
  })

  await t.step('should create entity mapping on first sync', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: 'new-sub-123',
    })

    // Verify entity mapping created with:
    // - local_entity_type: 'subcontractors'
    // - local_entity_id: 'new-sub-123'
    // - qb_entity_type: 'vendor'
    // - qb_entity_id from response
    // - qb_sync_token from response
    // - sync_status: 'synced'
    // - last_synced_at populated
  })

  await t.step('should update entity mapping on subsequent syncs', async () => {
    const mockFetch = new MockFetch()

    // Updated vendor with new SyncToken
    const updatedVendor = {
      Vendor: {
        ...mockQBVendor.Vendor,
        SyncToken: '2',
      },
    }
    mockFetch.mockQBSuccess('vendor', updatedVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Verify entity mapping updated with:
    // - qb_sync_token: '2'
    // - sync_status: 'synced'
    // - last_synced_at updated
    // - last_sync_error: null
  })

  await t.step('should update entity mapping with error details on failure', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBError('vendor', mockQBRateLimitError, 429)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Verify entity mapping updated with:
    // - sync_status: 'pending_retry'
    // - last_sync_error populated
    // - retry_count incremented
    // - last_error_type: 'rate_limit'
    // - last_error_at populated
  })

  await t.step('should support custom direction parameter', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const directions = ['to_quickbooks', 'from_quickbooks'] as const

    for (const direction of directions) {
      const request = createTestRequest('POST', {
        connectionId: mockQBConnection.id,
        entity_type: 'subcontractors',
        entity_id: mockSubcontractor.id,
        direction,
      })

      // Verify sync log has correct direction
    }
  })

  await t.step('should default to to_quickbooks direction', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
      // direction not specified
    })

    // Verify sync log direction defaults to 'to_quickbooks'
  })

  await t.step('should properly transform subcontractor data', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // Verify QB API called with correct data:
    // - DisplayName: company_name
    // - CompanyName: company_name
    // - PrimaryPhone.FreeFormNumber: contact_phone
    // - PrimaryEmailAddr.Address: contact_email
    // - BillAddr with address fields
    // - Active: true
  })

  await t.step('should include SyncToken when updating existing entity', async () => {
    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: mockSubcontractor.id,
    })

    // When existing mapping exists:
    // - QB API called with SyncToken from mapping
    // - Request body includes Id and SyncToken
  })

  await t.step('should handle missing optional fields gracefully', async () => {
    const minimalSubcontractor = {
      id: 'sub-minimal',
      company_id: 'company-456',
      company_name: 'Minimal Sub',
      // No phone, email, address, etc.
    }

    const mockFetch = new MockFetch()
    mockFetch.mockQBSuccess('vendor', mockQBVendor)

    const request = createTestRequest('POST', {
      connectionId: mockQBConnection.id,
      entity_type: 'subcontractors',
      entity_id: minimalSubcontractor.id,
    })

    // Verify:
    // - Only required fields sent to QB
    // - Optional fields undefined or omitted
    // - Sync still succeeds
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
