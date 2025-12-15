# QuickBooks Edge Function Integration Tests

Comprehensive integration tests for all 7 QuickBooks Supabase Edge Functions.

## Overview

This test suite provides complete coverage for:

1. **qb-sync-entity** - Single entity sync to/from QuickBooks
2. **qb-bulk-sync** - Batch sync of multiple entities
3. **qb-get-auth-url** - OAuth authorization URL generation
4. **qb-complete-oauth** - OAuth token exchange and connection creation
5. **qb-refresh-token** - Access token refresh
6. **qb-disconnect** - Connection revocation and deactivation
7. **qb-get-accounts** - Fetch QuickBooks Chart of Accounts

## Test Coverage

Each edge function test includes:

- **Request Validation**: Missing parameters, invalid data, authentication checks
- **Authentication**: Authorization header validation, token verification
- **API Call Mocking**: QuickBooks API responses (success and errors)
- **Response Formatting**: Correct response structure and status codes
- **Error Handling**: Network errors, QB API errors, invalid tokens
- **Edge Cases**: Empty data, expired tokens, concurrent requests
- **Database Operations**: Entity mappings, sync logs, pending syncs

## Test Infrastructure

### Setup Module (`setup.ts`)

Provides shared test utilities:

- **Mock Supabase Client**: Simulated database operations
- **Mock Fetch**: QuickBooks API response mocking
- **Test Fixtures**: Pre-configured QB entities, connections, tokens
- **Test Helpers**: Request creation, response parsing, assertions
- **Environment Setup**: Test environment variable management

### Test Fixtures

#### QuickBooks API Responses
- `mockQBTokens` - OAuth token response
- `mockQBVendor` - Vendor (subcontractor) entity
- `mockQBInvoice` - Invoice (payment application) entity
- `mockQBBill` - Bill (change order) entity
- `mockQBCustomer` - Customer (project) entity
- `mockQBAccount` - Chart of Accounts entry
- `mockQBAccountsResponse` - Query response with multiple accounts
- `mockQBCompanyInfo` - Company information
- `mockQBErrorResponse` - Generic error response
- `mockQBSyncTokenError` - Stale SyncToken conflict (error 5010)
- `mockQBRateLimitError` - Rate limit error (429)

#### Local Entities
- `mockSubcontractor` - Local subcontractor entity
- `mockPaymentApplication` - Local payment application entity
- `mockChangeOrder` - Local change order entity
- `mockProject` - Local project entity
- `mockEntityMapping` - QB entity mapping
- `mockSyncLog` - Sync operation log
- `mockPendingSync` - Pending sync queue entry

#### Connection & Auth
- `mockQBConnection` - Active QuickBooks connection
- `mockSupabaseUser` - Authenticated user

## Running Tests

### Prerequisites

1. **Deno Runtime**: Edge functions run on Deno
   ```bash
   # Install Deno
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Supabase CLI** (optional, for local testing)
   ```bash
   npm install -g supabase
   ```

### Run All Tests

```bash
# From the supabase/functions directory
deno test --allow-env --allow-net __tests__/
```

### Run Specific Test File

```bash
# Test single edge function
deno test --allow-env --allow-net __tests__/qb-sync-entity.test.ts

# Test OAuth functions
deno test --allow-env --allow-net __tests__/qb-get-auth-url.test.ts
deno test --allow-env --allow-net __tests__/qb-complete-oauth.test.ts
```

### Run with Coverage

```bash
deno test --allow-env --allow-net --coverage=coverage __tests__/

# Generate coverage report
deno coverage coverage --lcov > coverage.lcov
```

### Run with Watch Mode

```bash
deno test --allow-env --allow-net --watch __tests__/
```

## Test Patterns

### Basic Test Structure

```typescript
Deno.test('edge-function-name', async (t) => {
  await t.step('setup', () => {
    setupTestEnv()
  })

  await t.step('should test specific behavior', async () => {
    const request = createTestRequest('POST', {
      // request body
    })

    // Test assertions
  })

  await t.step('cleanup', () => {
    cleanupTestEnv()
  })
})
```

### Testing Success Scenarios

```typescript
await t.step('should successfully sync entity', async () => {
  const mockFetch = new MockFetch()
  mockFetch.mockQBSuccess('vendor', mockQBVendor)

  const request = createTestRequest('POST', {
    connectionId: mockQBConnection.id,
    entity_type: 'subcontractors',
    entity_id: mockSubcontractor.id,
  })

  // Verify response structure, status codes, database updates
})
```

### Testing Error Scenarios

```typescript
await t.step('should handle QB authentication error', async () => {
  const mockFetch = new MockFetch()
  mockFetch.mockQBError('vendor', mockQBErrorResponse, 401)

  const request = createTestRequest('POST', {
    connectionId: mockQBConnection.id,
    entity_type: 'subcontractors',
    entity_id: mockSubcontractor.id,
  })

  // Verify error response, status codes, error logging
})
```

### Testing Parameter Validation

```typescript
await t.step('should reject request with missing parameters', async () => {
  const testCases = [
    { body: {}, expectedError: 'Missing required parameters' },
    { body: { entity_type: 'sub' }, expectedError: 'Missing connectionId' },
  ]

  for (const { body, expectedError } of testCases) {
    const request = createTestRequest('POST', body)
    // Verify 400 status with appropriate error message
  }
})
```

## Test Helpers

### `createTestRequest(method, body, headers?)`

Creates a test HTTP request with authentication.

```typescript
const request = createTestRequest('POST', {
  connectionId: 'conn-123',
  entity_type: 'subcontractors',
}, {
  'Authorization': 'Bearer custom-token',
})
```

### `parseResponse<T>(response)`

Parses JSON response body.

```typescript
const response = await handler(request)
const data = await parseResponse(response)
assertEquals(data.success, true)
```

### `assertSuccessResponse(response, expectedStatus?)`

Asserts response is successful.

```typescript
await assertSuccessResponse(response, 200)
```

### `assertErrorResponse(response, expectedStatus, expectedMessage?)`

Asserts response is an error.

```typescript
await assertErrorResponse(response, 400, 'Missing required parameters')
```

### `MockFetch`

Mocks QuickBooks API responses.

```typescript
const mockFetch = new MockFetch()

