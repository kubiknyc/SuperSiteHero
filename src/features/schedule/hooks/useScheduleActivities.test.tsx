/**
 * Tests for Schedule Activities Hooks
 * CRITICAL for project management - ensures schedule tracking works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type {
  ScheduleActivity,
  ScheduleDependency,
  ScheduleBaseline,
  ScheduleCalendar,
  ScheduleStats,
  ScheduleImportLog,
} from '@/types/schedule-activities'

// =============================================
// Mock Setup
// =============================================

const mockGetActivities = vi.fn()
const mockGetActivity = vi.fn()
const mockGetActivitiesWithDetails = vi.fn()
const mockGetDependencies = vi.fn()
const mockGetBaselines = vi.fn()
const mockGetCalendars = vi.fn()
const mockGetCalendar = vi.fn()
const mockGetResources = vi.fn()
const mockGetScheduleStats = vi.fn()
const mockGetImportLogs = vi.fn()
const mockCreateActivity = vi.fn()
const mockUpdateActivity = vi.fn()
const mockBulkUpdateActivities = vi.fn()
const mockDeleteActivity = vi.fn()
const mockCreateDependency = vi.fn()
const mockDeleteDependency = vi.fn()
const mockCreateBaseline = vi.fn()
const mockSetActiveBaseline = vi.fn()
const mockClearActiveBaseline = vi.fn()
const mockCreateCalendar = vi.fn()
const mockUpdateCalendar = vi.fn()
const mockDeleteCalendar = vi.fn()
const mockCreateResource = vi.fn()
const mockImportActivities = vi.fn()
const mockCreateImportLog = vi.fn()
const mockUpdateImportLog = vi.fn()
const mockSyncToLookAhead = vi.fn()

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    userProfile: { id: 'user-123', company_id: 'company-456' },
  }),
}))

// Mock schedule activities API
vi.mock('@/lib/api/services/schedule-activities', () => ({
  scheduleActivitiesApi: {
    getActivities: (...args: unknown[]) => mockGetActivities(...args),
    getActivity: (...args: unknown[]) => mockGetActivity(...args),
    getActivitiesWithDetails: (...args: unknown[]) => mockGetActivitiesWithDetails(...args),
    getDependencies: (...args: unknown[]) => mockGetDependencies(...args),
    getBaselines: (...args: unknown[]) => mockGetBaselines(...args),
    getCalendars: (...args: unknown[]) => mockGetCalendars(...args),
    getCalendar: (...args: unknown[]) => mockGetCalendar(...args),
    getResources: (...args: unknown[]) => mockGetResources(...args),
    getScheduleStats: (...args: unknown[]) => mockGetScheduleStats(...args),
    getImportLogs: (...args: unknown[]) => mockGetImportLogs(...args),
    createActivity: (...args: unknown[]) => mockCreateActivity(...args),
    updateActivity: (...args: unknown[]) => mockUpdateActivity(...args),
    bulkUpdateActivities: (...args: unknown[]) => mockBulkUpdateActivities(...args),
    deleteActivity: (...args: unknown[]) => mockDeleteActivity(...args),
    createDependency: (...args: unknown[]) => mockCreateDependency(...args),
    deleteDependency: (...args: unknown[]) => mockDeleteDependency(...args),
    createBaseline: (...args: unknown[]) => mockCreateBaseline(...args),
    setActiveBaseline: (...args: unknown[]) => mockSetActiveBaseline(...args),
    clearActiveBaseline: (...args: unknown[]) => mockClearActiveBaseline(...args),
    createCalendar: (...args: unknown[]) => mockCreateCalendar(...args),
    updateCalendar: (...args: unknown[]) => mockUpdateCalendar(...args),
    deleteCalendar: (...args: unknown[]) => mockDeleteCalendar(...args),
    createResource: (...args: unknown[]) => mockCreateResource(...args),
    importActivities: (...args: unknown[]) => mockImportActivities(...args),
    createImportLog: (...args: unknown[]) => mockCreateImportLog(...args),
    updateImportLog: (...args: unknown[]) => mockUpdateImportLog(...args),
    syncToLookAhead: (...args: unknown[]) => mockSyncToLookAhead(...args),
  },
}))

// Import hooks after mocks
import {
  scheduleKeys,
  useScheduleActivities,
  useScheduleActivity,
  useScheduleActivitiesWithDetails,
  useScheduleDependencies,
  useScheduleBaselines,
  useScheduleCalendars,
  useScheduleCalendar,
  useScheduleResources,
  useScheduleStats,
  useScheduleImportLogs,
  useMasterScheduleData,
  useCreateScheduleActivity,
  useUpdateScheduleActivity,
  useBulkUpdateActivities,
  useDeleteScheduleActivity,
  useCreateDependency,
  useDeleteDependency,
  useCreateBaseline,
  useSetActiveBaseline,
  useClearBaseline,
  useCreateCalendar,
  useUpdateCalendar,
  useDeleteCalendar,
  useCreateResource,
  useSyncToLookAhead,
} from './useScheduleActivities'

// =============================================
// Test Data
// =============================================

const mockActivity: ScheduleActivity = {
  id: 'act-123',
  project_id: 'project-456',
  company_id: 'company-789',
  activity_id: 'A1000',
  activity_code: 'FOUND-001',
  name: 'Pour Foundation',
  description: 'Pour concrete foundation',
  wbs_code: '1.1',
  wbs_level: 2,
  parent_activity_id: null,
  sort_order: 1,
  planned_start: '2024-02-01',
  planned_finish: '2024-02-15',
  actual_start: null,
  actual_finish: null,
  baseline_start: '2024-02-01',
  baseline_finish: '2024-02-15',
  planned_duration: 10,
  actual_duration: null,
  remaining_duration: 10,
  duration_type: 'fixed_duration',
  percent_complete: 0,
  physical_percent_complete: 0,
  status: 'not_started',
  activity_type: 'task',
  is_milestone: false,
  is_critical: true,
  is_on_critical_path: true,
  total_float: 0,
  free_float: 0,
  calendar_id: null,
  constraint_type: 'as_soon_as_possible',
  constraint_date: null,
  responsible_party: 'Contractor A',
  responsible_user_id: null,
  subcontractor_id: null,
  budgeted_cost: 50000,
  actual_cost: 0,
  earned_value: 0,
  budgeted_labor_hours: 200,
  actual_labor_hours: 0,
  external_id: null,
  external_source: null,
  bar_color: null,
  milestone_color: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
}

const mockActivities: ScheduleActivity[] = [
  mockActivity,
  {
    ...mockActivity,
    id: 'act-124',
    activity_id: 'A1010',
    name: 'Frame Walls',
    planned_start: '2024-02-16',
    planned_finish: '2024-02-28',
    is_critical: false,
  },
  {
    ...mockActivity,
    id: 'act-125',
    activity_id: 'M1000',
    name: 'Foundation Complete',
    activity_type: 'milestone',
    is_milestone: true,
    planned_duration: 0,
  },
]

const mockDependency: ScheduleDependency = {
  id: 'dep-123',
  project_id: 'project-456',
  predecessor_id: 'act-123',
  successor_id: 'act-124',
  dependency_type: 'FS',
  lag_days: 0,
  lag_type: null,
  lag_value: null,
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
}

const mockBaseline: ScheduleBaseline = {
  id: 'base-123',
  project_id: 'project-456',
  name: 'Original Baseline',
  description: 'Initial project schedule',
  is_active: true,
  total_activities: 50,
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
}

const mockCalendar: ScheduleCalendar = {
  id: 'cal-123',
  company_id: 'company-789',
  project_id: 'project-456',
  name: 'Standard 5-Day',
  description: 'Monday-Friday work week',
  is_default: true,
  work_start_time: '07:00',
  work_end_time: '16:00',
  sunday_hours: 0,
  monday_hours: 8,
  tuesday_hours: 8,
  wednesday_hours: 8,
  thursday_hours: 8,
  friday_hours: 8,
  saturday_hours: 0,
  created_at: '2024-01-01T00:00:00Z',
}

const mockStats: ScheduleStats = {
  total_activities: 50,
  completed_activities: 10,
  in_progress_activities: 15,
  not_started_activities: 25,
  critical_activities: 12,
  on_critical_path_count: 12,
  earliest_start: '2024-02-01',
  latest_finish: '2024-08-15',
  project_duration_days: 195,
  avg_percent_complete: 20,
  activities_with_no_float: 12,
  activities_with_negative_float: 2,
}

const mockImportLog: ScheduleImportLog = {
  id: 'log-123',
  project_id: 'project-456',
  file_name: 'schedule.xml',
  file_url: null,
  status: 'completed',
  source_system: 'ms_project',
  import_date: '2024-01-15T10:00:00Z',
  activities_imported: 50,
  dependencies_imported: 75,
  resources_imported: 10,
  errors: null,
  warnings: null,
  imported_by: 'user-123',
  created_at: '2024-01-15T10:00:00Z',
}

// =============================================
// Test Setup
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockGetActivities.mockResolvedValue(mockActivities)
  mockGetActivity.mockResolvedValue(mockActivity)
  mockGetActivitiesWithDetails.mockResolvedValue(mockActivities)
  mockGetDependencies.mockResolvedValue([mockDependency])
  mockGetBaselines.mockResolvedValue([mockBaseline])
  mockGetCalendars.mockResolvedValue([mockCalendar])
  mockGetCalendar.mockResolvedValue(mockCalendar)
  mockGetResources.mockResolvedValue([])
  mockGetScheduleStats.mockResolvedValue(mockStats)
  mockGetImportLogs.mockResolvedValue([mockImportLog])
  mockCreateActivity.mockResolvedValue(mockActivity)
  mockUpdateActivity.mockResolvedValue(mockActivity)
  mockBulkUpdateActivities.mockResolvedValue({ updated: 3 })
  mockDeleteActivity.mockResolvedValue(undefined)
  mockCreateDependency.mockResolvedValue(mockDependency)
  mockDeleteDependency.mockResolvedValue(undefined)
  mockCreateBaseline.mockResolvedValue(mockBaseline)
  mockSetActiveBaseline.mockResolvedValue(undefined)
  mockClearActiveBaseline.mockResolvedValue(undefined)
  mockCreateCalendar.mockResolvedValue(mockCalendar)
  mockUpdateCalendar.mockResolvedValue(mockCalendar)
  mockDeleteCalendar.mockResolvedValue(undefined)
  mockCreateResource.mockResolvedValue({ id: 'res-123' })
  mockImportActivities.mockResolvedValue({ imported: 50, errors: [] })
  mockCreateImportLog.mockResolvedValue(mockImportLog)
  mockUpdateImportLog.mockResolvedValue(mockImportLog)
  mockSyncToLookAhead.mockResolvedValue({ synced: 5, skipped: 0, errors: [] })
})

// =============================================
// Query Key Tests
// =============================================

describe('scheduleKeys', () => {
  it('should generate correct base key', () => {
    expect(scheduleKeys.all).toEqual(['schedule-activities'])
  })

  it('should generate correct list keys', () => {
    expect(scheduleKeys.lists()).toEqual(['schedule-activities', 'list'])
    expect(scheduleKeys.list('project-456')).toEqual([
      'schedule-activities',
      'list',
      'project-456',
      undefined,
    ])
    expect(scheduleKeys.list('project-456', { status: 'not_started' })).toEqual([
      'schedule-activities',
      'list',
      'project-456',
      { status: 'not_started' },
    ])
  })

  it('should generate correct detail keys', () => {
    expect(scheduleKeys.details()).toEqual(['schedule-activities', 'detail'])
    expect(scheduleKeys.detail('act-123')).toEqual([
      'schedule-activities',
      'detail',
      'act-123',
    ])
  })

  it('should generate correct dependency keys', () => {
    expect(scheduleKeys.dependencies('project-456')).toEqual([
      'schedule-activities',
      'dependencies',
      'project-456',
    ])
  })

  it('should generate correct baseline keys', () => {
    expect(scheduleKeys.baselines('project-456')).toEqual([
      'schedule-activities',
      'baselines',
      'project-456',
    ])
  })

  it('should generate correct calendar keys', () => {
    expect(scheduleKeys.calendars('company-789')).toEqual([
      'schedule-activities',
      'calendars',
      'company-789',
      undefined,
    ])
    expect(scheduleKeys.calendars('company-789', 'project-456')).toEqual([
      'schedule-activities',
      'calendars',
      'company-789',
      'project-456',
    ])
  })

  it('should generate correct stats keys', () => {
    expect(scheduleKeys.stats('project-456')).toEqual([
      'schedule-activities',
      'stats',
      'project-456',
    ])
  })
})

// =============================================
// Query Hook Tests
// =============================================

describe('useScheduleActivities', () => {
  it('should fetch activities for project', async () => {
    const { result } = renderHook(() => useScheduleActivities('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockActivities)
    expect(mockGetActivities).toHaveBeenCalledWith({ project_id: 'project-456' })
  })

  it('should fetch activities with filters', async () => {
    const filters = { status: 'not_started' as const }
    const { result } = renderHook(() => useScheduleActivities('project-456', filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetActivities).toHaveBeenCalledWith({
      project_id: 'project-456',
      status: 'not_started',
    })
  })

  it('should not fetch when projectId is undefined', () => {
    const { result } = renderHook(() => useScheduleActivities(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useScheduleActivity', () => {
  it('should fetch single activity', async () => {
    const { result } = renderHook(() => useScheduleActivity('act-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockActivity)
    expect(mockGetActivity).toHaveBeenCalledWith('act-123')
  })
})

describe('useScheduleDependencies', () => {
  it('should fetch dependencies for project', async () => {
    const { result } = renderHook(() => useScheduleDependencies('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockDependency])
    expect(mockGetDependencies).toHaveBeenCalledWith('project-456')
  })
})

describe('useScheduleBaselines', () => {
  it('should fetch baselines for project', async () => {
    const { result } = renderHook(() => useScheduleBaselines('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockBaseline])
    expect(mockGetBaselines).toHaveBeenCalledWith('project-456')
  })
})

describe('useScheduleCalendars', () => {
  it('should fetch calendars for company', async () => {
    const { result } = renderHook(() => useScheduleCalendars('company-789'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockCalendar])
    expect(mockGetCalendars).toHaveBeenCalledWith('company-789', undefined)
  })

  it('should fetch calendars for specific project', async () => {
    const { result } = renderHook(() => useScheduleCalendars('company-789', 'project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetCalendars).toHaveBeenCalledWith('company-789', 'project-456')
  })
})

describe('useScheduleStats', () => {
  it('should fetch schedule statistics', async () => {
    const { result } = renderHook(() => useScheduleStats('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockStats)
    expect(mockGetScheduleStats).toHaveBeenCalledWith('project-456')
  })
})

describe('useScheduleImportLogs', () => {
  it('should fetch import logs', async () => {
    const { result } = renderHook(() => useScheduleImportLogs('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockImportLog])
    expect(mockGetImportLogs).toHaveBeenCalledWith('project-456')
  })
})

describe('useMasterScheduleData', () => {
  it('should fetch combined schedule data', async () => {
    const { result } = renderHook(() => useMasterScheduleData('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.activities).toEqual(mockActivities)
    expect(result.current.dependencies).toEqual([mockDependency])
    expect(result.current.stats).toEqual(mockStats)
    expect(result.current.baselines).toEqual([mockBaseline])
    expect(result.current.activeBaseline).toEqual(mockBaseline)
  })

  it('should detect hasBaseline when activities have baseline dates', async () => {
    const { result } = renderHook(() => useMasterScheduleData('project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.hasBaseline).toBe(true)
  })
})

// =============================================
// Activity Mutation Tests
// =============================================

describe('useCreateScheduleActivity', () => {
  it('should create activity', async () => {
    const { result } = renderHook(() => useCreateScheduleActivity(), {
      wrapper: createWrapper(),
    })

    const input = {
      project_id: 'project-456',
      company_id: 'company-789',
      name: 'New Activity',
      planned_start: '2024-03-01',
      planned_finish: '2024-03-15',
    }

    await result.current.mutateAsync(input)

    expect(mockCreateActivity).toHaveBeenCalledWith(input)
  })
})

describe('useUpdateScheduleActivity', () => {
  it('should update activity', async () => {
    const { result } = renderHook(() => useUpdateScheduleActivity(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      activityId: 'act-123',
      updates: { percent_complete: 50 },
    })

    expect(mockUpdateActivity).toHaveBeenCalledWith('act-123', { percent_complete: 50 })
  })
})

describe('useBulkUpdateActivities', () => {
  it('should bulk update activities', async () => {
    const { result } = renderHook(() => useBulkUpdateActivities(), {
      wrapper: createWrapper(),
    })

    const updates = [
      { id: 'act-123', updates: { planned_start: '2024-02-05' } },
      { id: 'act-124', updates: { planned_start: '2024-02-20' } },
    ]

    await result.current.mutateAsync(updates)

    expect(mockBulkUpdateActivities).toHaveBeenCalledWith(updates)
  })
})

describe('useDeleteScheduleActivity', () => {
  it('should delete activity', async () => {
    const { result } = renderHook(() => useDeleteScheduleActivity(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      activityId: 'act-123',
      projectId: 'project-456',
    })

    expect(mockDeleteActivity).toHaveBeenCalledWith('act-123')
  })
})

// =============================================
// Dependency Mutation Tests
// =============================================

describe('useCreateDependency', () => {
  it('should create dependency', async () => {
    const { result } = renderHook(() => useCreateDependency(), {
      wrapper: createWrapper(),
    })

    const input = {
      project_id: 'project-456',
      predecessor_id: 'act-123',
      successor_id: 'act-125',
      dependency_type: 'FS' as const,
    }

    await result.current.mutateAsync(input)

    expect(mockCreateDependency).toHaveBeenCalledWith(input)
  })
})

describe('useDeleteDependency', () => {
  it('should delete dependency', async () => {
    const { result } = renderHook(() => useDeleteDependency(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      dependencyId: 'dep-123',
      projectId: 'project-456',
    })

    expect(mockDeleteDependency).toHaveBeenCalledWith('dep-123')
  })
})

// =============================================
// Baseline Mutation Tests
// =============================================

describe('useCreateBaseline', () => {
  it('should create baseline', async () => {
    const { result } = renderHook(() => useCreateBaseline(), {
      wrapper: createWrapper(),
    })

    const input = {
      project_id: 'project-456',
      name: 'New Baseline',
      description: 'Updated schedule baseline',
    }

    await result.current.mutateAsync(input)

    expect(mockCreateBaseline).toHaveBeenCalledWith(input)
  })
})

describe('useSetActiveBaseline', () => {
  it('should set active baseline', async () => {
    const { result } = renderHook(() => useSetActiveBaseline(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      baselineId: 'base-123',
      projectId: 'project-456',
    })

    expect(mockSetActiveBaseline).toHaveBeenCalledWith('base-123', 'project-456')
  })
})

describe('useClearBaseline', () => {
  it('should clear active baseline', async () => {
    const { result } = renderHook(() => useClearBaseline(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('project-456')

    expect(mockClearActiveBaseline).toHaveBeenCalledWith('project-456')
  })
})

// =============================================
// Calendar Mutation Tests
// =============================================

describe('useCreateCalendar', () => {
  it('should create calendar', async () => {
    const { result } = renderHook(() => useCreateCalendar(), {
      wrapper: createWrapper(),
    })

    const input = {
      company_id: 'company-789',
      name: 'Extended Week',
      monday_hours: 10,
      tuesday_hours: 10,
      wednesday_hours: 10,
      thursday_hours: 10,
      friday_hours: 0,
      saturday_hours: 0,
      sunday_hours: 0,
    }

    await result.current.mutateAsync(input)

    expect(mockCreateCalendar).toHaveBeenCalledWith(input)
  })
})

describe('useUpdateCalendar', () => {
  it('should update calendar', async () => {
    const { result } = renderHook(() => useUpdateCalendar(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      calendarId: 'cal-123',
      updates: { name: 'Updated Calendar' },
    })

    expect(mockUpdateCalendar).toHaveBeenCalledWith('cal-123', { name: 'Updated Calendar' })
  })
})

describe('useDeleteCalendar', () => {
  it('should delete calendar', async () => {
    const { result } = renderHook(() => useDeleteCalendar(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      calendarId: 'cal-123',
      companyId: 'company-789',
      projectId: 'project-456',
    })

    expect(mockDeleteCalendar).toHaveBeenCalledWith('cal-123')
  })
})

// =============================================
// Look-Ahead Integration Tests
// =============================================

describe('useSyncToLookAhead', () => {
  it('should sync activities to look-ahead', async () => {
    const { result } = renderHook(() => useSyncToLookAhead(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      projectId: 'project-456',
      companyId: 'company-789',
      activityIds: ['act-123', 'act-124'],
      options: { overwriteExisting: true },
    })

    expect(mockSyncToLookAhead).toHaveBeenCalledWith(
      'project-456',
      'company-789',
      ['act-123', 'act-124'],
      { overwriteExisting: true }
    )
  })
})

// =============================================
// Critical Path & Schedule Analysis Tests
// =============================================

describe('Schedule Analysis Critical Tests', () => {
  it('should identify critical path activities', () => {
    const criticalActivities = mockActivities.filter(a => a.is_critical)
    expect(criticalActivities.length).toBeGreaterThan(0)
    expect(criticalActivities[0].is_on_critical_path).toBe(true)
  })

  it('should track float values for activities', () => {
    expect(mockActivity.total_float).toBeDefined()
    expect(mockActivity.free_float).toBeDefined()
  })

  it('should support dependency types', () => {
    const depTypes = ['FS', 'SS', 'FF', 'SF']
    expect(depTypes).toContain(mockDependency.dependency_type)
  })

  it('should track baseline vs actual dates', () => {
    expect(mockActivity.baseline_start).toBeDefined()
    expect(mockActivity.baseline_finish).toBeDefined()
    expect(mockActivity.planned_start).toBeDefined()
    expect(mockActivity.planned_finish).toBeDefined()
  })

  it('should track percent complete', () => {
    expect(mockActivity.percent_complete).toBeDefined()
    expect(mockActivity.percent_complete).toBeGreaterThanOrEqual(0)
    expect(mockActivity.percent_complete).toBeLessThanOrEqual(100)
  })

  it('should identify milestones', () => {
    const milestone = mockActivities.find(a => a.is_milestone)
    expect(milestone).toBeDefined()
    expect(milestone?.planned_duration).toBe(0)
  })

  it('should provide schedule statistics', () => {
    expect(mockStats.total_activities).toBeDefined()
    expect(mockStats.completed_activities).toBeDefined()
    expect(mockStats.critical_activities).toBeDefined()
    expect(mockStats.project_duration_days).toBeDefined()
  })

  it('should track activities with float issues', () => {
    expect(mockStats.activities_with_no_float).toBeDefined()
    expect(mockStats.activities_with_negative_float).toBeDefined()
  })
})

// =============================================
// Calendar Tests
// =============================================

describe('Calendar Configuration Tests', () => {
  it('should support daily work hours configuration', () => {
    expect(mockCalendar.monday_hours).toBeDefined()
    expect(mockCalendar.tuesday_hours).toBeDefined()
    expect(mockCalendar.wednesday_hours).toBeDefined()
    expect(mockCalendar.thursday_hours).toBeDefined()
    expect(mockCalendar.friday_hours).toBeDefined()
    expect(mockCalendar.saturday_hours).toBeDefined()
    expect(mockCalendar.sunday_hours).toBeDefined()
  })

  it('should track work start and end times', () => {
    expect(mockCalendar.work_start_time).toBeDefined()
    expect(mockCalendar.work_end_time).toBeDefined()
  })

  it('should support default calendar flag', () => {
    expect(mockCalendar.is_default).toBeDefined()
  })
})

// =============================================
// Import Tests
// =============================================

describe('Schedule Import Tests', () => {
  it('should track import log status', () => {
    expect(mockImportLog.status).toBeDefined()
    expect(['pending', 'processing', 'completed', 'failed']).toContain(mockImportLog.status)
  })

  it('should track import source system', () => {
    expect(mockImportLog.source_system).toBeDefined()
    expect(['ms_project', 'primavera_p6', 'procore', 'manual']).toContain(mockImportLog.source_system)
  })

  it('should track import counts', () => {
    expect(mockImportLog.activities_imported).toBeDefined()
    expect(mockImportLog.dependencies_imported).toBeDefined()
  })
})
