# Phase 3: Testing Gap Analysis Report

## Executive Summary

This document provides a comprehensive analysis of testing coverage gaps in the construction management platform, with prioritized recommendations for Phase 4 implementation.

### Current State Overview

| Metric | Count |
|--------|-------|
| Total Service Files | 71 |
| Service Test Files | 29 |
| **Untested Services** | **42** |
| Coverage Gap | 59% |

### Tested Services (29 files):
- analytics.test.ts (8 failures)
- approval-actions.test.ts
- approval-requests.test.ts
- approval-workflows.test.ts
- change-order-budget-integration.test.ts
- change-orders.test.ts
- checklists.test.ts (66 tests)
- client-portal.test.ts
- cost-tracking-variance.test.ts (159 tests)
- daily-reports.test.ts
- document-access-log.test.ts
- document-ai.test.ts
- documents-version-control.test.ts
- docusign.test.ts
- earned-value-management.test.ts (83 tests)
- lien-waiver-reminders.test.ts (1 failure)
- markups.test.ts
- messaging.test.ts (37 tests)
- payment-forecast.test.ts (58 tests)
- punch-lists.test.ts
- reports.test.ts (44 tests)
- rfi-response-analytics.test.ts (104 tests)
- rfis.test.ts
- safety-incidents.test.ts
- schedule.test.ts (54 tests)
- subcontractor-portal.test.ts
- submittals.test.ts
- tasks.test.ts
- workflows.test.ts

---

## Priority Service Analysis

### Tier 1: Critical Services (MUST Test First)

#### 1. `projects.ts` - Core Project Operations
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\projects.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 203 |
| Functions | 6 |
| Complexity | Low-Medium |
| Business Impact | Critical |
| Estimated Tests | 15-20 |

**Functions to Test:**
- `getProjectsByCompany()` - List projects with filters
- `getProject()` - Single project retrieval
- `getUserProjects()` - User-specific projects (with joins)
- `createProject()` - Create with user assignment
- `updateProject()` - Partial updates
- `deleteProject()` - Soft delete
- `searchProjects()` - Client-side text search

**Test Categories:**
1. Happy path CRUD operations (7 tests)
2. Input validation (projectId, companyId required) (4 tests)
3. Error handling (ApiErrorClass wrapping) (3 tests)
4. Edge cases (empty results, null handling) (3 tests)
5. Query options (filters, ordering, pagination) (3 tests)

---

#### 2. `cost-tracking.ts` - Financial Tracking
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\cost-tracking.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 713 |
| Functions | 25 |
| Complexity | High |
| Business Impact | Critical |
| Estimated Tests | 50-60 |

**API Objects:**
- `costCodesApi` - Cost code management (8 functions)
- `projectBudgetsApi` - Budget operations (9 functions)
- `costTransactionsApi` - Transaction tracking (6 functions)

**Key Functions:**
- `getCostCodes()` - With complex filtering
- `getCostCodesTree()` - Hierarchical tree building
- `createCostCode()` - CSI MasterFormat codes
- `getProjectBudgets()` - With view fallback
- `calculateProjectBudgetTotals()` - Financial calculations
- `getBudgetSummaryByDivision()` - Aggregation logic
- `getCostTransactions()` - With joined relations
- `getTransactionTotalsByType()` - Aggregation

**Test Categories:**
1. Cost codes CRUD (10 tests)
2. Tree building logic (5 tests)
3. Budget calculations (10 tests)
4. Transaction operations (8 tests)
5. Filter combinations (10 tests)
6. Fallback query paths (5 tests)
7. Error handling (7 tests)
8. Edge cases (5 tests)

---

#### 3. `documents.ts` - Document Management
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\documents.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 507 |
| Functions | 16 |
| Complexity | Medium |
| Business Impact | Critical |
| Estimated Tests | 35-45 |

**Functions to Test:**
- Document CRUD (4 functions)
- Folder management (4 functions)
- Version control (5 functions): `createDocumentVersion()`, `getDocumentVersions()`, `getLatestVersion()`, `revertToVersion()`, `compareVersions()`
- Special lookups: `findDocumentByName()`

