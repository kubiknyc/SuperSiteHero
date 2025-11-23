# Test Templates

Copy-paste templates for common testing scenarios.

## Unit Test - React Query Hook

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { use{Feature}, useCreate{Feature} } from './use{Feature}';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { mock{Feature} } from '@/__tests__/utils/factories';

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

describe('use{Feature}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch {feature} list', async () => {
    const mockData = [mock{Feature}(), mock{Feature}()];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => use{Feature}(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Database error');

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => use{Feature}(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useCreate{Feature}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create {feature} with company_id', async () => {
    const input = { name: 'Test {Feature}' };
    const mockCreated = mock{Feature}({ ...input, company_id: 'company-123' });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockCreated, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useCreate{Feature}(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(input as any);

    expect(mockInsert).toHaveBeenCalledWith({
      ...input,
      company_id: 'company-123',
    });
  });
});
```

## Unit Test - React Component

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { {Component} } from './{Component}';
import { TestProviders } from '@/__tests__/utils/TestProviders';

describe('{Component}', () => {
  it('should render component', () => {
    render(
      <TestProviders>
        <{Component} />
      </TestProviders>
    );

    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();

    render(
      <TestProviders>
        <{Component} onClick={mockOnClick} />
      </TestProviders>
    );

    await user.click(screen.getByRole('button'));

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
    render(
      <TestProviders>
        <{Component} isLoading={true} />
      </TestProviders>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = new Error('Test error');

    render(
      <TestProviders>
        <{Component} error={error} />
      </TestProviders>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });
});
```

## Integration Test

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TestProviders } from '@/__tests__/utils/TestProviders';
import { {Feature}Page } from '@/pages/{feature}/{Feature}Page';
import { mock{Feature} } from '@/__tests__/utils/factories';

const server = setupServer(
  http.get('https://your-project.supabase.co/rest/v1/{table}', () => {
    return HttpResponse.json([mock{Feature}()]);
  }),

  http.post('https://your-project.supabase.co/rest/v1/{table}', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mock{Feature}(body as any));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('{Feature} Workflow', () => {
  it('should complete full CRUD workflow', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders>
        <{Feature}Page />
      </TestProviders>
    );

    // CREATE
    await user.click(screen.getByRole('button', { name: /new/i }));
    await user.type(screen.getByLabelText(/name/i), 'Test Item');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    // UPDATE
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Updated Item');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Updated Item')).toBeInTheDocument();
    });

    // DELETE
    await user.click(screen.getByRole('button', { name: /delete/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.queryByText('Updated Item')).not.toBeInTheDocument();
    });
  });
});
```

## E2E Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('{Feature} E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should manage {feature} lifecycle', async ({ page }) => {
    await page.goto('/{feature}s');

    // CREATE
    await page.click('button:has-text("New {Feature}")');
    await page.fill('[name="name"]', 'E2E Test Item');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=E2E Test Item')).toBeVisible();

    // EDIT
    await page.click('[aria-label="Edit"]');
    await page.fill('[name="name"]', 'Updated Item');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Updated Item')).toBeVisible();

    // DELETE
    await page.click('[aria-label="Delete"]');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=Updated Item')).not.toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/{feature}s');

    await page.click('button:has-text("New {Feature}")');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=/required/i')).toBeVisible();
  });
});
```

## Mock Data Factory Template

```typescript
// Add to src/__tests__/utils/factories.ts

export interface Mock{Feature} {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Add other fields
}

export const mock{Feature} = (overrides: Partial<Mock{Feature}> = {}): Mock{Feature} => {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    company_id: faker.string.uuid(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
};
```

## Supabase RLS Test Template

```sql
-- Test RLS policies in Supabase SQL Editor
BEGIN;

-- Set up test user
SET LOCAL jwt.claims.sub TO 'test-user-id';
SET LOCAL jwt.claims.company_id TO 'test-company-id';

-- Test 1: User can read their company's data
SELECT COUNT(*) FROM {table_name}
WHERE company_id = 'test-company-id';
-- Expected: Should return rows

-- Test 2: User cannot read other company's data
SELECT COUNT(*) FROM {table_name}
WHERE company_id = 'other-company-id';
-- Expected: Should return 0 (RLS blocks)

-- Test 3: User can insert with their company_id
INSERT INTO {table_name} (name, company_id)
VALUES ('Test Record', 'test-company-id');
-- Expected: Success

-- Test 4: User cannot insert with different company_id
INSERT INTO {table_name} (name, company_id)
VALUES ('Test Record', 'other-company-id');
-- Expected: Error - RLS policy violation

-- Test 5: User can update their company's data
UPDATE {table_name}
SET name = 'Updated Name'
WHERE company_id = 'test-company-id'
LIMIT 1;
-- Expected: Success

-- Test 6: User cannot update other company's data
UPDATE {table_name}
SET name = 'Updated Name'
WHERE company_id = 'other-company-id';
-- Expected: No rows updated (RLS blocks)

-- Test 7: User can delete their company's data
DELETE FROM {table_name}
WHERE company_id = 'test-company-id'
LIMIT 1;
-- Expected: Success

-- Test 8: User cannot delete other company's data
DELETE FROM {table_name}
WHERE company_id = 'other-company-id';
-- Expected: No rows deleted (RLS blocks)

ROLLBACK;
```

## Quick Reference

### Common Queries

```typescript
// By role
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { level: 1 })

// By label
screen.getByLabelText(/password/i)

// By text
screen.getByText(/welcome/i)
screen.getByText('Exact match')

// By placeholder
screen.getByPlaceholderText(/search/i)

// By test id (use sparingly)
screen.getByTestId('custom-element')
```

### Common Assertions

```typescript
// Existence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()
expect(element).toBeVisible()

// Content
expect(element).toHaveTextContent('text')
expect(element).toContainHTML('<span>text</span>')

// Form elements
expect(input).toHaveValue('value')
expect(checkbox).toBeChecked()
expect(select).toHaveValue('option-value')
expect(input).toBeDisabled()

// Attributes
expect(element).toHaveAttribute('href', '/path')
expect(element).toHaveClass('active')

// Async
await waitFor(() => {
  expect(element).toBeInTheDocument()
})
```

### User Events

```typescript
const user = userEvent.setup()

// Click
await user.click(button)
await user.dblClick(element)

// Type
await user.type(input, 'text')
await user.clear(input)

// Select
await user.selectOptions(select, 'option-value')

// Keyboard
await user.keyboard('{Enter}')
await user.keyboard('{Escape}')

// Upload
await user.upload(fileInput, file)
```