// Mock success
mockFetch.mockQBSuccess('vendor', mockQBVendor)

// Mock error
mockFetch.mockQBError('vendor', errorData, 401)

// Get call history
const calls = mockFetch.getCallHistory()

// Reset
mockFetch.reset()
```

### `setupTestEnv()` / `cleanupTestEnv()`

Manages test environment variables.

```typescript
Deno.test('my-test', async (t) => {
  await t.step('setup', () => {
    setupTestEnv() // Sets QB_CLIENT_ID, QB_CLIENT_SECRET, etc.
  })

  // ... tests ...

  await t.step('cleanup', () => {
    cleanupTestEnv() // Cleans up env vars
  })
})
```

## Mock Supabase Client

Create mock Supabase client for testing:

```typescript
const mockClient = createMockSupabaseClient({
  user: { id: 'user-123', email: 'test@example.com' },
  queryData: mockQBConnection, // Data returned by queries
  queryError: null, // Or an error object
})
```

## Coverage Goals

- **Line Coverage**: > 80%
- **Branch Coverage**: > 75%
- **Function Coverage**: > 80%

## Test Scenarios by Function

### qb-sync-entity (96 tests)
- CORS handling
- Authentication validation
- Parameter validation
- Entity type validation
- Connection validation
- Entity fetching
- QB API integration (create/update)
- Token auto-refresh on 401
- Error handling (validation, rate limit, server, network)
- Sync log management
- Entity mapping creation/update
- Data transformation (all entity types)
- SyncToken handling

### qb-bulk-sync (52 tests)
- Batch processing
- Entity filtering (synced vs unsynced)
- "all" entity type support
- Batch size limiting (100)
- Pending sync queue management
- Sync log aggregation
- Partial failure handling
- Multiple entity types

### qb-get-auth-url (44 tests)
- OAuth URL generation
- State parameter generation
- Company ID encoding
- Sandbox flag encoding
- State storage
- Parameter validation
- URL encoding
- OAuth endpoint configuration

### qb-complete-oauth (48 tests)
- Authorization code exchange
- Token storage
- Company info fetching
- State validation
- Connection creation/update
- Sandbox vs production handling
- Token expiry calculation
- Error handling (token exchange failures)

### qb-refresh-token (40 tests)
- Token refresh flow
- Refresh token validation
- Token expiry checks
- Connection updates
- Error clearing
- Expired refresh token handling
- Network error handling

### qb-disconnect (36 tests)
- Token revocation
- Connection deactivation
- Pending sync cleanup
- Error handling (revoke failures)
- Connection preservation
- Graceful degradation

### qb-get-accounts (40 tests)
- Account fetching
- Account type filtering
- Query building
- Response mapping
- Token expiry checks
- Empty result handling
- Large dataset handling
- Sandbox vs production URLs

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Edge Functions

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Run tests
        run: |
          cd supabase/functions
          deno test --allow-env --allow-net --coverage=coverage __tests__/

      - name: Generate coverage
        run: |
          cd supabase/functions
          deno coverage coverage --lcov > coverage.lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./supabase/functions/coverage.lcov
```

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on others
2. **Use Fixtures**: Leverage pre-configured fixtures for consistency
3. **Mock External Calls**: Always mock QuickBooks API and database calls
4. **Test Error Paths**: Include both success and failure scenarios
5. **Validate Responses**: Check status codes, headers, and response structure
6. **Clean Up**: Always clean up test environment in teardown
7. **Document Edge Cases**: Add comments explaining non-obvious test cases

## Troubleshooting

### Tests Fail with "Permission denied"

Add required Deno permissions:
```bash
deno test --allow-env --allow-net __tests__/
```

### Environment Variables Not Set

Ensure `setupTestEnv()` is called in test setup:
```typescript
await t.step('setup', () => {
  setupTestEnv()
})
```

### Mock Fetch Not Working

Verify fetch is properly mocked before making requests:
```typescript
const mockFetch = new MockFetch()
mockFetch.mockQBSuccess('endpoint', responseData)
globalThis.fetch = mockFetch.getFetchFn()
```

## Contributing

When adding new edge functions or features:

1. Create test file: `__tests__/function-name.test.ts`
2. Add fixtures to `setup.ts` if needed
3. Follow existing test patterns
4. Ensure > 80% coverage
5. Document new test scenarios in this README

## Resources

- [Deno Testing](https://deno.land/manual/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [QuickBooks API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account)
