# Tests Directory

This directory contains test infrastructure and shared test utilities.

## Structure

```
__tests__/
├── setup.ts                 # Global test setup (runs before all tests)
├── utils/
│   ├── TestProviders.tsx    # React Query & Router wrapper for tests
│   ├── factories.ts         # Mock data generators
│   └── test-templates.md    # Copy-paste templates for common tests
├── integration/             # Integration tests (feature workflows)
│   └── projects-workflow.test.tsx
└── e2e/                     # End-to-end tests (Playwright)
    └── projects.spec.ts
```

## Quick Start

### Running Tests

```bash
# Unit tests (watch mode)
npm run test:watch

# All tests (once)
npm test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Writing Your First Test

1. **Unit Test** (for hooks/utilities)
   - Co-locate with source: `src/features/{feature}/hooks/use{Feature}.test.ts`
   - See: `src/features/projects/hooks/useProjects.test.ts`
   - Copy template from: `utils/test-templates.md`

2. **Integration Test** (for workflows)
   - Location: `__tests__/integration/{feature}-workflow.test.tsx`
   - See: `integration/projects-workflow.test.tsx`

3. **E2E Test** (for user journeys)
   - Location: `__tests__/e2e/{feature}.spec.ts`
   - See: `e2e/projects.spec.ts`

## Test Utilities

### TestProviders

Wraps components with React Query and Router:

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
import { mockProject, mockUser } from '@/__tests__/utils/factories';

const project = mockProject({
  name: 'Custom Name',
  status: 'active',
});
```

## Examples

See these files for complete examples:

- **Unit Test**: `src/features/projects/hooks/useProjects.test.ts`
- **Integration Test**: `integration/projects-workflow.test.tsx`
- **E2E Test**: `e2e/projects.spec.ts`

## Documentation

For complete testing guide, see: `../../TESTING.md`

## Adding New Factories

When you create a new feature, add a factory to `utils/factories.ts`:

```typescript
export const mockYourFeature = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(3),
  company_id: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});
```

## Common Issues

**Tests not finding modules?**
- Check path aliases in `vitest.config.ts`

**Mocks not working?**
- Ensure `vi.clearAllMocks()` in `beforeEach`
- Verify mock path matches import path exactly

**Timeouts in E2E tests?**
- Increase timeout in `playwright.config.ts`
- Ensure dev server is running

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)
- [MSW Docs](https://mswjs.io/)