**Test Categories:**
1. Document CRUD (8 tests)
2. Folder CRUD (6 tests)
3. Version control logic (12 tests)
4. Version comparison (4 tests)
5. Error handling (6 tests)
6. Validation (4 tests)
7. Edge cases (5 tests)

---

#### 4. `notifications.ts` - Alert System
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\notifications.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 225 |
| Functions | 8 |
| Complexity | Low |
| Business Impact | High |
| Estimated Tests | 20-25 |

**Functions to Test:**
- `getNotifications()` - With filters (user_id, is_read, type)
- `getNotification()` - Single retrieval
- `createNotification()` - With default values
- `markAsRead()` - Status update
- `markAllAsRead()` - Bulk update
- `deleteNotification()` - Soft delete
- `deleteAllNotifications()` - Bulk delete
- `getUnreadCount()` - Count query

**Test Categories:**
1. CRUD operations (8 tests)
2. Filter combinations (5 tests)
3. Bulk operations (4 tests)
4. Count queries (2 tests)
5. Error handling (4 tests)
6. Edge cases (2 tests)

---

#### 5. `analytics.ts` - Business Intelligence (Needs Fix)
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\analytics.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 714 |
| Functions | 20+ |
| Complexity | High |
| Business Impact | Critical |
| Current Test State | 8 failures |
| Estimated Additional Tests | 20-30 |

**Issues to Fix:**
1. `collectProjectSnapshot` - Returns undefined instead of snapshot ID
2. `storePrediction` - Missing `is_latest` field in assertion

**Functions to Test:**
- Snapshot operations (4 functions)
- Prediction operations (3 functions)
- Risk score operations (2 functions)
- Recommendation operations (6 functions)
- Model metadata operations (3 functions)
- Dashboard aggregation (1 function)

---

### Tier 2: High Priority Services

#### 6. `photo-management.ts`
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\photo-management.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 1,147 |
| Functions | 35+ |
| Complexity | High |
| Estimated Tests | 60-70 |

**API Sections:**
1. Photo CRUD (10 functions)
2. Collections (10 functions)
3. Comparisons (6 functions)
4. Annotations (4 functions)
5. GPS/Location (3 functions)
6. Statistics (2 functions)

**Special Testing Needs:**
- Helper functions: `mapPhotoFromDb`, `calculateDistance`
- Complex filters with 20+ options
- Clustering algorithm

---

#### 7. `inspections.ts`
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\inspections.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 394 |
| Functions | 9 |
| Complexity | Medium |
| Estimated Tests | 25-30 |

**Functions:**
- `getProjectInspections()` - With complex filters
- `getInspection()` - With relations
- `createInspection()` - With status logic
- `updateInspection()`
- `deleteInspection()` - Soft delete
- `recordResult()` - Status determination logic
- `scheduleReinspection()` - Clear previous results
- `getInspectionStats()` - Statistical calculations
- `getUpcomingInspections()` - Date-based filtering
- `cancelInspection()`

---

#### 8. `meetings.ts`
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\meetings.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 747 |
| Functions | 25+ |
| Complexity | High |
| Estimated Tests | 50-60 |

**API Objects:**
- `meetingsApi` - Core meeting operations (7 functions)
- `meetingNotesApi` - Notes management (5 functions)
- `meetingActionItemsApi` - Action items with task conversion (9 functions)
- `meetingAttendeesApi` - Attendee management (6 functions)
- `meetingAttachmentsApi` - File handling (4 functions)

**Special Testing Needs:**
- `convertToTask()` - Cross-entity creation
- `uploadAndAttach()` - Storage integration
- `addProjectUsersAsAttendees()` - Bulk operations

---

#### 9. `permits.ts`
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\permits.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 443 |
| Functions | 15 |
| Complexity | Medium |
| Estimated Tests | 35-40 |

**Functions:**
- CRUD operations (5 functions)
- Status queries: `getExpiringPermits()`, `getExpiredPermits()`, `getCriticalPermits()`
- Specialized: `getPermitsRequiringInspections()`, `getPermitStatistics()`, `getPermitsNeedingRenewalReminder()`

**Special Testing Needs:**
- Date calculation logic for reminders
- Statistics aggregation
- Complex status filtering

---

#### 10. `material-deliveries.ts`
**Location:** `c:\Users\Eli\Documents\git\src\lib\api\services\material-deliveries.ts`

