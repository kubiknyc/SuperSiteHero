/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockGetLookAheadActivities = vi.fn()
const mockGetActivitiesForWeek = vi.fn()
const mockGetActivitiesByWeek = vi.fn()
const mockGetLookAheadActivity = vi.fn()
const mockCreateLookAheadActivity = vi.fn()
const mockUpdateLookAheadActivity = vi.fn()
const mockMoveActivityToWeek = vi.fn()
const mockUpdateActivityStatus = vi.fn()
const mockDeleteLookAheadActivity = vi.fn()
const mockGetActivityConstraints = vi.fn()
const mockGetProjectOpenConstraints = vi.fn()
const mockCreateLookAheadConstraint = vi.fn()
const mockUpdateLookAheadConstraint = vi.fn()
const mockDeleteLookAheadConstraint = vi.fn()
const mockGetLookAheadSnapshots = vi.fn()
const mockCreateLookAheadSnapshot = vi.fn()
const mockGetPPCMetrics = vi.fn()
const mockGetLookAheadTemplates = vi.fn()
const mockCreateActivityFromTemplate = vi.fn()
const mockGetLookAheadDashboardStats = vi.fn()

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockUserProfile = { id: 'profile-1', company_id: 'company-1' }
const mockUseAuth = vi.fn(() => ({ user: mockUser, userProfile: mockUserProfile }))

// Mock the API services
vi.mock('@/lib/api/services/look-ahead', () => ({
  getLookAheadActivities: (...args: unknown[]) => mockGetLookAheadActivities(...args),
  getActivitiesForWeek: (...args: unknown[]) => mockGetActivitiesForWeek(...args),
  getActivitiesByWeek: (...args: unknown[]) => mockGetActivitiesByWeek(...args),
  getLookAheadActivity: (...args: unknown[]) => mockGetLookAheadActivity(...args),
  createLookAheadActivity: (...args: unknown[]) => mockCreateLookAheadActivity(...args),
  updateLookAheadActivity: (...args: unknown[]) => mockUpdateLookAheadActivity(...args),
  moveActivityToWeek: (...args: unknown[]) => mockMoveActivityToWeek(...args),
  updateActivityStatus: (...args: unknown[]) => mockUpdateActivityStatus(...args),
  deleteLookAheadActivity: (...args: unknown[]) => mockDeleteLookAheadActivity(...args),
  getActivityConstraints: (...args: unknown[]) => mockGetActivityConstraints(...args),
  getProjectOpenConstraints: (...args: unknown[]) => mockGetProjectOpenConstraints(...args),
  createLookAheadConstraint: (...args: unknown[]) => mockCreateLookAheadConstraint(...args),
  updateLookAheadConstraint: (...args: unknown[]) => mockUpdateLookAheadConstraint(...args),
  deleteLookAheadConstraint: (...args: unknown[]) => mockDeleteLookAheadConstraint(...args),
  getLookAheadSnapshots: (...args: unknown[]) => mockGetLookAheadSnapshots(...args),
  createLookAheadSnapshot: (...args: unknown[]) => mockCreateLookAheadSnapshot(...args),
  getPPCMetrics: (...args: unknown[]) => mockGetPPCMetrics(...args),
  getLookAheadTemplates: (...args: unknown[]) => mockGetLookAheadTemplates(...args),
  createActivityFromTemplate: (...args: unknown[]) => mockCreateActivityFromTemplate(...args),
  getLookAheadDashboardStats: (...args: unknown[]) => mockGetLookAheadDashboardStats(...args),
}))

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  lookAheadKeys,
  useLookAheadActivities,
  useActivitiesForWeek,
  useActivitiesByWeek,
  useLookAheadActivity,
  useCreateActivity,
  useUpdateActivity,
  useMoveActivityToWeek,
  useUpdateActivityStatus,
  useDeleteActivity,
  useActivityConstraints,
  useProjectOpenConstraints,
  useCreateConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
  useLookAheadSnapshots,
  usePPCMetrics,
  useCreateSnapshot,
  useLookAheadTemplates,
  useCreateActivityFromTemplate,
  useLookAheadDashboardStats,
} from './useLookAhead'

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Sample test data
const mockActivity = {
  id: 'activity-1',
  project_id: 'project-1',
  company_id: 'company-1',
  name: 'Foundation Work',
  description: 'Pour concrete foundation',
  trade: 'Concrete',
  week_number: 1,
  week_start_date: '2025-01-06',
  planned_start: '2025-01-06',
  planned_end: '2025-01-10',
  status: 'planned',
  percent_complete: 0,
  is_blocked: false,
  created_at: '2025-01-01T00:00:00Z',
  created_by: 'user-1',
}

