// File: /src/lib/api/services/checklist-time-tracking.test.ts
// Tests for checklist time tracking service
// Generated: 2025-12-15

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  startChecklistExecution,
  pauseChecklistExecution,
  resumeChecklistExecution,
  completeChecklistExecution,
  getExecutionPauses,
  getExecutionTimeAnalytics,
  getCompletionTimeAnalytics,
  getAverageCompletionTime,
  getEstimatedVsActual,
  getCompletionTimeByUser,
  getCompletionTimeTrends,
  getTimeVarianceSummary,
  getFastestAndSlowest,
  updateEstimatedDuration,
} from './checklist-time-tracking'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('Checklist Time Tracking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startChecklistExecution', () => {
    it('should start execution timer', async () => {
      const mockExecution = {
        id: 'exec-1',
        started_at: '2025-12-15T10:00:00Z',
        status: 'in_progress',
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockExecution, error: null }),
          }),
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await startChecklistExecution('exec-1')

      expect(result).toEqual(mockExecution)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        })
      )
    })

    it('should throw error on failure', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
            }),
          }),
        }),
      } as any)

      await expect(startChecklistExecution('exec-1')).rejects.toThrow(
        'Failed to start checklist execution'
      )
    })
  })

  describe('pauseChecklistExecution', () => {
    it('should pause execution and create pause record', async () => {
      const mockPause = {
        id: 'pause-1',
        checklist_id: 'exec-1',
        paused_at: '2025-12-15T10:30:00Z',
      }

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { pause_count: 0 }, error: null }),
          }),
        }),
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPause, error: null }),
          }),
        }),
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any)

      const result = await pauseChecklistExecution('exec-1', 'Break time')

      expect(result).toEqual(mockPause)
    })
  })

  describe('resumeChecklistExecution', () => {
    it('should resume paused execution', async () => {
      const mockPause = {
        id: 'pause-1',
        checklist_id: 'exec-1',
        paused_at: '2025-12-15T10:30:00Z',
        resumed_at: null,
      }

      const mockResumedPause = {
        ...mockPause,
        resumed_at: '2025-12-15T10:45:00Z',
        pause_duration_minutes: 15,
      }

      // Mock finding the pause
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockPause, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as any)

      // Mock updating the pause
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockResumedPause, error: null }),
            }),
          }),
        }),
      } as any)

      // Mock fetching execution
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { paused_duration_minutes: 0 },
              error: null,
            }),
          }),
        }),
      } as any)

      // Mock updating execution
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any)

      const result = await resumeChecklistExecution('exec-1')

      expect(result).toEqual(mockResumedPause)
    })
  })

  describe('completeChecklistExecution', () => {
    it('should complete execution', async () => {
      const mockExecution = {
        id: 'exec-1',
        is_completed: true,
        completed_at: '2025-12-15T11:00:00Z',
        status: 'submitted',
      }

      // Mock checking for active pause
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      } as any)

      // Mock completing execution
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockExecution, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await completeChecklistExecution('exec-1', 'user-1')

      expect(result).toEqual(mockExecution)
      expect(result.is_completed).toBe(true)
    })
  })

  describe('getExecutionPauses', () => {
    it('should fetch all pauses for an execution', async () => {
      const mockPauses = [
        { id: 'pause-1', paused_at: '2025-12-15T10:30:00Z', resumed_at: '2025-12-15T10:45:00Z' },
        { id: 'pause-2', paused_at: '2025-12-15T11:00:00Z', resumed_at: '2025-12-15T11:10:00Z' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPauses, error: null }),
          }),
        }),
      } as any)

      const result = await getExecutionPauses('exec-1')

      expect(result).toEqual(mockPauses)
      expect(result).toHaveLength(2)
    })
  })

  describe('getExecutionTimeAnalytics', () => {
    it('should fetch time analytics for execution', async () => {
      const mockAnalytics = {
        id: 'exec-1',
        actual_duration_minutes: 60,
        variance_minutes: 10,
        variance_percentage: 20,
        accuracy_rating: 'good',
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAnalytics, error: null }),
          }),
        }),
      } as any)

      const result = await getExecutionTimeAnalytics('exec-1')

      expect(result).toEqual(mockAnalytics)
    })

    it('should return null if not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
          }),
        }),
      } as any)

      const result = await getExecutionTimeAnalytics('exec-1')

      expect(result).toBeNull()
    })
  })

  describe('getCompletionTimeAnalytics', () => {
    it('should fetch analytics with filters', async () => {
      const mockAnalytics = [
        { id: 'exec-1', actual_duration_minutes: 60, completed_on_time: true },
        { id: 'exec-2', actual_duration_minutes: 70, completed_on_time: false },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)
      mockQuery.eq.mockResolvedValue({ data: mockAnalytics, error: null })

      const result = await getCompletionTimeAnalytics({
        start_date: '2025-12-01',
        end_date: '2025-12-31',
        template_id: 'template-1',
      })

      expect(result).toEqual(mockAnalytics)
      expect(mockQuery.eq).toHaveBeenCalledWith('checklist_template_id', 'template-1')
    })
  })

  describe('getAverageCompletionTime', () => {
    it('should fetch average completion time stats', async () => {
      const mockStats = {
        avg_duration_minutes: 65.5,
        median_duration_minutes: 60,
        min_duration_minutes: 45,
        max_duration_minutes: 90,
        std_dev_minutes: 12.5,
        total_executions: 10,
        on_time_count: 7,
        on_time_percentage: 70,
      }

      vi.mocked(supabase.rpc).mockResolvedValue({ data: [mockStats], error: null })

      const result = await getAverageCompletionTime('template-1')

      expect(result).toEqual(mockStats)
      expect(supabase.rpc).toHaveBeenCalledWith('get_template_average_completion_time', {
        p_template_id: 'template-1',
        p_date_from: null,
        p_date_to: null,
      })
    })

    it('should return zero stats if no data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null })

      const result = await getAverageCompletionTime('template-1')

      expect(result.total_executions).toBe(0)
      expect(result.avg_duration_minutes).toBe(0)
    })
  })

  describe('getEstimatedVsActual', () => {
    it('should compare estimated vs actual time', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { estimated_duration_minutes: 60 }, error: null }),
          }),
        }),
      } as any)

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ avg_duration_minutes: 70 }],
        error: null,
      })

      const result = await getEstimatedVsActual('template-1')

      expect(result.estimated).toBe(60)
      expect(result.actual).toBe(70)
      expect(result.variance).toBe(10)
      expect(result.variance_percentage).toBeCloseTo(16.67, 1)
    })
  })

  describe('getCompletionTimeByUser', () => {
    it('should fetch user completion time stats', async () => {
      const mockStats = {
        avg_duration_minutes: 65,
        total_executions: 5,
        on_time_count: 4,
        on_time_percentage: 80,
        avg_variance_percentage: 8.5,
      }

      vi.mocked(supabase.rpc).mockResolvedValue({ data: [mockStats], error: null })

      const result = await getCompletionTimeByUser('user-1')

      expect(result).toEqual(mockStats)
    })
  })

  describe('getCompletionTimeTrends', () => {
    it('should fetch time trends grouped by period', async () => {
      const mockAnalytics = [
        {
          id: 'exec-1',
          completed_at: '2025-12-01T10:00:00Z',
          actual_duration_minutes: 60,
          completed_on_time: true,
        },
        {
          id: 'exec-2',
          completed_at: '2025-12-02T10:00:00Z',
          actual_duration_minutes: 70,
          completed_on_time: false,
        },
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { code: '42883' } })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)
      mockQuery.order.mockResolvedValue({ data: mockAnalytics, error: null })

      const result = await getCompletionTimeTrends(
        'template-1',
        '2025-12-01',
        '2025-12-31',
        'day'
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('avg_duration_minutes')
      expect(result[0]).toHaveProperty('execution_count')
    })
  })

  describe('getTimeVarianceSummary', () => {
    it('should calculate variance summary', async () => {
      const mockData = [
        { variance_percentage: -10, completed_on_time: true }, // Faster
        { variance_percentage: 2, completed_on_time: true }, // On time
        { variance_percentage: 15, completed_on_time: false }, // Slower
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)
      mockQuery.not.mockResolvedValue({ data: mockData, error: null })

      const result = await getTimeVarianceSummary('template-1')

      expect(result.faster_count).toBe(1)
      expect(result.on_time_count).toBe(1)
      expect(result.slower_count).toBe(1)
      expect(result.total_executions).toBe(3)
      expect(result.avg_variance_percentage).toBeCloseTo(2.33, 1)
    })
  })

  describe('getFastestAndSlowest', () => {
    it('should fetch fastest and slowest executions', async () => {
      const mockFastest = [{ id: 'exec-1', actual_duration_minutes: 45 }]
      const mockSlowest = [{ id: 'exec-2', actual_duration_minutes: 90 }]

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockFastest, error: null }),
                }),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockSlowest, error: null }),
                }),
              }),
            }),
          }),
        } as any)

      const result = await getFastestAndSlowest('template-1', 1)

      expect(result.fastest).toEqual(mockFastest)
      expect(result.slowest).toEqual(mockSlowest)
    })
  })

  describe('updateEstimatedDuration', () => {
    it('should update template estimated duration based on history', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ median_duration_minutes: 65, total_executions: 10 }],
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any)

      await updateEstimatedDuration('template-1')

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
    })

    it('should throw error if not enough executions', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ total_executions: 3 }],
        error: null,
      })

      await expect(updateEstimatedDuration('template-1')).rejects.toThrow(
        'Need at least 5 completed executions'
      )
    })
  })
})
