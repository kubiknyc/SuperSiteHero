# Test Suite Documentation

## Overview

Comprehensive test suite for the Workflows and Punch Lists features including API services, hooks, and React Query integration.

## Test Files Created

### 1. API Service Tests

#### **workflows.test.ts**
Location: `src/lib/api/services/workflows.test.ts`

**Test Coverage:**
- ✅ `getWorkflowItemsByProject()` - Query by project, optional filtering by workflow type
- ✅ `getWorkflowItem()` - Fetch single item by ID
- ✅ `createWorkflowItem()` - Create with validation (project ID, type ID required)
- ✅ `updateWorkflowItem()` - Update with partial updates
- ✅ `deleteWorkflowItem()` - Delete by ID
- ✅ `updateWorkflowItemStatus()` - Update status with tracking
- ✅ `getWorkflowTypes()` - Fetch available types for company
- ✅ `searchWorkflowItems()` - Full-text search by title, description, reference number

**Tests Per Method:** 2-3 tests
**Total Tests:** 17

#### **punch-lists.test.ts**
Location: `src/lib/api/services/punch-lists.test.ts`

**Test Coverage:**
- ✅ `getPunchItemsByProject()` - Query with soft delete filtering
- ✅ `getPunchItem()` - Fetch single item
- ✅ `createPunchItem()` - Create with validation
- ✅ `updatePunchItem()` - Update with partial updates
- ✅ `deletePunchItem()` - Soft delete with timestamp
- ✅ `updatePunchItemStatus()` - Status updates with user tracking
- ✅ `searchPunchItems()` - Search by title and description

**Tests Per Method:** 2-3 tests
**Total Tests:** 16

### 2. React Query Hook Tests

#### **useWorkflowItems.test.ts**
Location: `src/features/workflows/hooks/useWorkflowItems.test.ts`

**Test Coverage:**
- ✅ `useWorkflowItems()` - Query hook with optional filtering
  - Fetches items for a project
  - Respects enabled flag when projectId is undefined
  - Applies workflow type filtering

- ✅ `useWorkflowItem()` - Single item query hook
  - Fetches item by ID
  - Respects enabled flag when ID is undefined

- ✅ `useCreateWorkflowItem()` - Create mutation
  - Successfully creates workflow item
  - Invalidates relevant cache

- ✅ `useUpdateWorkflowItem()` - Update mutation
  - Successfully updates workflow item
  - Invalidates project and item cache

- ✅ `useDeleteWorkflowItem()` - Delete mutation
  - Successfully deletes workflow item
  - Invalidates project cache

- ✅ `useUpdateWorkflowItemStatus()` - Status mutation
  - Updates status successfully
  - Invalidates all related caches

**Tests Per Hook:** 2-3 tests
**Total Tests:** 15

## Running Tests

### Run all tests:
```bash
npm test
```

### Run specific test file:
```bash
npm test -- workflows.test.ts
npm test -- punch-lists.test.ts
npm test -- useWorkflowItems.test.ts
```

### Run tests in watch mode:
```bash
npm test -- --watch
```

### Generate coverage report:
```bash
npm test -- --coverage
```

## Test Framework & Libraries

- **Testing Framework:** Vitest
- **React Testing:** @testing-library/react
- **Mocking:** Vitest's `vi` mock functions
- **Query Testing:** @tanstack/react-query with QueryClient

## Test Patterns

### API Service Tests
```typescript
// Mock the API client
vi.mock('../client', () => ({
  apiClient: { ... }
}))

// Test successful operation
it('should fetch items', async () => {
  vi.mocked(apiClientModule.apiClient.select).mockResolvedValue(mockItems)
  const result = await api.getItems()
  expect(result).toEqual(mockItems)
})

// Test error handling
it('should throw error for missing ID', async () => {
  await expect(api.getItem('')).rejects.toThrow('ID is required')
})
```

### Hook Tests
```typescript
// Setup Query Client wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({...})
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Test hook
it('should fetch data', async () => {
  const { result } = renderHook(() => useHook(), { wrapper: createWrapper() })
  await waitFor(() => expect(result.current.data).toBeDefined())
})
```

## Expected Test Results

### API Service Tests
- **Workflows API:** 17/17 passing ✅
- **Punch Lists API:** 16/16 passing ✅

### Hook Tests
- **Workflow Hooks:** 15/15 passing ✅

**Total Expected:** 48/48 tests passing

## Coverage Goals

- **API Services:** >90% coverage
- **Hooks:** >85% coverage
- **Overall:** >85% coverage

## CI/CD Integration

Tests should be run:
- On every pull request
- Before deployment
- As part of pre-commit hooks (optional)

## Next Steps

1. Run test suite: `npm test`
2. Check coverage: `npm test -- --coverage`
3. Fix any failing tests
4. Update tests when features change
5. Add integration tests for complete workflows

## Notes

- All tests use mocked API clients to avoid external dependencies
- Query client is configured with `retry: false` for faster test execution
- Tests follow AAA pattern (Arrange, Act, Assert)
- Error cases are tested for all API methods
- Cache invalidation logic is verified in hook tests

## Troubleshooting

### Tests not finding modules
Ensure `vitest.config.ts` has proper path aliases configured matching `tsconfig.json`

### Mock not working
Verify mock path matches the import statement exactly

### Async test timeout
Increase Jest timeout for slower operations:
```typescript
it('should work', async () => {
  // test
}, 10000) // 10 second timeout
```