const mockConstraint = {
  id: 'constraint-1',
  activity_id: 'activity-1',
  constraint_type: 'material',
  description: 'Waiting for concrete delivery',
  status: 'open',
  due_date: '2025-01-05',
  responsible_party: 'Supplier',
  created_at: '2025-01-01T00:00:00Z',
  created_by: 'user-1',
}

const mockSnapshot = {
  id: 'snapshot-1',
  project_id: 'project-1',
  company_id: 'company-1',
  week_start_date: '2025-01-06',
  activities_planned: 10,
  activities_completed: 6,
  ppc_percentage: 60,
  notes: 'First week snapshot',
  created_at: '2025-01-13T00:00:00Z',
  created_by: 'user-1',
}

const mockPPCMetrics = {
  current_week_ppc: 75,
  four_week_rolling_ppc: 68,
  trend: 'improving',
  weekly_data: [
    { week: '2025-01-06', ppc: 60 },
    { week: '2025-01-13', ppc: 75 },
  ],
}

const mockTemplate = {
  id: 'template-1',
  company_id: 'company-1',
  name: 'Foundation Template',
  trade: 'Concrete',
  estimated_duration_days: 5,
  default_constraints: ['material', 'labor'],
}

describe('lookAheadKeys', () => {
  it('should generate correct query keys', () => {
    expect(lookAheadKeys.all).toEqual(['look-ahead'])
    expect(lookAheadKeys.activities('project-1')).toEqual(['look-ahead', 'activities', 'project-1'])
    expect(lookAheadKeys.activitiesWithFilters('project-1', { status: 'planned' })).toEqual([
      'look-ahead',
      'activities',
      'project-1',
      { status: 'planned' },
    ])
    expect(lookAheadKeys.activitiesForWeek('project-1', '2025-01-06')).toEqual([
      'look-ahead',
      'activities',
      'project-1',
      'week',
      '2025-01-06',
    ])
    expect(lookAheadKeys.activity('activity-1')).toEqual(['look-ahead', 'activity', 'activity-1'])
    expect(lookAheadKeys.constraints('activity-1')).toEqual(['look-ahead', 'constraints', 'activity-1'])
    expect(lookAheadKeys.projectConstraints('project-1')).toEqual([
      'look-ahead',
      'project-constraints',
      'project-1',
    ])
    expect(lookAheadKeys.snapshots('project-1')).toEqual(['look-ahead', 'snapshots', 'project-1'])
    expect(lookAheadKeys.ppc('project-1')).toEqual(['look-ahead', 'ppc', 'project-1'])
    expect(lookAheadKeys.templates('company-1', 'Concrete')).toEqual([
      'look-ahead',
      'templates',
      'company-1',
      'Concrete',
    ])
    expect(lookAheadKeys.dashboardStats('project-1')).toEqual(['look-ahead', 'dashboard', 'project-1'])
  })
})