| Metric | Value |
|--------|-------|
| Lines of Code | 708 |
| Functions | 25+ |
| Complexity | Medium |
| Estimated Tests | 45-50 |

**API Sections:**
- Delivery CRUD (6 functions)
- Photo operations (4 functions)
- Search & filtering (5 functions)
- Statistics (4 functions)
- File upload helpers (2 functions)

---

### Tier 3: Medium Priority Services

| # | Service | LOC | Est. Tests | Notes |
|---|---------|-----|------------|-------|
| 11 | `equipment.ts` | 980 | 55-65 | 5 API objects, complex relations |
| 12 | `safety-metrics.ts` | 857 | 40-50 | OSHA calculations, benchmarks |
| 13 | `drawings.ts` | 623 | 35-40 | Revisions, sets, transmittals |
| 14 | `action-items.ts` | ~200 | 15-20 | Basic CRUD |
| 15 | `change-orders-v2.ts` | ~400 | 25-30 | Enhanced CO logic |

---

## Remaining Untested Services (27 files)

| Service | Priority | Estimated Tests |
|---------|----------|-----------------|
| ai-provider.ts | Medium | 15-20 |
| assemblies.ts | Low | 10-15 |
| certificate-reminders.ts | Medium | 15-20 |
| company.ts | Medium | 15-20 |
| company-users.ts | Medium | 15-20 |
| cost-estimates.ts | Medium | 20-25 |
| daily-reports-v2.ts | High | 30-35 |
| daily-report-templates.ts | Medium | 15-20 |
| document-entity-linking.ts | Low | 10-15 |
| drawing-packages.ts | Low | 15-20 |
| insurance.ts | Medium | 20-25 |
| look-ahead.ts | Medium | 20-25 |
| look-ahead-sync.ts | Low | 10-15 |
| markup-export.ts | Low | 10-15 |
| material-receiving.ts | Medium | 20-25 |
| near-miss-analytics.ts | Medium | 15-20 |
| notices.ts | Low | 10-15 |
| notification-preferences.ts | Low | 10-15 |
| photo-templates.ts | Low | 10-15 |
| project-templates.ts | Medium | 15-20 |
| quickbooks.ts | Medium | 20-25 |
| rfi-aging.ts | Low | 10-15 |
| rfi-routing-ai.ts | Low | 10-15 |
| safety-observations.ts | Medium | 20-25 |
| schedule-activities.ts | High | 25-30 |
| smart-summaries.ts | Low | 10-15 |
| takeoffs.ts | Medium | 20-25 |
| takeoff-templates.ts | Low | 10-15 |
| toolbox-talks.ts | Medium | 20-25 |
| weather.ts | Low | 10-15 |

---

## Implementation Roadmap for Phase 4

### Sprint 1: Critical Services (Week 1-2)
**Target: 150-175 new tests**

| Day | Service | Estimated Tests |
|-----|---------|-----------------|
| 1-2 | projects.ts | 20 |
| 3-5 | cost-tracking.ts | 55 |
| 6-7 | documents.ts | 40 |
| 8 | notifications.ts | 25 |
| 9-10 | Fix analytics.ts (8 failures) + add 20 | 28 |

### Sprint 2: High Priority Services (Week 3-4)
**Target: 200-225 new tests**

| Day | Service | Estimated Tests |
|-----|---------|-----------------|
| 1-3 | photo-management.ts | 65 |
| 4-5 | inspections.ts | 30 |
| 6-8 | meetings.ts | 55 |
| 9-10 | permits.ts | 40 |
| 11-12 | material-deliveries.ts | 45 |

### Sprint 3: Medium Priority Services (Week 5-6)
**Target: 150-175 new tests**

| Day | Service | Estimated Tests |
|-----|---------|-----------------|
| 1-3 | equipment.ts | 60 |
| 4-5 | safety-metrics.ts | 45 |
| 6-7 | drawings.ts | 40 |
| 8-9 | action-items.ts + change-orders-v2.ts | 45 |

---

## Test File Templates

