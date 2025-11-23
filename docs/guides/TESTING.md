# Testing Guide

Complete testing guide for the Construction Management Platform.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Coverage Goals](#coverage-goals)
- [Best Practices](#best-practices)

## Overview

This project uses a comprehensive testing strategy with three levels of testing:

1. **Unit Tests** - Test individual functions, hooks, and components in isolation
2. **Integration Tests** - Test feature workflows and component interactions
3. **E2E Tests** - Test complete user journeys in a real browser

## Testing Stack

### Unit & Integration Testing
- **Vitest** - Fast unit test framework (Vite-native)
- **React Testing Library** - Test React components from user's perspective
- **MSW (Mock Service Worker)** - Mock API requests
- **@faker-js/faker** - Generate realistic test data

### E2E Testing
- **Playwright** - Cross-browser end-to-end testing
- Supports Chrome, Firefox, Safari, and mobile viewports

## Running Tests

### Unit Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run unit tests only with verbose output
npm run test:unit
```

### E2E Tests

```bash
# First-time setup: Install Playwright browsers
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui

# Debug E2E tests (step through with debugger)
npm run test:e2e:debug
```

## Writing Tests

### Unit Test Example (React Query Hook)

Location: `src/features/{feature}/hooks/use{Feature}.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects, useCreateProject } from './useProjects';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { mockProject } from '@/__tests__/utils/factories';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Auth Context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-123',
      role: 'superintendent',
    },
  }),
}));

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch projects for user company', async () => {
    const mockProjects = [mockProject(), mockProject()];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProjects);
    expect(mockEq).toHaveBeenCalledWith('company_id', 'company-123');
  });
});
```

### Integration Test Example

Location: `src/__tests__/integration/{feature}-workflow.test.tsx`

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TestProviders } from '@/__tests__/utils/TestProviders';
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage';
import { mockProject } from '@/__tests__/utils/factories';

const server = setupServer(
  http.get('https://your-project.supabase.co/rest/v1/projects', () => {
    return HttpResponse.json([mockProject()]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Projects Workflow', () => {
  it('should create new project', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('https://your-project.supabase.co/rest/v1/projects', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(mockProject(body as any));
      })
    );

    render(
      <TestProviders>
        <ProjectsListPage />
      </TestProviders>
    );

    await user.click(screen.getByRole('button', { name: /new project/i }));
    await user.type(screen.getByLabelText(/name/i), 'New Project');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });
  });
});
```

### E2E Test Example

Location: `src/__tests__/e2e/{feature}.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create and edit project', async ({ page }) => {
    await page.goto('/projects');

    // Create
    await page.click('button:has-text("New Project")');
    await page.fill('[name="name"]', 'E2E Test Project');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=E2E Test Project')).toBeVisible();

    // Edit
    await page.click('[aria-label="Edit"]');
    await page.fill('[name="name"]', 'Updated Project');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Updated Project')).toBeVisible();
  });
});
```

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                    # Global test setup
│   ├── utils/
│   │   ├── TestProviders.tsx       # React Query & Router wrapper
│   │   └── factories.ts            # Mock data generators
│   ├── integration/                # Integration tests
│   │   └── {feature}-workflow.test.tsx
│   └── e2e/                        # E2E tests
│       └── {feature}.spec.ts
└── features/
    └── {feature}/
        └── hooks/
            ├── use{Feature}.ts
            └── use{Feature}.test.ts  # Co-located unit tests
```

## Test Utilities

### TestProviders

Wrapper component that provides all necessary context (React Query, Router):

```typescript
import { TestProviders } from '@/__tests__/utils/TestProviders';

render(
  <TestProviders>
    <YourComponent />
  </TestProviders>
);
```

For hooks:

```typescript
import { createWrapper } from '@/__tests__/utils/TestProviders';

const { result } = renderHook(() => useYourHook(), {
  wrapper: createWrapper(),
});
```

### Mock Data Factories

Generate realistic test data:

```typescript
import { mockProject, mockUser, mockDailyLog } from '@/__tests__/utils/factories';

const project = mockProject({
  name: 'Custom Name',
  status: 'active',
});