describe('Activity Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useLookAheadActivities', () => {
    it('should fetch activities for a project', async () => {
      mockGetLookAheadActivities.mockResolvedValue([mockActivity])

      const { result } = renderHook(() => useLookAheadActivities('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockActivity])
      expect(mockGetLookAheadActivities).toHaveBeenCalledWith('project-1', undefined)
    })

    it('should fetch activities with filters', async () => {
      mockGetLookAheadActivities.mockResolvedValue([mockActivity])
      const filters = { status: 'planned' as const, trade: 'Concrete' }

      const { result } = renderHook(() => useLookAheadActivities('project-1', filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetLookAheadActivities).toHaveBeenCalledWith('project-1', filters)
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useLookAheadActivities(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGetLookAheadActivities).not.toHaveBeenCalled()
    })
  })

  describe('useActivitiesForWeek', () => {
    it('should fetch activities for a specific week', async () => {
      mockGetActivitiesForWeek.mockResolvedValue([mockActivity])

      const { result } = renderHook(() => useActivitiesForWeek('project-1', '2025-01-06'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockActivity])
      expect(mockGetActivitiesForWeek).toHaveBeenCalledWith('project-1', '2025-01-06')
    })

    it('should not fetch when week date is undefined', () => {
      const { result } = renderHook(() => useActivitiesForWeek('project-1', undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useActivitiesByWeek', () => {
    it('should fetch activities grouped by week', async () => {
      const weeklyData = {
        weeks: [{ weekNumber: 1, startDate: '2025-01-06', endDate: '2025-01-10' }],
        activities: { 1: [mockActivity] },
      }
      mockGetActivitiesByWeek.mockResolvedValue(weeklyData)

      const { result } = renderHook(() => useActivitiesByWeek('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(weeklyData)
    })

    it('should fetch with base date', async () => {
      const baseDate = new Date('2025-01-01')
      mockGetActivitiesByWeek.mockResolvedValue({ weeks: [], activities: {} })

      renderHook(() => useActivitiesByWeek('project-1', baseDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockGetActivitiesByWeek).toHaveBeenCalled())
      expect(mockGetActivitiesByWeek).toHaveBeenCalledWith('project-1', baseDate)
    })
  })

  describe('useLookAheadActivity', () => {
    it('should fetch a single activity', async () => {
      mockGetLookAheadActivity.mockResolvedValue(mockActivity)

      const { result } = renderHook(() => useLookAheadActivity('activity-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockActivity)
      expect(mockGetLookAheadActivity).toHaveBeenCalledWith('activity-1')
    })
  })
})

describe('Activity Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useCreateActivity', () => {
    it('should create an activity', async () => {
      mockCreateLookAheadActivity.mockResolvedValue(mockActivity)

      const { result } = renderHook(() => useCreateActivity(), {
        wrapper: createWrapper(),
      })

      const dto = {
        project_id: 'project-1',
        name: 'Foundation Work',
        trade: 'Concrete',
        week_number: 1,
        week_start_date: '2025-01-06',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCreateLookAheadActivity).toHaveBeenCalledWith(dto, 'company-1', 'user-1')
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null, userProfile: null })

      const { result } = renderHook(() => useCreateActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'project-1',
        name: 'Test',
        trade: 'Test',
        week_number: 1,
        week_start_date: '2025-01-06',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('User or company information not available')
    })
  })

  describe('useUpdateActivity', () => {
    it('should update an activity', async () => {
      const updatedActivity = { ...mockActivity, name: 'Updated Foundation Work' }
      mockUpdateLookAheadActivity.mockResolvedValue(updatedActivity)

      const { result } = renderHook(() => useUpdateActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        dto: { name: 'Updated Foundation Work' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateLookAheadActivity).toHaveBeenCalledWith(
        'activity-1',
        { name: 'Updated Foundation Work' },
        'user-1'
      )
    })
  })

  describe('useMoveActivityToWeek', () => {
    it('should move an activity to a different week', async () => {
      const movedActivity = { ...mockActivity, week_number: 2, week_start_date: '2025-01-13' }
      mockMoveActivityToWeek.mockResolvedValue(movedActivity)

      const { result } = renderHook(() => useMoveActivityToWeek(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        weekNumber: 2,
        weekStartDate: '2025-01-13',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockMoveActivityToWeek).toHaveBeenCalledWith('activity-1', 2, '2025-01-13', 'user-1')
    })
  })

  describe('useUpdateActivityStatus', () => {
    it('should update activity status', async () => {
      const updatedActivity = { ...mockActivity, status: 'in_progress', percent_complete: 50 }
      mockUpdateActivityStatus.mockResolvedValue(updatedActivity)

      const { result } = renderHook(() => useUpdateActivityStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        status: 'in_progress',
        percentComplete: 50,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateActivityStatus).toHaveBeenCalledWith('activity-1', 'in_progress', 50, 'user-1')
    })
  })

  describe('useDeleteActivity', () => {
    it('should delete an activity', async () => {
      mockDeleteLookAheadActivity.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ activityId: 'activity-1', projectId: 'project-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDeleteLookAheadActivity).toHaveBeenCalledWith('activity-1')
    })
  })
})

describe('Constraint Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useActivityConstraints', () => {
    it('should fetch constraints for an activity', async () => {
      mockGetActivityConstraints.mockResolvedValue([mockConstraint])

      const { result } = renderHook(() => useActivityConstraints('activity-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockConstraint])
      expect(mockGetActivityConstraints).toHaveBeenCalledWith('activity-1')
    })

    it('should not fetch when activityId is undefined', () => {
      const { result } = renderHook(() => useActivityConstraints(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useProjectOpenConstraints', () => {
    it('should fetch open constraints for a project', async () => {
      mockGetProjectOpenConstraints.mockResolvedValue([mockConstraint])

      const { result } = renderHook(() => useProjectOpenConstraints('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockConstraint])
      expect(mockGetProjectOpenConstraints).toHaveBeenCalledWith('project-1')
    })
  })
})

describe('Constraint Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useCreateConstraint', () => {
    it('should create a constraint', async () => {
      mockCreateLookAheadConstraint.mockResolvedValue(mockConstraint)

      const { result } = renderHook(() => useCreateConstraint(), {
        wrapper: createWrapper(),
      })

      const dto = {
        activity_id: 'activity-1',
        constraint_type: 'material',
        description: 'Waiting for concrete delivery',
      }

      result.current.mutate({ dto, projectId: 'project-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCreateLookAheadConstraint).toHaveBeenCalledWith(dto, 'project-1', 'company-1', 'user-1')
    })
  })

  describe('useUpdateConstraint', () => {
    it('should update a constraint', async () => {
      const updatedConstraint = { ...mockConstraint, status: 'resolved' }
      mockUpdateLookAheadConstraint.mockResolvedValue(updatedConstraint)

      const { result } = renderHook(() => useUpdateConstraint(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        constraintId: 'constraint-1',
        dto: { status: 'resolved' },
        activityId: 'activity-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateLookAheadConstraint).toHaveBeenCalledWith('constraint-1', { status: 'resolved' }, 'user-1')
    })
  })

  describe('useDeleteConstraint', () => {
    it('should delete a constraint', async () => {
      mockDeleteLookAheadConstraint.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteConstraint(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ constraintId: 'constraint-1', activityId: 'activity-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDeleteLookAheadConstraint).toHaveBeenCalledWith('constraint-1')
    })
  })
})

describe('Snapshot & PPC Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useLookAheadSnapshots', () => {
    it('should fetch snapshots for a project', async () => {
      mockGetLookAheadSnapshots.mockResolvedValue([mockSnapshot])

      const { result } = renderHook(() => useLookAheadSnapshots('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockSnapshot])
      expect(mockGetLookAheadSnapshots).toHaveBeenCalledWith('project-1', undefined)
    })

    it('should fetch with limit', async () => {
      mockGetLookAheadSnapshots.mockResolvedValue([mockSnapshot])

      renderHook(() => useLookAheadSnapshots('project-1', 5), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockGetLookAheadSnapshots).toHaveBeenCalled())
      expect(mockGetLookAheadSnapshots).toHaveBeenCalledWith('project-1', 5)
    })
  })

  describe('usePPCMetrics', () => {
    it('should fetch PPC metrics for a project', async () => {
      mockGetPPCMetrics.mockResolvedValue(mockPPCMetrics)

      const { result } = renderHook(() => usePPCMetrics('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockPPCMetrics)
      expect(mockGetPPCMetrics).toHaveBeenCalledWith('project-1')
    })
  })

  describe('useCreateSnapshot', () => {
    it('should create a snapshot', async () => {
      mockCreateLookAheadSnapshot.mockResolvedValue(mockSnapshot)

      const { result } = renderHook(() => useCreateSnapshot(), {
        wrapper: createWrapper(),
      })

      const dto = {
        project_id: 'project-1',
        week_start_date: '2025-01-06',
        notes: 'First week snapshot',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCreateLookAheadSnapshot).toHaveBeenCalledWith(dto, 'company-1', 'user-1')
    })
  })
})

describe('Template Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useLookAheadTemplates', () => {
    it('should fetch templates for a company', async () => {
      mockGetLookAheadTemplates.mockResolvedValue([mockTemplate])

      const { result } = renderHook(() => useLookAheadTemplates(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockTemplate])
      expect(mockGetLookAheadTemplates).toHaveBeenCalledWith('company-1', undefined)
    })

    it('should fetch templates filtered by trade', async () => {
      mockGetLookAheadTemplates.mockResolvedValue([mockTemplate])

      renderHook(() => useLookAheadTemplates('Concrete'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockGetLookAheadTemplates).toHaveBeenCalled())
      expect(mockGetLookAheadTemplates).toHaveBeenCalledWith('company-1', 'Concrete')
    })
  })

  describe('useCreateActivityFromTemplate', () => {
    it('should create activity from template', async () => {
      mockCreateActivityFromTemplate.mockResolvedValue(mockActivity)

      const { result } = renderHook(() => useCreateActivityFromTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        templateId: 'template-1',
        projectId: 'project-1',
        overrides: { name: 'Custom Foundation' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCreateActivityFromTemplate).toHaveBeenCalledWith(
        'template-1',
        'project-1',
        'company-1',
        'user-1',
        { name: 'Custom Foundation' }
      )
    })
  })
})

describe('Dashboard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useLookAheadDashboardStats', () => {
    it('should fetch dashboard stats', async () => {
      const stats = {
        total_activities: 20,
        completed: 15,
        in_progress: 3,
        blocked: 2,
        current_week_ppc: 75,
      }
      mockGetLookAheadDashboardStats.mockResolvedValue(stats)

      const { result } = renderHook(() => useLookAheadDashboardStats('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(stats)
      expect(mockGetLookAheadDashboardStats).toHaveBeenCalledWith('project-1')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useLookAheadDashboardStats(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
})
