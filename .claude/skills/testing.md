# Testing Skill

Create and maintain comprehensive test suites for the codebase.

## Usage

Invoke this skill when you need to:
- Write unit tests for components or functions
- Create integration tests for features
- Build E2E tests with Playwright
- Improve test coverage
- Debug failing tests
- Set up test infrastructure

## Examples

**Unit tests**:
```
Use testing skill to write unit tests for the useProjects hook
```

**E2E tests**:
```
Use testing skill to create Playwright tests for the login flow
```

**Coverage improvement**:
```
Use testing skill to add tests for uncovered code in daily-reports
```

## Execution Steps

When this skill is invoked:

### 1. Analyze Target Code
- Read the file/component to be tested
- Understand inputs, outputs, and side effects
- Identify dependencies and mocking needs
- List edge cases and error scenarios

### 2. Choose Test Type
- **Unit tests**: Isolated function/component tests
- **Integration tests**: Multiple components working together
- **E2E tests**: Full user flows in browser

### 3. Follow Project Conventions

**File naming**:
- Unit/Integration: `*.test.ts` or `*.spec.ts`
- E2E: `tests/e2e/*.spec.ts`

**Test structure**:
```typescript
describe('ComponentName', () => {
  describe('featureName', () => {
    it('should do expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### 4. Write Tests

Use the test-engineer agent for complex test suites.

### 5. Run & Verify
- `npm test` - Run unit tests
- `npm run test:e2e` - Run Playwright tests
- `npm run test:coverage` - Check coverage

## Testing Patterns

### Unit Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MyComponent {...props} />
      </QueryClientProvider>
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClick = vi.fn();
    renderComponent({ onClick });
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Testing Custom Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from './useProjects';

describe('useProjects', () => {
  it('fetches projects successfully', async () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(3);
  });
});
```

### Mocking Supabase

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
  },
}));
```

### Mocking React Query

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const createWrapper = () => {
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

### E2E Tests with Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Projects Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login and setup
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('creates a new project', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid="new-project"]');
    await page.fill('[data-testid="project-name"]', 'Test Project');
    await page.click('[data-testid="save"]');

    await expect(page.getByText('Test Project')).toBeVisible();
  });
});
```

### Testing Loading & Error States

```typescript
it('shows loading spinner while fetching', () => {
  // Mock loading state
  vi.mocked(useProjects).mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  });

  renderComponent();
  expect(screen.getByTestId('spinner')).toBeInTheDocument();
});

it('displays error message on failure', () => {
  vi.mocked(useProjects).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error('Failed to fetch'),
  });

  renderComponent();
  expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
});
```

### Testing Forms

```typescript
import userEvent from '@testing-library/user-event';

it('validates required fields', async () => {
  const user = userEvent.setup();
  renderComponent();

  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
});

it('submits form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  renderComponent({ onSubmit });

  await user.type(screen.getByLabelText(/name/i), 'Test Name');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'Test Name' });
});
```

## Test Commands

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Single E2E file
npx playwright test tests/e2e/auth.spec.ts

# Debug E2E
npm run test:e2e:debug
```

## Coverage Goals

- **Unit tests**: 80%+ coverage for utilities and hooks
- **Integration tests**: Key user flows covered
- **E2E tests**: Critical paths (auth, CRUD, main features)

## Test Quality Checklist

- [ ] Tests are isolated (no shared state)
- [ ] Tests are deterministic (same result every run)
- [ ] Tests are fast (mock external dependencies)
- [ ] Tests are readable (clear descriptions)
- [ ] Tests cover happy path and edge cases
- [ ] Tests verify behavior, not implementation
- [ ] Tests clean up after themselves
- [ ] Assertions are specific and meaningful

## When to Use Agents

- **test-engineer agent**: Complex test strategy, CI/CD setup
- **debugger agent**: Investigate flaky or failing tests
- **playwright MCP**: Browser automation and visual testing
- **performance-optimizer agent**: Performance test analysis

## Common Issues

### Flaky Tests
- Add proper waits (`waitFor`, `waitForSelector`)
- Mock time-dependent code
- Isolate test data

### Slow Tests
- Mock network requests
- Use test fixtures
- Parallelize where possible

### Hard to Test Code
- Refactor to separate concerns
- Inject dependencies
- Use composition over inheritance
