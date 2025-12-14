// File: /src/features/inspections/hooks/useInspections.test.tsx
// Tests for inspections hooks

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock inspectionsApi
const mockGetProjectInspections = vi.fn()
const mockGetInspection = vi.fn()
const mockGetInspectionStats = vi.fn()
const mockGetUpcomingInspections = vi.fn()
const mockCreateInspection = vi.fn()
const mockUpdateInspection = vi.fn()
const mockDeleteInspection = vi.fn()
const mockRecordResult = vi.fn()
const mockScheduleReinspection = vi.fn()
const mockCancelInspection = vi.fn()

vi.mock('@/lib/api', () => ({
  inspectionsApi: {
    getProjectInspections: (...args: unknown[]) => mockGetProjectInspections(...args),
    getInspection: (...args: unknown[]) => mockGetInspection(...args),
    getInspectionStats: (...args: unknown[]) => mockGetInspectionStats(...args),
    getUpcomingInspections: (...args: unknown[]) => mockGetUpcomingInspections(...args),
    createInspection: (...args: unknown[]) => mockCreateInspection(...args),
    updateInspection: (...args: unknown[]) => mockUpdateInspection(...args),
    deleteInspection: (...args: unknown[]) => mockDeleteInspection(...args),
    recordResult: (...args: unknown[]) => mockRecordResult(...args),
    scheduleReinspection: (...args: unknown[]) => mockScheduleReinspection(...args),
    cancelInspection: (...args: unknown[]) => mockCancelInspection(...args),
  },
}))