### Template 1: Standard CRUD Service
```typescript
// Example: projects.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { projectsApi } from './projects'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  },
}))

import { apiClient } from '../client'

// Mock data factories
const createMockProject = (overrides = {}) => ({
  id: 'project-123',
  company_id: 'company-456',
  name: 'Test Project',
  address: '123 Test St',
  project_number: 'PRJ-001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('projectsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProjectsByCompany', () => {
    it('should fetch projects for a company', async () => {
      const mockProjects = [createMockProject()]
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.getProjectsByCompany('company-456')

      expect(apiClient.select).toHaveBeenCalledWith('projects', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'company_id', operator: 'eq', value: 'company-456' },
        ]),
      }))
      expect(result).toEqual(mockProjects)
    })

    it('should apply custom query options', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([])

      await projectsApi.getProjectsByCompany('company-456', {
        filters: [{ column: 'status', operator: 'eq', value: 'active' }],
        orderBy: { column: 'name', ascending: true },
      })

      expect(apiClient.select).toHaveBeenCalledWith('projects', expect.objectContaining({
        orderBy: { column: 'name', ascending: true },
      }))
    })

    it('should throw ApiErrorClass on database error', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('DB Error'))

      await expect(projectsApi.getProjectsByCompany('company-456'))
        .rejects.toThrow('Failed to fetch projects')
    })
  })

  describe('createProject', () => {
    it('should require company ID', async () => {
      await expect(projectsApi.createProject('', { name: 'Test' }))
        .rejects.toThrow('Company ID is required')
    })

    it('should create project and assign user', async () => {
      const mockProject = createMockProject()
      vi.mocked(apiClient.insert).mockResolvedValue(mockProject)

      const result = await projectsApi.createProject('company-456',
        { name: 'New Project', company_id: 'company-456' },
        'user-789'
      )

      expect(apiClient.insert).toHaveBeenCalledTimes(2) // project + project_users
      expect(result).toEqual(mockProject)
    })
  })

  // ... more tests for updateProject, deleteProject, searchProjects
})
```

### Template 2: Complex Service with Multiple APIs
```typescript
// Example: cost-tracking.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { costCodesApi, projectBudgetsApi, costTransactionsApi } from './cost-tracking'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
  },
}))

import { supabase } from '@/lib/supabase'

const createSupabaseMock = (resolveData: unknown, resolveError: unknown = null) => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
    then: vi.fn((onFulfilled) =>
      Promise.resolve({ data: resolveData, error: resolveError }).then(onFulfilled)
    ),
  }
  return mockChain
}

describe('costCodesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCostCodes', () => {
    it('should fetch cost codes with all filters', async () => {
      const mockCodes = [{ id: 'code-1', code: '01', name: 'General' }]
      const mockChain = createSupabaseMock(mockCodes)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await costCodesApi.getCostCodes({
        companyId: 'company-123',
        division: '01',
        level: 1,
        costType: 'direct',
        isActive: true,
        search: 'general',
      })

      expect(supabase.from).toHaveBeenCalledWith('cost_codes')
      expect(mockChain.eq).toHaveBeenCalledWith('company_id', 'company-123')
      expect(mockChain.eq).toHaveBeenCalledWith('division', '01')
      expect(mockChain.eq).toHaveBeenCalledWith('level', 1)
      expect(result).toEqual(mockCodes)
    })
  })

  describe('getCostCodesTree', () => {
    it('should build hierarchical tree from flat data', async () => {
      const flatCodes = [
        { id: '1', code: '01', name: 'Parent', parent_code_id: null },
        { id: '2', code: '01-100', name: 'Child', parent_code_id: '1' },
      ]
      const mockChain = createSupabaseMock(flatCodes)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await costCodesApi.getCostCodesTree('company-123')

      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].name).toBe('Child')
    })

    it('should handle orphan codes gracefully', async () => {
      const flatCodes = [
        { id: '1', code: '01', name: 'Orphan', parent_code_id: 'non-existent' },
      ]
      const mockChain = createSupabaseMock(flatCodes)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await costCodesApi.getCostCodesTree('company-123')

      expect(result).toHaveLength(1)
    })
  })
})

describe('projectBudgetsApi', () => {
  describe('calculateProjectBudgetTotals', () => {
    it('should calculate totals correctly', async () => {
      const mockBudgets = [
        { original_budget: 1000, approved_changes: 100, committed_cost: 500, actual_cost: 400 },
        { original_budget: 2000, approved_changes: 200, committed_cost: 1000, actual_cost: 800 },
      ]
      const mockChain = createSupabaseMock(mockBudgets)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await projectBudgetsApi.calculateProjectBudgetTotals('project-123')

      expect(result.total_original_budget).toBe(3000)
      expect(result.total_approved_changes).toBe(300)
      expect(result.total_revised_budget).toBe(3300)
      expect(result.total_actual_cost).toBe(1200)
      expect(result.total_variance).toBe(2100) // 3300 - 1200
    })

    it('should handle empty budgets', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await projectBudgetsApi.calculateProjectBudgetTotals('project-123')

      expect(result.total_original_budget).toBe(0)
      expect(result.budget_count).toBe(0)
    })
  })
})
```