const projects = mockMany(mockProject, 5); // Generate 5 projects
```

## Coverage Goals

| Category | Target Coverage |
|----------|----------------|
| Critical Paths (auth, RLS, payments) | 100% |
| Business Logic | 80%+ |
| UI Components | 60%+ |
| Utilities | 90%+ |

View coverage report:

```bash
npm run test:coverage
open coverage/index.html
```

## Best Practices

### General

1. **Test behavior, not implementation**
   - Focus on what the user sees and does
   - Avoid testing internal state or implementation details

2. **Follow AAA pattern**
   ```typescript
   it('should do something', () => {
     // Arrange - Set up test data
     const input = mockProject();

     // Act - Perform the action
     const result = doSomething(input);

     // Assert - Verify the result
     expect(result).toBe(expectedValue);
   });
   ```

3. **Use descriptive test names**
   ```typescript
   // Good
   it('should throw error when company_id is missing', () => {});

   // Bad
   it('test error', () => {});
   ```

4. **Clean up after tests**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

### React Testing Library

1. **Query by user-visible elements**
   ```typescript
   // Good - how users interact
   screen.getByRole('button', { name: /submit/i })
   screen.getByLabelText(/email/i)
   screen.getByText(/welcome/i)

   // Bad - implementation details
   screen.getByTestId('submit-btn')
   screen.getByClassName('button-primary')
   ```

2. **Wait for async updates**
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   ```

3. **Use userEvent over fireEvent**
   ```typescript
   import userEvent from '@testing-library/user-event';

   const user = userEvent.setup();
   await user.click(button);
   await user.type(input, 'text');
   ```

### Mocking

1. **Mock at the boundary**
   - Mock Supabase client, not React Query hooks
   - Mock HTTP requests with MSW for integration tests

2. **Reset mocks between tests**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

3. **Use factories for test data**
   ```typescript
   // Good - reusable and consistent
   const project = mockProject({ status: 'active' });

   // Bad - brittle and verbose
   const project = {
     id: '123',
     name: 'Test',
     company_id: '456',
     // ... many more fields
   };
   ```

### E2E Tests

1. **Use data-testid sparingly**
   - Prefer user-facing attributes (role, label, text)
   - Only use data-testid when no better option exists

2. **Handle authentication once**
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Login before each test
     await page.goto('/login');
     // ... login flow
   });
   ```

3. **Take screenshots for debugging**
   ```typescript
   await page.screenshot({ path: 'screenshots/error-state.png' });
   ```

4. **Test critical paths only**
   - E2E tests are slow and expensive
   - Focus on core user journeys
   - Use integration tests for detailed scenarios

## Testing RLS Policies

Test Row Level Security policies in Supabase SQL Editor:

```sql
BEGIN;

-- Set user context
SET LOCAL jwt.claims.sub TO 'user-123';
SET LOCAL jwt.claims.company_id TO 'company-123';

-- Test: User can only see their company's data
SELECT COUNT(*) FROM projects WHERE company_id = 'company-123';
-- Expected: > 0

SELECT COUNT(*) FROM projects WHERE company_id = 'other-company';
-- Expected: 0 (RLS should block)

-- Test: User cannot insert with wrong company_id
INSERT INTO projects (name, company_id)
VALUES ('Test', 'other-company');
-- Expected: Error - policy violation

ROLLBACK;
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm run test:coverage
      - run: npx playwright install
      - run: npm run test:e2e

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Common Issues

**Issue: "Cannot find module '@/lib/supabase'"**
- Ensure path aliases are configured in `vitest.config.ts`

**Issue: Tests timeout**
- Increase timeout in `vitest.config.ts` or `playwright.config.ts`
- Check for missing `await` on async operations

**Issue: Playwright browser not found**
- Run `npm run playwright:install`

**Issue: Mock not working**
- Verify `vi.clearAllMocks()` in `beforeEach`
- Check mock path matches actual import path

### Debug Mode

```bash
# Vitest debug
npm test -- --inspect-brk

# Playwright debug
npm run test:e2e:debug

# Run single test file
npm test -- useProjects.test.ts

# Run single E2E test
npx playwright test projects.spec.ts
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Next Steps

1. Install Playwright browsers: `npm run playwright:install`
2. Run example tests: `npm test`
3. Review example test files in `src/__tests__/`
4. Write tests for your features following the patterns above
5. Set up CI/CD pipeline with test automation