vi.mock('@/lib/api/errors', () => ({
  getErrorMessage: vi.fn((error) => error?.message || 'Unknown error'),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import {
  inspectionKeys,
  useInspections,
  useInspection,
  useInspectionStats,
  useUpcomingInspections,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  useRecordInspectionResult,
  useScheduleReinspection,
  useCancelInspection,
} from './useInspections'

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock inspection data
const mockInspection = {
  id: 'inspection-1',
  project_id: 'project-123',
  company_id: 'company-123',
  inspection_type: 'building_dept',
  inspection_name: 'Foundation Inspection',
  scheduled_date: '2024-03-20',
  scheduled_time: '09:00:00',
  status: 'scheduled',
  result: 'pending',
  inspector_name: 'John Inspector',
  inspector_phone: '555-1234',
  inspector_notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
}

const mockStats = {
  total_inspections: 25,
  scheduled_count: 5,
  completed_count: 18,
  passed_count: 15,
  failed_count: 3,
  upcoming_this_week: 2,
  overdue_count: 1,
}

describe('useInspections hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('inspectionKeys', () => {
    it('should generate correct keys', () => {
      expect(inspectionKeys.all).toEqual(['inspections'])
      expect(inspectionKeys.lists()).toEqual(['inspections', 'list'])
      expect(inspectionKeys.list('project-123')).toEqual([
        'inspections',
        'list',
        'project-123',
        undefined,
      ])
      expect(inspectionKeys.list('project-123', { status: 'scheduled' })).toEqual([
        'inspections',
        'list',
        'project-123',
        { status: 'scheduled' },
      ])
      expect(inspectionKeys.details()).toEqual(['inspections', 'detail'])
      expect(inspectionKeys.detail('insp-1')).toEqual(['inspections', 'detail', 'insp-1'])
      expect(inspectionKeys.stats('project-123')).toEqual([
        'inspections',
        'stats',
        'project-123',
      ])
      expect(inspectionKeys.upcoming('project-123')).toEqual([
        'inspections',
        'upcoming',
        'project-123',
      ])
    })
  })

  describe('useInspections hook', () => {
    it('should fetch inspections for a project', async () => {
      mockGetProjectInspections.mockResolvedValue([mockInspection])

      const { result } = renderHook(() => useInspections('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetProjectInspections).toHaveBeenCalledWith('project-123', undefined)
    })

    it('should fetch inspections with filters', async () => {
      mockGetProjectInspections.mockResolvedValue([mockInspection])

      const filters = { status: 'scheduled' as const }
      const { result } = renderHook(() => useInspections('project-123', filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetProjectInspections).toHaveBeenCalledWith('project-123', filters)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useInspections(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should handle errors', async () => {
      const testError = new Error('API error')
      mockGetProjectInspections.mockRejectedValue(testError)

      const { result } = renderHook(() => useInspections('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBe(testError)
    })
  })

  describe('useInspection hook', () => {
    it('should fetch a single inspection', async () => {
      mockGetInspection.mockResolvedValue(mockInspection)

      const { result } = renderHook(() => useInspection('inspection-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.id).toBe('inspection-1')
      expect(mockGetInspection).toHaveBeenCalledWith('inspection-1')
    })

    it('should be disabled when id is undefined', () => {
      const { result } = renderHook(() => useInspection(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useInspectionStats hook', () => {
    it('should fetch inspection stats', async () => {
      mockGetInspectionStats.mockResolvedValue(mockStats)

      const { result } = renderHook(() => useInspectionStats('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.total_inspections).toBe(25)
      expect(result.current.data?.passed_count).toBe(15)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useInspectionStats(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useUpcomingInspections hook', () => {
    it('should fetch upcoming inspections', async () => {
      mockGetUpcomingInspections.mockResolvedValue([mockInspection])

      const { result } = renderHook(() => useUpcomingInspections('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useUpcomingInspections(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateInspection hook', () => {
    it('should create an inspection', async () => {
      mockCreateInspection.mockResolvedValue(mockInspection)

      const { result } = renderHook(() => useCreateInspection(), {
        wrapper: createWrapper(),
      })

      const newInspection = {
        project_id: 'project-123',
        company_id: 'company-123',
        inspection_type: 'building_dept',
        inspection_name: 'Foundation Inspection',
        scheduled_date: '2024-03-20',
      }

      await result.current.mutateAsync(newInspection)

      expect(mockCreateInspection).toHaveBeenCalledWith(newInspection)
    })
  })

  describe('useUpdateInspection hook', () => {
    it('should update an inspection', async () => {
      mockUpdateInspection.mockResolvedValue({ ...mockInspection, inspection_name: 'Updated' })

      const { result } = renderHook(() => useUpdateInspection(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'inspection-1',
        inspection_name: 'Updated',
      })

      expect(mockUpdateInspection).toHaveBeenCalledWith('inspection-1', {
        inspection_name: 'Updated',
      })
    })
  })

  describe('useDeleteInspection hook', () => {
    it('should delete an inspection', async () => {
      mockDeleteInspection.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteInspection(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'inspection-1',
        projectId: 'project-123',
      })

      expect(mockDeleteInspection).toHaveBeenCalledWith('inspection-1')
    })
  })

  describe('useRecordInspectionResult hook', () => {
    it('should record inspection result', async () => {
      mockRecordResult.mockResolvedValue({
        ...mockInspection,
        result: 'pass',
        status: 'completed',
      })

      const { result } = renderHook(() => useRecordInspectionResult(), {
        wrapper: createWrapper(),
      })

      const input = {
        id: 'inspection-1',
        result: 'pass' as const,
        result_date: '2024-03-20',
        inspector_notes: 'All passed',
      }

      await result.current.mutateAsync(input)

      expect(mockRecordResult).toHaveBeenCalledWith(input)
    })

    it('should record failed inspection result with failure details', async () => {
      mockRecordResult.mockResolvedValue({
        ...mockInspection,
        result: 'fail',
        status: 'failed',
      })

      const { result } = renderHook(() => useRecordInspectionResult(), {
        wrapper: createWrapper(),
      })

      const input = {
        id: 'inspection-1',
        result: 'fail' as const,
        result_date: '2024-03-20',
        inspector_notes: 'Failed inspection',
        failure_reasons: 'Missing fire stops',
        corrective_actions_required: 'Install fire stops',
        reinspection_scheduled_date: '2024-03-27',
      }

      await result.current.mutateAsync(input)

      expect(mockRecordResult).toHaveBeenCalledWith(input)
    })
  })

  describe('useScheduleReinspection hook', () => {
    it('should schedule reinspection', async () => {
      mockScheduleReinspection.mockResolvedValue({
        ...mockInspection,
        scheduled_date: '2024-03-27',
      })

      const { result } = renderHook(() => useScheduleReinspection(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'inspection-1',
        scheduledDate: '2024-03-27',
        scheduledTime: '10:00',
      })

      expect(mockScheduleReinspection).toHaveBeenCalledWith(
        'inspection-1',
        '2024-03-27',
        '10:00'
      )
    })

    it('should schedule reinspection without time', async () => {
      mockScheduleReinspection.mockResolvedValue(mockInspection)

      const { result } = renderHook(() => useScheduleReinspection(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'inspection-1',
        scheduledDate: '2024-03-27',
      })

      expect(mockScheduleReinspection).toHaveBeenCalledWith(
        'inspection-1',
        '2024-03-27',
        undefined
      )
    })
  })

  describe('useCancelInspection hook', () => {
    it('should cancel an inspection', async () => {
      mockCancelInspection.mockResolvedValue({
        ...mockInspection,
        status: 'cancelled',
      })

      const { result } = renderHook(() => useCancelInspection(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('inspection-1')

      expect(mockCancelInspection).toHaveBeenCalledWith('inspection-1')
    })
  })
})
