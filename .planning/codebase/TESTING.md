# Testing Overview

> Generated: 2026-01-13 | Project: JobSight (SuperSiteHero)

## Test Framework Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.0.16 | Unit testing |
| Playwright | 1.57.0 | E2E testing |
| @testing-library/react | 16.3.1 | Component testing |
| MSW | 2.12.4 | API mocking |
| fake-indexeddb | 6.2.5 | Offline mocking |
| Faker.js | 10.1.0 | Test data |

## Test Commands

```bash
# Unit Tests (Vitest)
npm run test               # Watch mode
npm run test:unit          # Single run, verbose
npm run test:coverage      # With coverage report
npm run test:ui            # Vitest UI

# E2E Tests (Playwright)
npm run test:e2e           # All browsers
npm run test:e2e:chromium  # Chromium only
npm run test:e2e:headed    # See browser
npm run test:e2e:debug     # Debug mode
npm run test:e2e:ui        # Playwright UI

# Visual Regression
npm run test:visual        # Run visual tests
npm run test:visual:update # Update baselines
```

## Test Structure

### File Placement (Co-located)
```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx              # Test next to component
├── features/
│   └── daily-reports/
│       ├── hooks/
│       │   ├── useDailyReports.ts
│       │   └── useDailyReports.test.ts
│       └── __tests__/
│           └── integration.test.tsx  # Feature integration tests
└── __tests__/
    ├── setup.tsx                     # Global setup
    ├── factories/                    # Test data factories
    ├── helpers/                      # Render helpers
    ├── mocks/                        # MSW handlers
    └── integration/                  # Cross-feature tests
```

### Naming Convention
- `.test.ts` - Unit tests
- `.spec.ts` - E2E tests (Playwright)
- `.test.tsx` - React component tests

## Unit Test Patterns

### Component Test
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from './Button'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Button', () => {
  const defaultProps = { onClick: vi.fn(), children: 'Click me' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with label', () => {
      render(<Button {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <Button {...defaultProps} className="custom" />,
        { wrapper: createWrapper() }
      )
      expect(container.querySelector('.custom')).toBeInTheDocument()
    })
  })
})
```

### Hook Test
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDailyReports } from './useDailyReports'
import { supabase } from '@/lib/supabase'
import { createWrapper } from '@/__tests__/helpers'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

describe('useDailyReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches daily reports', async () => {
    const mockReports = [{ id: '1', project_id: 'proj-1' }]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockReports, error: null }),
    } as any)

    const { result } = renderHook(
      () => useDailyReports('proj-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockReports)
  })
})
```

## Test Data Factories

### Location
`src/__tests__/factories/`

### Available Factories
- `user.factory.ts` - Users, sessions, roles
- `project.factory.ts` - Projects, assignments
- `dailyReport.factory.ts` - Reports, entries
- `document.factory.ts` - Documents, versions
- `syncConflict.factory.ts` - Sync conflicts
- `pendingSyncItem.factory.ts` - Offline items

### Usage Pattern
```typescript
import { faker } from '@faker-js/faker'

export function createMockUser(options = {}) {
  return {
    id: options.id ?? faker.string.uuid(),
    email: options.email ?? faker.internet.email(),
    full_name: options.full_name ?? faker.person.fullName(),
    role: options.role ?? 'superintendent',
    company_id: options.company_id ?? faker.string.uuid(),
    is_active: options.is_active ?? true,
    created_at: faker.date.past().toISOString(),
    ...options,
  }
}

export function createMockAdmin(options = {}) {
  return createMockUser({ ...options, role: 'admin' })
}
```

## Test Utilities

### Custom Render
```typescript
// src/__tests__/helpers/render.tsx
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    user = null,
    isAuthenticated = false,
    route = '/',
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options

  return {
    ...render(ui, { wrapper: AllProviders, ...renderOptions }),
    queryClient,
  }
}
```

### Response Helpers
```typescript
export const successResponse = (data) => ({ data, error: null })
export const errorResponse = (message) => ({ data: null, error: new Error(message) })
```

## API Mocking (MSW)

### Setup
```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(
  http.get('*/rest/v1/projects', () => {
    return HttpResponse.json({ data: [], error: null })
  })
)
```

### Handler Creation
```typescript
export function createSupabaseHandler(path, method, response) {
  return http[method.toLowerCase()](
    `*/rest/v1${path}`,
    () => HttpResponse.json(response)
  )
}
```

## E2E Test Patterns

### Setup
- **Global Setup**: `e2e/global-setup.ts` - Environment checks, auth sessions
- **Storage State**: Pre-authenticated sessions saved to `.auth/user.json`
- **Timeout**: 90s (tests), 300s (smoke tests)

### Test Structure
```typescript
import { test, expect } from '@playwright/test'

// Use pre-authenticated session
test.use({ storageState: 'playwright/.auth/user.json' })

test.describe('Daily Reports', () => {
  test('navigates to daily reports', async ({ page }) => {
    await page.goto('/daily-reports')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/daily-reports/)
    await expect(page.locator('h1')).toContainText('Daily Reports')
  })

  test('creates a daily report', async ({ page }) => {
    await page.goto('/daily-reports/new')

    // Fill form
    await page.locator('#project_select').selectOption({ index: 1 })

    // Submit
    await page.locator('button[type="submit"]').click()

    // Assert success
    await expect(page).toHaveURL(/daily-reports\//)
  })
})
```

### Visual Regression
```typescript
test('matches baseline', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 150,
    maxDiffPixelRatio: 0.03,
    animations: 'disabled',
  })
})
```

## Coverage Configuration

### Thresholds
```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    global: { lines: 70, branches: 70, functions: 70, statements: 70 },
    'src/lib/auth/**/*.ts': { lines: 80, branches: 80 },
    'src/lib/api/**/*.ts': { lines: 80, branches: 80 },
  }
}
```

### Excluded
- `node_modules/`
- `src/__tests__/`
- `**/*.d.ts`
- `**/*.config.*`
- `dist/`

## Global Setup

### Mocks (src/__tests__/setup.tsx)
```typescript
// Browser APIs
Object.defineProperty(window, 'matchMedia', { ... })
global.IntersectionObserver = class { ... }
global.ResizeObserver = class { ... }

// UI Libraries
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

// Icons (mock all Lucide icons)
vi.mock('lucide-react', async (importOriginal) => {
  const Icon = (props) => <svg {...props} />
  const actual = await importOriginal()
  return new Proxy(actual, {
    get: (target, prop) => typeof prop === 'symbol' ? target[prop] : Icon
  })
})
```

## CI/CD Integration

### GitHub Actions
```bash
npm run lint           # ESLint (max 3000 warnings)
npm run type-check    # TypeScript
npm run test:coverage # Unit tests (70%+ required)
npm run test:e2e      # E2E (Chromium only in CI)
```

### Environment Variables
```env
# .env.test
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=anon-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password
```

## Offline Testing

### IndexedDB Mock
```typescript
import 'fake-indexeddb/auto'
// Automatically mocks IndexedDB
```

### Sync Conflict Testing
```typescript
import { createSyncConflict } from '@/__tests__/factories/syncConflict.factory'

const conflict = createSyncConflict({
  tableName: 'daily_reports',
  localVersion: { ... },
  serverVersion: { ... },
})
```

## Security Testing

```bash
npm run security:lint      # ESLint security rules
npm run security:quick     # npm audit + lint
npm run security:deps      # Dependency audit
```
