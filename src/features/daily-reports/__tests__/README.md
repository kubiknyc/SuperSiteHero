# Daily Reports V2 Test Suite

This directory contains comprehensive tests for the Daily Reports V2 feature implementation.

## Test Coverage

### 1. Unit Tests - Services

#### Workflow Engine (`services/__tests__/workflowEngine.test.ts`)
- Status transition validation
- Role-based permission checks
- Report validation for submission
- Notification configuration
- Auto-lock logic
- Review reminder calculations
- Escalation timing
- Status display information
- Available actions per role

**Coverage Areas:**
- State machine transitions (draft → submitted → approved → locked)
- Permission matrix for all roles (author, reviewer, approver, admin)
- Validation rules (required fields, signatures)
- Time-based automations (reminders, escalations, auto-lock)

#### Weather API Service (`services/__tests__/weatherApiService.test.ts`)
- Weather data fetching from OpenWeatherMap API
- Temperature conversions (Kelvin to Fahrenheit)
- Wind speed conversions (m/s to mph)
- Wind direction calculations
- Precipitation handling (rain and snow)
- Weather data caching
- Weather impact analysis
- Geolocation services

**Coverage Areas:**
- API integration and error handling
- Unit conversions and calculations
- Cache management
- Safety impact assessments (freezing, heat, wind, precipitation)

#### Template Service (`services/__tests__/templateService.test.ts`)
- Template CRUD operations
- Template creation from report data
- Template application to new reports
- Copy from previous day functionality
- Default value handling

**Coverage Areas:**
- Database operations (create, read, update, delete)
- Data transformation (stripping IDs, applying defaults)
- Previous day data retrieval

### 2. Integration Tests - State Management

#### Zustand Store (`store/__tests__/dailyReportStoreV2.test.ts`)
- Draft initialization and management
- Weather data application
- Workforce entry management
- Equipment entry management
- Delay entry management
- Safety incident tracking
- Template application
- Sync queue management
- Conflict resolution
- UI state management
- Form data export

**Coverage Areas:**
- Complete store lifecycle
- All CRUD operations for each entity type
- Computed values (total workers)
- Dirty state tracking
- Offline sync capabilities
- Section expansion/collapse

### 3. React Query Hooks (To Be Added)
- API data fetching
- Mutation handling
- Cache invalidation
- Optimistic updates

### 4. Component Tests (To Be Added)
- Form components (QuickModeForm, DetailedModeForm)
- Grid components (WorkforceGrid, EquipmentGrid)
- Section components (SafetyIncidentsSection, InspectionsSection, etc.)
- Approval workflow UI

### 5. E2E Tests (To Be Added)
- Complete report creation flow
- Approval workflow
- Copy from previous day
- Template usage
- PDF generation

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test workflowEngine
npm test weatherApiService
npm test templateService
npm test dailyReportStoreV2
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run in Watch Mode
```bash
npm run test:watch
```

### Run with UI
```bash
npm run test:ui
```

## Test Organization

```
src/features/daily-reports/
├── __tests__/
│   └── README.md (this file)
├── services/
│   └── __tests__/
│       ├── workflowEngine.test.ts
│       ├── weatherApiService.test.ts
│       ├── templateService.test.ts
│       └── notificationService.test.ts (to be added)
├── store/
│   └── __tests__/
│       └── dailyReportStoreV2.test.ts
├── hooks/
│   └── __tests__/
│       └── useDailyReportsV2.test.ts (to be added)
└── components/
    └── v2/
        └── __tests__/
            ├── DailyReportFormV2.test.tsx (to be added)
            ├── WorkforceGrid.test.tsx (to be added)
            └── ... (other component tests)
```

## Testing Best Practices

### 1. Test Naming
- Use descriptive test names that explain the scenario
- Format: `should [expected behavior] when [condition]`
- Example: `should return true when escalation time has passed`

### 2. Test Structure
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused on single behavior
- Use beforeEach for common setup

### 3. Mocking
- Mock external dependencies (API calls, Supabase)
- Use vi.mock() for module mocking
- Clear mocks between tests

### 4. Coverage Goals
- Aim for 80%+ code coverage
- 100% coverage for critical paths (workflow engine, validation)
- Focus on edge cases and error handling

## Known Test Gaps

### High Priority
1. Notification service unit tests
2. React Query hooks integration tests
3. Component tests for critical UI (form components)
4. E2E tests for approval workflow

### Medium Priority
1. Photo upload functionality tests
2. PDF generation tests
3. Performance tests for large datasets
4. Accessibility tests

### Low Priority
1. Visual regression tests
2. Cross-browser compatibility tests
3. Mobile-specific tests

## Continuous Integration

Tests are run automatically on:
- Every pull request
- Merge to main branch
- Nightly builds

CI Configuration: `.github/workflows/test-automation.yml`

## Test Data

### Factories
Use test data factories for consistent test data:

```typescript
const createMockReport = (overrides = {}): DailyReportV2 => ({
  id: 'report-1',
  project_id: 'proj-1',
  report_date: '2025-01-27',
  status: 'draft',
  mode: 'quick',
  shift_type: 'regular',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
```

### Fixtures
Common test fixtures are located in `__fixtures__/` directories.

## Debugging Tests

### Debug Single Test
```bash
npm test -- --testNamePattern="should allow draft -> submitted transition"
```

### Debug with Browser
```bash
npm run test:ui
```

### Verbose Output
```bash
npm test -- --reporter=verbose
```

## Performance Considerations

- Tests should complete in < 5 seconds
- Use fake timers for time-based tests
- Mock heavy operations (API calls, file I/O)
- Parallelize independent test suites

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass before PR
3. Update this README with new test coverage
4. Maintain minimum 80% coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Query Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
- [Zustand Testing](https://docs.pmnd.rs/zustand/guides/testing)
