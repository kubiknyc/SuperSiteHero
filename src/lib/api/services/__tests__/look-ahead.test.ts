import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as lookAhead from '../look-ahead'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Look-Ahead API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLookAheadSchedule', () => {
    it('should fetch look-ahead schedule', async () => {
      const mockSchedule = [
        { id: '1', week_number: 1, activity_name: 'Foundation' },
        { id: '2', week_number: 2, activity_name: 'Framing' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSchedule, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await lookAhead.getLookAheadSchedule('project-1', 4)

      expect(result).toHaveLength(2)
    })
  })

  describe('getActivities', () => {
    it('should fetch activities with filters', async () => {
      const mockActivities = [
        { id: '1', status: 'planned', percent_complete: 0 },
        { id: '2', status: 'in_progress', percent_complete: 50 },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockActivities, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await lookAhead.getActivities({ project_id: 'project-1' })

      expect(result).toHaveLength(2)
    })
  })

  describe('createActivity', () => {
    it('should create new activity', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await lookAhead.createActivity({
        project_id: 'project-1',
        activity_name: 'New Activity',
        planned_start_date: '2024-01-15',
        planned_end_date: '2024-01-20',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('updateActivity', () => {
    it('should update activity', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await lookAhead.updateActivity('1', { percent_complete: 75 })

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('deleteActivity', () => {
    it('should soft delete activity', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await lookAhead.deleteActivity('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('updateActivityStatus', () => {
    it('should update activity status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'in_progress' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await lookAhead.updateActivityStatus('1', 'in_progress')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'in_progress' })
    })
  })

  describe('getWeeklyPlan', () => {
    it('should fetch weekly plan', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as any)

      await lookAhead.getWeeklyPlan('project-1', 1)

      expect(supabase.rpc).toHaveBeenCalledWith('get_weekly_look_ahead', {
        p_project_id: 'project-1',
        p_week_number: 1,
      })
    })
  })

  describe('getConstraints', () => {
    it('should fetch constraints', async () => {
      const mockConstraints = [
        { id: '1', constraint_type: 'material', status: 'open' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockConstraints, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await lookAhead.getConstraints('activity-1')

      expect(result).toHaveLength(1)
    })
  })

  describe('addConstraint', () => {
    it('should add constraint to activity', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await lookAhead.addConstraint({
        activity_id: 'activity-1',
        constraint_type: 'material',
        description: 'Waiting for steel delivery',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('resolveConstraint', () => {
    it('should resolve constraint', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'resolved' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await lookAhead.resolveConstraint('constraint-1', 'Materials delivered')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolution_notes: 'Materials delivered',
        })
      )
    })
  })

  describe('getLastPlannerMetrics', () => {
    it('should fetch Last Planner System metrics', async () => {
      const mockMetrics = {
        ppc_this_week: 85,
        ppc_last_week: 80,
        tasks_committed: 20,
        tasks_completed: 17,
      }

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMetrics, error: null } as any)

      const result = await lookAhead.getLastPlannerMetrics('project-1', 1)

      expect(result.ppc_this_week).toBe(85)
    })
  })
})
