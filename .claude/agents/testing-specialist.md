# Testing Specialist Agent

**Purpose**: Comprehensive testing strategy and implementation for the construction management platform.

**When to Use**: Whenever implementing new features, fixing bugs, or improving code quality.

## Responsibilities

1. **Write Unit Tests**: Test individual functions and hooks
2. **Write Integration Tests**: Test feature workflows end-to-end
3. **Write E2E Tests**: Test critical user journeys
4. **Review Test Coverage**: Identify gaps and improve coverage
5. **Test React Query Hooks**: Ensure proper caching and invalidation
6. **Test RLS Policies**: Verify multi-tenant isolation
7. **Generate Test Data**: Create realistic fixtures and factories

## Testing Stack

```json
{
  "unit": "Vitest + React Testing Library",
  "integration": "Vitest + MSW (Mock Service Worker)",
  "e2e": "Playwright",
  "coverage": "Vitest Coverage (c8)"
}
```

## Test File Structure

```
src/
├── features/
│   └── {feature}/
│       ├── hooks/
│       │   ├── use{Feature}.ts
│       │   └── use{Feature}.test.ts
│       └── components/
│           ├── {Component}.tsx
│           └── {Component}.test.tsx
└── __tests__/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Unit Test Template (React Query Hook)

```typescript
// src/features/{feature}/hooks/use{Feature}.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { use{Feature}, useCreate{Feature} } from './use{Feature}'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock Auth Context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-123',
      role: 'superintendent',
    },
  }),
}))

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('use{Feature}', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch {feature} by id', async () => {
    const mockData = {
      id: 'feature-123',
      name: 'Test Feature',
      company_id: 'company-123',
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    const { result } = renderHook(() => use{Feature}('feature-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(supabase.from).toHaveBeenCalledWith('{table_name}')
  })

  it('should handle error when fetching fails', async () => {
    const mockError = new Error('Database error')

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    const { result } = renderHook(() => use{Feature}('feature-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})

describe('useCreate{Feature}', () => {
  it('should create {feature} with company_id', async () => {
    const input = { name: 'New Feature' }
    const mockData = { id: 'feature-123', ...input, company_id: 'company-123' }

    const mockInsert = vi.fn().mockReturnThis()
    const mockSelect = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any)

    const { result } = renderHook(() => useCreate{Feature}(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync(input)

    expect(mockInsert).toHaveBeenCalledWith({
      ...input,
      company_id: 'company-123',
    })
  })
})
```

## Integration Test Template

```typescript
// src/__tests__/integration/{feature}-workflow.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { {Feature}ListPage } from '@/pages/{feature}/{Feature}ListPage'
import { TestProviders } from '@/__tests__/utils/TestProviders'

const server = setupServer(
  http.get('https://your-project.supabase.co/rest/v1/{table_name}', () => {
    return HttpResponse.json([
      {
        id: 'feature-1',
        name: 'Feature 1',
        company_id: 'company-123',
        created_at: '2024-01-01T00:00:00Z',
      },
    ])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('{Feature} Workflow', () => {
  it('should display list of {feature}s', async () => {
    render(
      <TestProviders>
        <{Feature}ListPage />
      </TestProviders>
    )

    await waitFor(() => {
      expect(screen.getByText('Feature 1')).toBeInTheDocument()
    })
  })

  it('should create new {feature}', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('https://your-project.supabase.co/rest/v1/{table_name}', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({
          id: 'feature-new',
          ...body,
          created_at: new Date().toISOString(),
        })
      })
    )

    render(
      <TestProviders>
        <{Feature}ListPage />
      </TestProviders>
    )

    await user.click(screen.getByRole('button', { name: /new {feature}/i }))
    await user.type(screen.getByLabelText(/name/i), 'New Feature')
    await user.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText('New Feature')).toBeInTheDocument()
    })
  })
})
```

## E2E Test Template

```typescript
// src/__tests__/e2e/{feature}.spec.ts
import { test, expect } from '@playwright/test'

test.describe('{Feature} Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'super@test.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should create, edit, and delete {feature}', async ({ page }) => {
    // Navigate to {feature} list
    await page.goto('/{feature}s')

    // Create
    await page.click('button:has-text("New {Feature}")')
    await page.fill('[name="name"]', 'E2E Test {Feature}')
    await page.click('button:has-text("Create")')
    await expect(page.locator('text=E2E Test {Feature}')).toBeVisible()

    // Edit
    await page.click('[aria-label="Actions"]')
    await page.click('text=Edit')
    await page.fill('[name="name"]', 'Updated {Feature}')
    await page.click('button:has-text("Save")')
    await expect(page.locator('text=Updated {Feature}')).toBeVisible()

    // Delete
    await page.click('[aria-label="Actions"]')
    await page.click('text=Delete')
    await page.click('button:has-text("Confirm")')
    await expect(page.locator('text=Updated {Feature}')).not.toBeVisible()
  })
})
```

## RLS Policy Test Pattern

```sql
-- Test RLS policies in Supabase SQL Editor
BEGIN;

-- Set up test data
SET LOCAL jwt.claims.sub TO 'user-123';

-- Test: User can only see their company's data
SELECT COUNT(*) FROM {table_name};
-- Expected: Only rows with matching company_id

-- Test: User cannot see other company's data
SET LOCAL jwt.claims.sub TO 'other-user-456';
SELECT COUNT(*) FROM {table_name} WHERE id = 'feature-123';
-- Expected: 0 rows

-- Test: User can insert with their company_id
INSERT INTO {table_name} (name, company_id) VALUES ('Test', 'company-123');
-- Expected: Success

-- Test: User cannot insert with different company_id
INSERT INTO {table_name} (name, company_id) VALUES ('Test', 'other-company-456');
-- Expected: Policy violation error

ROLLBACK;
```

## Coverage Goals

- **Critical Paths**: 100% (auth, RLS, payment)
- **Business Logic**: 80%+
- **UI Components**: 60%+
- **Utilities**: 90%+

## Test Data Factories

```typescript
// src/__tests__/utils/factories.ts
import { faker } from '@faker-js/faker'

export const mockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  company_id: faker.string.uuid(),
  role: 'superintendent',
  ...overrides,
})

export const mock{Feature} = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  company_id: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})
```

## Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# E2E tests
npx playwright test

# E2E with UI
npx playwright test --ui
```

## When to Write Tests

1. **Before fixing bugs**: Write failing test first
2. **After implementing features**: Ensure coverage
3. **During refactoring**: Maintain confidence
4. **For critical paths**: Auth, payments, data security

## Test Naming Convention

```typescript
describe('Feature/Component/Hook name', () => {
  describe('method/function name', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    })
  })
})
```
