import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import {
  getLinkedProgressEntries,
  getProgressByActivity,
  calculateProgressSummaries,
  syncActivityFromProgress,
  syncAllActivitiesFromProgress,
  linkProgressToActivity,
  unlinkProgressFromActivity,
  autoLinkProgressEntries,
  getSyncStatus,
} from '../look-ahead-sync'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('Look-Ahead Sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLinkedProgressEntries', () => {
    it('should fetch linked progress entries', async () => {
      const mockEntries = [
        { id: '1', activity_id: 'act-1', actual_percentage_today: 25 },
        { id: '2', activity_id: 'act-1', actual_percentage_today: 25 },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await getLinkedProgressEntries('project-1')

      expect(result).toHaveLength(2)
      expect(mockQuery.not).toHaveBeenCalledWith('activity_id', 'is', null)
    })

    it('should apply date filters', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await getLinkedProgressEntries('project-1', '2024-01-01', '2024-01-31')

      expect(mockQuery.gte).toHaveBeenCalled()
      expect(mockQuery.lte).toHaveBeenCalled()
    })
  })

  describe('getProgressByActivity', () => {
    it('should group progress entries by activity', async () => {
      const mockEntries = [
        { id: '1', activity_id: 'act-1' },
        { id: '2', activity_id: 'act-1' },
        { id: '3', activity_id: 'act-2' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await getProgressByActivity('project-1')

      expect(result.size).toBe(2)
      expect(result.get('act-1')).toHaveLength(2)
      expect(result.get('act-2')).toHaveLength(1)
    })
  })

  describe('calculateProgressSummaries', () => {
    it('should calculate summaries for activities', async () => {
      const mockProgressEntries = [
        {
          id: '1',
          activity_id: 'act-1',
          activity_name: 'Foundation',
          actual_percentage_today: 25,
          cumulative_percentage: 25,
          daily_report: { report_date: '2024-01-15' },
        },
        {
          id: '2',
          activity_id: 'act-1',
          activity_name: 'Foundation',
          actual_percentage_today: 25,
          cumulative_percentage: 50,
          daily_report: { report_date: '2024-01-16' },
        },
      ]

      const mockActivities = [
        {
          id: 'act-1',
          activity_name: 'Foundation',
          percent_complete: 0,
          status: 'planned',
        },
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockProgressEntries, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
        } as any
      })

      const result = await calculateProgressSummaries('project-1')

      expect(result).toHaveLength(1)
      expect(result[0].activity_id).toBe('act-1')
      expect(result[0].cumulative_percentage).toBe(50)
      expect(result[0].needs_sync).toBe(true)
    })
  })

  describe('syncActivityFromProgress', () => {
    it('should sync activity from progress summary', async () => {
      const mockSummary = {
        activity_id: 'act-1',
        activity_name: 'Foundation',
        cumulative_percentage: 75,
        suggested_status: 'in_progress' as const,
        first_report_date: '2024-01-15',
        last_report_date: '2024-01-20',
        progress_entries: [],
        total_entries: 5,
        total_hours_logged: 40,
        variance_reasons: [],
        needs_sync: true,
        look_ahead_activity: {
          id: 'act-1',
          activity_name: 'Foundation',
          percent_complete: 0,
          status: 'planned',
          actual_start_date: null,
          actual_end_date: null,
        } as any,
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await syncActivityFromProgress('act-1', mockSummary, 'user-1')

      expect(result.success).toBe(true)
      expect(result.updates_applied.percent_complete).toBe(75)
      expect(result.updates_applied.status).toBe('in_progress')
    })

    it('should handle missing activity', async () => {
      const mockSummary = {
        activity_id: 'act-1',
        activity_name: 'Foundation',
        cumulative_percentage: 75,
        suggested_status: 'in_progress' as const,
        progress_entries: [],
        total_entries: 0,
        first_report_date: null,
        last_report_date: null,
        total_hours_logged: 0,
        variance_reasons: [],
        needs_sync: false,
        look_ahead_activity: undefined,
      }

      const result = await syncActivityFromProgress('act-1', mockSummary)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Look-ahead activity not found')
    })
  })

  describe('syncAllActivitiesFromProgress', () => {
    it('should sync all activities needing sync', async () => {
      const mockProgressEntries = [
        { id: '1', activity_id: 'act-1', cumulative_percentage: 50, daily_report: {} },
      ]

      const mockActivities = [
        {
          id: 'act-1',
          activity_name: 'Foundation',
          percent_complete: 0,
          status: 'planned',
        },
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1 || callCount === 3) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockProgressEntries, error: null }),
          } as any
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
          } as any
        }
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any
      })

      const result = await syncAllActivitiesFromProgress('project-1')

      expect(result.total).toBeGreaterThan(0)
    })
  })

  describe('linkProgressToActivity', () => {
    it('should link progress entry to activity', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await linkProgressToActivity('progress-1', 'activity-1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ activity_id: 'activity-1' })
      )
    })
  })

  describe('unlinkProgressFromActivity', () => {
    it('should unlink progress entry', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await unlinkProgressFromActivity('progress-1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ activity_id: null })
      )
    })
  })

  describe('autoLinkProgressEntries', () => {
    it('should auto-link entries by name match', async () => {
      const mockUnlinkedEntries = [
        { id: 'prog-1', activity_name: 'foundation work', daily_report: {} },
      ]

      const mockActivities = [
        { id: 'act-1', activity_name: 'Foundation Work', trade: 'concrete', location: 'site-a' },
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({ data: mockUnlinkedEntries, error: null }),
          } as any
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
          } as any
        }
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any
      })

      const result = await autoLinkProgressEntries('project-1')

      expect(result.linked).toBe(1)
      expect(result.unmatched).toBe(0)
    })
  })

  describe('getSyncStatus', () => {
    it('should get sync status for project', async () => {
      const mockProgressEntries = []
      const mockActivities = []

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1 || callCount === 3) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockProgressEntries, error: null }),
          } as any
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ count: 10, error: null }),
        } as any
      })

      const result = await getSyncStatus('project-1')

      expect(result.total_activities).toBe(10)
      expect(result.activities_with_progress).toBe(0)
    })
  })
})