### Template 3: Service with File Operations
```typescript
// Example: photo-management.test.ts (partial)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as photoManagement from './photo-management'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      }),
    },
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
  },
}))

describe('GPS and Location Functions', () => {
  describe('getPhotosNearLocation', () => {
    it('should call RPC function with correct parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null })

      await photoManagement.getPhotosNearLocation('project-123', 40.7128, -74.0060, 100)

      expect(supabase.rpc).toHaveBeenCalledWith('get_photos_by_location', {
        p_project_id: 'project-123',
        p_latitude: 40.7128,
        p_longitude: -74.0060,
        p_radius_meters: 100,
      })
    })
  })

  describe('getLocationClusters', () => {
    it('should cluster nearby photos', async () => {
      const mockPhotos = [
        { id: '1', latitude: 40.7128, longitude: -74.0060 },
        { id: '2', latitude: 40.7129, longitude: -74.0061 },
        { id: '3', latitude: 41.0000, longitude: -75.0000 }, // Far away
      ]
      vi.spyOn(photoManagement, 'getPhotos').mockResolvedValue(mockPhotos as any)

      const clusters = await photoManagement.getLocationClusters('project-123', 100)

      expect(clusters.length).toBeGreaterThanOrEqual(2) // At least 2 clusters
    })
  })
})
```

---

## Special Considerations

### 1. Fixing Existing Test Failures

**analytics.test.ts (8 failures):**
- Fix `collectProjectSnapshot` test - service returns `data` from RPC which is the ID
- Fix `storePrediction` test - include `is_latest: true` in expected payload

**lien-waiver-reminders.test.ts (1 failure):**
- `getReminderStats` - calculation issue with expected value (11 vs 10)

**offlineReportStore.test.ts (41 failures):**
- All failures: `useOfflineReportStore.getState is not a function`
- Need to mock Zustand store properly

### 2. Mocking Strategies

**Supabase Direct:**
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
    storage: { from: vi.fn() },
  },
}))
```

**API Client:**
```typescript
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  },
}))
```

### 3. Complex Test Scenarios

**Financial Calculations:**
- Test with floating point numbers
- Test with null/undefined values
- Test percentage calculations at boundaries

**Date Logic:**
- Mock Date.now() for consistent tests
- Test timezone handling
- Test date range boundaries

**Hierarchical Data:**
- Test tree building with circular references
- Test orphan node handling
- Test deep nesting (4+ levels)

---

## Summary

### Total Test Estimate for Phase 4

| Priority | Services | Estimated Tests |
|----------|----------|-----------------|
| Tier 1 (Critical) | 5 | 168 tests |
| Tier 2 (High) | 5 | 235 tests |
| Tier 3 (Medium) | 5 | 175 tests |
| **Total Phase 4** | **15** | **~578 tests** |

### Success Metrics

1. **Coverage Target:** Increase service coverage from 41% to 62%
2. **Test Count:** Add 500+ new service tests
3. **Failure Rate:** Fix all 50 existing test failures
4. **Quality:** Each service should have:
   - Full CRUD coverage
   - Error handling tests
   - Edge case coverage
   - Input validation tests

### Next Steps

1. Begin Sprint 1 with `projects.ts` (simplest critical service)
2. Fix existing `analytics.test.ts` failures before adding new tests
3. Create reusable mock factories for common data types
4. Set up CI coverage reporting to track progress
